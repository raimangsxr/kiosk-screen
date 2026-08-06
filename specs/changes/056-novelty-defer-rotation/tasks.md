---
description: "Task list for CHG-056 novelty defer rotation"
---

# Tasks: Diferir novedades en rotación tolerante a bajo ancho de banda (CHG-056)

**Input**: Design documents from `/specs/changes/056-novelty-defer-rotation/`

**Prerequisites**: `spec.md`, `context-pack.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/{contract-deltas,novelty-defer-rotation}.md`

**Tests**: Mandatory per TQ-002 — backend defer/ready/integration tests, CHG-050 regression updates, frontend gate/config/tracker/reconnect specs, manual `quickstart.md` (SC-001–SC-005).

**Organization**: SDD governance → foundational schema/types → US1 defer core (P1) 🎯 MVP → US2 config + discard (P1) → US3 multi-novelty FIFO (P2) → US4 indicator sync (P2) → polish & validation.

**Analyze remediation (2026-08-07)**: Addresses C1, G1–G6, I1, I2, A1, U1 from `/speckit-analyze` report.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: US1–US4 maps to spec user stories
- Exact file paths required in every task description

## Path Conventions

- Defer logic: `backend/app/application/display_orchestrator/novelty_defer.py`
- Orchestrator: `backend/app/application/display_orchestrator/{rotation_logic,rotation_plan,preload,snapshot_builder,service,sse_hub}.py`
- Kiosk API: `backend/app/api/display_stream.py`
- Config: `backend/app/repositories/models/kiosk_configuration.py`, `backend/app/api/configuration.py`
- Kiosk runtime: `frontend/src/app/display/{display-content-gate,novelty-preload-ready,novelty-queue-tracker,display-screen}.*`
- Admin: `frontend/src/app/features/display-config/`
- Contracts: `specs/contracts/{content-rotation,display-runtime,display-config-session,content-ads-admin}/contract.md`
- Change: `specs/changes/056-novelty-defer-rotation/`

---

## Phase 1: SDD Governance & Contracts (blocking)

**Purpose**: Merge contract deltas before code (Constitution IV, TQ-001).

**⚠️ CRITICAL**: Complete before Phase 3.

- [X] T001 Read `specs/manifest.yml` and `specs/changes/056-novelty-defer-rotation/{spec.md,context-pack.md,plan.md,research.md,data-model.md,quickstart.md,contracts/contract-deltas.md,contracts/novelty-defer-rotation.md}`.
- [X] T002 Merge `CONTENT.ROTATION` section from `specs/changes/056-novelty-defer-rotation/contracts/contract-deltas.md` into `specs/contracts/content-rotation/contract.md` (defer-first novelty, ready aggregation, rescheduled regular, discard consume, enriched snapshot).
- [X] T003 [P] Merge `DISPLAY.RUNTIME` section from `specs/changes/056-novelty-defer-rotation/contracts/contract-deltas.md` into `specs/contracts/display-runtime/contract.md` (gate bypass for novelties, `novelty_preload_ready` posting, indicator discard sync).
- [X] T004 [P] Merge `DISPLAY.CONFIG_SESSION` and `CONTENT.ADS.ADMIN` sections from `specs/changes/056-novelty-defer-rotation/contracts/contract-deltas.md` into `specs/contracts/display-config-session/contract.md` and `specs/contracts/content-ads-admin/contract.md`.
- [X] T005 Add CHG-056 entry `status: in-progress` to `specs/manifest.yml` under `changes:`; add `CHG-056` to `related_changes` for `CONTENT.ROTATION`, `DISPLAY.RUNTIME`, `DISPLAY.CONFIG_SESSION`, `CONTENT.ADS.ADMIN`; extend `owns` paths per `plan.md`; set `status: in-progress` in `specs/changes/056-novelty-defer-rotation/spec.md` frontmatter.
- [X] T006 Confirm ADR decision documented in `specs/changes/056-novelty-defer-rotation/research.md` §ADR decision (no new ADR file; revisit triggers recorded) — Constitution V.

**Checkpoint**: Contracts and manifest updated; implementation may begin.

---

## Phase 2: Foundational — Schema, Types & Helpers (blocking)

**Purpose**: DB column, API shapes, orchestrator state keys, shared helpers used by all user stories.

**⚠️ CRITICAL**: Complete before Phase 3.

