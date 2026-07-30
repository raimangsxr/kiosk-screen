# Implementation Plan: Contenido en emisión y trazabilidad de rotación

**Input**: Feature specification from `specs/changes/048-content-now-playing/spec.md`  
**Branch**: `048-content-now-playing` | **Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md)

## Context Grounding

- Manifest read: yes (`CONTENT.ADS.ADMIN`, `CONTENT.ROTATION`)
- Active contracts read: `content-ads-admin`, `content-rotation`, `display-runtime` (orchestrator state fields)
- Change specs read: CHG-048 (active), CHG-047 (admin SSE), CHG-041 (orchestrator), CHG-046 (list UX)
- Context pack read or created: [context-pack.md](./context-pack.md)
- ADRs read: `docs/adr/0009-display-orchestration-sse.md`
- Code entrypoints verified:
  - Backend: `rotation_logic.emit_top_content`, `service.advance_top`, `admin_content/hooks.py`, `admin_content/sse_hub.py`, `content_stream.py`
  - Frontend: `admin-content-stream.service.ts`, `content-list.component.ts`
- Tests identified: rotation snapshot unit tests, integration SSE `now_playing_changed`, log format tests, content-list row highlight specs
- Archived or consolidated specs read: none

## Summary

Extend the admin content list with a **yellow row background** for the item currently on air, driven by a new SSE event `now_playing_changed` on the existing admin content stream (CHG-047). Extend stream auth to any authenticated user who can read the list (`event_operator` included). Add structured **INFO** rotation logs on every top-content emit and on novelty-queue replanning without emit, using a shared `compute_rotation_plan_snapshot()` helper aligned with orchestrator logic.

## Technical Context

**Language/Version**: Python 3.12 (FastAPI), TypeScript / Angular 19+  
**Primary Dependencies**: Existing `AdminContentSseHub`, `DisplayOrchestrator`, browser `EventSource`  
**Storage**: PostgreSQL + Redis orchestrator state (`currentTopContentId` already persisted); no new tables  
**Testing**: `pytest backend/tests`, `npm --prefix frontend run test`  
**Target Platform**: Admin `/admin/content` + backend orchestrator  
**Project Type**: Full-stack web app  
**Performance Goals**: Highlight update ≤3 s (SC-002); replan log ≤2 s after upload (SC-004)  
**Constraints**: No new table column in UI; yellow row distinct from novelty orange; clear highlight when `contentMode != loop` top emit or paused/ads; Spanish a11y labels  
**Scale/Scope**: One `now_playing_changed` per org per emit; INFO logs per rotation step (acceptable volume for live events)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status |
|------|--------|
| Active contract identified and read | pass — `CONTENT.ADS.ADMIN`, `CONTENT.ROTATION` |
| Manifest update needed and planned | pass — CHG-048 entry in tasks |
| Context pack created/updated | pass — [context-pack.md](./context-pack.md) |
| Contract update required before implementation | yes — [contracts/contract-deltas.md](./contracts/contract-deltas.md) |
| Tests planned for changed behavior | pass |
| Security and user-facing error exposure considered | pass — stream read widened to match `GET /content`; logs ids/titles only |
| Observability/audit impact considered | pass — INFO rotation logs (new observability surface) |
| No archived or superseded specs used without justification | pass |

**Post-design re-check**: pass (all decisions in [research.md](./research.md))

## Project Structure

### Documentation for this change

```text
specs/changes/048-content-now-playing/
├── spec.md
├── context-pack.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── admin-content-stream-now-playing.md
│   ├── rotation-plan-logging.md
│   └── contract-deltas.md
└── tasks.md                    # /speckit-tasks
```

### Source code touched

```text
backend/
├── app/application/admin_content/
│   ├── hooks.py                # notify_now_playing_changed
│   └── sse_hub.py              # publish now_playing_changed envelope
├── app/application/display_orchestrator/
│   ├── rotation_plan.py        # NEW — compute_rotation_plan_snapshot()
│   ├── rotation_logging.py     # NEW — log_rotation_plan / log_rotation_replan
│   ├── rotation_logic.py       # call logging + now_playing after emit_top_content
│   ├── remote_control.py       # now_playing on remote jumps / mode changes
│   └── hooks.py                # replan log on notify_content_mutated
├── app/api/content_stream.py   # relax auth → get_current_user
└── tests/
    ├── unit/test_rotation_plan_snapshot.py
    ├── unit/test_rotation_logging.py
    └── integration/test_admin_content_now_playing_stream.py

frontend/
├── src/app/features/content/
│   ├── admin-content-stream.service.ts   # handle now_playing_changed
│   ├── content-list.component.ts         # row class, off-page hint, a11y
│   ├── content-list.component.css        # .content-list__row--on-air (yellow)
│   └── *.spec.ts

specs/contracts/content-ads-admin/contract.md
specs/contracts/content-rotation/contract.md
specs/manifest.yml
```

## Phase 0: Outline & Research

Completed — see [research.md](./research.md).

Key decisions:

1. **Reuse `currentTopContentId`** in orchestrator Redis state as source of truth for `now_playing_changed`.
2. **New SSE event** on existing admin hub; no full list refresh on rotation-only changes.
3. **Relax stream auth** from `CONTENT_MANAGEMENT_ROLES` to `get_current_user` (matches `GET /content` list access).
4. **`compute_rotation_plan_snapshot()`** centralizes showing/next/novelties for logs and replan events.
5. **Two log kinds**: `rotation_plan` (after emit) and `rotation_replan` (queue change, same showing).
6. **Clear now playing** on `mode_changed` away from active top content (ads, iframe-only, pause without top).

## Phase 1: Design & Contracts

Completed — see [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md).

### Active contract updates (before implementation)

- `specs/contracts/content-ads-admin/contract.md` — yellow row highlight, `now_playing_changed`, stream auth, off-page hint
- `specs/contracts/content-rotation/contract.md` — rotation plan INFO logging, snapshot semantics

### Publish / log trigger matrix

| Trigger | SSE `now_playing_changed` | Log `rotation_plan` | Log `rotation_replan` |
|---------|---------------------------|---------------------|------------------------|
| `emit_top_content` (rotation, novelty, remote) | yes (`contentId`) | yes | no |
| `notify_content_mutated` (upload) while showing unchanged | no | no | yes |
| `mode_changed` → ads / no top | yes (`contentId: null`) | yes (`rotation_plan` with `showing: null`) | no |
| Admin stream subscribe | yes (replay current state) | no | no |
| No active orchestrator | no | no | no |

## Phase 2: Task Planning Approach

- **Phase A (backend core)**: `rotation_plan.py`, `rotation_logging.py`, wire emits + replan hooks, unit tests.
- **Phase B (SSE)**: `notify_now_playing_changed`, hub publish, relax stream auth, integration tests.
- **Phase C (frontend)**: stream handler, `nowPlayingContentId` signal, row CSS, off-page hint, specs.
- **Phase D (governance)**: contract deltas, manifest, quickstart validation.

Test strategy: unit-test snapshot against fixture playlists (regular, novelty insert, recurring); integration test SSE event after `advance_top`; frontend test row class + hint; log capture test with `caplog`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Shared snapshot helper | Logs and replan must match real `advance_top` | Duplicating cursor logic in logger drifts from orchestrator |
| Stream auth relaxation | `event_operator` must see live highlight (clarification) | Separate poll endpoint adds latency and duplicate state |
