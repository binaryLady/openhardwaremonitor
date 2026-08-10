// Cross-platform sensor agent — the app for machines the desktop build
// can't reach (macOS, Linux). Serves the same web/ dashboard and speaks
// the embedded server's exact /data.json contract (HttpServer.cs,
// GenerateJSON): a pre-order tree of {id, Text, Children, Min, Value,
// Max, ImageURL} where every value is a preformatted display string.
//
//   node agent/serve.js          # http://localhost:8085/
//   OHM_PORT=9000 node agent/serve.js
//
// No dependencies. Sensors come from what the platform exposes without
// privileges: per-core and total CPU load, core clocks, memory load.
// Temperatures and fans need platform drivers the desktop app owns on
// Windows; on macOS they are root-gated (powermetrics) and omitted here
// rather than faked — the dashboard renders what the tree carries.
'use strict';
const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.OHM_PORT) || 8085;
const ROOT = path.join(__dirname, '..', 'web');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.json': 'application/json',
};

// ---- sensors ----------------------------------------------------------

// CPU load is a delta between two /proc-style snapshots, like every
// monitor computes it; the first poll has no delta and reads 0.
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
};

// ---- the tree, in the server's exact shape ----------------------------

let id = 0;
function node(text, icon, children, sensor) {
  const n = { id: id++, Text: text, Children: children || [] };
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

function buildTree() {
  id = 1; // 0 is the root, as in HttpServer.SendJSON
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

  const computer = node(os.hostname(), 'computer', [cpu, ram]);
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

// ---- the server -------------------------------------------------------

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

srv.listen(PORT, () => {
  console.log('OHM agent · http://localhost:' + PORT + '/ · data at /data.json');
});
