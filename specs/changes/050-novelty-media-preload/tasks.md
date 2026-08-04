---
description: "Task list for CHG-050 novelty media preload & queue indicator"
---

# Tasks: Precarga de medios de novedades e indicador de cola (CHG-050)

**Input**: Design documents from `/specs/changes/050-novelty-media-preload/`

**Prerequisites**: `spec.md`, `context-pack.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/{display-preload-sse,kiosk-media-gate,novelty-queue-indicator,contract-deltas}.md`

**Tests**: Mandatory per TQ-002 — backend preload/media_error/multi-kiosk tests, frontend gate/cache/indicator specs, manual `quickstart.md` (SC-001–SC-006; SC-001/SC-005 manual evidence in T044).

**Organization**: SDD governance → foundational types/helpers → US2 preload SSE (P1) → US1 media gate (P1) 🎯 MVP → US3 regular preload timing (P1) → US4 failure/timeout (P2) → US5 queue indicator (P2) → polish & validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: US1–US5 maps to spec user stories
- Exact file paths required in every task description

## Path Conventions

- Preload helpers: `backend/app/application/display_orchestrator/preload.py`
- Orchestrator: `backend/app/application/display_orchestrator/{rotation_logic,hooks,snapshot_builder,service}.py`
- Kiosk cache/gate: `frontend/src/app/display/{display-media-cache,display-content-gate,novelty-queue-tracker,novelty-queue-indicator}.*`
- Display shell: `frontend/src/app/display/display-screen.component.{ts,html,css}`
- Contract: `specs/contracts/content-rotation/contract.md`, `specs/contracts/display-runtime/contract.md`
- Change: `specs/changes/050-novelty-media-preload/`

---

## Phase 1: SDD Governance & Contracts (blocking)

**Purpose**: Merge contract deltas before code (Constitution IV, TQ-001).

**⚠️ CRITICAL**: Complete before Phase 3. (T002–T004 completed during analyze remediation.)

- [X] T001 Read `specs/manifest.yml` and `specs/changes/050-novelty-media-preload/{spec.md,context-pack.md,plan.md,research.md,data-model.md,quickstart.md,contracts/display-preload-sse.md,contracts/kiosk-media-gate.md,contracts/novelty-queue-indicator.md,contracts/contract-deltas.md}`.
- [X] T002 Merge CONTENT.ROTATION section from `specs/changes/050-novelty-media-preload/contracts/contract-deltas.md` into `specs/contracts/content-rotation/contract.md` (preload `isNovelty`, snapshot `pendingNovelties`, `media_error` advance).
- [X] T002b Merge DISPLAY.RUNTIME section from `specs/changes/050-novelty-media-preload/contracts/contract-deltas.md` into `specs/contracts/display-runtime/contract.md` (media gate, cache scheduler, novelty queue indicator, `GATE_TIMEOUT_MS`).
- [X] T003 Add CHG-050 entry `status: in-progress` to `specs/manifest.yml` under `changes:`; add `CHG-050` to `CONTENT.ROTATION.related_changes` and `DISPLAY.RUNTIME.related_changes`; extend `DISPLAY.RUNTIME.owns` with new kiosk services.
- [X] T004 Set `status: in-progress` in `specs/changes/050-novelty-media-preload/spec.md` frontmatter.

**Checkpoint**: Contracts and manifest updated; implementation may begin.

---

## Phase 2: Foundational — Shared Types & Preload Builders (blocking)

**Purpose**: Payload shapes and server-side preload item builders used by US2/US3/US5.

**⚠️ CRITICAL**: Complete before Phase 3.

- [X] T005 [P] Add `isNovelty: boolean` to preload item type and `pendingNovelties` to `SnapshotPayload` in `frontend/src/app/display/display-stream.models.ts`.
- [X] T006 [P] Implement `build_preload_items_from_snapshot(session, organization_id, orchestrator) -> list[dict]` mapping `compute_rotation_plan_snapshot().novelties` + next regular to `PreloadItem` dicts (`contentId`, `mediaUrl`, `contentType`, `mediaVersion`, `isNovelty`) in `backend/app/application/display_orchestrator/preload.py`.
- [X] T007 [P] Refactor `emit_preload` in `backend/app/application/display_orchestrator/rotation_logic.py` to call shared `publish_preload(orchestrator, session, items)` from `preload.py` and set `isNovelty` per item.
- [X] T008 [P] Add unit tests in `backend/tests/unit/test_preload_items.py` for novelty-only list, novelty+next-regular list, and empty eligible content.

**Checkpoint**: Preload builders and TS types ready.

---

