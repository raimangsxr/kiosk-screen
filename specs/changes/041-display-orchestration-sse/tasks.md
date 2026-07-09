---
description: "Task list for CHG-041 synchronized multi-kiosk display control"
---

# Tasks: Synchronized multi-kiosk display control

**Input**: Design documents from `/specs/changes/041-display-orchestration-sse/`

**Prerequisites**: `spec.md`, `context-pack.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/{sse-protocol,orchestrator-state-machine,contract-deltas}.md`, `docs/adr/0009-display-orchestration-sse.md`

**Tests**: Mandatory per TQ-002 — orchestrator unit, stream integration, contract, and viewer specs included.

**Organization**: SDD governance → foundational SSE infra → user stories US1–US5 → polling retirement & consolidation.

**Analysis remediation** (2026-07-08): C1 EVENT.BRANDING, G1 content_mutated, G2 orchestrator audit, G3 media_error, G4 load test, U2 SSE auth expiry.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: US1–US5 maps to spec user stories
- Exact file paths required in every task description

## Path Conventions

- Backend orchestrator: `backend/app/application/display_orchestrator/`
- Stream API: `backend/app/api/display_stream.py`
- Frontend viewer: `frontend/src/app/display/`
- Contracts: `specs/contracts/{display-runtime,display-control,display-config-session,content-rotation,display-events-audit,event-branding,ops-platform}/contract.md`
- Change: `specs/changes/041-display-orchestration-sse/`

---

## Phase 1: SDD Governance & Contracts (blocking)

**Purpose**: Merge contract deltas and accept ADR before code (Constitution IV, TQ-001).

**⚠️ CRITICAL**: No implementation below until T001–T009 complete.

- [X] T001 Read `specs/manifest.yml` and `specs/changes/041-display-orchestration-sse/{spec.md,context-pack.md,plan.md,research.md,data-model.md,quickstart.md,contracts/sse-protocol.md,contracts/orchestrator-state-machine.md,contracts/contract-deltas.md}`.
- [X] T002 Merge DISPLAY.RUNTIME section from `specs/changes/041-display-orchestration-sse/contracts/contract-deltas.md` into `specs/contracts/display-runtime/contract.md`.
- [X] T003 [P] Merge DISPLAY.CONTROL section from `specs/changes/041-display-orchestration-sse/contracts/contract-deltas.md` into `specs/contracts/display-control/contract.md`.
- [X] T004 [P] Merge DISPLAY.CONFIG_SESSION section from `specs/changes/041-display-orchestration-sse/contracts/contract-deltas.md` into `specs/contracts/display-config-session/contract.md`.
- [X] T005 [P] Merge CONTENT.ROTATION section from `specs/changes/041-display-orchestration-sse/contracts/contract-deltas.md` into `specs/contracts/content-rotation/contract.md`.
- [X] T006 [P] Merge DISPLAY.EVENTS.AUDIT section from `specs/changes/041-display-orchestration-sse/contracts/contract-deltas.md` into `specs/contracts/display-events-audit/contract.md`.
- [X] T007 [P] Merge EVENT.BRANDING section from `specs/changes/041-display-orchestration-sse/contracts/contract-deltas.md` into `specs/contracts/event-branding/contract.md`.
- [X] T008 [P] Merge OPS.PLATFORM section from `specs/changes/041-display-orchestration-sse/contracts/contract-deltas.md` into `specs/contracts/ops-platform/contract.md`.
- [X] T009 Set `status: Accepted` in `docs/adr/0009-display-orchestration-sse.md` and set `status: in-progress` in `specs/changes/041-display-orchestration-sse/spec.md` frontmatter; update `specs/manifest.yml` CHG-041 `status: in-progress`.

---

## Phase 2: Foundational — Redis & SSE infrastructure (blocking)

**Purpose**: Shared infra for all user stories. Dual mode: SSE for config push; polling still drives rotation until Phase 8.

**Independent Test**: `pytest backend/tests/integration/test_display_stream.py -k register` passes; Redis reachable from backend container.

**Gate G1** (exit Phase 2): 2+ SSE clients receive `config_updated` within 1 s after `PUT /api/configuration`.

