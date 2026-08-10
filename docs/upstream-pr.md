# Upstream PR — proposal package

Ready-to-open pull request from this fork to
[openhardwaremonitor/openhardwaremonitor](https://github.com/openhardwaremonitor/openhardwaremonitor).
Open it from the compare view:

> https://github.com/openhardwaremonitor/openhardwaremonitor/compare/master...binaryLady:openhardwaremonitor:main

Everything below the rule is the proposed PR body, ready to paste. Two
notes for the opener first:

- **What upstream gets vs. what stays ours.** The dashboard ships
  unbranded — identity is configuration (`web/ttm/config.js` +
  whitelabel tokens) — so upstream inherits a neutral skin, not
  TheTechMargin branding. Site-ops surfaces (Supabase gate/telemetry,
  Mission Control, the Maps-of-Making menu entry) are all fail-soft:
  with no Supabase config they are inert, and the hosted-site URLs
  appear only in docs. If upstream prefers, the `web/admin/` +
  `supabase/` directories can be dropped from the PR without touching
  anything else — nothing imports them.
- **Upstream activity.** The upstream repository has been quiet for
  years; if it stays unresponsive, the same package works as a PR to
  the active community fork (LibreHardwareMonitor) with the `Hardware/`
  layer differences accounted for.

---

## Title

Modernize the remote web UI; make the project buildable on current
toolchains

## Body

This PR modernizes the parts of Open Hardware Monitor that face users
over HTTP, without touching the sensor code or the wire contract.

### What changes

1. **The embedded web UI is replaced.** The 2012 jQuery/Knockout pages
   (~15k lines of vendored minified JS) give way to a dependency-free,
   framework-free dashboard: tokenized design system, ten themes × light/
   dark (all WCAG-AA-checked by an in-browser bench), full keyboard
   operation, `prefers-reduced-motion` support. The desktop app's own
   windows are served as routes — `/plot/` (PlotPanel), `/gadget/`
   (SensorGadget), `/report/` (ReportForm) — reimplemented as pure JS
   with line-level citations of the C# they mirror, and bench-tested for
   fidelity (Save/Submit Report payloads are byte-identical to the
   desktop's). The UI ships unbranded; identity is configuration.

2. **`/data.json` is untouched** — same shape, same display strings,
   same pre-order ids. Existing consumers keep working. The endpoint
   gains `Access-Control-Allow-Origin: *` (read-only, unauthenticated
   GET data) so browser dashboards on other origins can poll it.

3. **`HttpServer.cs` learns the basics of a static server**: directory
   index routes, 301 for extensionless directory requests, query-string
   handling (`/?param` used to 404), correct MIME types for svg/json/ico,
   and a styled 404 page.

4. **The solution builds on current toolchains.** All five projects
   retarget .NET Framework 4.5 → 4.8 (the 4.5 targeting pack no longer
   ships with VS 2022; 4.8 is preinstalled on Windows 10/11). A GitHub
   Actions workflow builds the solution on `windows-latest` on every push
   and uploads the runnable app as an artifact; a second workflow runs
   the web bench (120 assertions) headless.

5. **A cross-platform agent** (`agent/serve.js`, dependency-free Node)
   serves the same dashboard and the same `/data.json` contract on
   macOS/Linux from what those platforms expose — per-core load, clocks,
   memory everywhere; battery/SMC temperatures, fans and power on macOS
   in privilege tiers; `/sys/class/hwmon` on Linux. Sensors a platform
   gates are omitted, never faked. `install` registers start-at-login
   (launchd/systemd user unit). It also serves a live SpaceAPI v14
   fragment at `/spaceapi`.

### Compatibility

- Wire contract: unchanged (`/data.json`, `images_icon/`).
- License: all additions MPL-2.0, same as the project.
- The C# sensor stack (`Hardware/`, WinRing0, WMI) is untouched.

### Testing

- Web: 120-assertion in-browser bench (contrast across all twenty
  theme×mode variants, GUI-parity fidelity checks, standardization
  sweep), run headless in CI on every push.
- C#: built by the `windows build` workflow on every push; the artifact
  is the runnable app.
- Agent: `/data.json` and `/spaceapi` validated end-to-end through the
  dashboard's own parser; sampler parsers fixture-tested.
