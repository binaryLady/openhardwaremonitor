# Open Hardware Monitor — fork with a web dashboard

This fork gives Open Hardware Monitor a modern, tokenized web UI and makes
the app runnable on any desk: the browser dashboard under [`web/`](web/)
(design system, whitelabel layer, SpaceAPI publishing bridge), a
cross-platform sensor agent under [`agent/`](agent/) for macOS/Linux, and a
CI-built Windows executable. The desktop application embeds and serves the
dashboard itself (replacing the legacy jQuery web UI), so
`http://localhost:<port>/` opens the app with live data; the C# sensor code
and `/data.json` contract are unchanged.

Demo deployment: **https://ohm.thetechmargin.com** — `?demo=1` loads a
generated 32-sensor feed, so no hardware or install is required to evaluate
it.

## Run the app

**Windows — the full application** (WinForms GUI, ring-0 sensor drivers;
no Visual Studio required):

1. Download the **OpenHardwareMonitor** artifact from the latest
   [windows build](../../actions/workflows/windows-build.yml) run
   (or build `OpenHardwareMonitor.sln` yourself — VS 2022, .NET
   Framework 4.8).
2. Unzip and run `OpenHardwareMonitor.exe` **as Administrator** (the
   sensor drivers need it).
3. Enable **Options → Remote Web Server → Run** (default port 8085).
4. Open `http://localhost:8085/` — the TTM dashboard, served by the app
   itself, connects to live sensors automatically.

**macOS / Linux — the agent** (`agent/serve.js`, no dependencies): the
desktop application's driver and WinForms layers are Windows-only, so
other platforms run a small Node agent that serves the same dashboard
and speaks the same `/data.json` contract:

```sh
node agent/serve.js            # http://localhost:8085/
node agent/serve.js --open     # …and open the browser
node agent/serve.js install    # start at login (launchd / systemd user unit)
```

Sensors arrive in **honesty tiers** — each additive, none faked; the
dashboard renders what the tree carries:

1. *Out of the box, no privileges* — per-core CPU load, clocks, memory
   everywhere; on a Mac laptop also battery temperature and charge
   (`ioreg`); on Linux every `/sys/class/hwmon` temperature and fan.
2. *Helper tool on PATH* (macOS) — `brew install smctemp` (or
   `osx-cpu-temp` on Intel) adds CPU/GPU temperatures and fans.
3. *Root* (macOS) — `sudo node agent/serve.js` adds `powermetrics`
   fidelity: CPU die temperature, fan RPM, package power.

Ten theme worlds × light and dark modes — twenty variants, one token
layer, all WCAG-AA-checked by the in-browser bench. A sample:

| | Dark mode | Light mode |
|---|---|---|
| **Warm** | ![Warm dark: hero stat tiles with trend sparklines on a warm near-black ground](docs/screenshots/dashboard-dark.png) | ![Warm light: the same layout on ivory paper, neon accents inked down](docs/screenshots/dashboard-warm-light.png) |
| **Terminal** | ![Terminal dark: CRT phosphor — green-tinted black with pale phosphor ink](docs/screenshots/dashboard-terminal-dark.png) | ![Terminal light: warm paper and mono type](docs/screenshots/dashboard-terminal.png) |
| **Zine** | ![Zine dark: inverted photocopy — black paper, white ink borders, neon spots](docs/screenshots/dashboard-zine-dark.png) | ![Zine light: white photocopy paper, hard black ink borders, magenta and violet](docs/screenshots/dashboard-zine.png) |

## Scope of the fork

- **Dashboard** (`web/index.html`, `dashboard.js`) — polls the embedded
  server's `/data.json`, renders sensors grouped by hardware with
  configurable warn/hot thresholds, inline trend sparklines built from
  the poll history, and a hero band of stat tiles (activity, hottest
  temperature, peak load, counts).
- **Design system** (`web/ttm/`) — a single token layer (colors, type,
  spacing, motion, z-index) consumed by one component library; ten theme
  worlds, each in light and dark, all twenty verified against WCAG 2.1
  AA by computed contrast checks; site-wide
  whitelabeling via published config, with per-visitor overrides taking
  precedence. The application ships unbranded; identity is configuration.