## Phase 3: User Story 2 — Precarga al entrar en cola (P1)

**Goal**: Kiosks receive `preload` for all pending novelties within ≤2 s of public upload; FIFO warm max 3 concurrent downloads; no redundant fetches.

**Independent test**: Upload novelty with 30 s left on current slide → download starts within 5 s (preload SSE), not at timer expiry.

**Requires Phase 2**.

### Backend — emit preload on queue change

- [X] T009 [US2] Implement `emit_novelty_preload(orchestrator, session)` publishing all pending novelty items via `publish_preload` in `backend/app/application/display_orchestrator/preload.py`.
- [X] T010 [US2] Call `emit_novelty_preload` from `_maybe_log_rotation_replan` in `backend/app/application/display_orchestrator/hooks.py` when replan signature changes and loop is active (`contentMode === 'loop'`, not paused, not fixed/iframe per FR-009).
- [X] T011 [US2] Call `emit_novelty_preload` on orchestrator bootstrap in `backend/app/application/display_orchestrator/service.py` when resuming active loop session.
- [X] T012 [US2] Extend `build_snapshot_payload` in `backend/app/application/display_orchestrator/snapshot_builder.py` to include `pendingNovelties` from `build_preload_items_from_snapshot` (novelty subset only).

### Frontend — warm on preload + snapshot

- [X] T013 [P] [US2] Implement FIFO download scheduler (max 3 concurrent) in `frontend/src/app/display/display-media-cache.service.ts`; dedupe in-flight and cached URLs (FR-008).
- [X] T014 [US2] On `preload` SSE in `frontend/src/app/display/display-screen.component.ts`, call `mediaCache.warm()` for novelty/regular items **only when** `contentMode === 'loop' && !isPaused && !iframeActive` (FR-009); on snapshot, warm `pendingNovelties` under the same guards.
- [X] T015 [P] [US2] Add unit tests in `backend/tests/integration/test_display_preload_sse.py`: public upload → connected kiosk receives `preload` with `isNovelty: true` within hub publish.
- [X] T016 [P] [US2] Add unit tests in `backend/tests/unit/test_snapshot_pending_novelties.py`: snapshot includes ordered `pendingNovelties` after novelty upload.
- [X] T017 [P] [US2] Extend `frontend/src/app/display/display-media-cache.service.spec.ts` for FIFO cap-3 and dedupe behavior.

**Checkpoint**: US2 independently testable — preload on enqueue + snapshot backfill + client warm.

---

## Phase 4: User Story 1 — Novedad pesada sin pantalla negra (P1) 🎯 MVP

**Goal**: No black frame on novelty transition; hold previous slide until media ready; latest `show_content` wins.

**Independent test**: ≥10 MB novelty video — no black frame >300 ms on transition; previous slide held while downloading.

**Requires Phase 3** (preload lead time).

### Frontend — media ready probes

- [X] T018 [P] [US1] Add image decode probe and video `canplaythrough` probe (10 s sub-timeout) to `ensureReady(url, contentType)` in `frontend/src/app/display/display-media-cache.service.ts`.
- [X] T019 [P] [US1] Expose `readyState(url)` signal/map and `revision` bump on ready/failed in `frontend/src/app/display/display-media-cache.service.ts`.

### Frontend — content gate

- [X] T020 [US1] Create `DisplayContentGateService` in `frontend/src/app/display/display-content-gate.service.ts`: pending `ShowContentPayload` (latest wins), `committedContent` signal, `enqueueShowContent(payload)`, `commitWhenReady()`, `onCommitted(contentId)` callback/subject for tracker integration, mode guards (loop only, not paused/fixed/iframe).
- [X] T021 [US1] Wire gate in `frontend/src/app/display/display-screen.component.ts`: route `show_content` through gate instead of direct `displayViewer.applyShowContent`; use committed content for template bindings; remove remote URL fallback in `mediaSource()` — only blob URLs when ready.
- [X] T022 [US1] Register `DisplayContentGateService` in `frontend/src/app/display/display-screen.component.ts` providers array.

### Tests

- [X] T023 [P] [US1] Add `frontend/src/app/display/display-content-gate.service.spec.ts`: holds previous content until ready; latest show_content replaces pending; no commit while downloading.
- [X] T024 [P] [US1] Update `frontend/src/app/display/display-screen.component.spec.ts`: mock slow cache — assert previous slide remains during novelty transition (no empty/black src).
- [X] T024b [P] [US1] Add `fakeAsync` test in `frontend/src/app/display/display-content-gate.service.spec.ts`: when media is pre-cached, `onCommitted` fires and commit completes within 500 ms (SC-003).

