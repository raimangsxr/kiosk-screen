# Context Pack: CHG-041 Display Orchestration SSE

**Change**: `specs/changes/041-display-orchestration-sse/`
**Status**: draft (plan complete)
**Branch**: `041-display-orchestration-sse`

## Read first (in order)

1. `specs/changes/041-display-orchestration-sse/tasks.md`
2. `specs/changes/041-display-orchestration-sse/plan.md`
2. `docs/adr/0009-display-orchestration-sse.md`
3. `specs/changes/041-display-orchestration-sse/contracts/sse-protocol.md`
4. `specs/changes/041-display-orchestration-sse/contracts/orchestrator-state-machine.md`
5. `specs/changes/041-display-orchestration-sse/contracts/contract-deltas.md`
6. `specs/changes/041-display-orchestration-sse/spec.md`

## Active contracts to update before coding

- `specs/contracts/display-runtime/contract.md`
- `specs/contracts/display-control/contract.md`
- `specs/contracts/display-config-session/contract.md`
- `specs/contracts/content-rotation/contract.md`
- `specs/contracts/display-events-audit/contract.md`
- `specs/contracts/event-branding/contract.md`
- `specs/contracts/ops-platform/contract.md`

## Code to replace (Phase 4)

| Current | Role |
|---|---|
| `frontend/src/app/display/display-polling.service.ts` | Poll loop |
| `frontend/src/app/display/kiosk-rotation.controller.ts` | Rotation timers |
| `frontend/src/app/display/rotation-scheduler.service.ts` | setTimeout |
| `frontend/src/app/display/recurring-cadence.service.ts` | Counter math → port to Python |
| `frontend/src/app/core/display-control-sync.service.ts` | Cross-tab (partial retire) |

## Code to study (parity reference)

| File | Why |
|---|---|
| `backend/app/services/display_service.py` | Eligibility filters |
| `backend/app/application/display_control/service.py` | Remote control + fixed fallback |
| `frontend/src/app/display/kiosk-rotation.controller.ts` | State machine source of truth today |
| `frontend/src/app/display/kiosk-rotation.controller.spec.ts` | Acceptance oracle for orchestrator tests |
| `specs/changes/027-public-content-novelty-rotation/spec.md` | Novelty semantics delta |
| `specs/changes/039-independent-recurring-counters/contracts/recurring-cadence-behavior.md` | Counter rules |

## Locked product decisions

- Level 2 orchestration; SSE push; HTTP reverse channel
- Fan-out per organization on active session
- Config layout immediate; playlist at boundary
- Novelty consumed by orchestrator (not first-kiosk-wins)
- Polling fallback until Phase 4

## Implementation phases (from plan.md)

| Phase | Gate |
|-------|------|
| 1 SSE infra | 2+ clients receive config < 1 s |
| 2 Orchestrator | 3 kiosks same contentId × 5 cycles |
| 3 Parity | CHG-027 + CHG-039 scenarios pass server-side |
| 4 Cleanup | No polling in happy path |

## New backend modules (planned)

```
backend/app/application/display_orchestrator/
backend/app/api/display_stream.py
```

## New frontend modules (planned)

```
frontend/src/app/display/display-stream.service.ts
frontend/src/app/display/display-viewer.controller.ts
```

## Do not read by default

- `specs/archive/**`
- Consolidated change specs unless manifest points here
- Full `kiosk-rotation.controller.ts` after Phase 2 starts — prefer spec + state machine doc

## Validation commands

```sh
pytest backend/tests -k "orchestrator or display_stream"
npm --prefix frontend run test -- --include='**/display-stream**'
docker compose up -d redis
```

See `quickstart.md` for manual multi-kiosk procedures.
