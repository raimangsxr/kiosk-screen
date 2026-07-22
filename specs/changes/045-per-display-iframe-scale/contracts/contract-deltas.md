# Contract Deltas: CHG-045 Per-Display Iframe Scale

**Date**: 2026-07-22

Pre-implementation deltas to merge into active contracts before coding.

---

## IFRAMES.VIDEO_END

### Adds

- `iframe_display_scale_overrides` persistence keyed by `(display_device_id, iframe_id)`.
- Iframe default `scaleX`/`scaleY` remain organization-wide baseline; per-display overrides optional.
- `GET /iframes` and `GET /iframes/{id}` include `displayScales[]` with effective scale, `source` (`override` | `default`), and `connected` for every known `display_device`.
- `PUT /iframes/{id}/display-scales` batch upsert/clear overrides from iframe edit matrix; concurrent saves use last-write-wins semantics.
- Deleting an iframe cascades its override rows (FR-011).
- When override changes and iframe is active remote selection, server emits `iframe_scale_updated` SSE (in addition to existing `show_iframe` refresh on iframe default update).

### Modifies

- Non-goal "Per-kiosk iframe scale overrides are not supported" → **removed**; replaced with per-display override behavior above.

### Preserves

- Iframe URL uniqueness per organization.
- Default scale validation range `0.1`–`5.0`.
- `show_iframe` re-emitted on `PUT /iframes/{id}` when iframe is active selection (default scale changes).

---

## DISPLAY.RUNTIME

### Adds

- `POST /api/display/kiosk/register` response includes `displayDeviceId`; rejects empty/missing `label` with `422`.
- `GET /api/display/iframe-scales/me` returns override map for the kiosk's resolved display device.
- Kiosk resolves effective iframe scale client-side in `display-screen.component.ts` and `display-viewer.controller.ts`: `override ?? show_iframe.iframe.scale` on `show_iframe`, snapshot, polling fallback, and `iframe_scale_updated`.
- `DisplayLabelService` unchanged; label claim still drives device upsert on register.

### Preserves

- CHG-044 CSS scale host (`transform: scale(scaleX, scaleY)`, `transform-origin: top center`).
- Branding hidden in iframe mode.
- No on-display calibration controls (FR-013).

---

## DISPLAY.CONFIG_SESSION

### Adds

- `display_devices` table restored (label + `last_seen_at`; no layout profiles).
- `GET/POST/PATCH/DELETE /api/admin/display-devices` for known display registry.
- Manual device pre-creation and auto-create on first kiosk register with new label (FR-007c).
- Label rename via `PATCH` updates metadata only; overrides stay on device id (FR-005a).
- `kiosk_connections.display_device_id` FK restored.

### Preserves

- `GET /api/admin/display/kiosks/live` (connected kiosks); MAY extend rows with `displayDeviceId` but not required for ops dashboard scope.

---

## ADR

### Adds

- `docs/adr/0013-per-display-iframe-scale.md` — client-side scale resolution + `iframe_scale_updated` SSE; supersedes ADR-0012 non-goal on per-kiosk overrides.
