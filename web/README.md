# TTM web dashboard

A static browser dashboard for the machine running Open Hardware Monitor's
embedded web server. No build step, no framework, no tracking — the C#
application is untouched.

Live demo: **https://ohm.thetechmargin.com** (`?demo=1` for the animated
demo feed, `/components/` for the design-stack gallery, `/test/` for the
self-test bench, `/admin/` for operators). Also served at
https://openhardwaremonitor.vercel.app.

| Dark (default) | Terminal theme |
|---|---|
| ![Dashboard, warm-dark theme](../docs/screenshots/dashboard-dark.png) | ![Dashboard, terminal theme](../docs/screenshots/dashboard-terminal.png) |

## Use cases

- **Workshop presence on the open map** — the machine publishes a SpaceAPI
  signal to Maps of Making: running hardware means the space reads *open*,
  temperatures and fans travel as sensors, Four Corners keeps authorship
  attached, IIIF serves the machine photo zoomable. Bernard, keeper of
  Mother Sands, greets visitors in the menu and points them to the
  workshop.
- **Monitor wall / lab display** — full-screen the dashboard on a spare
  screen beside the machine; the summary strip is readable across the
  room, warn/hot states glow, polling pauses when the tab hides.
- **Kiosk in terminal dress** — the terminal theme (paper, mono,
  WCAG-checked) suits e-ink-ish kiosks and print-adjacent setups; flip
  live with <kbd>t</kbd> or persist it site-wide via `config.js`.
- **Classroom / demo without hardware** — `?demo=1` serves 32 animated
  sensors from a seeded generator; the same seed gives every student the
  same bytes for reproducible exercises.
- **Design-system reference** — `/components/` shows the whole TTM stack
  end to end; `/test/` proves it (48 checks, incl. WCAG contrast); the
  token layer whitelabels from Mission Control's editor — live preview,
  save on device, or publish site-wide via `ohm_site_config`.
- **Fork it for your own feed** — `parse.js`/`bridge.js` are pure and
  DOM-free: point them at any display-string sensor tree and the rest of
  the stack comes along.

## Module map

| File | Role |
|---|---|
| `index.html` | the page: source bar, sensor grid, map-bridge receipt |
| `parse.js` | **pure sensor core** (`window.OHMParse`): display-string parsing, tree flattening, thresholds, meter scaling |
| `bridge.js` | **map bridge** (`window.OHMBridge`): SpaceAPI v14 fragment for Maps of Making |
| `dashboard.js` | rendering + data flow: polling, status, toasts, shortcuts |
| `demo-data.js` | `window.OHM_DEMO()` — a jittered tree in the server's exact shape |
| `ttm/` | the TTM stack: tokens, components, theme switcher, whitelabel loader (`brand.js`), toasts, gate/telemetry (see `/THEMING.md`) |
| `admin/` | operator page; renders only for visitors flagged `is_admin` |
| `components/` | end-to-end gallery of the component stack |
| `test/` | the bench: 48 assertions, runs from `file://` or `/test/` |

## Data contract

The embedded server's `/data.json` (`Utilities/HttpServer.cs`,
`GenerateJSON`) is a pre-order tree of
`{id, Text, Children[], Min, Value, Max, ImageURL}` where **every value is a
preformatted display string** — `"52.0 °C"`, `"1,234 RPM"`. The dashboard
parses numbers back out for meters and thresholds but always shows the
server's own string. Hardware category comes from the node's icon path
(`images_icon/temperature.png` → `temperature`). Sub-hardware (a SuperIO
chip under the mainboard) becomes its own block.

Thresholds (conservative defaults, in `parse.js`): temperature ≥ 70 °C
warn / ≥ 85 °C hot; load ≥ 80 % warn / ≥ 95 % hot.

CORS note: the embedded server sends no `Access-Control-Allow-Origin`
header, so a deployed dashboard cannot poll a machine cross-origin. Serve
the page from the same origin, use a local proxy, or use demo data.

## UX

- hero band: the machine leads with stat tiles — hottest sensor (the one
  hero figure), peak load, sensor count — each with a 40-point trend
  sparkline built from the poll history the page already collects
- sensor rows carry an inline sparkline (2px, de-emphasis ink, status
  only on the "now" dot); the meter's unfilled track tints with the row's
  state so warn/hot reads across the whole bar; fresh readings flash once