- [X] T007 Create Alembic migration adding `novelty_max_defer_transitions INTEGER NOT NULL DEFAULT 3` with `CHECK (novelty_max_defer_transitions BETWEEN 1 AND 10)` on `kiosk_display_configurations` in `backend/alembic/versions/`.
- [X] T008 Add `novelty_max_defer_transitions` column mapping (default 3) to `KioskDisplayConfiguration` in `backend/app/repositories/models/kiosk_configuration.py`.
- [X] T009 [P] Expose `noveltyMaxDeferTransitions` on configuration GET/PUT schemas and mappers in `backend/app/api/configuration.py` (and related Pydantic/DTO modules if split).
- [X] T010 [P] Add `noveltyMaxDeferTransitions` to `KioskConfiguration` type and API client in `frontend/src/app/core/api/display.api.ts`.
- [X] T011 [P] Extend `pendingNovelties` entry type with `deferCount`, `maxDefer`, `downloadReady` in `frontend/src/app/display/display-stream.models.ts`.
- [X] T012 [P] Add `novelty_preload_ready` to kiosk event request schema and validation in `backend/app/api/display_stream.py` (or shared kiosk events schema module).
- [X] T013 Create `backend/app/application/display_orchestrator/novelty_defer.py` with helpers: `get_connected_kiosk_ids(hub, org, session)`, `is_novelty_ready(state, content_id, connected_ids)`, `increment_defer_count(state, content_id)`, `prune_novelty_state(state, content_id)`, `set_rescheduled_regular(state, content_id)` — unit-testable pure functions where possible.

**Checkpoint**: Schema and shared types ready.

---

## Phase 3: User Story 1 — Novedad pesada con rotación continua (P1) 🎯 MVP

**Goal**: Rotation continues with regular items while novelty downloads; when all connected kiosks ready, novelty emits replacing next regular slot; displaced regular shows on following transition.

**Independent test**: Throttled network + heavy novelty — rotation advances through ≥2 regular items without black hold; novelty emits after check; rescheduled regular follows (spec US1 scenarios 1–4).

**Requires Phase 2**.

### Backend — defer advance algorithm

- [X] T014 [US1] Refactor `advance_loop_top` in `backend/app/application/display_orchestrator/rotation_logic.py`: (1) emit `rescheduledRegularContentId` if set; (2) evaluate head novelty ready via `novelty_defer.is_novelty_ready`; (3) emit novelty + set rescheduled regular + `consume_novelty` when ready; (4) increment defer and fall through to regular when not ready; do not consume novelty on defer; skip defer evaluation when not in loop mode (FR-010 backend guard).
- [X] T015 [US1] Implement `handle_novelty_preload_ready(session, kiosk_id, content_id)` in `backend/app/application/display_orchestrator/service.py` updating `noveltyReadyKiosks` in Redis state (idempotent per kiosk/content).
- [X] T016 [US1] Wire `novelty_preload_ready` branch in `post_kiosk_event` in `backend/app/api/display_stream.py` to call `orchestrator.handle_novelty_preload_ready`.
- [X] T017 [US1] Expose connected kiosk IDs for orchestrator from `DisplaySseHub` in `backend/app/application/display_orchestrator/sse_hub.py` (method used by `novelty_defer.get_connected_kiosk_ids`).
- [X] T018 [US1] On kiosk disconnect in `backend/app/application/display_orchestrator/sse_hub.py`, remove kiosk from all `noveltyReadyKiosks` entries in orchestrator state.
- [X] T019 [US1] Extend `pending_novelty_items` / snapshot builder in `backend/app/application/display_orchestrator/preload.py` and `backend/app/application/display_orchestrator/snapshot_builder.py` to include `deferCount`, `maxDefer`, `downloadReady` per novelty.

### Backend — tests

- [X] T020 [P] [US1] Add `backend/tests/unit/test_novelty_defer_advance.py`: defer when not ready (regular emitted, defer++); emit when all ready; rescheduled regular on next boundary (1→2→3→6→4); **priority emission when ready at max−1 defer** (spec edge: emit over discard); **SC-005** bounded queue (`deferCount` never exceeds `maxDefer + 1` boundaries without emit/discard).
- [X] T021 [P] [US1] Add `backend/tests/unit/test_novelty_preload_ready.py`: idempotent ready per kiosk; readiness when all connected report; disconnected kiosk excluded.
- [X] T022 [P] [US1] Add `backend/tests/integration/test_display_novelty_defer_sse.py`: upload novelty → regular `show_content` sequence while not ready → novelty `show_content` with `reason: novelty` when kiosks post ready; assert preload still emitted on enqueue (FR-001 regression).
- [X] T023 [P] [US1] Extend `backend/tests/integration/test_display_novelty_defer_sse.py` (or add `test_display_novelty_defer_multi_kiosk.py`): two kiosks — fast kiosk alone insufficient; after slow disconnect, novelty emits (`quickstart.md` §3, FR-012).
- [X] T024 [P] [US1] Add `backend/tests/unit/test_novelty_defer_inactive_modes.py`: `advance_loop_top` does not defer/evaluate novelty when `isPaused`, `contentMode=fixed`, or `contentMode=iframe` (FR-010).

