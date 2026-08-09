# Open Hardware Monitor · with a live web dashboard

> **This fork adds a complete, themeable, open-source web dashboard** on top of
> Open Hardware Monitor's embedded sensor server — plus the publishing bridge
> that puts your machine on the open maps network.
>
> ### ⚡ Try it now: **[ohm.thetechmargin.com](https://ohm.thetechmargin.com/?demo=1)**
> No install, no hardware needed — `?demo=1` serves 32 animated sensors.

| Dark (default) | Terminal theme — one keypress away |
|---|---|
| ![The dashboard in the warm-dark theme: machine summary strip, live sensor meters with threshold coloring](docs/screenshots/dashboard-dark.png) | ![The same dashboard in the light terminal theme — every color re-derives from the token layer](docs/screenshots/dashboard-terminal.png) |

## What the fork adds

Everything lives in [`web/`](web/) — **the C# application is untouched.**
No build step, no framework, no tracking; plain HTML/CSS/JS served static.

- **Live dashboard** — polls the embedded server's `/data.json`, groups
  sensors by hardware with threshold coloring and glanceable warn/hot
  states; machine summary strip readable across a room.
- **A full design system** — tokenized to the last color, two
  WCAG-AA-verified themes, whitelabel-ready: the app ships unbranded and
  an operator claims it from the admin panel, no fork required.
- **Open-protocol publishing** — one click generates a
  [SpaceAPI](https://spaceapi.io) fragment carrying
  [Four Corners](https://fourcornersproject.org) attribution,
  [IIIF](https://iiif.io) imagery, and Wikidata-anchored
  [OKW](https://github.com/iop-alliance/OpenKnowWhere) manufacturing
  capabilities — ready to register on
  [Maps of Making](https://maps.thetechmargin.com).
- **Proof, not promises** — a 48-assertion in-browser test bench
  (including computed WCAG contrast) guards all of it.

| The component stack, end to end | 48 self-checks in the browser |
|---|---|
| ![The design-stack gallery: type, color, buttons, forms, data primitives, sensor rows](docs/screenshots/components.png) | ![The test bench: 48 passing assertions over tokens, themes, WCAG contrast, the sensor core and the map bridge](docs/screenshots/test-bench.png) |

## Explore the live demo

| URL | What you'll see |
|---|---|
| [ohm.thetechmargin.com/?demo=1](https://ohm.thetechmargin.com/?demo=1) | the dashboard on animated demo data |
| [/components/](https://ohm.thetechmargin.com/components/) | the design stack, every primitive on one page |
| [/test/](https://ohm.thetechmargin.com/test/?nogate=1) | the bench running its 48 checks live |
| [/admin/](https://ohm.thetechmargin.com/admin/) | Mission Control — telemetry, visitors, whitelabel editor (operator-gated) |

Keyboard, everywhere: <kbd>d</kbd> demo · <kbd>t</kbd> theme ·
<kbd>?</kbd> menu · <kbd>g</kbd> then a key navigates every surface.

## Run it yourself

```bash
git clone https://github.com/binaryLady/openhardwaremonitor.git
cd openhardwaremonitor
python3 -m http.server 8080 --directory web
# open http://localhost:8080/?demo=1  — or point it at a machine running
# Open Hardware Monitor's remote web server (Options → Remote Web Server)
```

Deploy your own: connect the repo to Vercel (`vercel.json` +
`build-web.sh` do the rest), optionally wire Supabase for the visitor
gate, telemetry, and site-wide whitelabel — the hardened, RPC-only schema
is [`supabase/schema.sql`](supabase/schema.sql). Without it everything
runs local-only by design. Full docs: **[`web/README.md`](web/README.md)**
· theming model: [`THEMING.md`](THEMING.md).

## Lineage

The Windows application is the open-source
[Open Hardware Monitor](https://openhardwaremonitor.org) (MPL-2.0); this
fork's additions keep the license and stay strictly additive. The design
system and map bridge grew alongside
[Maps of Making](https://github.com/touchthesun/maps_of_making) — the
canonical home of the mapping side — and the dashboard doubles as a
working reference for its SpaceAPI + OKW integration path.

---

*Everything below `web/` in this repository is the original Open Hardware
Monitor source for the Windows application.*
