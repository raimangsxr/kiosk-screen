# Context Pack: CHG-047 Admin Content List SSE

**Change**: `specs/changes/047-admin-content-sse/`  
**Status**: draft (plan complete)  
**Branch**: `047-admin-content-sse`

## Read first (in order)

1. `specs/changes/047-admin-content-sse/plan.md`
2. `specs/changes/047-admin-content-sse/spec.md`
3. `specs/changes/047-admin-content-sse/contracts/admin-content-stream.md`
4. `specs/changes/047-admin-content-sse/contracts/contract-deltas.md`
5. `specs/changes/047-admin-content-sse/research.md`
6. `docs/adr/0009-display-orchestration-sse.md` (transport precedent only)

## Active contracts to update before coding

- `specs/contracts/content-ads-admin/contract.md`

## Code entrypoints

| File | Role |
|------|------|
| `backend/app/application/admin_content/sse_hub.py` | **New** — org-scoped admin SSE hub + Redis fan-out |
| `backend/app/application/admin_content/hooks.py` | **New** — `notify_admin_content_inventory_changed` |
| `backend/app/api/content_stream.py` | **New** — `GET /admin/content/stream` |
| `backend/app/application/display_orchestrator/hooks.py` | Extend `notify_content_mutated` |
| `backend/app/application/display_orchestrator/rotation_logic.py` | Publish after novelty consume |
| `backend/app/api/content.py` | Existing mutation routes (already call hook) |
| `frontend/src/app/features/content/admin-content-stream.service.ts` | **New** — EventSource, debounce, drag gate |
| `frontend/src/app/features/content/content-list.component.ts` | Lifecycle, stale UI, `(refresh)` wiring |
| `frontend/src/app/features/content/content.facade.ts` | `refresh({ silent })` for SSE reconcile |
| `frontend/src/app/display/display-stream.service.ts` | Reference — reconnect/auth patterns |

## Tests

- `backend/tests/unit/test_admin_content_sse_hub.py` (**new**)
- `backend/tests/integration/test_admin_content_stream.py` (**new**)
- `frontend/src/app/features/content/admin-content-stream.service.spec.ts` (**new**)
- `frontend/src/app/features/content/content-list.component.spec.ts` (extend)
- Manual: `quickstart.md`

## Do not read by default

- `specs/archive/**`
- `frontend/src/app/features/ads/**` (out of scope)
- Full `display_orchestrator` state machine (only hooks + novelty consume path)

## Locked product decisions (from clarifications 2026-07-30)

- SSE only on `/admin/content` (page-scoped lifecycle)
- 1 s coalesce on burst notifications
- Silent successful sync
- Stale indicator after 30 s disconnect
- Defer remote refresh during active drag-and-drop

## Problem summary

Admin content list is static after initial load. Add SSE inventory notifications so operators see public uploads, peer edits, and novelty consumption without reload; fix **Actualizar** button; preserve CHG-046 list UX.
