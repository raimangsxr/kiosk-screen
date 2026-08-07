# Implementation Plan: Priorizar novedades descargadas

**Input**: Feature specification from `/specs/changes/058-prioritize-ready-novelties/spec.md`  
**Branch**: `058-prioritize-ready-novelties` | **Date**: 2026-08-07 | **Spec**: [spec.md](spec.md)

## Context Grounding

- Manifest read: yes, `specs/manifest.yml`
- Active contracts read: `CONTENT.ROTATION`
- Change specs read: `CHG-058`; `CHG-056` only because this change extends its defer/reschedule semantics
- Context pack read or created: `specs/changes/058-prioritize-ready-novelties/context-pack.md`
- ADRs read: none; no durable architectural choice changes
- Code entrypoints verified: `rotation_logic.py`, `rotation_plan.py`, `service.py`
- Tests identified: `backend/tests/unit/test_novelty_defer_advance.py`, `backend/tests/unit/test_rotation_plan_snapshot.py`
- Archived or consolidated specs read: none

## Summary

At each loop boundary, prioritize the ready FIFO novelty head before the preserved regular slot. Move the existing rescheduled-regular decision behind novelty readiness/defer evaluation in both the mutating advance path and the read-only planner. Keep the existing Redis fields, readiness aggregation, defer counters, timers, and public events unchanged.

## Technical Context

**Language/Version**: Python 3.12  
**Primary Dependencies**: FastAPI application layer, SQLAlchemy, Redis-backed orchestrator state  
**Storage**: Existing PostgreSQL content rows and Redis orchestrator state; no migration  
**Testing**: pytest unit tests with fakeredis and SQLAlchemy test session  
**Target Platform**: Backend display orchestrator  
**Project Type**: FastAPI + Angular web application  
**Performance Goals**: Constant additional work per boundary; no extra network round trip  
**Constraints**: Preserve FIFO, multi-kiosk readiness, defer/discard bounds, regular cursor, recurring counters, and live-event safety  
**Scale/Scope**: One ordering change in loop rotation plus planning/log parity

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Active contract identified and read: pass
- Manifest update needed and planned: pass; CHG-058 registered and linked to `CONTENT.ROTATION`
- Context pack created/updated: pass
- Contract update required before implementation: yes; completed in `specs/contracts/content-rotation/contract.md`
- Tests planned for changed behavior: pass
- Security and user-facing error exposure considered: pass; no new input or error surface
- Observability/audit impact considered: pass; planner and rotation logs must report the same next item as execution
- No archived or superseded specs used without justification: pass

## Project Structure

### Documentation for this change

```text
specs/changes/058-prioritize-ready-novelties/
├── spec.md
├── context-pack.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md
```

### Source code touched

```text
backend/
├── app/application/display_orchestrator/rotation_logic.py
├── app/application/display_orchestrator/rotation_plan.py
└── tests/unit/
    ├── test_novelty_defer_advance.py
    └── test_rotation_plan_snapshot.py
```

## Phase 0: Outline & Research

- Confirm whether the existing `rescheduledRegularContentId` can preserve the regular slot across multiple novelty emissions.
- Confirm ordering parity between `advance_loop_top()` and `compute_rotation_plan_snapshot()`.
- Record why no frontend, API, persistence migration, or ADR is required.

## Phase 1: Design & Contracts

- Data model: reuse existing `noveltyBurstActive`, `rescheduledRegularContentId`, readiness maps, and defer counters; document state invariants in `data-model.md`.
- API/UI contracts: no public shape change; add an internal rotation decision contract in `contracts/rotation-order.md`.
- Active contract updates: `CONTENT.ROTATION` updated before implementation.
- ADR updates: none; this is a local policy refinement within the established orchestrator architecture.
- Post-design constitution re-check: all gates remain pass.

## Phase 2: Task Planning Approach

- US1 tasks add failing burst/cursor tests, reorder execution and planner selection, and verify `1,6,7,8,2,3`.
- US2 tasks retain and extend tests for a blocked FIFO head, defer/discard behavior, and planner parity.
- Run the two narrow unit modules first, then the complete backend test suite if time permits.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | — | — |
