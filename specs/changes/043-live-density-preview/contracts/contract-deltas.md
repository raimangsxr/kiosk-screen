# Contract Deltas: CHG-043 Live Density Profile Calibration

**Date**: 2026-07-21 (revised after clarify session)

Pre-implementation deltas to merge into active contracts.

---

## DISPLAY.CONFIG_SESSION

### Adds

- Admin **live calibration workspace** at `/admin/display-layout` (create, edit, assign flows):
  - Mandatory **test kiosk** selection from connected kiosks (`GET .../live`).
  - **Iframe picker** from organization preconfigured iframes.
  - **Sliders** per supported embed family (300–1200 px); only the slider matching the
    selected iframe's `embed_app_family` is enabled at a time.
  - **Autosave** after ~500 ms debounce on slider rest; status chip: idle / guardando / guardado / error (all flows).
  - **Confirmation dialog** before switching test kiosk to iframe mode via remote control;
    calibration blocked until iframe is active.
  - **Aplicar a pantallas asignadas** button — visible only when the profile has at least
    one assigned display; pushes production density to all assigned kiosks (FR-013).
- `PUT /api/admin/display-layout/profiles/{id}` accepts optional `previewKioskId` query param.
  When present: persist profile, then preview fanout to that kiosk only (`profile_preview`).
  Does **not** fan out to other assigned kiosks.
- `POST /api/admin/display-layout/profiles/{id}/apply-assigned` — production fanout with
  `source: profile` to all devices assigned to the profile.

### Preserves

- Profile CRUD RBAC (`content_manager`).
- `PATCH .../devices/{id}` assignment unchanged; assign flow may open calibration workspace
  pre-filled; confirming assignment applies density to target via existing device publish (FR-014).

---

## DISPLAY.RUNTIME

### Adds

- SSE `layout_updated` families MAY include `source: profile_preview` during admin calibration.
- Kiosk applies `profile_preview` density via existing embed protocol (URL `embed_app_height_px` + `bull:config`) without persisting `local_overrides`.
- **Two fanout paths**:
  - **Preview** (autosave with `previewKioskId`): single test kiosk, `profile_preview` source.
  - **Production** (`POST .../apply-assigned` or device assignment): assigned kiosks, `profile` source.

### Preserves

- Precedence chain for production: `local_override → profile → org_default → 720`.
- Hidden on-display density panel (CHG-042 US3) unchanged.

---

## Embed density protocol (extends CHG-042)

### Adds

- `embed_density_source=profile_preview` permitted on iframe URL during admin preview sessions.

### Preserves

- `bull:config` postMessage schema unchanged.

---

## Deprecated / unchanged

- No embedded admin iframe preview surface.
- No `POST /profiles/{id}/preview` endpoint — preview is triggered by `PUT` + `previewKioskId` (see research R2).
- No change to sibling app repos for v1 (preview uses existing override channels).
