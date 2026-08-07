---
description: "Task list for CHG-057 ad rotation recovery"
---

# Tasks: Recuperación automática de rotación de anuncios en kioskos (CHG-057)

**Input**: Design documents from `/specs/changes/057-fix-ad-rotation-recovery/`

**Prerequisites**: `spec.md`, `context-pack.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/contract-deltas.md`

**Tests**: Mandatory per TQ-002 — backend ensure/reaper/visibility/poll tests, frontend viewer/polling/fingerprint specs, manual `quickstart.md` (SC-001–SC-004; SC-005 post-launch ops).

**Organization**: SDD governance → foundational runtime state + API/types → US1 reconnect recovery (P1) 🎯 MVP → US2 adsVisible rearma (P1) → US3 fallback poll sync (P2) → US4 animation dedupe split (P2) → polish & validation.

**Analyze remediation (2026-08-07)**: Addresses I1, C1–C3, U1, U2, I2, G1 from `/speckit-analyze` report.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: US1–US4 maps to spec user stories
- Exact file paths required in every task description

## Path Conventions

- Orchestrator: `backend/app/application/display_orchestrator/{hooks,runtime_state,service,remote_control,snapshot_builder,reaper}.py`
- APIs: `backend/app/api/{display,display_stream,schemas}.py`
- Kiosk runtime: `frontend/src/app/display/{display-stream,display-screen,display-viewer.controller,display-polling,display-fingerprint}.*`
- API client: `frontend/src/app/core/api/display.api.ts`
- Contracts: `specs/contracts/{content-rotation,display-runtime}/contract.md`
- Change: `specs/changes/057-fix-ad-rotation-recovery/`

---

## Phase 1: SDD Governance & Contracts (blocking)

**Purpose**: Merge contract deltas before code (Constitution IV, TQ-001).

**⚠️ CRITICAL**: Complete before user-story implementation phases (Phases 3–6).

- [X] T001 Read `specs/manifest.yml` and `specs/changes/057-fix-ad-rotation-recovery/{spec.md,context-pack.md,plan.md,research.md,data-model.md,quickstart.md,contracts/contract-deltas.md}`.
- [X] T002 Merge `CONTENT.ROTATION` section from `specs/changes/057-fix-ad-rotation-recovery/contracts/contract-deltas.md` into `specs/contracts/content-rotation/contract.md` (ensure on stream/state, ads visibility rearma, polled `currentTop`/`currentAds`).
- [X] T003 [P] Merge `DISPLAY.RUNTIME` section from `specs/changes/057-fix-ad-rotation-recovery/contracts/contract-deltas.md` into `specs/contracts/display-runtime/contract.md` (fallback sync, poll fingerprint, animation vs media dedupe amendment).
- [X] T004 Add CHG-057 entry `status: in-progress` to `specs/manifest.yml` under `changes:`; add `CHG-057` to `related_changes` for `CONTENT.ROTATION` and `DISPLAY.RUNTIME`; set `status: in-progress` in `specs/changes/057-fix-ad-rotation-recovery/spec.md` frontmatter.
- [X] T005 Confirm ADR decision in `specs/changes/057-fix-ad-rotation-recovery/research.md` §ADR decision (no new ADR file) — Constitution V.

**Checkpoint**: Contracts and manifest updated; implementation may begin.

---

## Phase 2: Foundational — Runtime State & Types (blocking)

**Purpose**: Shared orchestrator runtime payload builder and API/client shapes used by US1 and US3.

**⚠️ CRITICAL**: Complete before Phase 5 (US3 client sync). US1 backend ensure can start after T006–T008.

- [X] T006 Create `backend/app/application/display_orchestrator/runtime_state.py` with `build_current_top_payload(session, orchestrator, organization_id)` and `build_current_ads_payload(session, orchestrator, organization_id)` reusing `build_show_content_payload` / `build_show_ads_payload` (extract logic from `snapshot_builder.py`).
- [X] T007 Refactor `backend/app/application/display_orchestrator/snapshot_builder.py` to delegate `currentTop` / `currentAds` construction to `runtime_state.py`.
- [X] T008 [P] Add optional `currentTop` and `currentAds` fields to `DisplayStateSchema` in `backend/app/api/schemas.py` (same nested shapes as SSE snapshot payloads).
- [X] T009 [P] Add optional `currentTop` and `currentAds` to `DisplayState` interface in `frontend/src/app/core/api/display.api.ts` (import or mirror types from `frontend/src/app/display/display-stream.models.ts`).
- [X] T010 [P] Extend `equalByDisplayFingerprint` in `frontend/src/app/core/api/display.api.ts` and helpers in `frontend/src/app/display/display-fingerprint.ts` to compare runtime rotation position (`currentTop` command/content id, `currentAds` visible-window fingerprint).

