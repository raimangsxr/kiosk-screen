# Context Pack: CHG-048 Content Now Playing

**Change**: `specs/changes/048-content-now-playing/`  
**Status**: draft (plan complete)  
**Branch**: `048-content-now-playing`

## Read first (in order)

1. `specs/changes/048-content-now-playing/plan.md`
2. `specs/changes/048-content-now-playing/spec.md`
3. `specs/changes/048-content-now-playing/contracts/admin-content-stream-now-playing.md`
4. `specs/changes/048-content-now-playing/contracts/rotation-plan-logging.md`
5. `specs/changes/048-content-now-playing/contracts/contract-deltas.md`
6. `specs/changes/048-content-now-playing/research.md`
7. `specs/changes/047-admin-content-sse/contracts/admin-content-stream.md` (base stream)
8. `docs/adr/0009-display-orchestration-sse.md`

## Active contracts to update before coding

- `specs/contracts/content-ads-admin/contract.md`
- `specs/contracts/content-rotation/contract.md`

## Code entrypoints

| File | Role |
|------|------|
| `backend/app/application/display_orchestrator/rotation_plan.py` | **New** — `compute_rotation_plan_snapshot()` |
| `backend/app/application/display_orchestrator/rotation_logging.py` | **New** — structured INFO logs |
| `backend/app/application/display_orchestrator/rotation_logic.py` | Wire log + now_playing after emit |
| `backend/app/application/display_orchestrator/remote_control.py` | now_playing on mode/jump |
| `backend/app/application/display_orchestrator/hooks.py` | replan log on `notify_content_mutated` |
| `backend/app/application/admin_content/hooks.py` | `notify_now_playing_changed()` |
| `backend/app/application/admin_content/sse_hub.py` | publish `now_playing_changed` |
| `backend/app/api/content_stream.py` | relax auth; **connect replay** on subscribe |
| `frontend/src/app/features/content/admin-content-stream.service.ts` | handle `now_playing_changed` |
| `frontend/src/app/features/content/content-list.component.ts` | yellow row, off-page hint, a11y |

## Tests

- `backend/tests/unit/test_rotation_plan_snapshot.py` (**new**)
- `backend/tests/unit/test_rotation_logging.py` (**new**)
- `backend/tests/integration/test_admin_content_now_playing_stream.py` (**new**)
- `frontend/src/app/features/content/content-list.component.spec.ts` (extend)
- `frontend/src/app/features/content/admin-content-stream.service.spec.ts` (extend)
- Manual: `quickstart.md`

## Do not read by default

- `specs/archive/**`
- Full ads admin module
- Unrelated display kiosk UI

## Locked product decisions (clarifications 2026-07-30)

- SSE `now_playing_changed` on CHG-047 stream (not inventory refresh)
- Connect replay on stream subscribe (immediate highlight mid-rotation)
- INFO logs always in production
- Yellow row background (no new column); emission beats novelty tint
- All list viewers including `event_operator`
- Clear highlight when top content not on displays

## Problem summary

Operators cannot see which list row is on kiosk air; engineers lack rotation/novelty queue visibility in logs. Extend admin SSE + orchestrator logging without new DB tables.
