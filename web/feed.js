// The app's feed — one source pipeline for every page (dashboard and the
// /plot/, /gadget/, /report/ routes).
//
// A source is resolved once and read the same way everywhere: resolve() →
// read() → onData. Demo is a *source*, not a branch — it travels the same
// read → status → render path a machine does, so there is exactly one place
// where data enters the app.
//
// The saved machine URL loads live by default; demo reads only when
// explicitly chosen (?demo=1, the Demo button, or the last mode picked);
// with nothing saved a page shows its connect posture rather than
// substituting mock data.
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

  function resolve() {
    if (new URLSearchParams(location.search).has('demo') ||
        stored('ohm_mode') === 'demo') return { mode: 'demo', url: null };
    var url = normalizeUrl(stored('ohm_src_url'));
    if (url) return { mode: 'live', url: url };
    return { mode: 'none', url: null };
  }

  // The single read. Both modes return a promise of the app's sensor tree,
  // so callers never branch on where the data came from.
  function read(src) {
    if (src.mode === 'demo') {
      if (typeof window.OHM_DEMO !== 'function')
        return Promise.reject(new Error('demo feed unavailable'));
      return Promise.resolve(window.OHM_DEMO());
    }
    if (src.mode !== 'live') return Promise.reject(new Error('no source'));
    return fetch(src.url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function wire(o) {
    var timer = null;
    var src = { mode: 'none', url: null };
    var fails = 0;
    var paused = false; // an explicit pause outlives tab switches
    var probed = false; // same-origin probe fires at most once per page

    // When the desktop app itself serves this page, its own /data.json is
    // one fetch away on the same origin — connect to it instead of showing
    // the connect posture. Anywhere else (the hosted deployment, file://)
    // the probe misses once, silently, and the posture stands.
    function probeSameOrigin() {
      if (probed || location.protocol === 'file:') return;
      probed = true;
      fetch('/data.json', { cache: 'no-store' }).then(function (r) {
        if (!r.ok) return;
        return r.json().then(function () { useLive(location.origin); });
      }).catch(function () {});
    }
    function note(txt, tone) { if (o.onStatus) o.onStatus(txt, tone); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    // one tick, one success path, one failure path — for demo and live alike
    function tick() {
      return read(src).then(function (root) {
        fails = 0;
        note(src.mode === 'demo' ? 'demo' : 'live', 'ok');
        o.onData(root);
      }, function (err) {
        fails++;
        note('unreachable', 'bad');
        if (o.onError) o.onError(err, src, fails);
      });
    }

    function run() {
      stop();
      paused = false;
      src = resolve();
      fails = 0;
      if (src.mode === 'none') { note('no machine', ''); probeSameOrigin(); return; }
      tick();
      timer = setInterval(tick, POLL_MS);
    }
    function pause() { paused = true; stop(); }
    // hold/release around edits: no re-resolve, no status churn
    function hold() { stop(); }
    function release() { if (!paused && !timer && src.mode !== 'none') timer = setInterval(tick, POLL_MS); }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else if (!paused) run();
    });

    function useDemo() { put('ohm_mode', 'demo'); run(); }
    function useLive(raw) {
      var url = normalizeUrl(raw);
      if (!url) return null;
      put('ohm_src_url', String(raw).trim());
      put('ohm_mode', 'live');
      note('connecting…');
      run();
      return url;
    }

    // the shared srcbar every page carries — any page connects the app
    if (o.urlInput) {
      var saved = stored('ohm_src_url');
      if (saved && !o.urlInput.value) o.urlInput.value = saved;
      if (o.connectBtn) o.connectBtn.addEventListener('click', function () {
        if (useLive(o.urlInput.value)) return;
        o.urlInput.focus();
        if (o.onNoUrl) o.onNoUrl();
      });
      if (o.demoBtn) o.demoBtn.addEventListener('click', function () {
        useDemo();
        if (o.onDemo) o.onDemo();
      });
    }

    run();
    return {
      stop: stop, run: run, tick: tick, pause: pause,
      hold: hold, release: release,
      running: function () { return timer !== null; },
      mode: function () { return src.mode; },
      source: function () { return src; },
      useDemo: function () { useDemo(); if (o.onDemo) o.onDemo(); },
      useLive: useLive,
    };
  }

  window.OHMFeed = {
    wire: wire, resolve: resolve, read: read,
    normalizeUrl: normalizeUrl, POLL_MS: POLL_MS,
  };
})();