- the machine URL persists in localStorage; the live badge pulses
- keyboard: <kbd>d</kbd> demo · <kbd>/</kbd> connect · <kbd>t</kbd>
  dark/terminal theme · <kbd>Esc</kbd> pause · <kbd>?</kbd> drawer menu ·
  <kbd>g</kbd> then <kbd>d</kbd>/<kbd>c</kbd>/<kbd>t</kbd>/<kbd>a</kbd>/<kbd>m</kbd>
  navigates dashboard / components / test bench / mission control / maps.
  The chord handler runs in the capture phase and consumes its keys, so
  <kbd>g</kbd>-then-<kbd>t</kbd> navigates without also toggling the theme;
  page-level shortcuts skip any key arriving `defaultPrevented`
- sensor tree: <kbd>↑</kbd>/<kbd>↓</kbd> (or <kbd>j</kbd>/<kbd>k</kbd>)
  move between device cards, <kbd>Home</kbd>/<kbd>End</kbd> jump to the
  edges, <kbd>←</kbd>/<kbd>→</kbd> collapse/expand, <kbd>Enter</kbd>/<kbd>Space</kbd>
  toggle (native). Keyboard focus survives the 5 s poll re-render
- accessible navigation: every page starts with a skip-to-content link
  (first tab stop, jumps to `#main`); the drawer menu moves focus in on
  open, traps <kbd>Tab</kbd>, and returns focus to the burger on close;
  `window.TTMNav` exposes the routes/chord state the test bench asserts
- polling pauses when the tab is hidden and resumes on return; under
  `prefers-reduced-motion` it stretches to 20 s
- the status badge is a polite live region; warn/hot rows carry explanatory
  titles rather than color alone

## Publishing to open maps (SpaceAPI · Four Corners · IIIF)

The map-bridge fragment (`bridge.js`) is a SpaceAPI v14 document: register
its URL on Maps of Making and the machine appears as a space signal —
activity as `state.open`, temperatures and fans as `sensors`, refreshed by
the heartbeat. Two open protocols ride along as `ext_*` extensions,
configured per site via `window.OHM_BRIDGE_META` (see the shape documented
at the top of `bridge.js`):

- **Four Corners** (`ext_fourcorners`, fourcornersproject.org) —
  attribution that travels with the signal: authorship/license, backstory
  (defaults to honest provenance of the telemetry), related imagery, links.
- **IIIF Image API 3** (`ext_iiif`, iiif.io) — an `ImageService3` block so
  any IIIF viewer can deep-zoom the machine photo; `logo` carries the
  static fallback image.
- **Manufacturing capabilities** (`ext_tags` + `ext_okw`) — Wikidata QIDs
  and OKW equipment records per the OHM×Maps-of-Making integration plan:
  QIDs are the shared vocabulary hub between MoM's activity ontology
  (`owl:sameAs`) and Open Hardware Manager's OKW records, so the machine's
  live signal is discoverable by capability queries ("find spaces that can
  laser-cut") the moment those systems ingest it. Set `meta.capabilities`
  (QIDs) and `meta.equipment` (OKW field names).

## Tests

Open `test/index.html` (append `?nogate=1` to skip the visitor gate). 48
assertions: the TTM stack (tokens incl. the full theme-able vocabulary,
the whitelabel loader,
theming across all three terminal selectors, whitelabel runtime, toasts,
gate, telemetry), WCAG 2.1 contrast computed from live tokens in both
themes, the sensor core, seeded demo/fixture data, and the map bridge
with its Four Corners and IIIF extensions. Results land in
`window.__TTM_TEST_RESULTS` for headless harnesses:

```bash
chromium --headless --dump-dom "file://$PWD/web/test/index.html?nogate=1" \
  | grep -o 'id="summary">[^<]*'
```

## Deploy

`build-web.sh` stages `web/` into `public/`; `vercel.json` carries the
build command. Optional Supabase (visitor gate + telemetry + whitelabel,
`ohm_` tables): run `supabase/schema.sql`, set `SUPABASE_URL` /
`SUPABASE_ANON_KEY` in the deployment env, redeploy. Without them
everything runs local-only.

Security model (hardened for a shared database): the anon key can only
call whitelisted RPCs — validated, size-capped writes for the gate and
telemetry, a boolean admin probe, and public reads of the whitelabel
config. Visitor PII is never readable with the anon key. Mission
Control's reads and publishes require the **operator token** (set once in
`ohm_admin_secrets` per the instructions in `schema.sql`; the UI asks for
it and keeps it in sessionStorage only), and `is_admin` can only be
granted from the SQL editor.
