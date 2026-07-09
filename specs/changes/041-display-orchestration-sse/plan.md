# Implementation Plan: Synchronized multi-kiosk display control

**Branch**: `041-display-orchestration-sse` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/changes/041-display-orchestration-sse/spec.md`

## Context Grounding

- Manifest read: `specs/manifest.yml` (CHG-041 entry present, status draft)
- Active contracts read: `DISPLAY.RUNTIME`, `DISPLAY.CONTROL`, `DISPLAY.CONFIG_SESSION`,
  `CONTENT.ROTATION`, `DISPLAY.EVENTS.AUDIT`, `OPS.PLATFORM`
- Change specs read: `spec.md`, `context-pack.md`, `contracts/sse-protocol.md`,
  `contracts/orchestrator-state-machine.md`
- Context pack read or created: `context-pack.md` (updated)
- ADRs read: `docs/adr/0009-display-orchestration-sse.md`
- Code entrypoints verified:
  - `backend/app/services/display_service.py`
  - `backend/app/application/display_control/service.py`
  - `frontend/src/app/display/kiosk-rotation.controller.ts`
  - `frontend/src/app/display/display-polling.service.ts`
  - `frontend/src/app/display/display-screen.component.ts`
- Tests identified:
  - `backend/tests/integration/test_display_api.py` (extend)
  - new `backend/tests/integration/test_display_stream.py`
  - new `backend/tests/unit/test_display_orchestrator.py`
  - `frontend/src/app/display/kiosk-rotation.controller.spec.ts` (parity reference)
  - new `display-stream.service.spec.ts`, `display-viewer.controller.spec.ts`
- Archived or consolidated specs read: none

## Summary

Move display program authority from kiosk clients to the backend. A
**DisplayOrchestrator** owns rotation cursor, timers, recurring counters, and
novelty queue per active operator session. Connected displays register, subscribe
to an SSE command stream, render `show_content` / `show_ads` instructions, and
report playback facts via HTTP. Admin and remote-control mutations fan-out to
all displays within one second. Implementation is phased: SSE infra first (dual
mode with polling), then server rotation, then advanced parity (recurring,
novelty, availability), then polling retirement.

## Technical Context

| Dimension | Value |
|-----------|-------|
| **Languages** | Python 3.12+ (FastAPI), TypeScript / Angular 20 |
| **Primary dependencies** | FastAPI, SQLAlchemy, Alembic, PostgreSQL, Redis (new), Angular `EventSource` |
| **Storage** | PostgreSQL (config, playlists, sessions); Redis (orchestrator hot state, SSE buffer, pub/sub) |
| **Testing** | pytest (unit + integration), Jasmine/Karma (viewer + stream client) |
| **Target** | Kiosk `/display` route; new backend stream endpoints |
| **Performance** | Config fan-out < 1 s (SC-001); 50 concurrent SSE connections per org (validated in T083) |
| **Constraints** | Live-event safety; phased migration with polling fallback until Phase 4; cookie/session auth for SSE |
| **Scale** | Multi-kiosk per organization (3–20 typical); multi-replica backend via Redis pub/sub |

## Constitution Check

*GATE: passed before Phase 0 and after Phase 1.*

| Principle | Status |
|-----------|--------|
| Active contracts identified | pass — six contracts listed in spec |
| Manifest update planned | pass — CHG-041 entry exists; paths updated at implementation |
| Context pack present | pass — `context-pack.md` |
| Contract update before implementation | yes — `contracts/contract-deltas.md` |
| Tests for changed behavior | pass — orchestrator unit + stream integration + viewer specs |
| Security / error exposure | pass — session-scoped streams; no tokens in SSE URLs when cookies used |
| Observability / audit | pass — new connection/orchestrator events in DISPLAY.EVENTS.AUDIT |
| No unjustified archive reads | pass |
| Durable rationale in ADR | pass — ADR-0009 |

## Project Structure

### Documentation for this change

```text
specs/changes/041-display-orchestration-sse/
├── spec.md
├── context-pack.md
├── plan.md                         ← this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── sse-protocol.md
│   ├── orchestrator-state-machine.md
│   └── contract-deltas.md
├── checklists/requirements.md
└── tasks.md                        ← /speckit-tasks
```

### Source code (planned)

```text
backend/
├── app/
│   ├── application/display_orchestrator/
│   │   ├── service.py              # state machine
│   │   ├── scheduler.py            # asyncio timers
│   │   ├── redis_state.py
│   │   └── sse_hub.py
│   ├── api/
│   │   ├── display_stream.py       # SSE + register + events
│   │   └── display.py              # wire orchestrator triggers
│   └── repositories/models/
│       └── kiosk_connection.py     # optional Phase 2
├── alembic/versions/               # kiosk_connections (optional)
└── tests/
    ├── unit/test_display_orchestrator.py
    └── integration/test_display_stream.py

