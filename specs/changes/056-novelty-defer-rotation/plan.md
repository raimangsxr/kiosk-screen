# Implementation Plan: Diferir novedades en rotación tolerante a bajo ancho de banda

**Input**: Feature specification from `specs/changes/056-novelty-defer-rotation/spec.md`  
**Branch**: `056-novelty-defer-rotation` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)

## Context Grounding

- Manifest read: yes (`CONTENT.ROTATION`, `DISPLAY.RUNTIME`, `DISPLAY.CONFIG_SESSION`, `CONTENT.ADS.ADMIN`)
- Active contracts read:
  - `specs/contracts/content-rotation/contract.md`
  - `specs/contracts/display-runtime/contract.md`
  - `specs/contracts/display-config-session/contract.md`
  - `specs/contracts/content-ads-admin/contract.md`
- Change specs read: CHG-056 (active), CHG-050 (preload/gate baseline), CHG-041 (orchestrator), CHG-027 (novelty queue)
- Context pack read or created: [context-pack.md](./context-pack.md)
- ADRs read: `docs/adr/0009-display-orchestration-sse.md`
- Code entrypoints verified:
  - Backend: `rotation_logic.advance_loop_top`, `rotation_plan.compute_rotation_plan_snapshot`, `preload.pending_novelty_items`, `service.handle_media_error`, `display_stream.post_kiosk_event`, `kiosk_configuration` model
  - Frontend: `display-content-gate.service.ts`, `novelty-queue-tracker.service.ts`, `display-screen.component.ts`, `display-config` feature
- Tests identified: new unit/integration defer + ready tests; extend gate and display-config specs
- Archived or consolidated specs read: none

## Summary

Replace CHG-050 **client-side novelty gate** (hold slide until ready) with **server-orchestrated defer**: rotation continues with regular items while novelties preload; each boundary defers emission if not all connected kiosks report ready, up to **`noveltyMaxDeferTransitions`** (Admin config, default 3); ready novelties **replace** the next regular slot and **reschedule** the displaced item for the following transition; max-defer **discards consume** `isNovelty` without showing.

## Technical Context

**Language/Version**: Python 3.12 (FastAPI), TypeScript / Angular 19+  
**Primary Dependencies**: `DisplayOrchestrator`, Redis orchestrator state, `DisplaySseHub`, `DisplayContentGateService`, `NoveltyQueueTrackerService`  
**Storage**: PostgreSQL (`novelty_max_defer_transitions` column); Redis defer/ready/rescheduled state  
**Testing**: `pytest backend/tests`, `npm --prefix frontend run test`  
**Target Platform**: Kiosk `/display` runtime + admin `/admin/configuration`  
**Project Type**: Full-stack web app  
**Performance Goals**: SC-001–SC-005 (no rotation freeze on novelty; 90 %+ show rate on slow networks with max≥3)  
**Constraints**: Multi-kiosk sync; contract update before code; Spanish admin UI; preserve regular content gate  
**Scale/Scope**: Loop-mode novelty path + configuration field; ads/sponsor strip out of scope

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status |
|------|--------|
| Active contract identified and read | pass — four contracts listed above |
| Manifest update needed and planned | pass — `CHG-056` on related_changes during implement |
| Context pack created/updated | pass — [context-pack.md](./context-pack.md) |
| Contract update required before implementation | yes — [contracts/contract-deltas.md](./contracts/contract-deltas.md) |
| Tests planned for changed behavior | pass — see Phase 2 |
| Security and user-facing error exposure considered | pass — no new secrets; kiosk events authenticated |
| Observability/audit impact considered | pass — extended rotation_plan logs; consume on discard |
| No archived or superseded specs used without justification | pass |

**Post-design re-check**: pass (decisions in [research.md](./research.md))

## Project Structure

### Documentation for this change

```text
specs/changes/056-novelty-defer-rotation/
├── spec.md
├── context-pack.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── contract-deltas.md
│   └── novelty-defer-rotation.md
└── tasks.md                    # /speckit-tasks
```

### Source code touched