### Frontend — gate bypass + ready reporter

- [X] T025 [US1] Bypass display gate for `payload.reason === 'novelty'` (commit immediately) in `frontend/src/app/display/display-content-gate.service.ts`; keep gate unchanged for regular content.
- [X] T026 [US1] Create `frontend/src/app/display/novelty-preload-ready.service.ts` posting `novelty_preload_ready` to `POST /api/display/kiosk/events` when `DisplayMediaCacheService` reaches ready for pending novelty URLs (dedupe per contentId per session).
- [X] T027 [US1] Wire `NoveltyPreloadReadyService` from `frontend/src/app/display/display-screen.component.ts` on preload + snapshot `pendingNovelties` warm completion paths (respect FR-010 loop-only guards).
- [X] T028 [P] [US1] Add `frontend/src/app/display/display-content-gate.service.spec.ts` cases: novelty commits immediately without hold; regular content still waits for ready.
- [X] T029 [P] [US1] Add `frontend/src/app/display/novelty-preload-ready.service.spec.ts` for deduped ready POST on cache ready.
- [X] T030 [P] [US1] Add `frontend/src/app/display/novelty-preload-ready.service.spec.ts` cases: no `novelty_preload_ready` POST when paused, fixed content, or iframe active (FR-010).
- [X] T031 [P] [US1] Add `frontend/src/app/display/display-screen.component.spec.ts` case: after simulated SSE reconnect + snapshot with enriched `pendingNovelties`, tracker rebuilds defer metadata and re-posts ready for cached novelties (FR-012a).

**Checkpoint**: US1 MVP — defer rotation + synchronized novelty emit + rescheduled regular.

---

## Phase 4: User Story 2 — Límite configurable de aplazamientos (P1)

**Goal**: Operator configures max defer transitions; discard consumes `isNovelty` without display when max exceeded; config propagates to kiosks.

**Independent test**: Set max=2, slow novelty → after 2 defers icon gone, Admin `isNovelty` cleared, rotation continues (spec US2).

**Requires Phase 3** (defer counter exists).

### Backend — discard + config hot reload

- [X] T032 [US2] In `advance_loop_top` defer branch in `backend/app/application/display_orchestrator/rotation_logic.py`, when `deferCount >= configuration.novelty_max_defer_transitions`, call `consume_novelty` without `show_content` and prune defer/ready state via `novelty_defer.prune_novelty_state`.
- [X] T033 [US2] On configuration save with lowered `novelty_max_defer_transitions`, trim active `noveltyDeferCounts` values to new max in `backend/app/application/display_orchestrator/service.py` `apply_config_deferred_fields` (or dedicated hook).
- [X] T034 [P] [US2] Add unit test in `backend/tests/unit/test_novelty_defer_advance.py` for max-defer discard: `is_novelty` cleared, no `show_content`, regular continues.
- [X] T035 [P] [US2] Add integration test in `backend/tests/integration/test_novelty_defer_admin_discard.py` (or extend defer SSE test): after max-defer discard, admin content list no longer shows `isNovelty` and inventory SSE refresh fires (FR-008 / G5).

### Frontend — admin configuration + kiosk propagation

- [X] T036 [US2] Add «Máximo de aplazamientos de novedad» integer control (min 1, max 10, default 3) to admin form template in `frontend/src/app/features/display-config/display-config.component.html`.
- [X] T037 [US2] Bind `noveltyMaxDeferTransitions` in form model, validation, and PUT payload in `frontend/src/app/features/display-config/display-config.component.ts` and `frontend/src/app/features/display-config/display-config.facade.ts`.
- [X] T038 [US2] Apply `noveltyMaxDeferTransitions` from `config_updated` SSE in `frontend/src/app/display/display-screen.component.ts` (store on runtime config used by tracker/orchestrator client state); no page reload required (FR-007).
- [X] T039 [P] [US2] Extend `frontend/src/app/features/display-config/display-config.component.spec.ts` for load/save/validation of `noveltyMaxDeferTransitions`.
- [X] T040 [P] [US2] Add `frontend/src/app/display/display-screen.component.spec.ts` case: `config_updated` with new `noveltyMaxDeferTransitions` updates kiosk state within same tick (SC-004 automated proxy).