- [X] T010 Add `redis:7-alpine` service to `docker-compose.yml` with volume and `backend` dependency; document in `docs/dev/local-lab.md`.
- [X] T011 Add `redis` Python dependency and connection settings in `backend/app/config.py` (URL from env, default `redis://redis:6379/0` in compose).
- [X] T012 [P] Create `backend/app/application/display_orchestrator/redis_state.py` with get/set helpers for keys in `specs/changes/041-display-orchestration-sse/data-model.md`.
- [X] T013 [P] Create `backend/app/application/display_orchestrator/sse_hub.py` with connection registry, local fan-out, and Redis pub/sub subscribe/publish on `pubsub:org:{orgId}:display`.
- [X] T014 Create `backend/app/application/display_orchestrator/snapshot_builder.py` building `snapshot` payload from existing `get_display_state()` in `backend/app/services/display_service.py`.
- [X] T015 Create `backend/app/api/display_stream.py` with `POST /api/display/kiosk/register` and `GET /api/display/stream` per `specs/changes/041-display-orchestration-sse/contracts/sse-protocol.md`.
- [X] T016 Register `display_stream` router in `backend/app/main.py` (or existing API router module).
- [X] T017 Wire `PUT /api/configuration` in `backend/app/api/configuration.py` to publish config change and emit `config_updated` SSE via `sse_hub.py`.
- [X] T018 [P] Create `backend/tests/contract/test_display_stream_openapi.py` asserting register, stream, and events paths exist in OpenAPI schema.
- [X] T019 Create `backend/tests/integration/test_display_stream.py` with tests: register returns `kioskId`; two parallel SSE clients receive `config_updated` after configuration PUT (gate G1).
- [X] T020 [P] Create `frontend/src/app/display/display-stream.models.ts` with TypeScript types for SSE envelope and `config_updated` / `snapshot` payloads per `contracts/sse-protocol.md`.
- [X] T021 Create `frontend/src/app/display/display-stream.service.ts` wrapping `EventSource`, handling reconnect, `Last-Event-ID`, and exposing signals for latest event.
- [X] T022 [P] Create `frontend/src/app/display/display-stream.service.spec.ts` with mock `EventSource`: connect, receive `config_updated`, reconnect on error.
- [X] T023 Integrate `DisplayStreamService` into `frontend/src/app/display/display-screen.component.ts` to apply `config_updated` layout fields (ratios, borders) without reload; keep `DisplayPollingService` for rotation.
- [X] T024 Run `pytest backend/tests/integration/test_display_stream.py -v` and `npm --prefix frontend run test -- --include='**/display-stream**'`.

---

## Phase 3: User Story 1 — Instant configuration propagation (Priority: P1) 🎯 MVP

**Goal**: All connected displays reflect admin configuration changes within 1 second (SC-001).

**Independent Test**: Two browser displays connected; change `topRegionRatio`; both update layout < 1 s without reload.

- [X] T025 [US1] Extend `backend/app/application/display_orchestrator/snapshot_builder.py` to diff layout vs playlist fields and set `applyImmediately` / `changedFields` per `contracts/orchestrator-state-machine.md` config mutation policy.
- [X] T026 [US1] Emit `config_updated` with partial configuration on ratio/border changes; defer `inlineAdCount` to next ad boundary in `backend/app/application/display_orchestrator/sse_hub.py`.
- [X] T027 [US1] Wire `PUT /api/event-configuration` in `backend/app/api/event_configuration.py` to emit `branding_updated` SSE via `sse_hub.py` (replaces CHG-024 poll + BroadcastChannel for kiosks).
- [X] T028 [US1] Extend `frontend/src/app/display/display-screen.component.ts` to apply `branding_updated` via `EventBrandingService.refresh()` and bind `--top-ratio`, `--bottom-ratio`, sponsor border CSS vars from SSE events.
- [X] T029 [P] [US1] Add integration test in `backend/tests/integration/test_display_stream.py`: mid-slide ratio change applies immediately on two SSE clients.
- [X] T030 [US1] Extend `frontend/src/app/display/display-screen.component.spec.ts` to assert CSS vars and branding update on SSE events without polling tick.
- [X] T031 [US1] Manual validation per `specs/changes/041-display-orchestration-sse/quickstart.md` Phase 1 SC-001; record pass in `specs/changes/041-display-orchestration-sse/checklists/requirements.md` notes.

---

## Phase 4: User Story 2 — Synchronized rotation across hall displays (Priority: P1)

**Goal**: All displays show the same top content and advance together (SC-002, SC-006).

**Independent Test**: Three displays in loop; verify same `contentId` after each advance for 5 cycles; ad timer not reset on top advance.

