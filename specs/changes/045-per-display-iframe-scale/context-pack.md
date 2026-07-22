# Context Pack: CHG-045 Per-Display Iframe Scale

**Change**: `specs/changes/045-per-display-iframe-scale/`  
**Status**: draft (plan complete)  
**Branch**: `045-per-display-iframe-scale`

## Read first (in order)

1. `specs/changes/045-per-display-iframe-scale/plan.md`
2. `specs/changes/045-per-display-iframe-scale/spec.md`
3. `specs/changes/045-per-display-iframe-scale/data-model.md`
4. `specs/changes/045-per-display-iframe-scale/contracts/contract-deltas.md`
5. `specs/changes/045-per-display-iframe-scale/research.md`
6. `docs/adr/0013-per-display-iframe-scale.md` (create during implementation)

## Active contracts to update before coding

- `specs/contracts/iframes-video-end/contract.md`
- `specs/contracts/display-runtime/contract.md`
- `specs/contracts/display-config-session/contract.md`

## Code entrypoints

| File | Role |
|------|------|
| `backend/app/repositories/models/iframe.py` | Default scale columns |
| `backend/app/repositories/models/display_device.py` | **New** stable display record |
| `backend/app/repositories/models/iframe_display_scale_override.py` | **New** override rows |
| `backend/app/services/iframe_service.py` | Extend list/get; override batch save |
| `backend/app/application/iframe_runtime.py` | Emit `iframe_scale_updated`; refresh helpers |
| `backend/app/application/display_orchestrator/remote_control.py` | `emit_iframe` (unchanged payload) |
| `backend/app/api/display_stream.py` | Register upsert device; extend response |
| `backend/app/api/iframes.py` | Display-scales sub-resource |
| `frontend/src/app/features/iframes/iframe-list.component.ts` | Display scale summary column |
| `frontend/src/app/features/iframes/iframe-form.component.ts` | Per-display matrix |
| `frontend/src/app/display/display-screen.component.ts` | Resolve effective scale (show_iframe, snapshot, polling) |
| `frontend/src/app/display/display-viewer.controller.ts` | Snapshot iframe payload; delegate scale resolution |
| `frontend/src/app/display/display-stream.service.ts` | `iframe_scale_updated` handler |

## Tests

- `backend/tests/unit/test_iframe_scale_resolver.py` (new)
- `backend/tests/integration/test_iframe_display_scales_api.py` (new)
- `backend/tests/integration/test_display_devices_api.py` (new)
- `frontend/src/app/features/iframes/iframe-form.component.spec.ts` (extend)
- `frontend/src/app/display/display-screen.component.spec.ts` (extend)
- `frontend/src/app/display/display-viewer.controller.spec.ts` (extend)
- Manual: `quickstart.md`

## Do not read by default

- `specs/archive/**`
- `specs/changes/042-per-display-iframe-layout/**` (historical density model; superseded)
- `specs/changes/043-live-density-preview/**`
- CHG-044 spec unless verifying default-scale baseline

## Problem summary

Per-display `scaleX`/`scaleY` overrides for embedded iframes. Backend authoritative;
stable `display_devices`; client-side effective scale resolution on kiosk; admin
iframe list + edit-form matrix; no on-display calibration.
