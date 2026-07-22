# ADR-0012: Iframe CSS scale

**Status**: Accepted  
**Date**: 2026-07-21  
**Change**: CHG-044  
**Supersedes**: ADR-0010, ADR-0011

## Context

CHG-042/043 introduced per-display embed density (profiles, calibration, URL
`embed_app_height_px`, `bull:config`, sibling-app coupling). Operators found the
model heavy and hard to tune. Product chose a simpler global-per-iframe scale.

## Decision

1. Each iframe record stores `scaleX` and `scaleY` (default `1.0`, range `0.1`–`5.0`).
2. Kiosk runtime applies `transform: scale(X, Y)` with `transform-origin: top center`
   inside an `overflow: hidden` host. No density query params or postMessage.
3. Remove embed-density tables, admin calibration UI, SSE `layout_updated`, and
   `embed_density_defaults` from kiosk configuration.
4. On `PUT /iframes/{id}`, re-emit `show_iframe` when that iframe is active so
   scale updates apply live.
5. Keep kiosk **display label** (`DisplayLabelService`) for ops visibility only.
6. Admin dashboard lists connected kiosks via `GET /api/admin/display/kiosks/live`
   without density metadata.

## Consequences

### Positive

- Single admin surface (iframe form) for visual tuning.
- No cross-repo protocol with AMRN bull/escalabirras embed apps for density.
- Smaller backend and frontend surface; destructive migration acceptable.

### Negative

- CSS scale can clip content when scale > 1 (accepted: `overflow: hidden` + top center).
- Per-kiosk tuning is no longer supported; different screens sharing an iframe share scale.

## Alternatives considered

- **Keep CHG-042 density** — rejected (operational complexity).
- **Per-kiosk scale overrides** — rejected (scope; can revisit if needed).
