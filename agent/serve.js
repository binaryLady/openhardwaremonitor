// Cross-platform sensor agent — the app for machines the desktop build
// can't reach (macOS, Linux). Serves the same web/ dashboard and speaks
// the embedded server's exact /data.json contract (HttpServer.cs,
// GenerateJSON): a pre-order tree of {id, Text, Children, Min, Value,
// Max, ImageURL} where every value is a preformatted display string.
//
//   node agent/serve.js              # http://localhost:8085/
//   node agent/serve.js --open       # …and open the browser
//   node agent/serve.js install      # start at login (launchd / systemd)
//   node agent/serve.js uninstall
//   OHM_PORT=9000 node agent/serve.js
//
// No dependencies. Core sensors (per-core CPU load, clocks, memory) come
// from Node's os module on every platform; a per-platform sampler
// (agent/samplers/<platform>.js) adds what the OS exposes — temperatures,
// fans, power, battery — in honesty tiers, omitted rather than faked when
// a tier is gated (see samplers/darwin.js for the macOS tiers).
'use strict';
const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const PORT = Number(process.env.OHM_PORT) || 8085;
const ROOT = path.join(__dirname, '..', 'web');
const POLL_MS = 5000;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.json': 'application/json',
};

// ---- core sensors ------------------------------------------------------

// CPU load is a delta between two snapshots, like every monitor computes
// it; the first poll has no delta and reads 0.
let prev = os.cpus().map((c) => c.times);
function cpuLoads() {
  const now = os.cpus().map((c) => c.times);
  const loads = now.map((t, i) => {
    const p = prev[i] || t;
    const busy = (t.user - p.user) + (t.nice - p.nice) + (t.sys - p.sys) + (t.irq - p.irq);
    const total = busy + (t.idle - p.idle);
    return total > 0 ? (100 * busy) / total : 0;
  });
  prev = now;
  return loads;
}

// min/max accumulate across the agent's lifetime, like the app's columns
const history = {};
function span(key, v) {
  const h = history[key] || (history[key] = { min: v, max: v });
  if (v < h.min) h.min = v;
  if (v > h.max) h.max = v;
  return h;
}

const fmt = {
  pct: (v) => v.toFixed(1) + ' %',
  mhz: (v) => Math.round(v).toLocaleString('en-US') + ' MHz',
  degC: (v) => v.toFixed(1) + ' °C',
  rpm: (v) => Math.round(v).toLocaleString('en-US') + ' RPM',
  watt: (v) => v.toFixed(1) + ' W',
};

// sensor categories → the TypeNode label and icon the desktop app uses
// (TypeNode.cs) and the display format; parse.js categorizes by the icon
const CATS = {
  temperature: { type: 'Temperatures', format: fmt.degC },
  fan: { type: 'Fans', format: fmt.rpm },
  power: { type: 'Powers', format: fmt.watt },
  level: { type: 'Levels', format: fmt.pct },
  voltage: { type: 'Voltages', format: (v) => v.toFixed(3) + ' V' },
  load: { type: 'Load', format: fmt.pct },
  clock: { type: 'Clocks', format: fmt.mhz },
};

// ---- platform sampler (extra hardware blocks, refreshed off-request) ---

let sampler = null;
try { sampler = require('./samplers/' + process.platform + '.js'); } catch (e) {}

let EXTRAS = []; // sampler blocks in spec form {name, icon, sensors}
function refreshExtras() {
  if (!sampler) return;
  sampler.sample().then((blocks) => { EXTRAS = blocks || []; },
    () => { EXTRAS = []; });
}

// ---- the tree, in the server's exact shape ----------------------------

function node(text, icon, children, sensor) {
  const n = { id: 0, Text: text, Children: children || [] };
  if (sensor) {
    const h = span(sensor.key, sensor.value);
    n.Min = sensor.format(h.min);
    n.Value = sensor.format(sensor.value);
    n.Max = sensor.format(h.max);
    n.ImageURL = 'images/transparent.png';
  } else {
    n.Min = ''; n.Value = ''; n.Max = '';
    n.ImageURL = 'images_icon/' + icon + '.png';
  }
  return n;
}

/** a sampler block → a hardware node with per-category TypeNodes */
function blockNode(block) {
  const byCat = {};
  for (const s of block.sensors) {
    const cat = CATS[s.cat];
    if (!cat) continue;
    (byCat[s.cat] = byCat[s.cat] || []).push(
      node(s.name, null, [], {
        key: 'x.' + block.name + '.' + s.cat + '.' + s.name,
        value: s.value, format: cat.format,
      }));
  }
  const types = Object.keys(byCat).map((c) => node(CATS[c].type, c, byCat[c]));
  return node(block.name, block.icon, types);
}