**Gate G2** (exit Phase 4): 3 kiosks same `contentId` × 5 loop cycles without polling.

- [X] T032 [US2] Create `backend/app/application/display_orchestrator/service.py` with Redis-backed state per `contracts/orchestrator-state-machine.md` (cursors, mode, pause, sequence).
- [X] T033 [US2] Create `backend/app/application/display_orchestrator/scheduler.py` with asyncio top and ad timers (independent — FR-012).
- [X] T034 [US2] Implement `advance_top()` loop algorithm in `backend/app/application/display_orchestrator/service.py` per orchestrator state machine (regular queue only in this phase).
- [X] T035 [US2] Implement `advance_ad()` and `show_ads` emission in `backend/app/application/display_orchestrator/service.py`.
- [X] T036 [US2] Implement `schedule_empty_queue_audit()` debounced 200 ms emitting `orchestrator_empty_queue` and fallback `show_content` with `playback.mode=manual` in `backend/app/application/display_orchestrator/service.py`.
- [X] T037 [US2] Emit `orchestrator_advanced` audit event on each top advance in `backend/app/application/display_orchestrator/service.py` per `specs/contracts/display-events-audit/contract.md`.
- [X] T038 [US2] Wire admin content and ad write paths in `backend/app/api/content.py` and `backend/app/api/ads.py` to orchestrator `content_mutated` trigger (playlist refresh at next boundary per FR-009).
- [X] T039 [US2] Bootstrap orchestrator on `POST /api/display/open` in `backend/app/api/display.py`; emit initial `snapshot` + `show_content` + `show_ads`.
- [X] T040 [US2] Extend `backend/app/api/display_stream.py` with `POST /api/display/kiosk/events` for `video_ended` (idempotent on `commandId`) and `media_error` (log + audit, non-blocking) triggering or recording per `contracts/sse-protocol.md`.
- [X] T041 [P] [US2] Create `backend/tests/unit/test_display_orchestrator.py` with tests: ad timer survives top advance; photo timer advance; first `video_ended` advances; empty queue debounce emits `orchestrator_empty_queue`.
- [X] T042 [US2] Extend `backend/tests/integration/test_display_stream.py` with `test_multi_kiosk_same_command_id` — 3 logical kiosks, 5 loop cycles, same `contentId` (gate G2); add test that `inlineAdCount` change defers `show_ads` until next ad tick (requires T035).
- [X] T043 [US2] Create `frontend/src/app/display/display-viewer.controller.ts` applying `show_content` and `show_ads` to template state; report `video_ended` and `media_error` via HTTP.
- [X] T044 [P] [US2] Create `frontend/src/app/display/display-viewer.controller.spec.ts` for `show_content` render state, `video_ended` POST, and `media_error` POST.
- [X] T045 [US2] Add `DISPLAY_ORCHESTRATOR` feature flag in frontend environment; when true, `display-screen.component.ts` uses `DisplayViewerController` instead of `KioskRotationController` timers.
- [X] T046 [US2] Run `pytest backend/tests/unit/test_display_orchestrator.py backend/tests/integration/test_display_stream.py -v` and viewer specs.

---

## Phase 5: User Story 3 — Remote control affects every screen (Priority: P1)

**Goal**: Pause, resume, next, previous, jump_to fan-out to all displays within 1 s (SC-003).

**Independent Test**: Pause with 3 displays — all freeze; resume — all continue same item.

- [X] T047 [US3] Wire `PUT /api/display/remote-control/state` and `POST /api/display/remote-control/navigation` in `backend/app/api/display.py` to orchestrator triggers emitting `mode_changed` / `show_content`.
- [X] T048 [US3] Implement pause/resume in `backend/app/application/display_orchestrator/service.py` (freeze top timer, ads continue per FR-011).
- [X] T049 [US3] Implement `next`, `previous`, `jump_to` navigation in `backend/app/application/display_orchestrator/service.py`.
- [X] T050 [US3] Implement fixed mode entry/exit and auto-fallback in `backend/app/application/display_orchestrator/service.py` (integrate `DisplayControlService` rules from `backend/app/application/display_control/service.py`).
- [X] T051 [P] [US3] Add unit tests in `backend/tests/unit/test_display_orchestrator.py`: pause freezes top not ads; jump_to; fixed auto-fallback to loop.
- [X] T052 [US3] Add integration test in `backend/tests/integration/test_display_stream.py`: remote pause/resume fan-out to 3 clients within 1 s.
- [X] T053 [US3] Extend `frontend/src/app/display/display-viewer.controller.ts` to handle `mode_changed` and fixed/iframe display modes.
- [X] T054 [US3] Run `pytest backend/tests/integration/test_remote_control_api.py` and new stream fan-out tests.