**Checkpoint**: US1 MVP — novelty plays without black frame when precached or gate-held.

---

## Phase 5: User Story 3 — Rotación regular con medios pesados (P1)

**Goal**: Next regular item preloaded at start of current item period; gate applies to regular `show_content` same as novelty.

**Independent test**: Heavy regular video as next — preloaded during previous item; instant transition when ready.

**Requires Phase 4** (gate exists).

### Backend — regular preload timing

- [X] T025 [US3] Move regular next-item preload from inside `advance_loop_top` to `_after_emit_top_content` in `backend/app/application/display_orchestrator/rotation_logic.py` (emit preload for next regular after each top emit, not simultaneous with advance).
- [X] T026 [US3] Remove duplicate `emit_preload` call immediately before `emit_top_content` in `advance_loop_top` in `backend/app/application/display_orchestrator/rotation_logic.py`.

### Tests

- [X] T027 [P] [US3] Add test in `backend/tests/integration/test_display_preload_sse.py`: after `show_content` for item R, kiosk receives `preload` for next regular S with `isNovelty: false` before R timer expires.
- [X] T028 [P] [US3] Extend `frontend/src/app/display/display-content-gate.service.spec.ts`: regular (non-novelty) `show_content` held until cache ready.

**Checkpoint**: US3 complete — regular rotation same gate/preload semantics.

---

## Phase 6: User Story 4 — Fallo de descarga o espera excesiva (P2)

**Goal**: `media_error` on failure/30 s timeout; orchestrator advances all displays; no indefinite black or hold.

**Independent test**: Inaccessible novelty URL → `media_error` → rotation continues within ≤30 s.

**Requires Phase 4**.

### Backend — media_error advance

- [X] T029 [US4] Extend `handle_media_error` in `backend/app/application/display_orchestrator/service.py`: dedupe by `commandId` via `processedKioskEvents` (mirror `handle_video_ended`); on first error call `advance_top(session, reason="media_error")`.
- [X] T030 [P] [US4] Add unit tests in `backend/tests/unit/test_media_error_advance.py`: first `media_error` advances; duplicate ignored; audit event still recorded.
- [X] T030b [P] [US4] Add integration test in `backend/tests/integration/test_display_media_error_multi_kiosk.py`: two kiosks subscribed → first posts `media_error` → both receive subsequent `show_content` (FR-007 multi-display).

### Frontend — gate timeout & error post

- [X] T031 [US4] Add `GATE_TIMEOUT_MS = 30_000` constant and 30 s gate timeout plus cache failure handler in `frontend/src/app/display/display-content-gate.service.ts` posting `media_error` via `DisplayViewerController` / existing kiosk events API in `frontend/src/app/display/display-viewer.controller.ts`.
- [X] T032 [US4] On `media_error` path, clear pending gate state and keep committed content visible in `frontend/src/app/display/display-content-gate.service.ts`.
- [X] T033 [P] [US4] Add tests in `frontend/src/app/display/display-content-gate.service.spec.ts` for timeout → `media_error` POST and no commit of failed content.

**Checkpoint**: US4 complete — resilient skip on failure/timeout.

---

## Phase 7: User Story 5 — Indicador de cola de novedades (P2)

**Goal**: Discrete always-visible overlay; icon per novelty; check when ready; error on failure; remove on commit; max 5 + N; snapshot backfill.

**Independent test**: Two novelties (image + video) → icons ≤2 s, checks on ready, first icon gone when visible.

**Requires Phase 3** (preload/snapshot); integrates with Phase 4 gate commit events.

### Frontend — tracker

- [X] T034 [US5] Create `NoveltyQueueTrackerService` in `frontend/src/app/display/novelty-queue-tracker.service.ts`: **replace** local queue from latest `preload` payload (authoritative ordered novelty ids) and `snapshot.pendingNovelties`; track `downloadStatus` from cache; remove on `onCommitted(contentId)`, skip, or ids dropped from latest preload; compute `visibleIcons` (5 max) + `overflowCount`.
- [X] T035 [US5] Hook tracker to preload/snapshot in `frontend/src/app/display/display-screen.component.ts` (respect FR-009 mode guards) and subscribe to gate `onCommitted(contentId)` for removal timing (FR-016).

### Frontend — indicator UI

- [X] T036 [P] [US5] Create `NoveltyQueueIndicatorComponent` in `frontend/src/app/display/novelty-queue-indicator.component.ts` + `.css`: bottom-right overlay, image/video icons, check overlay, error overlay, `+N` badge, `aria-hidden="true"`, hidden when empty or disallowed mode.
- [X] T037 [US5] Add `<app-novelty-queue-indicator>` to `frontend/src/app/display/display-screen.component.html` and import component in `frontend/src/app/display/display-screen.component.ts`.

