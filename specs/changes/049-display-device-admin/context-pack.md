# Context Pack: CHG-049 Display Device Admin

**Change**: `specs/changes/049-display-device-admin/`  
**Status**: implemented  
**Branch**: `049-display-device-admin`

## Read first (in order)

1. `specs/changes/049-display-device-admin/plan.md`
2. `specs/changes/049-display-device-admin/spec.md`
3. `specs/changes/049-display-device-admin/data-model.md`
4. `specs/changes/049-display-device-admin/contracts/contract-deltas.md`
5. `specs/changes/049-display-device-admin/research.md`

## Active contracts to update before coding

- `specs/contracts/display-config-session/contract.md`

## Code entrypoints

| File | Role |
|------|------|
| `frontend/src/app/features/display-devices/display-devices-list.component.ts` | **New** — list, inline create, rename/delete actions, 30 s poll |
| `frontend/src/app/features/display-devices/display-devices.facade.ts` | **New** — merge devices + live kiosks |
| `frontend/src/app/features/display-devices/display-device-rename-dialog.component.ts` | **New** — rename modal |
| `frontend/src/app/core/api/display-device.api.ts` | Existing CRUD client (reuse) |
| `frontend/src/app/core/api/live-kiosks.api.ts` | Existing live connection client (reuse) |
| `frontend/src/app/features/admin-shell/admin-navigation.service.ts` | Add Pantallas nav item |
| `frontend/src/app/app.routes.ts` | Add `/admin/displays` route |
| `frontend/src/app/features/iframes/iframe-form.component.ts` | Remove lifecycle UI; add link |
| `frontend/src/app/features/iframes/iframe.facade.ts` | Remove device precreate/delete methods |

## Tests

- `frontend/src/app/features/display-devices/display-devices-list.component.spec.ts` (**new**)
- `frontend/src/app/features/display-devices/display-devices.facade.spec.ts` (**new**, optional)
- `frontend/src/app/features/iframes/iframe-form.component.spec.ts` (update)
- Regression: `backend/tests/integration/test_display_devices_api.py`
- Manual: `quickstart.md`

## Do not read by default

- `specs/archive/**`
- `backend/app/api/display_devices.py` (no changes expected)
- Kiosk `frontend/src/app/display/**` (runtime unchanged)

## Problem summary

Frontend admin feature to manage display device inventory centrally at `/admin/displays` (list, pre-create, rename, delete, ~30 s connection refresh). Remove create/delete from iframe scale matrix **before** lifecycle mutations ship (FR-009 blocking phase). No backend API changes.