```text
backend/
├── alembic/versions/               # novelty_max_defer_transitions column
├── app/repositories/models/kiosk_configuration.py
├── app/api/
│   ├── configuration.py            # schema GET/PUT
│   └── display_stream.py           # novelty_preload_ready handler
├── app/application/display_orchestrator/
│   ├── novelty_defer.py            # NEW — ready check, defer/discard helpers
│   ├── rotation_logic.py           # advance_loop_top defer algorithm
│   ├── rotation_plan.py            # plan reflects defer + rescheduled
│   ├── snapshot_builder.py         # enriched pendingNovelties
│   ├── preload.py                  # optional defer metadata on replan
│   ├── service.py                  # handle_novelty_preload_ready; disconnect hook
│   └── sse_hub.py                  # expose connected kiosk ids to orchestrator
└── tests/
    ├── unit/test_novelty_defer_advance.py
    ├── unit/test_novelty_preload_ready.py
    └── integration/test_display_novelty_defer_sse.py

frontend/
├── src/app/core/api/display.api.ts           # noveltyMaxDeferTransitions
├── src/app/features/display-config/          # form field + validation
├── src/app/display/
│   ├── display-content-gate.service.ts       # bypass novelty
│   ├── novelty-preload-ready.service.ts      # NEW — post ready events
│   ├── novelty-queue-tracker.service.ts      # defer metadata from snapshot
│   ├── display-screen.component.ts           # wire ready reporter
│   └── display-stream.models.ts              # snapshot types
└── *.spec.ts

specs/contracts/{content-rotation,display-runtime,display-config-session,content-ads-admin}/contract.md
specs/manifest.yml
```

## Phase 0: Outline & Research

Completed — see [research.md](./research.md).

Key decisions:

1. Server-owned defer/discard/emission (not client gate for novelties).
2. New kiosk event `novelty_preload_ready`.
3. Redis state: `noveltyDeferCounts`, `noveltyReadyKiosks`, `rescheduledRegularContentId`.
4. Advance algorithm with rescheduled regular slot (clarification Q1).
5. All connected kiosks must report ready (Q2); disconnected excluded (Q3).
6. Config field on `/admin/configuration` (Q4); discard consumes `isNovelty` (Q5).
7. Gate bypass for `reason === 'novelty'` only.

## Phase 1: Design & Contracts

Completed — see [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md).

Active contract updates (before code):

- Apply [contract-deltas.md](./contracts/contract-deltas.md) to four active contracts.
- Interface detail: [novelty-defer-rotation.md](./contracts/novelty-defer-rotation.md).

No new ADR required for v1; defer rationale captured in research R1/R4. Consider ADR if ops later needs per-event audit rows.

## Phase 2: Task Planning Approach

Map tasks to user stories:

| Story | Backend | Frontend | Tests |
|-------|---------|----------|-------|
| US1 Defer + emit + reschedule | `novelty_defer.py`, `advance_loop_top`, ready handler | gate bypass, ready reporter | integration defer SSE |
| US2 Max defer + config | migration, configuration API, discard path | admin form field | unit discard + config spec |
| US3 FIFO multi-novelty | defer maps per id | tracker sync | unit multi-novelty |
| US4 Indicator states | enriched snapshot | tracker defer fields | tracker spec |

**Test strategy**:

1. Unit: advance with mock ready sets — defer, emit, reschedule, discard.
2. Unit: ready aggregation with connect/disconnect kiosk sets.
3. Integration: upload novelty + throttle → assert regular `show_content` sequence then novelty.
4. Frontend: gate bypass for novelty; regular gate unchanged.
5. Manual: [quickstart.md](./quickstart.md) slow-network checklist.

**Suggested task phases** (`/speckit-tasks`):

1. Contract + manifest + migration + API schema
2. Orchestrator defer core (backend)
3. Kiosk ready event + snapshot enrichment
4. Frontend gate bypass + ready reporter + tracker
5. Admin configuration UI
6. Polish + validation

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New kiosk event type | Server must aggregate multi-kiosk readiness | Client-only defer desyncs displays |
| Redis defer state | Rescheduled regular + per-novelty counters across boundaries | Stateless advance cannot reschedule item 4 after novelty 6 |
| Server emit only when all ready | Clarified sync requirement | Fastest-kiosk-wins shows novelty before slow kiosk cached |

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Race: ready arrives mid-advance | Readiness checked only at boundary; ready kiosks persist in Redis |
| Rescheduled + recurring collision | Process rescheduled slot first in advance (step 1) |
| Lower max defer mid-flight | Spec: trim counts on config save; unit test |
| Novelty gate `media_error` removed | Monitor rotation logs; regular gate still reports errors |