---

## Phase 6: User Story 4 — Public upload novelty on every screen (Priority: P2)

**Goal**: Public API novelty appears on all displays at next loop boundary (SC-005).

**Independent Test**: Public upload with 3 loop-mode displays; all show novelty on next boundary in display order.

- [X] T055 [US4] Implement novelty queue and burst logic in `backend/app/application/display_orchestrator/service.py` per CHG-027 parity in `contracts/orchestrator-state-machine.md`.
- [X] T056 [US4] Orchestrator consumes novelty in DB on emit (replace first-kiosk-wins); wire `POST /api/public/content/upload` handler to orchestrator content-mutated trigger in `backend/app/api/v1/public_content/`.
- [X] T057 [US4] Implement recurring counters and due detection in `backend/app/application/display_orchestrator/service.py` per CHG-039 rules in `specs/changes/039-independent-recurring-counters/contracts/recurring-cadence-behavior.md`.
- [X] T058 [US4] Implement iframe mode (`show_iframe`) and availability background tick (30 s) in `backend/app/application/display_orchestrator/scheduler.py`.
- [X] T059 [US4] Emit `preload` events before upcoming content in `backend/app/application/display_orchestrator/service.py`.
- [X] T060 [P] [US4] Port CHG-027 and CHG-039 acceptance scenarios to `backend/tests/unit/test_display_orchestrator.py`.
- [X] T061 [US4] Extend `backend/tests/integration/test_public_content_novelty.py` for orchestrator path (all kiosks receive same novelty `commandId`).
- [X] T062 [US4] Extend `frontend/src/app/display/display-viewer.controller.ts` for novelty slides, iframe, and preload hints.
- [X] T063 [US4] Run `pytest backend/tests/integration/test_public_content_novelty.py backend/tests/unit/test_display_orchestrator.py -v`.

---

## Phase 7: User Story 5 — Displays recover from brief disconnections (Priority: P2)

**Goal**: Reconnect + snapshot within 5 s; session supersede; idempotent events (SC-004).

**Independent Test**: Disconnect display 30 s; reconnect; same program as peers within 5 s.

- [X] T064 [US5] Implement SSE event buffer in Redis (`sse:buffer:{orgId}:{sessionId}`) in `backend/app/application/display_orchestrator/redis_state.py` with replay or `snapshot` fallback per `contracts/sse-protocol.md`.
- [X] T065 [US5] Handle `Last-Event-ID` on reconnect in `backend/app/api/display_stream.py`.
- [X] T066 [US5] Emit `session_ended` when `open_display` supersedes session in `backend/app/services/display_service.py` via `sse_hub.py`.
- [X] T067 [US5] Supersede duplicate `clientInstanceId` registrations in `backend/app/api/display_stream.py` (close prior SSE with reason `superseded`).
- [X] T068 [US5] Implement reconnecting indicator in `frontend/src/app/display/display-stream.service.ts` (CHG-030 parity); show last frame during gap; on SSE 401/403 close stream and navigate to login (reuse `DisplayPollingService` fatal auth UX).
- [X] T069 [P] [US5] Add tests in `backend/tests/integration/test_display_stream.py`: reconnect receives `snapshot`; duplicate `video_ended` idempotent; `session_ended` on supersede.
- [X] T070 [US5] Add `frontend/src/app/display/display-stream.service.spec.ts` cases for reconnect, `session_ended` UI state, and fatal 401 closes stream.
- [X] T071 [US5] Optional: create `kiosk_connections` model in `backend/app/repositories/models/kiosk_connection.py` + Alembic migration for ops audit trail.
- [X] T072 [US5] Emit `kiosk_connected` / `kiosk_disconnected` audit events per `specs/contracts/display-events-audit/contract.md` from `backend/app/application/display_orchestrator/sse_hub.py`.

---

## Phase 8: Polish — Retire polling & consolidation

**Purpose**: Plan Phase 4 completion; remove legacy paths; consolidate contracts.

**Gate G3**: All P1 scenarios automated; no polling in happy path.

