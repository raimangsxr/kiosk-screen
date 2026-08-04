# Implementation Plan: Precarga de medios de novedades e indicador de cola

**Input**: Feature specification from `specs/changes/050-novelty-media-preload/spec.md`  
**Branch**: `050-novelty-media-preload` | **Date**: 2026-08-04 | **Spec**: [spec.md](./spec.md)

## Context Grounding

- Manifest read: yes (`CONTENT.ROTATION`, `DISPLAY.RUNTIME`)
- Active contracts read: `specs/contracts/content-rotation/contract.md`, `specs/contracts/display-runtime/contract.md`
- Change specs read: CHG-050 (active), CHG-027 (novelty queue), CHG-041 (orchestrator SSE), CHG-048 (rotation plan snapshot)
- Context pack read or created: [context-pack.md](./context-pack.md)
- ADRs read: `docs/adr/0009-display-orchestration-sse.md`
- Code entrypoints verified:
  - Backend: `rotation_logic.emit_preload`, `rotation_logic.advance_loop_top`, `hooks.notify_content_mutated`, `snapshot_builder.build_snapshot_payload`, `service.handle_media_error`, `rotation_plan.compute_rotation_plan_snapshot`
  - Frontend: `display-media-cache.service.ts`, `display-screen.component.ts`, `display-viewer.controller.ts`, `display-stream.models.ts`
- Tests identified: novelty preload unit/integration, media_error advance, gate + indicator Angular specs, existing display-stream tests
- Archived or consolidated specs read: none

## Summary

Eliminate black frames when heavy novelty (and regular) media rotates on kiosks by **preloading on queue entry**, **gating slide commit until media is ready** (latest `show_content` wins), and **advancing rotation on first `media_error`**. Add a **discrete on-screen novelty queue indicator** (icon per pending novelty, check when ready, error on failure, remove on display, max 5 + N).

## Technical Context

**Language/Version**: Python 3.12 (FastAPI), TypeScript / Angular 19+  
**Primary Dependencies**: Existing `DisplayOrchestrator`, `DisplayMediaCacheService`, display SSE hub  
**Storage**: PostgreSQL + Redis orchestrator state; no new tables  
**Testing**: `pytest backend/tests`, `npm --prefix frontend run test`  
**Target Platform**: Kiosk display runtime (`/display`) + orchestrator backend  
**Project Type**: Full-stack web app  
**Performance Goals**: SC-001–SC-006 (no black >300 ms; preload ≤2 s; commit ≤500 ms when cached; recovery ≤30 s)  
**Constraints**: No server-side ready ack; multi-kiosk desync acceptable; indicator subtle (public may see); contract update before code  
**Scale/Scope**: All top loop content + novelty indicator; ads out of scope

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status |
|------|--------|
| Active contract identified and read | pass — `CONTENT.ROTATION`, `DISPLAY.RUNTIME` |
| Manifest update needed and planned | pass — tasks will update `manifest.yml` |
| Context pack created/updated | pass — [context-pack.md](./context-pack.md) |
| Contract update required before implementation | yes — [contracts/contract-deltas.md](./contracts/contract-deltas.md) |
| Tests planned for changed behavior | pass — see Phase 2 approach |
| Security and user-facing error exposure considered | pass — no new secrets; `media_error` metadata internal |
| Observability/audit impact considered | pass — existing `media_error` audit + rotation advance |
| No archived or superseded specs used without justification | pass |

**Post-design re-check**: pass (decisions in [research.md](./research.md))

## Project Structure

### Documentation for this change

```text
specs/changes/050-novelty-media-preload/
├── spec.md
├── context-pack.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── display-preload-sse.md
│   ├── kiosk-media-gate.md
│   ├── novelty-queue-indicator.md
│   └── contract-deltas.md
└── tasks.md                    # /speckit-tasks
```

### Source code touched

```text
backend/
├── app/application/display_orchestrator/
│   ├── rotation_logic.py       # emit novelty preload; move regular preload timing
│   ├── hooks.py                # emit preload on content mutation replan
│   ├── snapshot_builder.py     # pendingNovelties in snapshot
│   ├── service.py              # handle_media_error → advance_top (deduped)
│   └── preload.py              # NEW — build preload items from plan snapshot
├── app/api/mappers.py          # if snapshot typing needed
└── tests/
    ├── unit/test_novelty_preload_emit.py
    ├── unit/test_media_error_advance.py
    └── integration/test_display_preload_sse.py

frontend/
├── src/app/display/
│   ├── display-media-cache.service.ts      # FIFO scheduler, ready probes
│   ├── display-content-gate.service.ts     # NEW — latest-wins gate
│   ├── novelty-queue-tracker.service.ts    # NEW — tracker state
│   ├── novelty-queue-indicator.component.ts # NEW — overlay UI
│   ├── display-screen.component.ts         # wire gate + indicator
│   ├── display-screen.component.html       # overlay host
│   ├── display-stream.models.ts            # isNovelty, pendingNovelties
│   └── *.spec.ts

specs/contracts/content-rotation/contract.md
specs/contracts/display-runtime/contract.md
specs/manifest.yml
```

## Phase 0: Outline & Research

Completed — see [research.md](./research.md).

Key decisions:

1. Reuse SSE `preload`; add `isNovelty` per item.
2. Emit preload on novelty queue change + after each top emit for next regular.
3. Extend snapshot with `pendingNovelties` for reconnect (clarification).
4. New `DisplayContentGateService` — latest wins, no commit until ready.
5. Extend `handle_media_error` to `advance_top` (today only audits).
6. FIFO download scheduler max 3 in `DisplayMediaCacheService`.
7. `NoveltyQueueIndicatorComponent` — 5 icons + N, check/error/remove on commit.

## Phase 1: Design & Contracts

Completed — see [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md).

### Active contract updates (before implementation)

Apply [contracts/contract-deltas.md](./contracts/contract-deltas.md) to `CONTENT.ROTATION`.

### Implementation sequence (for tasks.md)

| Phase | Stories | Focus |
|-------|---------|-------|
| 1 | US2 | Backend preload emit + snapshot `pendingNovelties` + `isNovelty` field |
| 2 | US1, US3 | Media cache scheduler + content gate + wire display-screen |
| 3 | US4 | Gate timeout + `media_error` advance (backend + client) |
| 4 | US5 | Novelty queue tracker + indicator overlay |
| 5 | — | Contract + manifest + quickstart validation |

## Phase 2: Task Planning Approach

- Map tasks to user stories US1–US5 from spec.md.
- Backend-first for preload/snapshot so frontend can integrate against real SSE.
- Gate unit tests with mocked cache; indicator tests with tracker + fake cache signals.
- Integration: public upload → preload SSE → novelty icon → gate no-black transition.
- **Critical gap**: `handle_media_error` must gain `advance_top` before E2E skip tests pass.

### Test strategy

| Behavior | Test type |
|----------|-----------|
| Preload on novelty upload | backend integration |
| Snapshot `pendingNovelties` | backend unit |
| media_error advances rotation | backend unit |
| Gate holds until blob ready | frontend unit |
| Latest show_content wins | frontend unit |
| Indicator 5+N, check, error, remove | frontend component |
| No black frame on heavy video | manual + optional e2e stub |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New gate service (client) | Separate pending vs committed content | Direct `applyShowContent` causes black frames |
| Snapshot field addition | Reconnect indicator backfill | Preload-only loses state on disconnect (clarification) |
| Video canplaythrough probe | SC-001 for video | Blob-only insufficient |
