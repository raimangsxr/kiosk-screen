# Context Pack: CHG-042 Per-Display Iframe Layout Profiles

**Change**: `specs/changes/042-per-display-iframe-layout/`
**Status**: draft (plan complete)
**Branch**: `042-per-display-iframe-layout`

## Read first (in order)

1. `specs/changes/042-per-display-iframe-layout/plan.md`
2. `specs/changes/042-per-display-iframe-layout/spec.md`
3. `specs/changes/042-per-display-iframe-layout/contracts/embed-density-protocol.md`
4. `specs/changes/042-per-display-iframe-layout/data-model.md`
5. `specs/changes/042-per-display-iframe-layout/contracts/contract-deltas.md`
6. `docs/adr/0010-per-display-iframe-embed-density.md`

## Active contracts to update before coding

- `specs/contracts/display-runtime/contract.md`
- `specs/contracts/display-config-session/contract.md`
- iframe admin behavior (`IFRAMES.VIDEO_END` or equivalent)

## Sibling repos (joint acceptance gate)

| Repo | Artifact |
|------|----------|
| `../amrn-bull` | `specs/changes/042-per-display-iframe-layout/contracts/sibling-app-deltas.md` |
| `../amrn-escalabirras-dual` | same |

## Code entrypoints

| File | Role |
|------|------|
| `frontend/src/app/display/display-screen.component.ts` | Iframe URL + postMessage + hidden panel |
| `frontend/src/app/display/display-stream.service.ts` | Register with `label` |
| `backend/app/api/display_stream.py` | Link label → `display_devices` |
| `backend/app/repositories/models/kiosk_connection.py` | `label` exists; add `display_device_id` |
| `backend/app/repositories/models/iframe.py` | Add `embed_app_family` |

## Tests

- `backend/tests/unit/test_embed_density_resolver.py` (new)
- `backend/tests/integration/test_display_layout_api.py` (new)
- `frontend/src/app/display/display-layout.service.spec.ts` (new)
- Manual: `quickstart.md` E2E across bull + escalabirras

## Do not read by default

- `specs/archive/**`
- Consolidated change specs unless manifest points here

## Problem summary

Per-display vertical density for embedded AMRN apps. Backend authoritative;
kiosk cache; stable display labels; URL + `bull:config` protocol; sibling embed
override precedence over global `app_height_px`.