**Checkpoint**: Shared runtime builder and cross-layer types ready.

---

## Phase 3: User Story 1 — Rotación sobrevive a cortes de red (P1) 🎯 MVP

**Goal**: Orchestrator reactivates on SSE reconnect and polled ensure without page refresh; loop-mode top + sponsors resume (pause/fixed/iframe: sponsors only per spec US1 scenario 4).

**Independent test**: Simulate reaper idle removal → SSE reconnect without refresh → `show_ads` and `show_content` resume within 2× ad duration (`quickstart.md` §1, SC-001).

**Requires Phase 1; T006 recommended before stream ensure.**

### Backend — ensure hooks

- [X] T011 [US1] Call `ensure_display_orchestrator(open_session, registration.organization_id)` in `backend/app/api/display_stream.py` `open_display_stream` inside the open-time DB session block (before snapshot build/cache).
- [X] T012 [US1] Call `ensure_display_orchestrator(session, user.organization_id)` at start of `display_state_route` in `backend/app/api/display.py` before `get_display_state`.

### Backend — tests

- [X] T013 [P] [US1] Add `backend/tests/integration/test_display_ad_rotation_recovery.py`: reaper removes idle orchestrator → stream reconnect → assert `OrchestratorRegistry.get` is non-null and `show_ads` SSE events resume (extend patterns from `backend/tests/integration/test_display_stream.py` `test_reaper_removes_idle_orchestrator_after_grace`).
- [X] T014 [P] [US1] Add scenario in `backend/tests/integration/test_display_ad_rotation_recovery.py`: after reaper, `GET /api/display/state` recreates orchestrator in registry (FR-001/FR-005 ensure path) — **does not** assert `currentTop`/`currentAds` response fields (that belongs to US3 / T024 after T021).
- [X] T018 [P] [US1] Add scenario in `backend/tests/integration/test_display_ad_rotation_recovery.py`: remote-control **pause** (or fixed/iframe) → reaper → stream reconnect → `show_ads` resumes but no new `show_content` for top (FR-007 / spec US1 scenario 4).

### Frontend — reconnect (no new UI per FR-010)

- [X] T015 [US1] Verify `frontend/src/app/display/display-stream.service.ts` `onopen` clears fallback without extra recovery banners; add regression spec in `frontend/src/app/display/display-stream.service.spec.ts` if behavior is adjusted.

**Checkpoint**: US1 reconnect path independently testable.

---

## Phase 4: User Story 2 — Visibilidad de sponsors se restaura con rotación (P1)

**Goal**: Hiding then showing sponsors from remote control re-arms ad rotation without kiosk refresh.

**Independent test**: Hide ads → wait ≥1 ad duration → show ads → rotation within next cycle (`quickstart.md` §2, SC-002).

**Requires Phase 1.**

### Backend — ads timer lifecycle

- [X] T016 [US2] In `advance_ad` in `backend/app/application/display_orchestrator/service.py`: when `adsVisible` is false, call `self._scheduler.cancel_ad()` and return (do not leave a one-shot timer that stops permanently).
- [X] T017 [US2] In `apply_remote_state` in `backend/app/application/display_orchestrator/remote_control.py`: when `ads_visible` transitions false→true, call `orchestrator.ensure_ad_rotation(session)`; when true→false, cancel ad timer via scheduler. Confirm `notify_remote_state_changed` in `backend/app/application/display_orchestrator/hooks.py` is invoked from `backend/app/api/display.py` `update_remote_control_state_route` (integration coverage below replaces verification-only task).

### Backend — tests

