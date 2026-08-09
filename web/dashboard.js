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
    els.tree.textContent = '';
    if (!blocks.length) {
      els.tree.innerHTML = '<p class="ttm-note">No sensors in the feed.</p>';
      return;
    }
    blocks.forEach(block => {
      const card = document.createElement('div');
      card.className = 'ttm-hw';
      const h = document.createElement('h3');
      h.textContent = block.name;
      card.appendChild(h);
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
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // ---- data flow ----------------------------------------------------------

  function apply(root) {
    lastTree = root;
    render(root);
    els.bridge.textContent = window.OHMBridge.json(root);
    els.copy.disabled = false;
  }

  function setStatus(txt, tone) {
    els.status.textContent = txt;
    els.status.style.color = tone === 'ok' ? 'var(--ttm-success)'
      : tone === 'bad' ? 'var(--ttm-danger)' : '';
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

  // keyboard: d demo · / focus url · t theme · esc pause — never while typing
  document.addEventListener('keydown', e => {
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
