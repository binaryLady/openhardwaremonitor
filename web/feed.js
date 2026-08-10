// Shared feed for the app's satellite views (/plot/, /gadget/, /report/).
// Resolves the same source the dashboard uses — ?demo=1, the stored mode,
// the stored machine URL — polls at the dashboard's cadence, and pauses
// while the tab is hidden. Pure data flow: pages pass an onData callback.
(function () {
  'use strict';
  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var POLL_MS = REDUCED ? 20000 : 5000;

  function stored(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function normalizeUrl(raw) {
    var u = (raw || '').trim();
    if (!u) return null;
    if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
    if (!/data\.json(\?|$)/.test(u)) u = u.replace(/\/?$/, '/') + 'data.json';
    return u;
  }

  // demo wins when asked for (?demo=1) or last used; else the saved machine;
  // with nothing saved the satellites fall back to demo so they always show
  function resolve() {
    var demo = new URLSearchParams(location.search).has('demo') ||
      stored('ohm_mode') === 'demo';
    var url = normalizeUrl(stored('ohm_src_url'));
    if (demo || !url) return { mode: 'demo', url: null };
    return { mode: 'live', url: url };
  }

  function start(onData, onStatus) {
    var src = resolve();
    var timer = null;
    var note = function (txt, tone) { if (onStatus) onStatus(txt, tone); };
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function tick() {
      if (src.mode === 'demo') {
        note('demo', 'ok');
        onData(window.OHM_DEMO());
        return;
      }
      fetch(src.url, { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (root) { note('live', 'ok'); onData(root); })
        .catch(function () { note('unreachable', 'bad'); });
    }
    function run() { stop(); tick(); timer = setInterval(tick, POLL_MS); }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else run();
    });
    run();
    return { mode: src.mode, stop: stop, resume: run };
  }

  window.OHMFeed = { start: start, resolve: resolve, POLL_MS: POLL_MS };
})();
