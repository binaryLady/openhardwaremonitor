// GUI core — the desktop application's GUI features (UnitManager,
// Save Report, hide/rename/plot selection, column visibility) as pure,
// DOM-free logic so the bench can prove them. dashboard.js consumes this;
// the C# application is untouched.
//
// Preferences persist in one localStorage key ('ohm_gui'); the store is
// injectable so tests run against a plain object.
(function () {
  'use strict';

  // ── units (GUI/UnitManager.cs: Celsius | Fahrenheit) ─────────────────────
  // Server strings stay the source of truth; Fahrenheit is a display
  // transform applied to temperature strings only ("52.0 °C" → "125.6 °F").
  function toDisplay(s, unit) {
    if (unit !== 'f' || typeof s !== 'string') return s;
    var m = /^(-?\d+(?:\.\d+)?) °C$/.exec(s);
    if (!m) return s;
    var f = parseFloat(m[1]) * 9 / 5 + 32;
    return f.toFixed(1) + ' °F';
  }

  // ── Save Report (GUI/ReportForm.cs) ──────────────────────────────────────
  // A plain-text report of the whole tree — pre-order walk, the server's own
  // strings, Min/Max where present. Timestamp is a parameter (determinism).
  function report(root, when) {
    var lines = [];
    lines.push('Open Hardware Monitor Report');
    lines.push('');
    lines.push('Time: ' + when);
    lines.push('');
    lines.push('Sensors');
    lines.push('');
    (function walk(node, depth) {
      if (!node) return;
      if (node.Text) {
        var pad = new Array(depth + 1).join('   ');
        var line = pad + '+- ' + node.Text;
        if (node.Value) {
          line += ' : ' + node.Value;
          if (node.Min || node.Max)
            line += ' (min ' + (node.Min || '—') + ' / max ' + (node.Max || '—') + ')';
        }
        lines.push(line);
      }
      (node.Children || []).forEach(function (c) { walk(c, depth + (node.Text ? 1 : 0)); });
    })(root, 0);
    lines.push('');
    return lines.join('\n');
  }

  // ── preferences (hide / rename / plot / columns / unit / views) ──────────
  var DEFAULTS = {
    unit: 'c',                       // 'c' | 'f'
    hidden: [],                      // sensor keys (hw/group/name)
    renames: {},                     // key → custom display name
    plotted: [],                     // sensor keys in the plot
    cols: { value: true, min: true, max: true },
    showHidden: false,
    plot: false,
    gadget: false,
  };

  function makePrefs(storage) {
    var KEY = 'ohm_gui';
    function read() {
      try {
        var raw = storage.getItem(KEY);
        var v = raw ? JSON.parse(raw) : {};
        var out = JSON.parse(JSON.stringify(DEFAULTS));
        Object.keys(DEFAULTS).forEach(function (k) {
          if (v[k] !== undefined) out[k] = v[k];
        });
        return out;
      } catch (e) { return JSON.parse(JSON.stringify(DEFAULTS)); }
    }
    function write(p) {
      try { storage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
      return p;
    }
    return {
      get: read,
      set: function (patch) {
        var p = read();
        Object.keys(patch || {}).forEach(function (k) { p[k] = patch[k]; });
        return write(p);
      },
      toggleIn: function (listKey, item) {
        var p = read();
        var i = p[listKey].indexOf(item);
        if (i === -1) p[listKey].push(item); else p[listKey].splice(i, 1);
        write(p);
        return i === -1; // true → now present
      },
    };
  }

  // ── column layout (View → Columns) ───────────────────────────────────────
  // name+spark+meter always render; value/min/max are the desktop's
  // toggleable columns. The class picks the matching grid template.
  function colsClass(cols) {
    var n = 3 + (cols.value ? 1 : 0) + (cols.min ? 1 : 0) + (cols.max ? 1 : 0);
    return 'gui-cols-' + n;
  }

  window.OHMGui = {
    toDisplay: toDisplay,
    report: report,
    makePrefs: makePrefs,
    colsClass: colsClass,
    DEFAULTS: DEFAULTS,
  };
})();