**Checkpoint**: US2 — configurable max defer + discard consume in Admin + config propagation.

---

## Phase 5: User Story 3 — Múltiples novedades en cola (P2)

**Goal**: Independent defer counters per novelty; FIFO emission; head novelty blocks tail.

**Independent test**: Novelties A and B — A ready first emits before B; B keeps own defer count (spec US3).

**Requires Phase 3**.

- [X] T041 [US3] Ensure `noveltyDeferCounts` and `noveltyReadyKiosks` in `backend/app/application/display_orchestrator/novelty_defer.py` are keyed per `contentId` and only head novelty is evaluated in `advance_loop_top` in `backend/app/application/display_orchestrator/rotation_logic.py`.
- [X] T042 [US3] Update `compute_rotation_plan_snapshot` in `backend/app/application/display_orchestrator/rotation_plan.py` to reflect defer state and rescheduled regular in planned `next` when applicable.
- [X] T043 [P] [US3] Add multi-novelty scenarios to `backend/tests/unit/test_novelty_defer_advance.py`: A defers while B waiting; A emits when ready; B never jumps ahead of A; multiple discards same boundary in FIFO order.

**Checkpoint**: US3 — FIFO multi-novelty defer independence.

---

## Phase 6: User Story 4 — Visibilidad operativa del estado de aplazamiento (P2)

**Goal**: Indicator shows pending/ready/error during defer; icons removed on emit or server discard.

**Independent test**: Observe overlay through defer cycle — no check during defer, check when ready, removed on emit/discard (spec US4).

**Requires Phase 3** (snapshot enrichment T019).

- [X] T044 [US4] Extend `NoveltyQueueEntry` with optional `deferCount`/`maxDefer` in `frontend/src/app/display/novelty-queue-tracker.service.ts`; merge from snapshot `pendingNovelties` on `syncFromSnapshot` (FR-003: check from local cache without changing visible slide).
- [X] T045 [US4] Remove tracker entries when `contentId` absent from latest snapshot/preload pending set (server discard) in `frontend/src/app/display/novelty-queue-tracker.service.ts`.
- [X] T046 [US4] Keep local `downloadStatus` driving check icon; do not remove icon on defer-only regular transitions in `frontend/src/app/display/novelty-queue-indicator.component.ts` (verify no regression).
- [X] T047 [P] [US4] Extend `frontend/src/app/display/novelty-queue-tracker.service.spec.ts` for defer metadata sync, discard removal, ready check state, and reconnect snapshot backfill.

**Checkpoint**: US4 — operator-visible defer states without UX regression.

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: CHG-050 regression, logging, validation, consolidation.

- [X] T048 [P] Audit and update CHG-050 tests for novelty gate removal: `frontend/src/app/display/display-content-gate.service.spec.ts`, `frontend/src/app/display/display-screen.component.spec.ts`, `backend/tests/integration/test_display_media_error_multi_kiosk.py` — novelty must not trigger gate hold/`media_error` advance; regular `media_error` behavior unchanged (G1).
- [X] T049 [P] Extend `rotation_plan` / `rotation_replan` logging in `backend/app/application/display_orchestrator/rotation_logging.py` with `deferCounts` and `rescheduledRegular` when present.
- [X] T050 Run `pytest backend/tests/unit/test_novelty_defer_advance.py backend/tests/unit/test_novelty_preload_ready.py backend/tests/unit/test_novelty_defer_inactive_modes.py backend/tests/integration/test_display_novelty_defer_sse.py -q` (include admin discard test module if split).
- [X] T051 Run targeted frontend specs: `display-content-gate.service.spec.ts`, `novelty-preload-ready.service.spec.ts`, `novelty-queue-tracker.service.spec.ts`, `display-config.component.spec.ts`, `display-screen.component.spec.ts` via `npm --prefix frontend run test`.
- [X] T052 Execute manual scenarios in `specs/changes/056-novelty-defer-rotation/quickstart.md` §1–5; record pass/fail for **SC-001 through SC-005** in `specs/changes/056-novelty-defer-rotation/checklists/requirements.md` §Success Criteria Validation (evidence table).
- [X] T053 Verify no regression: regular content gate still holds on slow download in `frontend/src/app/display/display-content-gate.service.spec.ts` and `quickstart.md` §4 (FR-013).
- [X] T054 Sync `specs/changes/056-novelty-defer-rotation/context-pack.md` with final test paths, entrypoints, and resolved analyze gaps (G6).
- [X] T055 Set `status: implemented` in `specs/changes/056-novelty-defer-rotation/spec.md` and `specs/manifest.yml` when validated.
- [X] T056 Consolidate CHG-056 behavior into active contracts if drift found; mark change `consolidated` when promoted to source of truth; reference `research.md` §ADR decision in consolidation notes.

