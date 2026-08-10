// Plot view — the desktop plot window (GUI/PlotPanel.cs) as a route.
// Feed via OHMFeed (same source as the dashboard); the plotted set is the
// shared preference gui-core.js persists, so dashboard and plot agree.
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var NS = 'http://www.w3.org/2000/svg';
  var flatten = window.OHMParse.flatten;
  var prefs = window.OHMGui.makePrefs(localStorage);
  var gui = prefs.get();

  var HIST_N = 40;
  var hist = new Map();
  var lastVal = new Map();
  var names = new Map(); // key → server name (names may contain '/')
  function remember(key, n) {
    if (n == null) return;
    var h = hist.get(key);
    if (!h) { h = []; hist.set(key, h); }
    h.push(n);
    if (h.length > HIST_N) h.shift();
  }

  function label(key) {
    return gui.renames[key] || names.get(key) || key.split('/').pop();
  }

  function draw() {
    var svg = $('#plot'), legend = $('#plot-legend');
    var keys = gui.plotted.filter(function (k) {
      return hist.has(k) && hist.get(k).length > 1;
    });
    svg.replaceChildren();
    legend.textContent = '';
    if (!keys.length) {
      var note = document.createElement('span');
      note.className = 'ttm-note';
      note.textContent = gui.plotted.length
        ? 'Waiting for readings…' : 'Pick sensors below to plot them.';
      legend.appendChild(note);
      return;
    }
    var W = 600, H = 200, pad = 6;
    keys.slice(0, 8).forEach(function (k, i) {
      var h = hist.get(k);
      var min = Math.min.apply(null, h), max = Math.max.apply(null, h);
      if (min === max) { min -= 1; max += 1; }
      var x = function (j) { return pad + (W - 2 * pad) * (j / (h.length - 1)); };
      var y = function (v) { return H - pad - (H - 2 * pad) * ((v - min) / (max - min)); };
      var d = h.map(function (v, j) {
        return (j ? 'L' : 'M') + x(j).toFixed(1) + ' ' + y(v).toFixed(1);
      }).join(' ');
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', 'plot-line plot-s' + (i % 5));
      svg.appendChild(p);
      var chip = document.createElement('span');
      chip.className = 'ttm-plotchip plot-s' + (i % 5);
      var dot = document.createElement('i');
      var txt = document.createElement('span');
      txt.textContent = label(k) + ' · ' +
        (window.OHMGui.toDisplay(lastVal.get(k), gui.unit) || '—');
      chip.appendChild(dot); chip.appendChild(txt);
      legend.appendChild(chip);
    });
  }

  // sensor picker: every hardware block, every sensor, a pressed-state
  // plot toggle per row — the desktop tree's plot checkboxes
  var ICO_PLOT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M2 12 6 8l3 2 5-6"/><circle cx="14" cy="4" r="1.4" fill="currentColor" stroke="none"/></svg>';
  function renderPicker(blocks) {
    var box = $('#picker');
    box.textContent = '';
    blocks.forEach(function (block) {
      var card = document.createElement('section');
      card.className = 'ttm-card';
      var h = document.createElement('h3');
      h.className = 'ttm-card__title';
      h.textContent = block.name;
      card.appendChild(h);
      block.sensors.forEach(function (s) {
        var key = block.name + '/' + s.group + '/' + s.name;
        var row = document.createElement('div');
        row.className = 'ttm-kv';
        var k = document.createElement('span');
        k.className = 'k';
        k.textContent = label(key);
        var v = document.createElement('span');
        v.className = 'v';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ttm-minibtn';
        btn.setAttribute('aria-pressed', String(gui.plotted.indexOf(key) !== -1));
        btn.setAttribute('aria-label', 'Plot ' + s.name);
        btn.title = 'Show in plot';
        btn.innerHTML = ICO_PLOT;
        btn.addEventListener('click', function () {
          prefs.toggleIn('plotted', key);
          gui = prefs.get();
          btn.setAttribute('aria-pressed', String(gui.plotted.indexOf(key) !== -1));
          draw();
        });
        v.appendChild(document.createTextNode(
          (window.OHMGui.toDisplay(s.value, gui.unit) || '—') + ' '));
        v.appendChild(btn);
        row.appendChild(k); row.appendChild(v);
        card.appendChild(row);
      });
      box.appendChild(card);
    });
  }

  var pickerDrawn = false;
  window.OHMFeed.wire({
    urlInput: $('#src-url'),
    connectBtn: $('#connect'),
    demoBtn: $('#demo'),
    onData: function (root) {
      gui = prefs.get();
      var blocks = flatten(root);
      blocks.forEach(function (b) {
        b.sensors.forEach(function (s) {
          var key = b.name + '/' + s.group + '/' + s.name;
          remember(key, s.n);
          lastVal.set(key, s.value);
          names.set(key, s.name);
        });
      });
      // the picker re-renders per poll for live values; focus on a toggle
      // survives because rows rebuild only when the shape changes
      if (!pickerDrawn || !document.activeElement ||
          !$('#picker').contains(document.activeElement)) {
        renderPicker(blocks);
        pickerDrawn = true;
      }
      draw();
    },
    onStatus: function (txt, tone) {
      var st = $('#status');
      st.textContent = txt;
      st.className = 'ttm-badge' +
        (tone === 'ok' ? ' ttm-badge--live' : tone === 'bad' ? ' ttm-badge--danger' : '');
      if (txt === 'no machine') $('#picker').innerHTML =
        '<p class="ttm-note">Not connected — enter your machine’s data.json URL above, or load demo data.</p>';
    },
  });
})();