- **Publishing bridge** (`web/bridge.js`) — generates a SpaceAPI v14
  fragment from the live feed: activity as `state.open`, temperatures and
  fans as `sensors`, with optional extensions for
  [Four Corners](https://fourcornersproject.org) attribution,
  [IIIF Image API 3](https://iiif.io) imagery, and Wikidata-anchored
  [OKW](https://github.com/iop-alliance/OpenKnowWhere) manufacturing
  capabilities, for registration on
  [Maps of Making](https://maps.thetechmargin.com). The agent serves it
  **live** at `/spaceapi` — fresh sensors on every request.
- **Cross-platform agent** (`agent/serve.js`) — a dependency-free Node
  server for macOS/Linux: same dashboard, same `/data.json` contract,
  sensors in honesty tiers (see *Run the app*), start-at-login via
  `install`, live `/spaceapi`.
- **Embedded serving + CI** — the dashboard is compiled into the Windows
  executable (`Utilities/HttpServer.cs` serves it same-origin, CORS open
  on `/data.json`); the `windows build` workflow compiles the solution on
  every push and uploads the runnable app as an artifact; the `web tests`
  workflow runs the bench headless.
- **Test bench** (`web/test/`) — 120 in-browser assertions covering the
  sensor core, the bridge (including the extension contracts), theming,
  the whitelabel runtime, and WCAG contrast computed from live token
  values. Runs from `file://` or the deployed site; no build step.

| Component gallery (`/components/`) | Test bench (`/test/`) |
|---|---|
| ![Component gallery: type, color, buttons, forms, data primitives, sensor rows with sparklines, stat tiles](docs/screenshots/components.png) | ![Test bench with 120 passing assertions](docs/screenshots/test-bench.png) |

## Keyboard & accessibility

The dashboard is fully keyboard-operable: <kbd>d</kbd> demo ·
<kbd>/</kbd> connect · <kbd>t</kbd> theme · <kbd>Esc</kbd> pause ·
<kbd>?</kbd> menu · <kbd>g</kbd>-chords navigate the site · arrows /
<kbd>j</kbd>/<kbd>k</kbd> walk the sensor tree (focus survives the poll
re-render). Every page opens with a skip-to-content link; the drawer
menu manages focus per the ARIA disclosure pattern; WCAG 2.1 AA contrast
is computed from live token values by the test bench on every run, across
all twenty theme variants; `prefers-reduced-motion` collapses all animation and slows
polling. The full table lives in [`web/README.md`](web/README.md).

## Demo URLs

| URL | Contents |
|---|---|
| [/?demo=1](https://ohm.thetechmargin.com/?demo=1) | dashboard on generated demo data |
| [/components/](https://ohm.thetechmargin.com/components/) | component gallery |
| [/test/?nogate=1](https://ohm.thetechmargin.com/test/?nogate=1) | test bench |
| [/get/](https://ohm.thetechmargin.com/get/) | install the app — Windows · macOS · Linux |
| [/admin/](https://ohm.thetechmargin.com/admin/) | operator panel: telemetry, visitors, whitelabel editor (token-gated) |

Keyboard: <kbd>d</kbd> demo · <kbd>t</kbd> theme · <kbd>?</kbd> menu ·
<kbd>g</kbd> then <kbd>d</kbd>/<kbd>c</kbd>/<kbd>t</kbd>/<kbd>a</kbd>/<kbd>m</kbd>
navigates.

## Running locally

```bash
git clone https://github.com/binaryLady/openhardwaremonitor.git
cd openhardwaremonitor
node agent/serve.js --open
# serves the dashboard *and* this machine's sensors at :8085,
# plus a live SpaceAPI fragment at /spaceapi; ?demo=1 for demo data.
# Static-only alternative: python3 -m http.server 8080 --directory web
```

Deployment: `vercel.json` + `build-web.sh` stage `web/` into `public/`
for any static host. Supabase is optional (visitor gate, telemetry,
whitelabel publishing); the schema with its RPC-only access model is
[`supabase/schema.sql`](supabase/schema.sql). Without it the site runs
local-only.

Further documentation: [`web/README.md`](web/README.md) (architecture,
data contract, security model) · [`THEMING.md`](THEMING.md) (theme and
whitelabel model).

## Lineage and licensing

The Windows application is the original
[Open Hardware Monitor](https://openhardwaremonitor.org) (MPL-2.0); this
fork's additions are strictly additive and carry the same license. The
design system and publishing bridge were developed alongside
[Maps of Making](https://github.com/touchthesun/maps_of_making), which
remains the canonical repository for the mapping side; the dashboard
serves as a working reference implementation of its SpaceAPI + OKW
integration path.
