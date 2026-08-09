// Map bridge — turns a /data.json tree into a SpaceAPI-style fragment
// (api_compatibility 14) for publishing the machine as a space signal on
// Maps of Making: activity becomes state.open, temperatures and fans become
// sensors. Pure: depends only on window.OHMParse. Host the fragment at a
// URL you control and register it; the heartbeat does the rest.
(function () {
  'use strict';

  /** SpaceAPI-style fragment as a plain object. */
  function fragment(root) {
    const blocks = window.OHMParse.flatten(root);
    const machineNode = (root.Children || [])[0];
    const machine = machineNode ? machineNode.Text : 'machine';
    const temps = [], fans = [];
    blocks.forEach(b => b.sensors.forEach(s => {
      if (s.n == null) return;
      const loc = machine + ' / ' + b.name;
      if (s.cat === 'temperature') temps.push({ value: s.n, unit: '°C', location: loc, name: s.name });
      if (s.cat === 'fan') fans.push({ value: Math.round(s.n), unit: 'RPM', location: loc, name: s.name });
    }));
    const anyLoad = blocks.some(b => b.sensors.some(s => s.cat === 'load' && s.n != null && s.n > 5));
    return {
      api_compatibility: ['14'],
      space: machine,
      url: 'https://example.org',
      location: { lat: 0, lon: 0 },
      state: {
        open: anyLoad,
        message: anyLoad ? 'machine active — sensors report load' : 'machine idle',
        lastchange: Math.floor(Date.now() / 1000)
      },
      sensors: { temperature: temps, fan_speed: fans },
      contact: {},
      'x-source': 'open hardware monitor /data.json via thetechmargin dashboard'
    };
  }

  /** The fragment pretty-printed, ready for the receipt pane / clipboard. */
  function json(root) {
    return JSON.stringify(fragment(root), null, 2);
  }

  window.OHMBridge = { fragment, json };
})();
