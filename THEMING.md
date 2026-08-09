# TTM theming

Themes are selected by the `data-ttm-theme` attribute on `<html>`, persisted
by `theme.js` (localStorage key `ttm_theme`), and switchable at runtime from
the burger menu it injects (`.ttm-burger` → theme radios).

## Themes in `web/ttm/tokens.css`

| Attribute | Palette |
|---|---|
| `data-ttm-theme="ttm"` or none | TTM warm dark — `--ttm-bg: #0f0b08`, brown surfaces, full-strength brand colors |
| `data-ttm-theme="terminal"` | Light paper — `--ttm-bg: #f2ede1`, muted brand colors, mono type (`--ttm-font-sans` aliases the mono stack). Also honors legacy `[data-theme="terminal"]`. |

The **zine** look (`theme.js` label for the attribute-less state) is a
maps-site layer: it needs `ttm-theme.css` on top of `tokens.css` (maps_of_making only; not shipped here).
With `tokens.css` alone, no attribute = the `:root` TTM dark palette.

## Site default

Set on the page: `<html data-ttm-theme="ttm">`, and/or in
`web/ttm/config.js` → `defaultTheme: 'ttm' | 'terminal' | ''`.
A visitor's stored choice wins over the site default.

## Custom tokens (whitelabel)

Two layers, personal always winning:

- **Device overrides** — `theme.js` applies localStorage
  `ttm_custom_tokens` (validated against `/^--(ttm|z|radius)-[a-z-]+$/`).
  Mission Control's Whitelabel card edits them with live preview and
  **Save on device** (`TTMTheme.setCustom`).
- **Site config** — `web/ttm/brand.js` reads `ohm_site_config` from
  Supabase (60s browser cache): brand copy (page title, tagline, footer
  badge), site default theme, site-wide token overrides, and gate copy
  (consumed by `stack.js` via `TTMBrand.get('gate')`). Mission Control's
  **Publish site-wide** writes it. Fail-soft: without Supabase the
  defaults apply and publish is disabled with a note.

## Brand reference

Brand colors, radius (`0.7rem`), and the Poppins / Pacifico / Geist Mono
stacks are identical across all themes and match
`brand-globals-export.css` (brand.thetechmargin.com). Only surfaces/text
differ per theme.

## Accessibility

Both palettes keep `prefers-reduced-motion` support (animations and
transitions collapse to 0.01ms) and `:focus-visible` outlines. The terminal
theme adds its own focus treatment (`.terminal :focus-visible`).