function buildTree() {
  const cpus = os.cpus();
  const loads = cpuLoads();
  const total = loads.reduce((a, b) => a + b, 0) / (loads.length || 1);

  const loadType = node('Load', 'load', [
    node('CPU Total', null, [], { key: 'load.total', value: total, format: fmt.pct }),
    ...loads.map((v, i) =>
      node('CPU Core #' + (i + 1), null, [], { key: 'load.' + i, value: v, format: fmt.pct })),
  ]);
  const clockType = node('Clocks', 'clock', cpus.map((c, i) =>
    node('CPU Core #' + (i + 1), null, [], { key: 'clock.' + i, value: c.speed, format: fmt.mhz })));
  const cpu = node(cpus[0] ? cpus[0].model.trim() : 'CPU', 'cpu', [loadType, clockType]);

  const memUsed = (100 * (os.totalmem() - os.freemem())) / os.totalmem();
  const ram = node('Memory', 'ram', [
    node('Load', 'load', [
      node('Memory', null, [], { key: 'mem.load', value: memUsed, format: fmt.pct }),
    ]),
  ]);

  const computer = node(os.hostname(), 'computer', [cpu, ram, ...EXTRAS.map(blockNode)]);
  const root = {
    id: 0, Text: 'Sensor', Children: [computer],
    Min: 'Min', Value: 'Value', Max: 'Max', ImageURL: '',
  };
  renumber(root, 0);
  return root;
}

// HttpServer.GenerateJSON numbers nodes pre-order (parent before its
// children); mirror that so ids match the desktop server's byte-for-byte
function renumber(n, next) {
  n.id = next++;
  for (const c of n.Children) next = renumber(c, next);
  return next;
}

// ---- lifecycle: start at login ----------------------------------------

const PLIST = path.join(os.homedir(), 'Library', 'LaunchAgents',
  'com.thetechmargin.ohm-agent.plist');
const UNIT_DIR = path.join(os.homedir(), '.config', 'systemd', 'user');
const UNIT = path.join(UNIT_DIR, 'ohm-agent.service');

function install() {
  if (process.platform === 'darwin') {
    fs.mkdirSync(path.dirname(PLIST), { recursive: true });
    fs.writeFileSync(PLIST, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.thetechmargin.ohm-agent</string>
  <key>ProgramArguments</key><array>
    <string>${process.execPath}</string>
    <string>${__filename}</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict></plist>
`);
    execFile('launchctl', ['load', '-w', PLIST], () => {
      console.log('installed: ' + PLIST + '\nthe dashboard now starts at login — http://localhost:' + PORT + '/');
    });
  } else if (process.platform === 'linux') {
    fs.mkdirSync(UNIT_DIR, { recursive: true });
    fs.writeFileSync(UNIT, `[Unit]
Description=Open Hardware Monitor agent (TTM dashboard)

[Service]
ExecStart=${process.execPath} ${__filename}
Restart=always

[Install]
WantedBy=default.target
`);
    execFile('systemctl', ['--user', 'enable', '--now', 'ohm-agent'], (err) => {
      console.log(err
        ? 'wrote ' + UNIT + ' — enable it with: systemctl --user enable --now ohm-agent'
        : 'installed: ' + UNIT + '\nthe dashboard now starts at login — http://localhost:' + PORT + '/');
    });
  } else {
    console.log('install is for macOS/Linux; on Windows run the desktop app (see README).');
  }
}

function uninstall() {
  if (process.platform === 'darwin') {
    execFile('launchctl', ['unload', '-w', PLIST], () => {
      try { fs.unlinkSync(PLIST); } catch (e) {}
      console.log('uninstalled');
    });
  } else if (process.platform === 'linux') {
    execFile('systemctl', ['--user', 'disable', '--now', 'ohm-agent'], () => {
      try { fs.unlinkSync(UNIT); } catch (e) {}
      console.log('uninstalled');
    });
  } else {
    console.log('nothing to uninstall on this platform.');
  }
}

// ---- the server -------------------------------------------------------

function serve() {
  const srv = http.createServer((req, res) => {
    let p = req.url.split('?')[0];
    if (p === '/data.json') {
      const body = JSON.stringify(buildTree());
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(body);
      return;
    }
    if (p.endsWith('/')) p += 'index.html';
    else if (!path.posix.basename(p).includes('.')) {
      res.writeHead(301, { Location: p + '/' });
      res.end();
      return;
    }
    const file = path.normalize(path.join(ROOT, p));
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) {
        fs.readFile(path.join(ROOT, '404.html'), (e2, nf) => {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end(e2 ? 'not found' : nf);
        });
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });

  refreshExtras();
  setInterval(refreshExtras, POLL_MS).unref();

  srv.listen(PORT, () => {
    console.log('OHM agent · http://localhost:' + PORT + '/ · data at /data.json');
    if (process.argv.includes('--open')) {
      const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
      execFile(opener, ['http://localhost:' + PORT + '/'], () => {});
    }
  });
}

if (require.main === module) {
  const cmd = process.argv[2];
  if (cmd === 'install') install();
  else if (cmd === 'uninstall') uninstall();
  else serve();
}

module.exports = { buildTree, blockNode, renumber };
