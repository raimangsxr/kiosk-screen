# Quickstart: CHG-045 Per-Display Iframe Scale

Manual validation script for local lab (`docs/dev/local-lab.md`).

## Prerequisites

- Backend + frontend running; operator session open (`POST /display/open`).
- At least two browser profiles or devices for kiosk clients.
- Each kiosk must claim a non-empty display label before register succeeds.

## 1 — Baseline (defaults only)

1. Create iframe `https://example.org/agenda` with `scaleX=1`, `scaleY=1`.
2. Open `/display` on **Pantalla A** and **Pantalla B** (distinct labels).
3. Pin iframe from remote control.
4. **Expect**: both screens render at scale 1.0; iframe list shows both labels with source `default` (after US3 UI) or `GET /iframes/{id}` returns `displayScales[]` with `source: default`.

## 2a — Per-display overrides via API (US1 / MVP)

Use this section for Phase 3 (T031) before admin matrix UI exists.

1. Resolve `displayDeviceId` for Pantalla A and B from `GET /api/admin/display-devices` (or register response).
2. `PUT /iframes/{id}/display-scales` with body:

   ```json
   {
     "items": [
       { "displayDeviceId": "<id-a>", "scaleX": 1.25, "scaleY": 0.8 },
       { "displayDeviceId": "<id-b>", "scaleX": 0.9, "scaleY": 1.1 }
     ]
   }
   ```

3. **Expect** (≤5s, SC-001): each connected kiosk updates without full reload; inspect `--iframe-scale-x/y` in devtools.
4. Reload Pantalla A only.
5. **Expect**: scale `1.25 / 0.8` restored; Pantalla B unchanged.

## 2b — Per-display overrides via admin matrix (US3)

1. Edit iframe → matrix: set Pantalla A `1.25 / 0.8`, Pantalla B `0.9 / 1.1`; save.
2. **Expect** (≤5s): each kiosk updates without full reload; list shows overrides and `connected` chips where applicable.
3. Reload Pantalla A only.
4. **Expect**: scale `1.25 / 0.8` restored; Pantalla B unchanged.

## 3 — Clear override

1. Clear Pantalla A row in matrix (restablecer) or API `{ "displayDeviceId": "<id-a>", "clear": true }`.
2. **Expect**: Pantalla A reverts to iframe default; list/API shows `default` for A.
3. **Disconnect test**: disconnect Pantalla B mid-edit, save override for B, reconnect — **expect** saved override applies on next connection (no partial state).

## 4 — Offline pre-provision

1. `POST /api/admin/display-devices` with label `Pantalla C` (or admin UI when built).
2. Open iframe edit matrix **before** connecting Pantalla C (or use API §2a).
3. **Expect**: Pantalla C appears with `connected: false`; set override, save.
4. Connect kiosk with label `Pantalla C`, pin iframe.
5. **Expect**: override applied on first connection; `connected: true` in list.

## 5 — Label rename

1. Rename Pantalla B device label in admin (`PATCH /api/admin/display-devices/{id}`).
2. **Expect**: iframe list/matrix show new label; override values unchanged.

## 6 — Iframe default update

1. Remove all overrides for an iframe; change default scale to `1.5 / 1.5`.
2. **Expect**: all displays without override pick up new default on live refresh.

## 7 — Register without label (negative)

1. Attempt `POST /api/display/kiosk/register` with empty or omitted `label`.
2. **Expect**: `422` validation error; no `displayDeviceId` returned.

## Automated validation

```sh
pytest backend/tests -k "display_device or iframe_scale or display_scale"
npm --prefix frontend run test -- --include='**/iframe**' --include='**/display-screen**' --include='**/display-viewer**'
npm --prefix frontend run build
```
