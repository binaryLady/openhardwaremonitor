// Shared feed for the app's routes (/plot/, /gadget/, /report/).
// Every route is an entry point to the application: the saved machine URL
// is the app and loads live; demo renders only when explicitly chosen
// (?demo=1 or the dashboard's last mode). With nothing saved the route
// asks to connect — it never silently substitutes mock data.
// Pages wire the shared srcbar (input · Connect · Demo · status badge)
// and receive the raw tree via onData; polling pauses while hidden.
(function () {
  'use strict';
  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var POLL_MS = REDUCED ? 20000 : 5000;

  function stored(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function normalizeUrl(raw) {
    var u = (raw || '').trim();
    if (!u) return null;
    if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
    if (!/data\.json(\?|$)/.test(u)) u = u.replace(/\/?$/, '/') + 'data.json';
    return u;
  }

  // the app decides the source: explicit demo (?demo=1 or last mode) wins,
  // else the saved machine loads live, else there is no source yet
  function resolve() {
    if (new URLSearchParams(location.search).has('demo') ||
        stored('ohm_mode') === 'demo') return { mode: 'demo', url: null };
    var url = normalizeUrl(stored('ohm_src_url'));
    if (url) return { mode: 'live', url: url };
    return { mode: 'none', url: null };
  }

  function wire(o) {
    var timer = null;
    var src = { mode: 'none', url: null };
    function note(txt, tone) { if (o.onStatus) o.onStatus(txt, tone); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function tick() {
      if (src.mode === 'demo') {
        note('demo', 'ok');
        o.onData(window.OHM_DEMO());
        return;
      }
      fetch(src.url, { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (root) { note('live', 'ok'); o.onData(root); })
        .catch(function () { note('unreachable', 'bad'); });
    }
    function run() {
      stop();
      src = resolve();
      if (src.mode === 'none') { note('no machine', ''); return; }
      tick();
      timer = setInterval(tick, POLL_MS);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else run();
    });

    // the shared srcbar: any route connects the app directly
    if (o.urlInput) {
      var saved = stored('ohm_src_url');
      if (saved && !o.urlInput.value) o.urlInput.value = saved;
      if (o.connectBtn) o.connectBtn.addEventListener('click', function () {
        var raw = o.urlInput.value.trim();
        if (!raw) { o.urlInput.focus(); return; }
        put('ohm_src_url', raw);
        put('ohm_mode', 'live');
        note('connecting…');
        run();
      });
      if (o.demoBtn) o.demoBtn.addEventListener('click', function () {
        put('ohm_mode', 'demo');
        run();
      });
    }

    run();
    return { stop: stop, run: run, mode: function () { return src.mode; } };
  }

  window.OHMFeed = { wire: wire, resolve: resolve, POLL_MS: POLL_MS };
})();