- [X] T019 [P] [US2] Add `backend/tests/unit/test_ad_rotation_recovery.py`: (a) `advance_ad` with `adsVisible: false` cancels ad timer; `ensure_ad_rotation` publishes `show_ads` and re-arms timer; (b) **FR-009** zero eligible ads — ensure path leaves strip empty without error; (c) **FR-008** repeated `ensure_display_orchestrator` does not stack duplicate ad timers (assert single armed ad timer / scheduler state).
- [X] T020 [P] [US2] Add integration scenario in `backend/tests/integration/test_display_ad_rotation_recovery.py`: PUT `backend/app/api/display.py` remote-control hide ads → wait tick → show ads → SSE receives `show_ads` within one ad duration without re-register (proves hooks → `apply_remote_state` → `ensure_ad_rotation`).

**Checkpoint**: US2 independently testable.

---

## Phase 5: User Story 3 — Modo de respaldo mantiene sponsors actualizados (P2)

**Goal**: Polled `GET /display/state` carries live rotation position; kiosk applies `currentTop` / `currentAds` during fallback polling.

**Independent test**: Force SSE fallback banner → observe sponsor/top advance across polls (`quickstart.md` §3, SC-003).

**Requires Phase 2 and T012.**

### Backend — polled runtime fields

- [X] T021 [US3] Populate `currentTop` and `currentAds` in `to_display_state_schema` / `display_state_route` in `backend/app/api/display.py` using `runtime_state.py` and active orchestrator from `OrchestratorRegistry` (mirror snapshot semantics; null when no orchestrator).

### Frontend — fallback sync

- [X] T022 [US3] Update `seedViewerFromState` in `frontend/src/app/display/display-screen.component.ts` to apply `state.currentTop` via `displayViewer.applyShowContent` and `state.currentAds` via `displayViewer.applyShowAds` when present (not only empty `visibleAds` seed).
- [X] T023 [US3] In fallback polling effect in `frontend/src/app/display/display-screen.component.ts`, ensure `applyConfigurationState` / seed path runs when poll fingerprint detects runtime position change (depends on T010).

### Tests

- [X] T024 [P] [US3] Extend `backend/tests/integration/test_display_ad_rotation_recovery.py`: orchestrator rotating → repeated `GET /state` returns non-null `currentAds` / `currentTop` with advancing `currentAds.startIndex` or changing `currentTop.content.id` across polls (FR-005 response fields; moved from MVP T014 scope).
- [X] T025 [P] [US3] Add or extend `frontend/src/app/display/display-screen.component.spec.ts`: fallback polling with mocked `DisplayState` carrying new `currentAds` updates `visibleAds` / animation without full page reload.

**Checkpoint**: US3 independently testable.

---

## Phase 6: User Story 4 — Rotación perceptible con pocos sponsors (P2)

**Goal**: Equivalent consecutive `show_ads` windows still animate when configured animation ≠ `none`; `none` stays static.

**Independent test**: Single sponsor + `fade` → animation each cycle; `none` → static (`quickstart.md` §4, SC-004).

**Requires Phase 1; independent of US1–US3 backend.**

### Frontend — animation vs media dedupe

- [X] T026 [US4] Refactor `applyShowAds` in `frontend/src/app/display/display-viewer.controller.ts`: always increment `adAnimationRun` when effective animation ≠ `none`; update `visibleAds` / border / fingerprint only when fingerprint changes (preserve CHG-053 media warm skip in `display-screen.component.ts` effects).

### Tests

- [X] T027 [P] [US4] Extend `frontend/src/app/display/display-viewer.controller.spec.ts`: identical consecutive `show_ads` with `fade` increments `adAnimationRun`; identical with `none` does not increment.
- [X] T028 [P] [US4] Add regression in `frontend/src/app/display/display-viewer.controller.spec.ts`: fingerprint change still updates `visibleAds` and increments animation run.

**Checkpoint**: US4 independently testable.

---

## Phase 7: Polish & Cross-Cutting Validation

**Purpose**: Regression, manifest closure, manual evidence.

