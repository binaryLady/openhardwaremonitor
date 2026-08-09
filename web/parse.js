// Pure sensor core for the Open Hardware Monitor dashboard — no DOM, no
// state. Everything here takes the embedded web server's /data.json tree
// (Utilities/HttpServer.cs GenerateJSON) and returns plain data, so it can
// be unit-tested in the bench (/test/) and reused by other consumers.
//
// The feed is a pre-order tree of {id, Text, Children[], Min, Value, Max,
// ImageURL} where every value is a preformatted display string ("52.0 °C",
// "1,234 RPM"). We parse the number back out for meters/thresholds but
// consumers should always show the server's own string.
(function () {
  'use strict';

  /** "52.0 °C" -> 52.0 ; "1,234 RPM" -> 1234 ; "" -> null */
  function num(s) {
    if (typeof s === 'number') return s;
    if (!s) return null;
    const m = String(s).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }

  /** Category comes from the node's icon (images_icon/temperature.png …). */
  function categoryOf(node) {
    const m = /images_icon\/([a-z_]+)\.png/.exec(node.ImageURL || '');
    return m ? m[1] : null;
  }

  /**
   * Flatten the tree into hardware blocks:
   * [{name, icon, sensors: [{name, cat, group, value, min, max, n, nMin, nMax}]}]
   * Sub-hardware (e.g. a SuperIO chip under the mainboard) becomes its own block.
   */
  function flatten(root) {
    const blocks = [];
    const machines = (root.Children || []);
    machines.forEach(machine => {
      (machine.Children || []).forEach(function walkHw(hw) {
        const block = { name: hw.Text, icon: categoryOf(hw), sensors: [] };
        (hw.Children || []).forEach(child => {
          if (categoryOf(child) && child.Children && child.Children.length &&
              child.Children.every(c => !c.Children || !c.Children.length)) {
            // a type group (Temperatures / Fans / …) full of leaf sensors
            const cat = categoryOf(child);
            child.Children.forEach(s => block.sensors.push({
              name: s.Text, cat, group: child.Text,
              value: s.Value, min: s.Min, max: s.Max,
              n: num(s.Value), nMin: num(s.Min), nMax: num(s.Max)
            }));
          } else if (child.Children && child.Children.length) {
            walkHw(child); // sub-hardware (e.g. SuperIO chip under mainboard)
          }
        });
        if (block.sensors.length) blocks.push(block);
      });
    });
    return blocks;
  }

  /** '' | 'warn' | 'hot' — conservative defaults per sensor category. */
  function stateOf(s) {
    if (s.n == null) return '';
    if (s.cat === 'temperature') {
      if (s.n >= 85) return 'hot';
      if (s.n >= 70) return 'warn';
    } else if (s.cat === 'load') {
      if (s.n >= 95) return 'hot';
      if (s.n >= 80) return 'warn';
    }
    return '';
  }

  /** 0..100 meter fill, or null when the sensor has no usable scale. */
  function meterPct(s) {
    if (s.n == null) return null;
    if (s.cat === 'load' || /%/.test(s.value)) return Math.max(0, Math.min(100, s.n));
    // scale within the session's observed min..max window
    if (s.nMin != null && s.nMax != null && s.nMax > s.nMin)
      return ((s.n - s.nMin) / (s.nMax - s.nMin)) * 100;
    return null;
  }

  /**
   * One-look machine summary for the dashboard's overview strip:
   * {machine, blocks, sensors, fans, active, hottest, maxLoad} — hottest and
   * maxLoad are {hw, name, value, n, state} or null when the feed has none.
   */
  function summarize(root) {
    const blocks = flatten(root);
    const machineNode = (root.Children || [])[0];
    let hottest = null, maxLoad = null, fans = 0, sensors = 0;
    blocks.forEach(b => b.sensors.forEach(s => {
      sensors++;
      if (s.cat === 'fan') fans++;
      if (s.n == null) return;
      if (s.cat === 'temperature' && (!hottest || s.n > hottest.n))
        hottest = { hw: b.name, name: s.name, value: s.value, n: s.n, state: stateOf(s) };
      if (s.cat === 'load' && (!maxLoad || s.n > maxLoad.n))
        maxLoad = { hw: b.name, name: s.name, value: s.value, n: s.n, state: stateOf(s) };
    }));
    return {
      machine: machineNode ? machineNode.Text : 'machine',
      blocks: blocks.length, sensors, fans,
      active: !!(maxLoad && maxLoad.n > 5),
      hottest, maxLoad
    };
  }

  window.OHMParse = { num, categoryOf, flatten, stateOf, meterPct, summarize };
})();
