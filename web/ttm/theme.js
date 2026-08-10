// TTM theme + navigation controller.
// Injects the universal site header (brand · primary nav · mode toggle ·
// hamburger) on every page that loads this script; the hamburger collapses
// the full sitemap in hierarchy order, then theme choice.
// A11y per the TTM spec + ARIA disclosure/menu practices: aria-expanded /
// aria-controls, focus moves in on open, Tab is trapped, Escape and backdrop
// close and return focus, aria-current marks the page you are on, 44px
// targets, reduced-motion honored in CSS.
// Theme precedence: visitor choice → admin default → config default.
(function () {
  'use strict';
  var THEMES = ['ttm', 'terminal', 'zine', 'ocean', 'forest', 'synthwave',
    'ember', 'mono', 'blueprint', 'bubblegum'];
  var THEME_LABELS = { 'ttm': 'Warm', 'terminal': 'Terminal', 'zine': 'Zine',
    'ocean': 'Ocean', 'forest': 'Forest', 'synthwave': 'Synthwave',
    'ember': 'Ember', 'mono': 'Mono', 'blueprint': 'Blueprint',
    'bubblegum': 'Bubblegum' };
  // Every theme supports both polarities; Auto follows the OS. theme.js
  // resolves the choice into a concrete data-ttm-mode attribute before
  // paint, so tokens.css defines each variant exactly once.
  var MODES = ['light', 'dark'];
  var mediaDark = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  var ALLOWED_TOKEN = /^--(ttm|z|radius)-[a-z-]+$/;
  // Information hierarchy: the product first, publishing second, operator
  // tools last, each with a role line so the list reads as a sitemap.
  var ROUTES = [
    { href: '/',         name: 'Dashboard',       desc: 'live hardware sensors' },
    { href: '/?demo=1',  name: 'Demo feed',       desc: 'animated mock sensor data' },
    { group: 'App views' },
    { href: '/plot/',    name: 'Plot',            desc: 'time series of chosen sensors' },
    { href: '/gadget/',  name: 'Gadget',          desc: 'compact readout — kiosk friendly' },
    { href: '/report/',  name: 'Report',          desc: 'the whole tree as plain text' },
    { group: 'Operator tools' },
    { href: '/admin/',      name: 'Mission Control', desc: 'telemetry · visitors (admin)' },
    { href: '/test/',       name: 'Test bench',      desc: 'the stack proves itself in-browser' },
    { group: 'Network' },
    { href: 'https://maps.thetechmargin.com/', name: 'Maps of Making',
      desc: 'where the map bridge publishes to' },
  ];

  function stored(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function currentTheme() {
    var v = stored('ttm_theme');
    // legacy: Zine used to be the empty value (attribute-less), which
    // rendered identically to Dark — old choices map to the real zine theme
    if (v === '') v = 'zine';
    if (v !== null && THEMES.indexOf(v) !== -1) return v;
    v = stored('ttm_theme_default');
    if (v !== null && THEMES.indexOf(v) !== -1) return v;
    var c = (window.TTM_CONFIG && window.TTM_CONFIG.defaultTheme) || '';
    return THEMES.indexOf(c) !== -1 ? c : 'ttm';
  }
  function getCustom() {
    try { return JSON.parse(stored('ttm_custom_tokens')) || {}; } catch (e) { return {}; }
  }
  function applyCustom(tokens) {
    var root = document.documentElement;
    Array.prototype.slice.call(root.style).forEach(function (p) {
      if (ALLOWED_TOKEN.test(p)) root.style.removeProperty(p);
    });
    Object.keys(tokens || {}).forEach(function (k) {
      if (ALLOWED_TOKEN.test(k)) root.style.setProperty(k, String(tokens[k]).slice(0, 64));
    });
  }
  function setCustom(tokens) {
    try { localStorage.setItem('ttm_custom_tokens', JSON.stringify(tokens || {})); } catch (e) {}
    applyCustom(tokens || {});
  }
  function resetCustom() { setCustom({}); }
  function currentMode() {
    var v = stored('ttm_mode');
    if (MODES.indexOf(v) !== -1) return v;
    return mediaDark && mediaDark.matches ? 'dark' : 'light'; // OS until toggled
  }
  function resolveMode() { return currentMode(); }
  function apply(theme) {
    if (theme) document.documentElement.setAttribute('data-ttm-theme', theme);
    else document.documentElement.removeAttribute('data-ttm-theme');
    document.documentElement.setAttribute('data-ttm-mode', resolveMode());
    document.querySelectorAll('.ttm-menu__theme input[name="ttm-theme-pick"]').forEach(function (r) {
      r.checked = r.value === theme;
    });
    var mode = resolveMode();
    // inline SVG in currentColor — text glyphs render as emoji on mobile
    var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="4.2"/>' +
      '<path d="M12 2.6v2.4M12 19v2.4M2.6 12H5M19 12h2.4M5.4 5.4 7 7M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6"/></svg>';
    var MOON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M20.4 14.2A8.5 8.5 0 0 1 9.8 3.6a8.5 8.5 0 1 0 10.6 10.6Z"/></svg>';
    document.querySelectorAll('.ttm-modetoggle').forEach(function (b) {
      b.innerHTML = mode === 'dark' ? SUN : MOON;
      b.setAttribute('aria-label', mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
  }
  function setMode(mode) {
    if (MODES.indexOf(mode) === -1) return false;
    try { localStorage.setItem('ttm_mode', mode); } catch (e) {}
    apply(currentTheme());
    return true;
  }

  // Brand faces, loaded as universal chrome — the token stacks name
  // Poppins/Pacifico/Special Elite/JetBrains Mono, but no page ever loaded
  // them, so every surface silently fell back to system fonts.
  (function loadFonts() {
    if (document.querySelector('link[data-ttm-fonts]')) return;
    [['preconnect', 'https://fonts.googleapis.com', false],
     ['preconnect', 'https://fonts.gstatic.com', true]].forEach(function (p) {
      var l = document.createElement('link');
      l.rel = p[0]; l.href = p[1];
      if (p[2]) l.crossOrigin = 'anonymous';
      document.head.appendChild(l);
    });
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.setAttribute('data-ttm-fonts', '');
    css.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700' +
      '&family=Pacifico&family=Special+Elite' +
      '&family=JetBrains+Mono:wght@400;600;700&display=swap';
    document.head.appendChild(css);
  })();

  apply(currentTheme());
  applyCustom(getCustom());
  // Auto mode tracks the OS live
  if (mediaDark && mediaDark.addEventListener) {
    mediaDark.addEventListener('change', function () {
      if (MODES.indexOf(stored('ttm_mode')) === -1) apply(currentTheme());
    });
  }

  // current-page key includes the demo flag, so Dashboard (/) and
  // Demo feed (/?demo=1) mark aria-current distinctly
  function hereKey() {
    return location.pathname.replace(/index\.html$/, '') +
      (new URLSearchParams(location.search).has('demo') ? '?demo=1' : '');
  }

  // Universal site header: pure chrome — just the tools cluster the mode
  // toggle + burger mount into. It carries no text: every page's own hero
  // header (h1 + crumb) is the identity, and all navigation is
  // consolidated in the hamburger menu. Sits after the skip link so that
  // stays the first tab stop on every page.
  function buildSitebar() {
    if (document.querySelector('.ttm-sitebar')) return;
    var bar = document.createElement('header');
    bar.className = 'ttm-sitebar';
    bar.innerHTML = '<div class="ttm-sitebar__inner">' +
      '<span class="ttm-sitebar__tools"></span></div>';
    var skip = document.querySelector('.ttm-skip');
    document.body.insertBefore(bar, skip ? skip.nextSibling : document.body.firstChild);
  }
  function chromeTools() {
    return document.querySelector('.ttm-sitebar__tools') || document.body;
  }

  function buildMenu() {
    var here = hereKey();
    var burger = document.createElement('button');
    burger.className = 'ttm-burger';
    burger.type = 'button';
    burger.setAttribute('aria-label', 'Site menu');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-controls', 'ttm-menu');
    burger.setAttribute('aria-haspopup', 'true');
    burger.setAttribute('aria-keyshortcuts', 'Shift+Slash');
    burger.innerHTML = '<span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>';

    var backdrop = document.createElement('div');
    backdrop.className = 'ttm-menu__backdrop';

    var panel = document.createElement('div');
    panel.className = 'ttm-menu';
    panel.id = 'ttm-menu';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Site menu');
    panel.setAttribute('aria-hidden', 'true');

    // Meet Bernard — the keeper greets you at the door, by the name you gave
    // at the gate. Voice per the character bible: em-dash, typewriter, amber,
    // they/them, short sentences. Name is injected as text, never HTML.
    var visitorName = '';
    try { visitorName = (JSON.parse(localStorage.getItem('ttm_visitor')) || {}).name || ''; } catch (e) {}
    var greeting = (visitorName ? '\u2014 ' + visitorName + '. ' : '\u2014 ') +
      "Bernard (they/them), keeper of 'Mother Sands'. Your machine's hum carries to the map.";
    var html = '<div class="ttm-menu__head"><span class="ttm-menu__title">Menu</span>' +
      '<button type="button" class="ttm-menu__close" aria-label="Close menu">×</button></div>';
    html += '<a class="ttm-menu__bernard" href="https://maps.thetechmargin.com/genjson/"><span class="voice"></span></a>';
    // This page's actions: buttons proxy the dashboard's own controls.
    var ACTIONS = [
      { id: 'connect',     name: 'Connect',     desc: 'poll a machine’s data.json' },
      { id: 'demo',        name: 'Demo data',   desc: 'load the animated mock feed' },
      { id: 'copy-bridge', name: 'Copy bridge', desc: 'SpaceAPI fragment to clipboard' },
    ].filter(function (a) { return document.getElementById(a.id); });
    if (ACTIONS.length) {
      html += '<nav aria-label="Dashboard actions"><ul class="ttm-menu__list">';
      ACTIONS.forEach(function (a) {
        html += '<li><button type="button" class="ttm-menu__item ttm-menu__action" data-proxy="' + a.id + '">' +
          '<span class="ttm-menu__name">' + a.name + '</span>' +
          '<span class="ttm-menu__desc">' + a.desc + '</span></button></li>';
      });
      html += '</ul></nav>';
    }
    html += '<nav aria-label="Site sections"><ul class="ttm-menu__list">';
    ROUTES.forEach(function (r) {
      if (r.group) { html += '<li class="ttm-menu__group" role="presentation">' + r.group + '</li>'; return; }
      var current = here === r.href;
      html += '<li><a class="ttm-menu__item" href="' + r.href + '"' +
        (current ? ' aria-current="page"' : '') + '>' +
        '<span class="ttm-menu__name">' + r.name + '</span>' +
        '<span class="ttm-menu__desc">' + r.desc + '</span></a></li>';
    });
    html += '</ul></nav>';
    // Contact & social — whitelabel-published (ohm_site_config key "contact"),
    // hidden until the operator fills it in. Values render as text and
    // validated URLs only; stored junk can never become markup or script.
    html += '<nav aria-label="Contact" class="ttm-menu__contactnav" hidden>' +
      '<ul class="ttm-menu__list ttm-menu__contact"></ul></nav>';
    html += '<fieldset class="ttm-menu__theme"><legend>Theme</legend>';
    THEMES.forEach(function (t) {
      var id = 'ttm-theme-' + t;
      html += '<label for="' + id + '"><input type="radio" id="' + id + '" name="ttm-theme-pick" value="' + t + '"' +
        (currentTheme() === t ? ' checked' : '') + '><span>' + THEME_LABELS[t] + '</span></label>';
    });
    html += '</fieldset>';
    html += '<div class="ttm-menu__keys" aria-label="Keyboard shortcuts">' +
      '<kbd>?</kbd> open this menu &nbsp; <kbd>Esc</kbd> close &nbsp; ' +
      '<kbd>t</kbd> next theme &nbsp; <kbd>m</kbd> light/dark<br>' +
      '<kbd>g</kbd> then <kbd>d</kbd> dashboard · <kbd>p</kbd> plot · <kbd>g</kbd> gadget · ' +
      '<kbd>r</kbd> report<br>' +
      '<kbd>g</kbd> then <kbd>t</kbd> test bench · <kbd>a</kbd> mission control · ' +
      '<kbd>m</kbd> maps of making<br>' +
      'dashboard: <kbd>d</kbd> demo · <kbd>/</kbd> connect · <kbd>Esc</kbd> pause · ' +
      '<kbd>\u2191</kbd><kbd>\u2193</kbd> sensor cards<br>' +
      '<kbd>Tab</kbd> from the top reaches a skip-to-content link on every page</div>';
    panel.innerHTML = html;
    panel.querySelector('.ttm-menu__bernard .voice').textContent = greeting;

    // ── contact links: text + validated http(s)/mailto URLs only ──
    var CONTACT_KEYS = [
      ['email', 'Email'], ['website', 'Website'], ['github', 'GitHub'],
      ['mastodon', 'Mastodon'], ['bluesky', 'Bluesky'], ['x', 'X'],
    ];
    function safeUrl(v, key) {
      v = String(v || '').trim().slice(0, 300);
      if (!v) return null;
      if (key === 'email')
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'mailto:' + v : null;
      if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
      try {
        var u = new URL(v);
        if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
      } catch (e) {}
      return null;
    }
    function renderContact() {
      var box = panel.querySelector('.ttm-menu__contact');
      if (!box) return;
      var c = (window.TTMBrand && window.TTMBrand.get('contact')) || {};
      box.textContent = '';
      var head = document.createElement('li');
      head.className = 'ttm-menu__group';
      head.setAttribute('role', 'presentation');
      head.textContent = 'Contact';
      box.appendChild(head);
      var n = 0;
      CONTACT_KEYS.forEach(function (k) {
        var href = safeUrl(c[k[0]], k[0]);
        if (!href) return;
        n++;
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.className = 'ttm-menu__item';
        a.href = href;
        if (k[0] !== 'email') { a.target = '_blank'; a.rel = 'me noopener'; }
        var nm = document.createElement('span');
        nm.className = 'ttm-menu__name';
        nm.textContent = k[1];
        var ds = document.createElement('span');
        ds.className = 'ttm-menu__desc';
        ds.textContent = String(c[k[0]]).trim().slice(0, 300);
        a.appendChild(nm); a.appendChild(ds);
        li.appendChild(a);
        box.appendChild(li);
      });
      panel.querySelector('.ttm-menu__contactnav').hidden = n === 0;
    }
    renderContact();
    document.addEventListener('ttm:brand', renderContact);

    function isOpen() { return panel.classList.contains('is-open'); }
    function open() {
      panel.classList.add('is-open'); backdrop.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      burger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('ttm-menu-open');
      var first = panel.querySelector('a, button, input');
      if (first) first.focus();
    }
    function close(returnFocus) {
      panel.classList.remove('is-open'); backdrop.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      burger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('ttm-menu-open');
      if (returnFocus !== false) burger.focus();
    }
    burger.addEventListener('click', function () {
      isOpen() ? close() : open();
    });
    backdrop.addEventListener('click', function () { close(); });
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      if (e.key !== 'Tab') return;
      var els = panel.querySelectorAll('a, button, input');
      var first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    });
    panel.addEventListener('click', function (e) {
      if (e.target.closest('.ttm-menu__close')) { close(); return; }
      var btn = e.target.closest('.ttm-menu__action');
      if (!btn) return;
      close(false);
      var target = document.getElementById(btn.dataset.proxy);
      if (target) { target.click(); target.focus(); }
    });
    panel.addEventListener('change', function (e) {
      if (e.target.name !== 'ttm-theme-pick') return;
      try { localStorage.setItem('ttm_theme', e.target.value); } catch (err) {}
      apply(e.target.value);
      if (window.TTMToast) window.TTMToast.show(
        (THEME_LABELS[e.target.value] || 'Dark') + ' theme.', { type: 'success', timeout: 2500 });
      if (window.TTMStack) window.TTMStack.track('theme_change', { theme: e.target.value || 'ttm' });
    });

    document.body.appendChild(backdrop);
    chromeTools().appendChild(burger);
    document.body.appendChild(panel);

    // ── Keyboard shortcuts: ? lands you in the menu; g-then-key navigates ──
    // Capture phase so chords win over page-level single-key shortcuts:
    // a consumed chord key (g-then-t) arrives at page handlers with
    // defaultPrevented set, and they must skip it (dashboard.js does).
    var pendingG = 0;
    var CHORD_ROUTES = { d: '/', p: '/plot/', g: '/gadget/', r: '/report/',
      t: '/test/', a: '/admin/', m: 'https://maps.thetechmargin.com/' };
    document.addEventListener('keydown', function (e) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '?') { e.preventDefault(); isOpen() ? close() : open(); return; }
      if (pendingG && Date.now() - pendingG < 1500 && CHORD_ROUTES[e.key]) {
        e.preventDefault();
        pendingG = 0;
        location.href = CHORD_ROUTES[e.key];
        return;
      }
      if (e.key === 'g') { pendingG = Date.now(); e.preventDefault(); return; }
      pendingG = 0;
      // site-wide single keys: t cycles the theme world, m flips light/dark.
      // Consumed here (capture + preventDefault) so page handlers skip them.
      if (e.key === 't') {
        e.preventDefault();
        var next = THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length];
        set(next);
        if (window.TTMToast) window.TTMToast.show(THEME_LABELS[next] + ' theme.', { timeout: 1500 });
        if (window.TTMStack) window.TTMStack.track('theme_change', { theme: next });
        return;
      }
      if (e.key === 'm') {
        e.preventDefault();
        var mode = resolveMode() === 'dark' ? 'light' : 'dark';
        setMode(mode);
        if (window.TTMToast) window.TTMToast.show(
          (mode === 'dark' ? 'Dark' : 'Light') + ' mode.', { timeout: 1500 });
        if (window.TTMStack) window.TTMStack.track('mode_change', { mode: mode });
        return;
      }
    }, true);

    // Small public surface so pages (and the test bench) can see the
    // navigation contract without re-implementing it.
    window.TTMNav = {
      routes: CHORD_ROUTES,
      chordPending: function () { return pendingG !== 0 && Date.now() - pendingG < 1500; },
      openMenu: open, closeMenu: close, menuOpen: isOpen,
    };
  }

  // Universal chrome: the mode toggle sits beside the burger in the
  // sitebar's tools cluster — part of the site shell, not any page's markup.
  function buildModeToggle() {
    if (document.querySelector('.ttm-modetoggle')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ttm-modetoggle';
    b.setAttribute('aria-keyshortcuts', 'm');
    b.addEventListener('click', function () {
      var next = resolveMode() === 'dark' ? 'light' : 'dark';
      setMode(next);
      if (window.TTMStack) window.TTMStack.track('mode_change', { mode: next });
    });
    chromeTools().appendChild(b);
    apply(currentTheme()); // paint the glyph
  }

  // Universal footer: every page carries the same closing line — pages keep
  // their own first line; missing footers are created.
  function buildFooter() {
    var footer = document.querySelector('footer.ttm-footer');
    if (!footer) {
      footer = document.createElement('footer');
      footer.className = 'ttm-footer';
      (document.querySelector('.ttm-main') || document.body).appendChild(footer);
    }
    if (footer.querySelector('.ttm-kbd-hints')) return;
    var hints = document.createElement('span');
    hints.className = 'ttm-kbd-hints';
    hints.innerHTML = '<kbd>?</kbd> menu · <kbd>g</kbd> chords navigate · ' +
      '<kbd>t</kbd> theme · <kbd>m</kbd> light/dark · <kbd>Tab</kbd> skip link';
    footer.appendChild(document.createElement('br'));
    footer.appendChild(hints);
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildSitebar();
    buildModeToggle();
    buildFooter();
    buildMenu();
    var badge = document.createElement('div');
    badge.className = 'ttm-footer-badge';
    badge.innerHTML = 'made with <span class="heart">❤</span> <span class="brand-name gradient-text-rainbow">open source</span>';
    // in the footer flow — buildFooter guarantees one exists on every page
    (document.querySelector('footer.ttm-footer') || document.body).appendChild(badge);
  });

  // set() persists then applies — apply() alone is for previews
  function set(theme) {
    if (THEMES.indexOf(theme) === -1) return false;
    try { localStorage.setItem('ttm_theme', theme); } catch (e) {}
    apply(theme);
    return true;
  }

  window.TTMTheme = {
    apply: apply, set: set, current: currentTheme, THEMES: THEMES,
    mode: currentMode, setMode: setMode, MODES: MODES,
    getCustom: getCustom, setCustom: setCustom, resetCustom: resetCustom,
  };
})();