---

## Dependencies & Execution Order

```text
Phase 1 (T001–T006) ──blocks──► all implementation
Phase 2 (T007–T013) ──blocks──► Phase 3+
Phase 3 US1 (T014–T031) ──blocks──► Phase 4–6
Phase 4 US2 (T032–T040) ──after──► Phase 3 (defer counter)
Phase 5 US3 (T041–T043) ──after──► Phase 3
Phase 6 US4 (T044–T047) ──after──► T019 (snapshot fields)
Phase 7 (T048–T056) ──after──► all story phases
```

### User story completion order

| Order | Story | Priority | Depends on |
|-------|-------|----------|------------|
| 1 | US1 Defer + emit + reschedule | P1 | Phase 2 |
| 2 | US2 Max defer + config | P1 | US1 backend defer |
| 3 | US3 Multi-novelty FIFO | P2 | US1 |
| 4 | US4 Indicator visibility | P2 | US1 snapshot + tracker |

### Parallel opportunities

```text
# Phase 1 contract merges (after T002):
T003 ‖ T004

# Phase 2 (after T007–T008):
T009 ‖ T010 ‖ T011 ‖ T012

# Phase 3 backend tests (after T014–T019):
T020 ‖ T021 ‖ T022 ‖ T023 ‖ T024

# Phase 3 frontend tests (after T025–T027):
T028 ‖ T029 ‖ T030 ‖ T031

# Phase 4:
T034 ‖ T035 ‖ T039 ‖ T040  (after T032–T038)

# Phase 7:
T048 ‖ T049 ‖ T050 ‖ T051  (after story phases)
```

---

## Implementation Strategy

### MVP (minimum shippable)

1. Complete Phase 1–2.
2. Complete Phase 3 (US1) → **rotation continues on slow novelty; emit when all ready; rescheduled regular**.
3. Validate with `quickstart.md` §1 before continuing.

### Incremental delivery

1. US1 → core defer + gate bypass + ready events (MVP)
2. US2 → admin config + discard consume + config_updated
3. US3 → multi-novelty FIFO hardening
4. US4 → indicator defer metadata polish
5. Phase 7 → CHG-050 regression + full SC validation

### Task totals

| Phase | Tasks | Story |
|-------|-------|-------|
| 1 Governance | 6 | — |
| 2 Foundational | 7 | — |
| 3 US1 | 18 | US1 |
| 4 US2 | 9 | US2 |
| 5 US3 | 3 | US3 |
| 6 US4 | 4 | US4 |
| 7 Polish | 9 | — |
| **Total** | **56** | |

**Parallelizable [P]**: 24 tasks

---

## Independent Test Criteria (summary)

| Story | How to verify independently |
|-------|----------------------------|
| US1 | `quickstart.md` §1 + `test_novelty_defer_advance.py` + multi-kiosk integration + FR-010 inactive-mode tests + reconnect spec |
| US2 | `quickstart.md` §2 + config spec + discard unit/integration + `config_updated` spec (SC-004) |
| US3 | Multi-novelty unit scenarios in `test_novelty_defer_advance.py` |
| US4 | Tracker spec + `quickstart.md` §1 icon observation |

## Requirement traceability (TQ-002)

| Requirement | Task IDs |
|-------------|----------|
| FR-001 preload | T022 |
| FR-002 defer → regular | T014, T020 |
| FR-003 check sin cambiar slide | T044, T047 |
| FR-004 / FR-004a emit + reschedule | T014, T020 |
| FR-005 defer counter | T013, T041 |
| FR-006 admin config | T036–T037 |
| FR-007 config propagate | T038, T040, T052 (SC-004) |
| FR-008 discard + consume | T032, T034, T035, T045 |
| FR-009 FIFO | T041, T043 |
| FR-010 inactive modes | T014, T024, T027, T030 |
| FR-011 sync | T014, T022, T023 |
| FR-012 / FR-012a ready + reconnect | T015–T018, T021, T031, T047 |
| FR-013 regular gate | T025, T028, T053 |
| FR-014 no novelty gate | T025, T028, T048 |
| SC-005 bounded queue | T020, T052 |
