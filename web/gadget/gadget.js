// Gadget view — the desktop gadget window (GUI/SensorGadget.cs) as a route:
// a kiosk-scale readout of the plotted sensors, hero-tile sized.
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var prefs = window.OHMGui.makePrefs(localStorage);

  function tile(label, value, state) {
    var t = document.createElement('div');
    t.className = 'ttm-tile ttm-tile--hero';
    var l = document.createElement('span');
    l.className = 'ttm-tile__label';
    l.textContent = label;
    var v = document.createElement('b');
    v.className = 'ttm-tile__value' + (state ? ' ' + state : '');
    v.textContent = value;
    t.appendChild(l); t.appendChild(v);
    return t;
  }

  window.OHMFeed.start(function (root) {
    var gui = prefs.get();
    var blocks = window.OHMParse.flatten(root);
    var byKey = new Map();
    blocks.forEach(function (b) {
      b.sensors.forEach(function (s) {
        byKey.set(b.name + '/' + s.group + '/' + s.name, s);
      });
    });
    var box = $('#tiles');
    box.textContent = '';
    var shown = 0;
    gui.plotted.forEach(function (k) {
      var s = byKey.get(k);
      if (!s) return;
      shown++;
      box.appendChild(tile(gui.renames[k] || s.name,
        window.OHMGui.toDisplay(s.value, gui.unit) || '—',
        window.OHMParse.stateOf(s)));
    });
    if (!shown) {
      var m = window.OHMParse.summarize(root);
      if (m.hottest) box.appendChild(tile(m.hottest.name,
        window.OHMGui.toDisplay(m.hottest.value, gui.unit), m.hottest.state));
      if (m.maxLoad) box.appendChild(tile(m.maxLoad.name, m.maxLoad.value, m.maxLoad.state));
    }
  }, function (txt, tone) {
    var st = $('#status');
    st.textContent = txt;
    st.className = 'ttm-badge' +
      (tone === 'ok' ? ' ttm-badge--live' : tone === 'bad' ? ' ttm-badge--danger' : '');
  });
})();
