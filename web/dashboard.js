// Open Hardware Monitor dashboard — consumes the embedded web server's
// /data.json (Utilities/HttpServer.cs GenerateJSON): a pre-order tree of
// {id, Text, Children[], Min, Value, Max, ImageURL} where every value is a
// preformatted display string ("52.0 °C", "1,234 RPM"). We parse the number
// back out for meters/thresholds but always show the server's own string.
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const els = {
    url: $('#src-url'), connect: $('#connect'), demo: $('#demo'),
    status: $('#status'), tree: $('#tree'), bridge: $('#bridge'),
    copy: $('#copy-bridge')
  };
  const toast = (msg, opts) => window.TTMToast && TTMToast.show(msg, opts || {});

  // under reduced motion, poll gently: values stop fluttering every 5s
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const POLL_MS = REDUCED ? 20000 : 5000;
  let timer = null;
  let mode = 'idle'; // idle | demo | live
  let lastTree = null;

  // parsing + thresholds live in parse.js (window.OHMParse);
  // the desktop GUI's features (units, report, hide/rename/plot, columns)
  // live in gui-core.js (window.OHMGui) as pure logic
  const { flatten, stateOf, meterPct } = window.OHMParse;
  const GUI = window.OHMGui;
  const prefs = GUI.makePrefs(localStorage);
  let gui = prefs.get();
  let manage = false; // manage mode is a session posture, not a preference
  const unit = s => GUI.toDisplay(s, gui.unit);

  // ---- history + sparklines ----------------------------------------------
  // Ring buffer of the last N numeric readings per sensor — polling already
  // delivers a time series, the UI just never kept it. Held in memory only.
  const HIST_N = 40;
  const hist = new Map();
  const lastVal = new Map(); // previous display string — a change gets a flash
  function remember(key, n) {
    if (n == null) return null;
    let h = hist.get(key);
    if (!h) { h = []; hist.set(key, h); }
    h.push(n);
    if (h.length > HIST_N) h.shift();
    return h;
  }
  // 2px line, no axes or grid: the de-emphasis stroke carries the shape, a
  // single end dot carries "now". Flat series draw as a midline.
  function sparkline(svg, h, state) {
    if (!svg) return;
    if (!h || h.length < 2) { svg.replaceChildren(); return; }
    const w = 120, ht = 32, pad = 3;
    let min = Math.min.apply(null, h), max = Math.max.apply(null, h);
    if (min === max) { min -= 1; max += 1; }
    const x = i => pad + (w - 2 * pad) * (i / (h.length - 1));
    const y = v => ht - pad - (ht - 2 * pad) * ((v - min) / (max - min));
    const d = h.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
    const ns = 'http://www.w3.org/2000/svg';
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', 'spark__line');
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('cx', x(h.length - 1).toFixed(1));
    dot.setAttribute('cy', y(h[h.length - 1]).toFixed(1));
    dot.setAttribute('r', '2.5');
    dot.setAttribute('class', 'spark__dot' + (state ? ' spark__dot--' + state : ''));
    svg.replaceChildren(path, dot);
  }

  // ---- rendering ----------------------------------------------------------

  function render(root) {
    const blocks = flatten(root);
    // remember which blocks the user collapsed — polling must not undo it
    const collapsed = {};
    els.tree.querySelectorAll('details.ttm-hw').forEach(d => {
      collapsed[d.dataset.hw] = !d.open;
    });
    // remember keyboard position — a poll re-render must not drop focus
    const focused = document.activeElement &&
      els.tree.contains(document.activeElement) &&
      document.activeElement.closest('details.ttm-hw');
    const focusedHw = focused ? focused.dataset.hw : null;
    els.tree.textContent = '';
    if (!blocks.length) {
      els.tree.innerHTML = '<p class="ttm-note">No sensors in the feed.</p>';
      return;
    }
    blocks.forEach(block => {
      const card = document.createElement('details');
      card.className = 'ttm-hw';
      card.dataset.hw = block.name;
      card.open = !collapsed[block.name];
      const worst = block.sensors.reduce((w, s) => {
        const st = stateOf(s);
        return st === 'hot' || w === 'hot' ? 'hot' : (st || w);
      }, '');
      const sum = document.createElement('summary');
      sum.innerHTML = '<span class="dot' + (worst ? ' ' + worst : '') +
        '" aria-hidden="true"></span>' +
        '<h3>' + esc(block.name) + '</h3>' +
        '<span class="n">' + block.sensors.length + ' sensors' +
        (block.icon ? ' · ' + esc(block.icon) : '') + '</span>';
      card.appendChild(sum);
      let lastGroup = null;
      block.sensors.forEach(s => {
        const key = block.name + '/' + s.group + '/' + s.name;
        const hidden = gui.hidden.indexOf(key) !== -1;
        if (hidden && !gui.showHidden) return; // View → Show Hidden Sensors
        if (s.group !== lastGroup) {
          lastGroup = s.group;
          if (s.group) {
            const g = document.createElement('div');
            g.className = 'ttm-sensor ttm-sensor--group';
            g.innerHTML = '<span class="nm">' + esc(s.group) + '</span><span></span><span></span>';
            card.appendChild(g);
          }
        }
        const row = document.createElement('div');
        const st = stateOf(s);
        row.className = 'ttm-sensor' + (st ? ' ttm-sensor--' + st : '') +
          (hidden ? ' is-hidden' : '');
        if (st) row.title = st === 'hot' ? 'above critical threshold' : 'above warning threshold';
        const pct = meterPct(s);
        const h = remember(key, s.n);
        const range = h && h.length > 1
          ? ' · last ' + h.length + ' readings ' + Math.min.apply(null, h) + '–' + Math.max.apply(null, h)
          : '';
        const shown = gui.renames[key] || s.name; // custom name, original in title
        const plotted = gui.plotted.indexOf(key) !== -1;
        // manage mode folds the desktop's context menu into the name cell —
        // inline SVG in currentColor (text glyphs render as emoji on mobile)
        const ctl = !manage ? '' :
          '<span class="ctl">' +
          '<button type="button" class="ttm-minibtn" data-act="plot" data-key="' + esc(key) + '"' +
            ' aria-pressed="' + plotted + '" title="Show in plot" aria-label="Show in plot">' + ICO.plot + '</button>' +
          '<button type="button" class="ttm-minibtn" data-act="hide" data-key="' + esc(key) + '"' +
            ' title="' + (hidden ? 'Unhide sensor' : 'Hide sensor') + '"' +
            ' aria-label="' + (hidden ? 'Unhide sensor' : 'Hide sensor') + '">' +
            (hidden ? ICO.eye : ICO.eyeOff) + '</button>' +
          '<button type="button" class="ttm-minibtn" data-act="rename" data-key="' + esc(key) + '"' +
            ' title="Rename sensor" aria-label="Rename sensor">' + ICO.pen + '</button></span>';
        row.innerHTML =
          '<span class="nm" title="' + esc(s.name + range) + '">' + esc(shown) + ctl + '</span>' +
          '<svg class="spark" viewBox="0 0 120 32" preserveAspectRatio="none" aria-hidden="true"></svg>' +
          '<span class="meterbar" aria-hidden="true">' +
            (pct == null ? '' : '<i style="width:' + pct.toFixed(1) + '%"></i>') +
          '</span>' +
          // the app's toggleable data columns (View → Columns), server strings
          (gui.cols.value ? '<span class="val' + (lastVal.get(key) !== s.value ? ' is-fresh' : '') + '">' +
            esc(unit(s.value) || '—') + '</span>' : '') +
          (gui.cols.min ? '<span class="mn" title="session minimum">' + esc(unit(s.min) || '—') + '</span>' : '') +
          (gui.cols.max ? '<span class="mx" title="session maximum">' + esc(unit(s.max) || '—') + '</span>' : '');
        lastVal.set(key, s.value);
        keyName.set(key, s.name);
        sparkline(row.querySelector('.spark'), h, st);
        card.appendChild(row);
      });
      els.tree.appendChild(card);
    });
    if (focusedHw != null) {
      const again = els.tree.querySelector('details.ttm-hw[data-hw="' + cssEsc(focusedHw) + '"] > summary');
      if (again) again.focus({ preventScroll: true });
    }
  }

  function cssEsc(s) {
    return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&');
  }

  // manage-mode icons — stroke/fill follow currentColor
  const ICO = {
    plot: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M2 12 6 8l3 2 5-6"/><circle cx="14" cy="4" r="1.4" fill="currentColor" stroke="none"/></svg>',
    eye: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M1.5 8s2.5-4 6.5-4 6.5 4 6.5 4-2.5 4-6.5 4S1.5 8 1.5 8Z"/><circle cx="8" cy="8" r="1.8"/></svg>',
    eyeOff: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M1.5 8s2.5-4 6.5-4 6.5 4 6.5 4-2.5 4-6.5 4S1.5 8 1.5 8Z"/><path d="M3 13 13 3"/></svg>',
    pen: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="m3 13 .8-3L11 2.8l2.2 2.2L6 12.2 3 13Z"/></svg>',
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // ---- data flow ----------------------------------------------------------

  let lastSummary = null;
  function apply(root) {
    lastTree = root;
    render(root);
    lastSummary = window.OHMParse.summarize(root);
    renderSummary(lastSummary);
    els.bridge.textContent = window.OHMBridge.json(root);
    els.copy.disabled = false;
    drawPlot();
    renderGadget();
  }

  function renderSummary(m) {
    $('#machine-card').hidden = false;
    $('#m-name').textContent = m.machine;
    const st = $('#m-state');
    st.textContent = m.active ? 'active' : 'idle';
    st.className = 'ttm-badge' + (m.active ? ' ttm-badge--success' : '');
    const hot = $('#m-hot');
    hot.textContent = m.hottest ? unit(m.hottest.value) : '—';
    hot.className = 'ttm-tile__value' + (m.hottest && m.hottest.state ? ' ' + m.hottest.state : '');
    hot.title = m.hottest ? m.hottest.hw + ' / ' + m.hottest.name : '';
    const load = $('#m-load');
    load.textContent = m.maxLoad ? m.maxLoad.value : '—';
    load.className = 'ttm-tile__value' + (m.maxLoad && m.maxLoad.state ? ' ' + m.maxLoad.state : '');
    load.title = m.maxLoad ? m.maxLoad.hw + ' / ' + m.maxLoad.name : '';
    $('#m-count').textContent = m.sensors;
    $('#m-count-sub').textContent = m.blocks + ' devices · ' + m.fans + ' fans';
    sparkline($('#trend-hot'), m.hottest ? remember('~hottest', m.hottest.n) : null,
      m.hottest && m.hottest.state);
    sparkline($('#trend-load'), m.maxLoad ? remember('~maxload', m.maxLoad.n) : null,
      m.maxLoad && m.maxLoad.state);
  }

  function setStatus(txt, tone) {
    els.status.textContent = txt;
    els.status.className = 'ttm-badge' +
      (tone === 'ok' ? ' ttm-badge--live' : tone === 'bad' ? ' ttm-badge--danger' : '');
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function startDemo() {
    stop();
    mode = 'demo';
    try { localStorage.setItem('ohm_mode', 'demo'); } catch (e) {} // satellites follow
    setStatus('demo', 'ok');
    apply(window.OHM_DEMO());
    timer = setInterval(() => apply(window.OHM_DEMO()), POLL_MS);
    toast('Demo data loaded — values animate like a live feed.', { type: 'success' });
  }

  function normalizeUrl(raw) {
    let u = (raw || '').trim();
    if (!u) return null;
    if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
    if (!/data\.json(\?|$)/.test(u)) u = u.replace(/\/?$/, '/') + 'data.json';
    return u;
  }

  let failStreak = 0;
  async function poll(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const root = await res.json();
      failStreak = 0;
      setStatus('live', 'ok');
      apply(root);
    } catch (err) {
      failStreak++;
      setStatus('unreachable', 'bad');
      if (failStreak === 1) {
        toast('Could not reach ' + url + ' — ' + err.message +
          '. If the monitor is running, this is likely CORS: the embedded ' +
          'server sends no Access-Control-Allow-Origin header, so browsers ' +
          'block cross-origin reads. Open this page from the same origin, ' +
          'use a local proxy, or load demo data.', { type: 'error', timeout: 12000 });
      }
    }
  }

  function startLive() {
    const url = normalizeUrl(els.url.value);
    if (!url) { toast('Enter the machine URL first, e.g. http://machine:8085', { type: 'warning' }); return; }
    stop();
    mode = 'live';
    failStreak = 0;
    setStatus('connecting…');
    try {
      localStorage.setItem('ohm_src_url', els.url.value.trim());
      localStorage.setItem('ohm_mode', 'live'); // satellites follow
    } catch (e) {}
    poll(url);
    timer = setInterval(() => poll(url), POLL_MS);
  }

  // ---- GUI: the desktop application's features, TTM-dressed ---------------
  const NS = 'http://www.w3.org/2000/svg';
  const gels = {
    plot: $('#gui-plot'), gadget: $('#gui-gadget'), manage: $('#gui-manage'),
    reset: $('#gui-reset'), report: $('#gui-report'), unit: $('#gui-unit'),
    hidden: $('#gui-hidden'), colV: $('#gui-col-value'),
    colMin: $('#gui-col-min'), colMax: $('#gui-col-max'),
    plotCard: $('#plot-card'), plotSvg: $('#plot'), legend: $('#plot-legend'),
    gadgetBox: $('#gadget'), gadgetBody: $('#gadget-body'), gadgetClose: $('#gadget-close'),
  };

  function syncGui() {
    document.body.classList.remove('gui-cols-3', 'gui-cols-4', 'gui-cols-5', 'gui-cols-6');
    document.body.classList.add(GUI.colsClass(gui.cols));
    document.body.classList.toggle('gui-manage', manage);
    gels.plot.setAttribute('aria-pressed', String(gui.plot));
    gels.plot.textContent = gui.plot ? 'Hide plot' : 'Show plot';
    gels.gadget.setAttribute('aria-pressed', String(gui.gadget));
    gels.gadget.textContent = gui.gadget ? 'Hide gadget' : 'Show gadget';
    gels.manage.setAttribute('aria-pressed', String(manage));
    gels.manage.textContent = manage ? 'Done managing' : 'Manage sensors';
    gels.unit.checked = gui.unit === 'f';
    gels.hidden.checked = !!gui.showHidden;
    gels.colV.checked = !!gui.cols.value;
    gels.colMin.checked = !!gui.cols.min;
    gels.colMax.checked = !!gui.cols.max;
    gels.plotCard.hidden = !gui.plot;
    gels.gadgetBox.hidden = !gui.gadget;
  }

  function refresh() { if (lastTree) apply(lastTree); }

  // resume polling without the demo toast (rename pauses, then resumes)
  function resume() {
    if (timer || mode === 'idle') return;
    if (mode === 'demo') timer = setInterval(() => apply(window.OHM_DEMO()), POLL_MS);
    else if (mode === 'live') {
      const url = normalizeUrl(els.url.value);
      if (url) timer = setInterval(() => poll(url), POLL_MS);
    }
  }

  const keyName = new Map(); // key → server name (names may contain '/')
  function sensorLabel(key) {
    return gui.renames[key] || keyName.get(key) || key.split('/').pop();
  }

  // Plot (GUI/PlotPanel.cs): every plotted sensor's ring buffer as a line;
  // series normalize to their own range, the legend carries real values.
  function drawPlot() {
    if (!gels.plotSvg || !gui.plot) return;
    const keys = gui.plotted.filter(k => hist.has(k) && hist.get(k).length > 1);
    gels.plotSvg.replaceChildren();
    gels.legend.textContent = '';
    if (!keys.length) {
      const note = document.createElement('span');
      note.className = 'ttm-note';
      note.textContent = gui.plotted.length
        ? 'Waiting for readings…'
        : 'No sensors plotted yet — use Manage sensors, then the chart button on a row.';
      gels.legend.appendChild(note);
      return;
    }
    const W = 600, H = 200, pad = 6;
    keys.slice(0, 8).forEach((k, i) => {
      const h = hist.get(k);
      let min = Math.min.apply(null, h), max = Math.max.apply(null, h);
      if (min === max) { min -= 1; max += 1; }
      const x = j => pad + (W - 2 * pad) * (j / (h.length - 1));
      const y = v => H - pad - (H - 2 * pad) * ((v - min) / (max - min));
      const d = h.map((v, j) => (j ? 'L' : 'M') + x(j).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', 'plot-line plot-s' + (i % 5));
      gels.plotSvg.appendChild(p);
      const chip = document.createElement('span');
      chip.className = 'ttm-plotchip plot-s' + (i % 5);
      const dot = document.createElement('i');
      const label = document.createElement('span');
      label.textContent = sensorLabel(k) + ' · ' + (unit(lastVal.get(k)) || '—');
      chip.appendChild(dot); chip.appendChild(label);
      gels.legend.appendChild(chip);
    });
  }

  // Gadget (GUI/SensorGadget.cs): a compact always-visible readout of the
  // plotted sensors — falls back to the view's hero figures.
  function renderGadget() {
    if (!gels.gadgetBody || !gui.gadget) return;
    gels.gadgetBody.textContent = '';
    const rows = [];
    gui.plotted.forEach(k => {
      const v = unit(lastVal.get(k));
      if (v) rows.push([sensorLabel(k), v]);
    });
    if (!rows.length && lastSummary) {
      if (lastSummary.hottest) rows.push([lastSummary.hottest.name, unit(lastSummary.hottest.value)]);
      if (lastSummary.maxLoad) rows.push([lastSummary.maxLoad.name, lastSummary.maxLoad.value]);
    }
    if (!rows.length) {
      const note = document.createElement('p');
      note.className = 'ttm-note';
      note.textContent = 'Connect or load demo data.';
      gels.gadgetBody.appendChild(note);
      return;
    }
    rows.slice(0, 8).forEach(r => {
      const kv = document.createElement('div');
      kv.className = 'ttm-kv';
      const k = document.createElement('span'); k.className = 'k'; k.textContent = r[0];
      const v = document.createElement('span'); v.className = 'v'; v.textContent = r[1];
      kv.appendChild(k); kv.appendChild(v);
      gels.gadgetBody.appendChild(kv);
    });
  }

  function setUnit(u) {
    gui = prefs.set({ unit: u });
    syncGui(); refresh();
    toast(u === 'f' ? 'Temperatures in Fahrenheit.' : 'Temperatures in Celsius.', { timeout: 2000 });
  }
  function togglePlotCard() {
    gui = prefs.set({ plot: !gui.plot });
    syncGui(); drawPlot();
  }

  gels.plot.addEventListener('click', togglePlotCard);
  gels.gadget.addEventListener('click', () => {
    gui = prefs.set({ gadget: !gui.gadget });
    syncGui(); renderGadget();
  });
  gels.gadgetClose.addEventListener('click', () => {
    gui = prefs.set({ gadget: false });
    syncGui();
  });
  gels.manage.addEventListener('click', () => {
    manage = !manage;
    syncGui(); refresh();
    if (manage) toast('Manage mode — plot, hide, or rename any sensor row.', { timeout: 3500 });
  });
  gels.reset.addEventListener('click', () => {
    hist.clear();
    refresh();
    toast('Reading history reset. Live min/max columns come from the server and reset with it.',
      { timeout: 4000 });
  });
  gels.report.addEventListener('click', () => {
    if (!lastTree) { toast('Connect or load demo data first.', { type: 'warning' }); return; }
    const text = GUI.report(lastTree, new Date().toISOString());
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = 'open-hardware-monitor-report.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Report saved.', { type: 'success' });
  });
  gels.unit.addEventListener('change', () => setUnit(gels.unit.checked ? 'f' : 'c'));
  gels.hidden.addEventListener('change', () => {
    gui = prefs.set({ showHidden: gels.hidden.checked });
    refresh();
  });
  [['colV', 'value'], ['colMin', 'min'], ['colMax', 'max']].forEach(pair => {
    gels[pair[0]].addEventListener('change', () => {
      const cols = { value: gels.colV.checked, min: gels.colMin.checked, max: gels.colMax.checked };
      gui = prefs.set({ cols: cols });
      syncGui(); refresh();
    });
  });

  // manage-mode row actions (event delegation survives poll re-renders)
  els.tree.addEventListener('click', e => {
    const btn = e.target.closest('.ttm-minibtn');
    if (!btn) return;
    const key = btn.dataset.key;
    if (btn.dataset.act === 'plot') {
      const added = prefs.toggleIn('plotted', key);
      gui = prefs.get();
      if (added && !gui.plot) gui = prefs.set({ plot: true });
      syncGui(); refresh();
      toast(added ? 'Plotting ' + sensorLabel(key) + '.' : 'Removed from plot.', { timeout: 2000 });
    } else if (btn.dataset.act === 'hide') {
      prefs.toggleIn('hidden', key);
      gui = prefs.get();
      refresh();
    } else if (btn.dataset.act === 'rename') {
      const row = btn.closest('.ttm-sensor');
      const nm = row && row.querySelector('.nm');
      if (!nm) return;
      stop(); // hold the poll re-render while the name is being edited
      const input = document.createElement('input');
      input.className = 'ttm-input ttm-rename';
      input.value = sensorLabel(key);
      input.setAttribute('aria-label', 'Sensor name');
      nm.replaceChildren(input);
      input.focus(); input.select();
      let closed = false;
      const done = save => {
        if (closed) return; // Enter triggers blur — settle once
        closed = true;
        if (save) {
          const v = input.value.trim();
          const renames = Object.assign({}, gui.renames);
          if (v && v !== key.split('/').pop()) renames[key] = v;
          else delete renames[key];
          gui = prefs.set({ renames: renames });
        }
        // defer past the settling keystroke: re-rendering inside the Enter
        // keydown moves focus onto a summary, which the same key then toggles
        setTimeout(() => { resume(); refresh(); }, 0);
      };
      input.addEventListener('keydown', ev => {
        ev.stopPropagation();
        if (ev.key === 'Enter') done(true);
        else if (ev.key === 'Escape') done(false);
      });
      input.addEventListener('blur', () => done(true));
    }
  });

  // ---- wiring -------------------------------------------------------------

  els.connect.addEventListener('click', startLive);
  els.url.addEventListener('keydown', e => { if (e.key === 'Enter') startLive(); });
  els.demo.addEventListener('click', startDemo);

  els.copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(els.bridge.textContent);
      toast('SpaceAPI fragment copied.', { type: 'success' });
    } catch (_) {
      toast('Copy failed — select the JSON and copy manually.', { type: 'warning' });
    }
  });

  // Arrow keys walk the device cards: ↑/↓ (or j/k) between summaries,
  // Home/End to the edges, ←/→ collapse/expand. Enter/Space toggling is
  // native to summary; Tab order is untouched.
  els.tree.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const summaries = Array.from(els.tree.querySelectorAll('details.ttm-hw > summary'));
    if (!summaries.length) return;
    const cur = summaries.indexOf(document.activeElement);
    let next = null;
    if (e.key === 'ArrowDown' || e.key === 'j') next = cur < 0 ? 0 : Math.min(cur + 1, summaries.length - 1);
    else if (e.key === 'ArrowUp' || e.key === 'k') next = cur < 0 ? 0 : Math.max(cur - 1, 0);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = summaries.length - 1;
    else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && cur >= 0) {
      e.preventDefault();
      summaries[cur].parentElement.open = e.key === 'ArrowRight';
      return;
    }
    if (next == null) return;
    e.preventDefault();
    summaries[next].focus();
  });

  // keyboard: d demo · / focus url · t theme · esc pause — never while typing,
  // never on a key the site chord handler (ttm/theme.js) already consumed
  document.addEventListener('keydown', e => {
    if (e.defaultPrevented) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(input|textarea|select)$/i.test(e.target.tagName)) return;
    if (e.key === 'd') { startDemo(); }
    else if (e.key === '/') { e.preventDefault(); els.url.focus(); }
    else if (e.key === 'u') { setUnit(gui.unit === 'f' ? 'c' : 'f'); }
    else if (e.key === 'p') { togglePlotCard(); }
    else if (e.key === 'Escape' && timer) { stop(); setStatus('paused'); toast('Polling paused — d or Connect to resume.', { timeout: 2500 }); }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stop(); }
    else if (mode === 'demo') startDemo();
    else if (mode === 'live') startLive();
  });

  // the machine URL survives reloads — monitors are revisited, not retyped
  try {
    const saved = localStorage.getItem('ohm_src_url');
    if (saved && !els.url.value) els.url.value = saved;
  } catch (e) {}

  syncGui(); // paint the persisted GUI state before any data arrives

  // ?demo=1 auto-loads demo data (handy for the deployed preview)
  if (new URLSearchParams(location.search).has('demo')) startDemo();
})();