frontend/
└── src/app/display/
    ├── display-stream.service.ts
    ├── display-viewer.controller.ts
    └── display-screen.component.ts  # slim down; remove polling path Phase 4

docker-compose.yml                   # add redis service
```

## Phase 0: Outline & Research

Completed — see [research.md](./research.md). All technical unknowns resolved:

- SSE + HTTP reverse channel (not WebSockets)
- Redis for multi-replica fan-out and orchestrator state
- Novelty consumed by orchestrator (semantic change from CHG-027)
- Phased migration retaining polling fallback until Phase 4

## Phase 1: Design & Contracts

Completed artifacts:

| Artifact | Path |
|----------|------|
| Data model | [data-model.md](./data-model.md) |
| SSE protocol | [contracts/sse-protocol.md](./contracts/sse-protocol.md) |
| State machine | [contracts/orchestrator-state-machine.md](./contracts/orchestrator-state-machine.md) |
| Contract deltas | [contracts/contract-deltas.md](./contracts/contract-deltas.md) |
| Quickstart | [quickstart.md](./quickstart.md) |
| ADR | [docs/adr/0009-display-orchestration-sse.md](../../docs/adr/0009-display-orchestration-sse.md) |

### Active contract updates (before implementation)

Merge `contracts/contract-deltas.md` sections into:

1. `specs/contracts/display-runtime/contract.md`
2. `specs/contracts/display-control/contract.md`
3. `specs/contracts/display-config-session/contract.md`
4. `specs/contracts/content-rotation/contract.md`
5. `specs/contracts/display-events-audit/contract.md`
6. `specs/contracts/event-branding/contract.md`
7. `specs/contracts/ops-platform/contract.md`

### Task phases vs plan phases

| Plan phase (plan.md) | Task phases (tasks.md) | Gate |
|----------------------|------------------------|------|
| 1 — SSE infra | Phase 1–2 + Phase 3 (US1) | G1 |
| 2 — Core orchestrator | Phase 4 (US2) + Phase 5 (US3) | G2 |
| 3 — Advanced parity | Phase 6 (US4) | — |
| 4 — Retire polling | Phase 7 (US5) + Phase 8 | G3 |

## Phase 2: Task Planning Approach

Tasks will be grouped by implementation phase and mapped to user stories:

| Phase | User stories | Key deliverable |
|-------|--------------|-----------------|
| 1 | US-1 (partial), US-5 (partial) | SSE + config fan-out, dual mode |
| 2 | US-1, US-2, US-3 | Orchestrator loop/ads/remote |
| 3 | US-4, US-2 (recurring) | Novelty, recurring, fixed/iframe |
| 4 | US-5 | Retire polling; contract consolidation |

### Test strategy

1. **Unit** — `DisplayOrchestrator` ports scenarios from
   `kiosk-rotation.controller.spec.ts` (FR-012, pause, recurring, novelty).
2. **Contract** — SSE envelope JSON schema validation.
3. **Integration** — parallel HTTP clients simulate 3 kiosks; assert same
   `commandId` sequence after admin PUT and remote navigation.
4. **Frontend** — `DisplayStreamService` reconnect; viewer applies `show_content`.
5. **Manual** — quickstart.md soak test for SC-001–SC-006.

### Phase gates

| Gate | Criterion |
|------|-----------|
| G1 → Phase 2 | 2+ SSE clients receive `config_updated` < 1 s after PUT |
| G2 → Phase 3 | 3 kiosks show same `contentId` for 5 loop cycles without polling |
| G3 → Phase 4 | All P1 acceptance scenarios automated; polling not in happy path |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Redis dependency | Multi-replica SSE fan-out | In-memory fan-out fails with >1 backend pod |
| Dual mode (poll + SSE) during migration | Live-event safety | Big-bang cutover too risky for venues |
| Orchestrator in Python | Single source of truth for N kiosks | Client-side rotation cannot synchronize hall displays |

## Estimated effort

| Phase | Duration |
|-------|----------|
| 1 — SSE infra | 1.5–2 weeks |
| 2 — Core orchestrator | 3–4 weeks |
| 3 — Advanced parity | 2 weeks |
| 4 — Retire polling | 1 week |
| **Total** | **7.5–9 weeks** |
