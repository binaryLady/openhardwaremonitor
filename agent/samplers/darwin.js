// macOS sensor sampler — three honesty tiers, each additive, none faked:
//   1. no privileges, no installs: battery temperature/charge via ioreg
//   2. a helper tool if present on PATH: smctemp or osx-cpu-temp
//      (CPU/GPU temperature, fans)
//   3. root: powermetrics (CPU die temperature, fan RPM, package power)
// sample() returns hardware blocks {name, icon, sensors:[{cat, name, value}]};
// serve.js formats values and shapes the /data.json tree. The parsers are
// pure string→object functions so they test off-platform.
'use strict';
const { execFile } = require('child_process');

function run(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 10000 }, (err, stdout) => {
      resolve(err ? null : String(stdout));
    });
  });
}

// ---- pure parsers ------------------------------------------------------

/** ioreg -rn AppleSmartBattery → {tempC, chargePct} (either may be absent) */
function parseIoregBattery(text) {
  const out = {};
  const t = /"Temperature" = (\d+)/.exec(text);
  if (t) out.tempC = Number(t[1]) / 100;
  const cur = /"CurrentCapacity" = (\d+)/.exec(text);
  const max = /"MaxCapacity" = (\d+)/.exec(text);
  if (cur) {
    const c = Number(cur[1]);
    // Apple Silicon reports a percentage directly; Intel reports mAh
    out.chargePct = c <= 100 ? c : (max && Number(max[1]) > 0 ? (100 * c) / Number(max[1]) : null);
    if (out.chargePct == null) delete out.chargePct;
  }
  return out;
}

/** `smctemp -c` / `osx-cpu-temp` → °C number or null ("58.2", "58.2°C") */
function parseTempLine(text) {
  const m = /(-?\d+(?:\.\d+)?)\s*°?C?/.exec((text || '').trim());
  const v = m ? Number(m[1]) : NaN;
  return Number.isFinite(v) && v > 0 ? v : null;
}

/** `osx-cpu-temp -f` → [{name, rpm}] ("Fan 0 - Left side at 1594 RPM (34%)") */
function parseFans(text) {
  const fans = [];
  for (const m of (text || '').matchAll(/Fan (\d+)[^\n]*?at (\d+(?:\.\d+)?) RPM/g))
    fans.push({ name: 'Fan #' + (Number(m[1]) + 1), rpm: Number(m[2]) });
  return fans;
}

/** powermetrics text → {dieTempC?, fans:[{name,rpm}], packageW?} */
function parsePowermetrics(text) {
  const out = { fans: [] };
  const die = /CPU die temperature: (-?\d+(?:\.\d+)?)/.exec(text);
  if (die) out.dieTempC = Number(die[1]);
  for (const m of (text || '').matchAll(/^Fan(?: (\d+))?: (\d+(?:\.\d+)?) rpm/gm))
    out.fans.push({ name: 'Fan #' + (m[1] ? Number(m[1]) + 1 : 1), rpm: Number(m[2]) });
  const pw = /Combined Power \(CPU \+ GPU \+ ANE\): (\d+(?:\.\d+)?) mW/.exec(text);
  if (pw) out.packageW = Number(pw[1]) / 1000;
  return out;
}

// ---- the sampler -------------------------------------------------------

let tool; // memoized helper-tool detection: undefined → not probed yet
async function findTool() {
  if (tool !== undefined) return tool;
  for (const t of ['smctemp', 'osx-cpu-temp']) {
    if (await run('/usr/bin/which', [t])) return (tool = t);
  }
  return (tool = null);
}

async function sample() {
  const blocks = [];
  const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;

  const [battery, helper, pm] = await Promise.all([
    run('ioreg', ['-rn', 'AppleSmartBattery']),
    findTool(),
    isRoot ? run('powermetrics', ['-n', '1', '-i', '1000', '--samplers', 'smc,cpu_power']) : null,
  ]);

  // tier 3/2: SMC block — powermetrics wins when both report the same thing
  const smc = { name: 'SMC', icon: 'mainboard', sensors: [] };
  if (pm) {
    const p = parsePowermetrics(pm);
    if (p.dieTempC != null) smc.sensors.push({ cat: 'temperature', name: 'CPU Die', value: p.dieTempC });
    for (const f of p.fans) smc.sensors.push({ cat: 'fan', name: f.name, value: f.rpm });
    if (p.packageW != null) smc.sensors.push({ cat: 'power', name: 'Package', value: p.packageW });
  }
  if (helper && !smc.sensors.some((s) => s.cat === 'temperature')) {
    const cpu = parseTempLine(await run(helper, helper === 'smctemp' ? ['-c'] : []));
    if (cpu != null) smc.sensors.push({ cat: 'temperature', name: 'CPU', value: cpu });
    if (helper === 'smctemp') {
      const gpu = parseTempLine(await run(helper, ['-g']));
      if (gpu != null) smc.sensors.push({ cat: 'temperature', name: 'GPU', value: gpu });
    }
  }
  if (helper === 'osx-cpu-temp' && !smc.sensors.some((s) => s.cat === 'fan')) {
    for (const f of parseFans(await run(helper, ['-f'])))
      smc.sensors.push({ cat: 'fan', name: f.name, value: f.rpm });
  }
  if (smc.sensors.length) blocks.push(smc);

  // tier 1: battery — every Mac laptop, no privileges
  if (battery) {
    const b = parseIoregBattery(battery);
    const bat = { name: 'Battery', icon: 'battery', sensors: [] };
    if (b.tempC != null) bat.sensors.push({ cat: 'temperature', name: 'Battery', value: b.tempC });
    if (b.chargePct != null) bat.sensors.push({ cat: 'level', name: 'Charge', value: b.chargePct });
    if (bat.sensors.length) blocks.push(bat);
  }

  return blocks;
}

module.exports = { sample, parseIoregBattery, parseTempLine, parseFans, parsePowermetrics };
