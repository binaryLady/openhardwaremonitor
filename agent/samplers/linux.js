// Linux sensor sampler — /sys/class/hwmon, no privileges: each chip that
// exposes temp*_input (millidegrees) or fan*_input (RPM) becomes a
// hardware block. Same {name, icon, sensors:[{cat, name, value}]} shape
// as the darwin sampler; serve.js formats and shapes the tree.
'use strict';
const fs = require('fs');
const path = require('path');

const HWMON = '/sys/class/hwmon';

function readTrim(file) {
  try { return fs.readFileSync(file, 'utf8').trim(); } catch (e) { return null; }
}

function chipSensors(dir) {
  const sensors = [];
  let entries;
  try { entries = fs.readdirSync(dir); } catch (e) { return sensors; }
  for (const f of entries) {
    let m = /^temp(\d+)_input$/.exec(f);
    if (m) {
      const raw = Number(readTrim(path.join(dir, f)));
      if (Number.isFinite(raw) && raw !== 0) {
        const label = readTrim(path.join(dir, 'temp' + m[1] + '_label'));
        sensors.push({ cat: 'temperature', name: label || 'Temp #' + m[1], value: raw / 1000 });
      }
      continue;
    }
    m = /^fan(\d+)_input$/.exec(f);
    if (m) {
      const raw = Number(readTrim(path.join(dir, f)));
      if (Number.isFinite(raw) && raw > 0) {
        const label = readTrim(path.join(dir, 'fan' + m[1] + '_label'));
        sensors.push({ cat: 'fan', name: label || 'Fan #' + m[1], value: raw });
      }
    }
  }
  return sensors;
}

async function sample() {
  const blocks = [];
  let chips;
  try { chips = fs.readdirSync(HWMON); } catch (e) { return blocks; }
  for (const c of chips) {
    const dir = path.join(HWMON, c);
    const sensors = chipSensors(dir);
    if (sensors.length)
      blocks.push({ name: readTrim(path.join(dir, 'name')) || c, icon: 'mainboard', sensors });
  }
  return blocks;
}

module.exports = { sample, chipSensors };
