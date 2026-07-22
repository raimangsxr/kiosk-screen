# CHG-044 — Iframe CSS scale

## Summary

Replace the CHG-042/043 embed-density system with per-iframe `scaleX`/`scaleY`
applied via CSS `transform: scale()` on the kiosk display runtime.

## Goals

- Admin configures scale on each iframe (default 1.0, range 0.1–5.0).
- Kiosk applies scale with `transform-origin: top center` inside `overflow: hidden`.
- Live update when iframe scale changes (`show_iframe` re-emitted on PUT).
- Remove density profiles, calibration UI, `bull:config`, `embed_app_height_px`, SSE `layout_updated`.

## Non-goals

- Per-kiosk scale overrides.
- Changes to sibling AMRN embed apps.

## Acceptance

- Migration `0023_iframe_css_scale` applies cleanly.
- `GET /api/admin/display/kiosks/live` returns connected kiosks without density fields.
- `/admin/display-layout` route removed.
- Contracts updated; CHG-042/043 marked cancelled/superseded.
