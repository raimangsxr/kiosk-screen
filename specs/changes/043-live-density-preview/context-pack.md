# Context Pack: CHG-043 Live Density Profile Calibration

**Change**: `specs/changes/043-live-density-preview/`  
**Status**: implemented (2026-07-21)  
**Branch**: `043-live-density-preview`

## Read first (in order)

1. `specs/changes/043-live-density-preview/spec.md` (includes clarify session 2026-07-21)
2. `specs/changes/043-live-density-preview/plan.md`
3. `specs/changes/043-live-density-preview/research.md`
4. `specs/changes/043-live-density-preview/data-model.md`
5. `specs/changes/043-live-density-preview/contracts/contract-deltas.md`
6. `specs/changes/042-per-display-iframe-layout/contracts/embed-density-protocol.md`
7. `docs/adr/0011-live-profile-calibration-preview.md`

## Active contracts to update before coding

- `specs/contracts/display-config-session/contract.md`
- `specs/contracts/display-runtime/contract.md`

## Code entrypoints

| File | Role |
|------|------|
| `frontend/src/app/features/display-layout/display-layout-profiles.component.ts` | Host calibration workspace; assign entry |
| `frontend/src/app/features/display-layout/display-layout-calibration.component.ts` | Sliders, pickers, autosave status chip (new) |
| `frontend/src/app/features/display-layout/display-layout-calibration.facade.ts` | Debounce + API + iframe dialog + remote control (new) |
| `frontend/src/app/features/display-layout/display-layout.api.ts` | `updateProfile` + `applyAssigned` |
| `frontend/src/app/features/remote-control/remote-control.facade.ts` | `setIframeMode` after confirmation dialog |
| `backend/app/application/display_layout/service.py` | Preview fanout; apply-assigned; narrow PUT fanout |
| `backend/app/api/display_layout.py` | `PUT ?previewKioskId`; `POST .../apply-assigned` |
| `frontend/src/app/display/display-layout.service.ts` | Handle `profile_preview` source |
| `frontend/src/app/shared/util/embed-density-labels.ts` | Add `profile_preview` → **vista previa** |

## Tests

- `backend/tests/integration/test_display_layout_api.py` — preview + apply-assigned fanout
- `backend/tests/contract/test_display_layout_openapi.py` — new routes
- `frontend/src/app/features/display-layout/display-layout-calibration.facade.spec.ts` (new)
- `frontend/src/app/features/display-layout/display-layout-profiles.component.spec.ts`
- `specs/changes/043-live-density-preview/quickstart.md` — manual gate

## Do not read by default

- `specs/archive/**`
- Unrelated change specs unless manifest points here

## Product decisions (2026-07-21)

| Topic | Decision |
|-------|----------|
| Preview surface | Connected kiosk only |
| Save model | Debounced autosave ~500 ms |
| Iframe source | Operator picks from org iframe list |
| Layout | Top content region as on `/display` |
| Flows | Create, edit, assign |
| Create gate | Test kiosk required before sliders |
| Autosave fanout | Preview kiosk only (`profile_preview`); assigned kiosks unchanged |
| Apply to assigned | **Aplicar a pantallas asignadas** button when profile has assignments |
| Assign flow | Confirm assignment applies density to target via `PATCH .../devices/{id}` |
| Active sliders | Only family matching selected iframe |
| Iframe mode | Confirmation dialog → remote control switch |

## API summary

| Endpoint | Fanout |
|----------|--------|
| `PUT /profiles/{id}?previewKioskId=…` | Test kiosk only (`profile_preview`) |
| `POST /profiles/{id}/apply-assigned` | All assigned kiosks (`profile`) |
| `PATCH /devices/{id}` (assign) | Target kiosk only (`profile`) |

No `POST /profiles/{id}/preview` — rejected (see research R2).
