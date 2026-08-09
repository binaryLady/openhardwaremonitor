# TTM web dashboard

A static browser dashboard for the machine running Open Hardware Monitor's
embedded web server. No build step, no framework, no tracking — the C#
application is untouched.

Live: https://openhardwaremonitor.vercel.app (`?demo=1` for the animated
demo feed, `/test/` for the self-test bench, `/admin/` for operators).

## Module map

| File | Role |
|---|---|
| `index.html` | the page: source bar, sensor grid, map-bridge receipt |
| `parse.js` | **pure sensor core** (`window.OHMParse`): display-string parsing, tree flattening, thresholds, meter scaling |
| `bridge.js` | **map bridge** (`window.OHMBridge`): SpaceAPI v14 fragment for Maps of Making |
| `dashboard.js` | rendering + data flow: polling, status, toasts, shortcuts |
| `demo-data.js` | `window.OHM_DEMO()` — a jittered tree in the server's exact shape |
| `ttm/` | the TTM stack: tokens, components, theme switcher, toasts, gate/telemetry (see `/THEMING.md`) |
| `admin/` | operator page; renders only for visitors flagged `is_admin` |
| `test/` | the bench: 24 assertions, runs from `file://` or `/test/` |

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

- keyboard: <kbd>d</kbd> demo · <kbd>/</kbd> connect · <kbd>t</kbd>
  dark/terminal theme · <kbd>Esc</kbd> pause · <kbd>?</kbd> drawer menu
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

## Tests

Open `test/index.html` (append `?nogate=1` to skip the visitor gate). 24
assertions: 14 over the TTM stack (tokens, theming, toasts, gate,
telemetry) and 10 over the sensor core and map bridge. Results land in
`window.__TTM_TEST_RESULTS` for headless harnesses:

```bash
chromium --headless --dump-dom "file://$PWD/web/test/index.html?nogate=1" \
  | grep -o 'id="summary">[^<]*'
```

## Deploy

`build-web.sh` stages `web/` into `public/`; `vercel.json` carries the
build command. Optional Supabase (visitor gate + telemetry, `ohm_` tables):
run `supabase/schema.sql`, set `SUPABASE_URL` / `SUPABASE_ANON_KEY` in the
deployment env, redeploy. Without them everything runs local-only.