- [X] T073 Remove `DisplayPollingService` provider from `frontend/src/app/display/display-screen.component.ts`; delete or deprecate `frontend/src/app/display/display-polling.service.ts` and `display-polling.service.spec.ts`.
- [X] T074 Remove timer ownership from `frontend/src/app/display/kiosk-rotation.controller.ts`; retain only if needed for tests, else delete with `kiosk-rotation.controller.spec.ts` scenarios ported to backend.
- [X] T075 Remove kiosk-path `BroadcastChannel` sync from `frontend/src/app/core/event-config-sync.service.ts` (admin cross-tab may remain); retire kiosk use of `frontend/src/app/core/display-control-sync.service.ts` per updated contracts.
- [X] T076 Add Alembic migration deprecating `remote_control_polling_seconds` on `kiosk_display_configurations` (or mark deprecated in schema first per rollout policy).
- [X] T077 Mark `GET /api/display/state` deprecated in OpenAPI; document fallback-only in `specs/contracts/display-config-session/contract.md`.
- [X] T078 Implement polling fallback only when SSE down > 60 s with visible banner in `frontend/src/app/display/display-screen.component.ts`.
- [X] T079 [P] Run full validation from `specs/changes/041-display-orchestration-sse/quickstart.md` (SC-001 through SC-006 soak).
- [X] T080 [P] Add optional load test in `backend/tests/integration/test_display_stream.py`: 50 concurrent SSE registrations per org complete without connection drops (plan performance goal).
- [X] T081 Run `pytest backend/tests`, `npm --prefix frontend run test`, `npm --prefix frontend run build`, Docker builds per `AGENTS.md`.
- [X] T082 Consolidate CHG-041 behavior into active contracts; set `status: implemented` in `specs/changes/041-display-orchestration-sse/spec.md` and `specs/manifest.yml`; record validation evidence in `checklists/requirements.md`.

---

## Dependencies & Execution Order

```text
Phase 1 (T001–T009) ──blocks──► Phase 2 (T010–T024)
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              Phase 3 US1       Phase 4 US2       (parallel after G1)
              (T025–T031)       (T032–T046)
                    │                 │
                    └────────┬────────┘
                             ▼
                       Phase 5 US3 (T047–T054)
                             │
                             ▼
                       Phase 6 US4 (T055–T063)
                             │
                             ▼
                       Phase 7 US5 (T064–T072)
                             │
                             ▼
                       Phase 8 Polish (T073–T082)
```

### User story dependencies

| Story | Depends on | Can start after |
|-------|------------|-----------------|
| US1 | Phase 2 | T024 |
| US2 | Phase 2, US1 layout/branding apply | T031 |
| US3 | US2 orchestrator | T046 |
| US4 | US2 loop engine | T046 |
| US5 | Phase 2 SSE | T024 (partial); full after US2 |

### Parallel opportunities

| Group | Tasks | Notes |
|-------|-------|-------|
| Contract merges | T003–T008 | Different contract files |
| Backend/frontend SSE | T012–T013, T020–T022 | After T011 |
| Orchestrator tests | T041, T051, T060 | Same file — sequence |
| Phase 8 cleanup | T073–T077 | Different files |

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Complete Phase 1 + Phase 2 (T001–T024).
2. Complete Phase 3 (T025–T031).
3. **STOP and validate**: SC-001 manual + integration test gate G1.
4. Demo to operators: config and branding change visible on all displays < 1 s.

### Incremental delivery

1. MVP → US2 → US3 → US4 → US5 → Phase 8.

### Suggested MVP scope

**Phases 1–3** (T001–T031): SSE config + branding fan-out with dual-mode rotation.

---

## Task Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| 1 Governance | T001–T009 (9) | — |
| 2 Foundational | T010–T024 (15) | — |
| 3 US1 Config | T025–T031 (7) | US1 |
| 4 US2 Sync rotation | T032–T046 (15) | US2 |
| 5 US3 Remote | T047–T054 (8) | US3 |
| 6 US4 Novelty | T055–T063 (9) | US4 |
| 7 US5 Resilience | T064–T072 (9) | US5 |
| 8 Polish | T073–T082 (10) | — |
| **Total** | **82** | |

### Independent test criteria (per story)

| Story | Independent test |
|-------|------------------|
| US1 | Two displays; ratio + branding change < 1 s on both |
| US2 | Three displays; same contentId × 5 cycles; ads independent |
| US3 | Pause/resume all displays within 1 s |
| US4 | Public upload → all displays show novelty next boundary |
| US5 | 30 s disconnect → reconnect → same program within 5 s |