### Tests

- [X] T038 [P] [US5] Add `frontend/src/app/display/novelty-queue-tracker.service.spec.ts`: add on preload, ready→check, error state, remove on commit, 5+N overflow, snapshot backfill.
- [X] T039 [P] [US5] Add `frontend/src/app/display/novelty-queue-indicator.component.spec.ts`: renders icons, check, error, +N, hidden when empty.

**Checkpoint**: US5 complete — operator-visible queue status on kiosk.

---

## Phase 8: Polish & Cross-Cutting Validation

**Purpose**: Full regression, manifest, manual evidence.

- [X] T040 [P] Update `specs/changes/050-novelty-media-preload/quickstart.md` with any command/path drift found during implementation.
- [X] T041 Run `pytest backend/tests/unit/test_preload_items.py backend/tests/unit/test_media_error_advance.py backend/tests/unit/test_snapshot_pending_novelties.py backend/tests/integration/test_display_preload_sse.py backend/tests/integration/test_display_media_error_multi_kiosk.py`.
- [X] T042 Run `npm --prefix frontend run test` for display gate, cache, tracker, indicator, and display-screen specs.
- [X] T043 Run `npm --prefix frontend run build` and fix any compile errors in `frontend/src/app/display/`.
- [X] T044 Execute manual scenarios in `specs/changes/050-novelty-media-preload/quickstart.md` §1–5; record pass/fail for SC-001 (no black >300 ms), SC-005, and SC-006 in `specs/changes/050-novelty-media-preload/checklists/requirements.md` Notes.
- [X] T045 Set `status: implemented` in `specs/changes/050-novelty-media-preload/spec.md` and `specs/manifest.yml` when validated.
- [X] T046 Consolidate CHG-050 behavior into `specs/contracts/content-rotation/contract.md` if any drift found during implementation; mark change `consolidated` when promoted.

---

## Dependencies & Execution Order

```text
Phase 1 (T001–T004) ──blocks──► all implementation (T002–T004 ✅ done)
Phase 2 (T005–T008) ──blocks──► Phase 3+
Phase 3 US2 (T009–T017) ──blocks──► Phase 4 US1 (optimal) & Phase 7 US5 tracker feed
Phase 4 US1 (T018–T024) ──blocks──► Phase 5 US3, Phase 6 US4, Phase 7 US5 commit hook
Phase 5 US3 (T025–T028) ──after──► Phase 4
Phase 6 US4 (T029–T033) ──after──► Phase 4
Phase 7 US5 (T034–T039) ──after──► Phase 3; gate commit from Phase 4
Phase 8 (T040–T046) ──after──► all story phases
```

### User story completion order

| Order | Story | Priority | Depends on |
|-------|-------|----------|------------|
| 1 | US2 Preload on enqueue | P1 | Phase 2 |
| 2 | US1 No black frame (MVP) | P1 | US2 |
| 3 | US3 Regular preload | P1 | US1 |
| 4 | US4 Failure/timeout | P2 | US1 |
| 5 | US5 Queue indicator | P2 | US2 + US1 commit |

### Parallel opportunities

```text
# Phase 2 (all parallel after T001–T004):
T005, T006, T007, T008

# Phase 3 tests parallel with frontend warm:
T015 ‖ T016 ‖ T017  (after T009–T014)

# Phase 4 probes + gate tests:
T018 ‖ T019 → T020–T022 → T023 ‖ T024

# Phase 7 UI tests:
T038 ‖ T039  (after T034–T037)
```

---

## Implementation Strategy

### MVP (minimum shippable)

1. Complete Phase 1–2.
2. Complete Phase 3 (US2) + Phase 4 (US1) → **fixes black screen for novelties**.
3. Validate with `quickstart.md` §1–2 before continuing.

### Incremental delivery

1. US2 + US1 → novelty preload + gate (MVP)
2. US3 → regular rotation parity
3. US4 → production resilience
4. US5 → operator overlay indicator

### Task totals

| Phase | Tasks | Story |
|-------|-------|-------|
| 1 Governance | 5 | — |
| 2 Foundational | 4 | — |
| 3 US2 | 9 | US2 |
| 4 US1 | 8 | US1 |
| 5 US3 | 4 | US3 |
| 6 US4 | 6 | US4 |
| 7 US5 | 6 | US5 |
| 8 Polish | 7 | — |
| **Total** | **48** | |

**Parallelizable [P]**: 22 tasks