- [X] T029 [P] Run targeted backend tests: `pytest backend/tests/integration/test_display_ad_rotation_recovery.py backend/tests/unit/test_ad_rotation_recovery.py -q`.
- [X] T030 [P] Run targeted frontend tests: `npm --prefix frontend run test -- --include='**/display-viewer.controller.spec.ts' --include='**/display-screen.component.spec.ts' --include='**/display-stream.service.spec.ts' --include='**/display-fingerprint.spec.ts' --include='**/display.api.spec.ts'`.
- [X] T031 Run broader validation: `pytest backend/tests` and `npm --prefix frontend run test` and `npm --prefix frontend run build` (or narrow subsets if CI time constrained; document in checklist).
- [X] T032 Execute manual scenarios `specs/changes/057-fix-ad-rotation-recovery/quickstart.md` §1–§5; record pass/fail in `specs/changes/057-fix-ad-rotation-recovery/checklists/requirements.md` §Success Criteria Validation (SC-001–SC-004 blocking; SC-005 ops follow-up post-deploy).
- [X] T033 Verify FR-010: no new kiosk recovery banners beyond existing reconnect/fallback UI in `frontend/src/app/display/display-screen.component.ts`.
- [X] T034 Mark change `status: implemented` in `specs/changes/057-fix-ad-rotation-recovery/spec.md` and `specs/manifest.yml` after acceptance.
- [X] T035 [P] Consolidate any remaining drift from contract deltas into `specs/contracts/content-rotation/contract.md` and `specs/contracts/display-runtime/contract.md` if implementation adjusted wording.
- [X] T036 Update `specs/changes/057-fix-ad-rotation-recovery/context-pack.md`: replace «Current gap» with implemented summary, refresh test file list, keep terminology table (`motor de rotación` = orchestrator).

---

## Dependencies & Execution Order

```text
Phase 1 (T001–T005) ──blocks──► all implementation
Phase 2 (T006–T010) ──blocks──► Phase 5 US3 client sync (T022–T025)
Phase 3 US1 (T011–T015, T018) ──► MVP after Phase 1 (+ T006 recommended)
Phase 4 US2 (T016–T020) ──► after Phase 1; parallel with US1 backend
Phase 5 US3 (T021–T025) ──► after Phase 2 + T012
Phase 6 US4 (T026–T028) ──► after Phase 1; parallel with US1–US3
Phase 7 (T029–T036) ──► after desired user stories complete
```

### User Story Dependencies

| Story | Depends on | Can parallel with |
|-------|------------|-------------------|
| US1 | Phase 1, T006 (recommended) | US2 backend, US4 frontend |
| US2 | Phase 1 | US1 backend, US4 frontend |
| US3 | Phase 1, Phase 2, T012 | US4 |
| US4 | Phase 1 | US1–US3 |

---

## Parallel Execution Examples

### After Phase 1 complete

```text
Parallel batch A: T002 + T003
Parallel batch B (after T006): T008 + T009 + T010
```

### US1 + US2 backend (after Phase 1)

```text
T011 + T016 + T017 (different files)
Then: T013 + T014 + T018 + T019 + T020 (tests)
```

### US4 while US3 in progress

```text
T026 + T027 + T028 (frontend only)
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1 (contracts)
2. T006, T011, T012, T013, T014, T018
3. **STOP and VALIDATE**: `quickstart.md` §1 / integration reaper tests (no `currentTop`/`currentAds` assertion until US3)
4. Deploy/demo if needed before US2–US4

### Incremental Delivery

1. Phase 1 + Phase 2 → types ready
2. US1 → reconnect recovery (production P0)
3. US2 → admin hide/show fix
4. US3 → fallback poll sync
5. US4 → few-sponsor animation UX
6. Phase 7 → full validation

---

## Task Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| 1 Governance | T001–T005 (5) | — |
| 2 Foundational | T006–T010 (5) | — |
| 3 US1 | T011–T015, T018 (6) | P1 🎯 |
| 4 US2 | T016–T017, T019–T020 (4) | P1 |
| 5 US3 | T021–T025 (5) | P2 |
| 6 US4 | T026–T028 (3) | P2 |
| 7 Polish | T029–T036 (8) | — |
| **Total** | **36** | |

**Suggested MVP scope**: Phase 1 + T006 + T011–T014 + T018 — 12 tasks.

**Parallel opportunities**: 16 tasks marked `[P]`.
