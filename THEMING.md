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

`theme.js` accepts per-site token overrides (localStorage
`ttm_custom_tokens`, validated against `/^--(ttm|z|radius)-[a-z-]+$/`).
The whitelabel admin editor that writes them (`brand.js` +
`whitelabel.sql`) lives on the maps_of_making site; here the hook is
dormant unless overrides are set by hand. Overrides apply on top of the
active theme.

## Brand reference

Brand colors, radius (`0.7rem`), and the Poppins / Pacifico / Geist Mono
stacks are identical across all themes and match
`brand-globals-export.css` (brand.thetechmargin.com). Only surfaces/text
differ per theme.

## Accessibility

Both palettes keep `prefers-reduced-motion` support (animations and
transitions collapse to 0.01ms) and `:focus-visible` outlines. The terminal
theme adds its own focus treatment (`.terminal :focus-visible`).
