# TTM theming

Two attributes on `<html>` drive every surface, both resolved by
`web/ttm/theme.js` **before first paint**:

- `data-ttm-theme` — the *world* (palette family), persisted in
  localStorage `ttm_theme`, switchable from the burger menu's theme
  radios or by cycling with <kbd>t</kbd>.
- `data-ttm-mode` — `light` or `dark`. Follows the OS
  (`prefers-color-scheme`, tracked live) until the visitor touches the
  ☀/☾ toggle in the site header or presses <kbd>m</kbd>; the explicit
  choice persists in localStorage `ttm_mode`.

Because theme.js stamps a concrete mode attribute, `tokens.css` defines
each variant exactly once — no `prefers-color-scheme` duplication in CSS.

## Worlds in `web/ttm/tokens.css`

Ten worlds × two modes = twenty palettes, every one WCAG-AA-checked by
the test bench (`/test/`) from live token values on each run.

| `data-ttm-theme` | World |
|---|---|
| `ttm` (or none) | **Warm** — the TTM home palette: warm dark, ivory light |
| `terminal` | CRT phosphor dark · paper light, mono type throughout |
| `zine` | photocopy light · inverted-photocopy dark |
| `ocean` | deep-water dark · foam light |
| `forest` | canopy dark · meadow light |
| `synthwave` | neon-grid dark · pastel-horizon light |
| `ember` | coal dark · hearth light |
| `mono` | grayscale, both polarities |
| `blueprint` | drafting-blue dark · vellum light |
| `bubblegum` | candy dark · sherbet light |

Legacy selectors `.terminal` / `[data-theme="terminal"]` / `.zine` are
kept alongside `[data-ttm-theme]` — they are the published spec API and
the bench asserts they stay alive.

## Site default & precedence

Personal always wins: **visitor's stored choice** → **published site
default** (`ohm_site_config`, written from Mission Control) → **config
default** (`web/ttm/config.js` → `defaultTheme`) → `ttm`.

## Custom tokens (whitelabel)

Two layers, personal always winning:

- **Device overrides** — theme.js applies localStorage
  `ttm_custom_tokens` (validated against `/^--(ttm|z|radius)-[a-z-]+$/`).
  Mission Control's Whitelabel card edits them with live preview and
  **Save on device** (`TTMTheme.setCustom`).
- **Site config** — `web/ttm/brand.js` reads `ohm_site_config` from
  Supabase (60 s browser cache): brand copy (page title, wordmark,
  tagline, footer badge), site default theme, site-wide token overrides,
  gate copy, and published contact links (menu). Mission Control's
  **Publish site-wide** writes it. Fail-soft: without Supabase the
  defaults apply and publish is disabled with a note.

## Brand reference

Brand colors, radius (`0.7rem`), and the Poppins / Pacifico / Geist Mono
stacks are identical across all worlds and match
`brand-globals-export.css` (brand.thetechmargin.com). Only surfaces and
inks differ per world; component shapes never change with the theme.

## Accessibility

Every world keeps `prefers-reduced-motion` support (transitions *and*
animations collapse), `:focus-visible` outlines, and AA contrast in both
modes — computed by the bench for every text/status pair plus 3:1 for
interactive chrome (WCAG 1.4.11) across all twenty combinations.
