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

  // parsing + thresholds live in parse.js (window.OHMParse)
  const { flatten, stateOf, meterPct } = window.OHMParse;

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
        '<span class="n">' + block.sensors.length + ' sensors</span>';
      card.appendChild(sum);
      let lastGroup = null;
      block.sensors.forEach(s => {
        if (s.group !== lastGroup) {
          lastGroup = s.group;
          const g = document.createElement('div');
          g.className = 'ttm-sensor ttm-sensor--group';
          g.innerHTML = '<span class="nm">' + esc(s.group) + '</span><span></span><span></span>';
          card.appendChild(g);
        }
        const row = document.createElement('div');
        const st = stateOf(s);
        row.className = 'ttm-sensor' + (st ? ' ttm-sensor--' + st : '');
        if (st) row.title = st === 'hot' ? 'above critical threshold' : 'above warning threshold';
        const pct = meterPct(s);
        row.innerHTML =
          '<span class="nm" title="' + esc(s.name) + '">' + esc(s.name) + '</span>' +
          '<span class="meterbar" aria-hidden="true">' +
            (pct == null ? '' : '<i style="width:' + pct.toFixed(1) + '%"></i>') +
          '</span>' +
          '<span class="val">' + esc(s.value || '—') + '</span>';
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

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // ---- data flow ----------------------------------------------------------

  function apply(root) {
    lastTree = root;
    render(root);
    renderSummary(window.OHMParse.summarize(root));
    els.bridge.textContent = window.OHMBridge.json(root);
    els.copy.disabled = false;
  }

  function renderSummary(m) {
    $('#machine-card').hidden = false;
    $('#m-name').textContent = m.machine;
    const st = $('#m-state');
    st.textContent = m.active ? 'active' : 'idle';
    st.className = 'ttm-badge' + (m.active ? ' ttm-badge--success' : '');
    const hot = $('#m-hot');
    hot.textContent = m.hottest ? m.hottest.value : '—';
    hot.className = m.hottest && m.hottest.state ? m.hottest.state : '';
    hot.title = m.hottest ? m.hottest.hw + ' / ' + m.hottest.name : '';
    const load = $('#m-load');
    load.textContent = m.maxLoad ? m.maxLoad.value : '—';
    load.className = m.maxLoad && m.maxLoad.state ? m.maxLoad.state : '';
    load.title = m.maxLoad ? m.maxLoad.hw + ' / ' + m.maxLoad.name : '';
    $('#m-count').textContent = m.sensors + ' across ' + m.blocks + ' devices · ' + m.fans + ' fans';
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
          '. If the monitor is running: from an https page, browsers block ' +
          'plain-http machines (mixed content) — open the dashboard the ' +
          'machine itself serves at that address instead. Upstream builds ' +
          'also lack a CORS header for cross-origin reads. Or load demo data.',
          { type: 'error', timeout: 12000 });
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
    poll(url);
    timer = setInterval(() => poll(url), POLL_MS);
  }

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
    else if (e.key === 't') {
      const cur = document.documentElement.getAttribute('data-ttm-theme') || 'ttm';
      const next = cur === 'terminal' ? 'ttm' : 'terminal';
      window.TTMTheme.set(next);
      toast('Theme: ' + (next === 'terminal' ? 'terminal' : 'dark'), { timeout: 1500 });
    }
    else if (e.key === 'Escape' && timer) { stop(); setStatus('paused'); toast('Polling paused — d or Connect to resume.', { timeout: 2500 }); }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stop(); }
    else if (mode === 'demo') startDemo();
    else if (mode === 'live') startLive();
  });

  // ?demo=1 auto-loads demo data (handy for the deployed preview)
  if (new URLSearchParams(location.search).has('demo')) startDemo();
})();
