# Tasks: Display Control Rotation Tests

**Input**: Design documents from `/specs/020-display-control-rotation-tests/`
- `plan.md` (required)
- `spec.md` (required for user stories)
- `data-model.md`

**Prerequisites**: plan.md, spec.md

**Tests**: Mandatory for this spec. The whole point of 020 is test
coverage. Each user story's tests must be green before the spec
closes.

**Organization**: Tasks are grouped by user story. The three
behavior-gap tasks (T001-T003 in Phase 1) are pre-requisites for the
test tasks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3 / US4 / US5

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: close the three behavior gaps from 018 (T031b, T031c,
T049) before the tests can pass against them.

- [ ] T001 [P] [US1] Implement FR-001 in `kiosk-rotation.controller.ts`:
      add a debounced (60 s) POST to `/api/display/rotation-event`
      with body `{ "eventType": "content_rotation_empty", "payload":
      { "reason": "queue_empty" } }` on the non-empty → empty
      transition. Wire it into the existing `effect()`.
- [ ] T002 [US1] Implement FR-002 in `display-screen.component.ts`
      template: add a `<div class="empty-queue" aria-label="No
      content available">Sin contenido</div>` branch wrapping the
      content region. Keep the ad-region rendering outside this
      branch.
- [ ] T003 [US3] Implement FR-003 refactor in
      `display-rotation.service.ts`: extract `pickRecurringInsertion`
      pure helper from the controller. Verify the controller's
      cadence behavior is byte-for-byte identical post-refactor
      (run US3 Karma specs as regression).

**Checkpoint**: Phase 2 test files can now reference FR-001/FR-002
behavior without flakiness.

---

## Phase 2: Foundational (Migration + Service Unit Tests)

**Purpose**: migration idempotency + service-level unit tests.

- [ ] T004 [P] [US1] Migration idempotency test
      (`backend/tests/integration/test_migration_0012_content_rotation_modes.py`):
      fresh SQLite-in-memory schema; `alembic upgrade head`; rerun;
      assert no exception. Inspect schema: `top_content_items` has
      `recurring_every_x_iterations`, `is_fixed`, both checks;
      `display_control_states` has `selected_fixed_content_id`,
      widened `content_mode` CHECK, new `ck_display_control_fixed_has_target`.
- [ ] T005 [P] [US1] Data-preservation invariant test (same file):
      seed a `TopContentItem` row; run upgrade; assert row persists
      and new columns take defaults. Seed a `display_control_states`
      row with `content_mode='loop'`; assert it persists untouched.
- [ ] T006 [P] [US3] Service-level unit tests
      (`backend/tests/unit/test_content_service_extension_autodetect.py`):
      `detect_media_type_from_extension('.jpg') == 'photo'`; same
      for the other 8 extensions; unknown extensions raise
      `UnsupportedExtensionError`; missing filename raises
      `UnsupportedExtensionError`.
- [ ] T007 [P] [US3] Service-level unit tests
      (`backend/tests/unit/test_content_service_exclusivity.py`):
      `create_uploaded` raises when both `is_fixed=True` and
      `recurring_every_x_iterations=3`; raises when
      `recurring_every_x_iterations <= 0`; accepts `is_fixed=True`
      alone; accepts `recurring_every_x_iterations=1` alone;
      autodetect overrides explicit `contentType='photo'` for `.mp4`.
- [ ] T008 [P] [US3] Service-level unit tests
      (`backend/tests/unit/test_display_control_service_pause_resume.py`):
      pause/resume persist with fresh `navigationCommandId`; pause/
      resume rejected with HTTP 409 mapping when `content_mode !=
      'loop'`; `update_state` with `content_mode='fixed'` and valid
      target succeeds; with target whose `is_fixed=False` raises
      ValueError → HTTP 400.
- [ ] T009 [P] Update existing backend tests/fixtures that reference
      removed/changed fields: `grep -rn configured_event_duration_minutes
      backend/` and `grep -rn "content_type=" backend/tests/`. Replace
      hard-coded `content_type="photo"` upload fixtures with the new
      optional pattern only where the tests exercise the upload path.

**Checkpoint**: `pytest backend/tests -q` shows migration + service
tests green.

---

## Phase 3: User Story 1 — Migration Idempotency (deferred to Phase 2)

US1's acceptance scenarios are exercised by T004-T005.

---

## Phase 4: User Story 2 — Service-Level Unit Tests for Rotation

US2's acceptance scenarios are exercised by T006-T009.

---

## Phase 5: User Story 3 — Karma Specs for Kiosk Rotation

**Purpose**: Karma coverage for the kiosk rotation behavior.

- [ ] T010 [P] [US3] Karma spec for ad index round-robin
      (`frontend/src/app/display/display-screen.component.spec.ts`):
      3 ads, `defaultAdDurationSeconds=10`; advance time by 10 s
      three times; assert index moves 0 → 1 → 2 → 0 with each hold
      ≥ 9 s and ≤ 11 s.
- [ ] T011 [P] [US3] Karma spec for Chrome vs Firefox ad visibility:
      render kiosk component headless; assert `.ad-region` exists,
      has non-zero bounding-box, contains configured `<img>` elements.
      Repeat with `FirefoxUserAgent`.
- [ ] T012 [P] [US3] Karma spec for video ended → next item effective
      duration: video fires `ended`; advance by `videoEndDelaySeconds`;
      assert next item rendered for its `effectiveDurationSeconds`.
- [ ] T013 [P] [US3] Karma spec for empty-queue placeholder (FR-002):
      content queue empty; assert `<div class="empty-queue" aria-label="No
      content available">Sin contenido</div>` is present.
- [ ] T014 [P] [US3] Karma spec for branding overlay hide on iframe
      (US2): with branding configured and `contentMode='loop'`,
      overlay is in DOM; with `contentMode='iframe'`, overlay is
      NOT in DOM; with `contentMode='fixed'`, overlay is in DOM.
- [ ] T015 [P] [US3] Karma spec for iframe → loop transition: start
      in iframe mode with branding; flip `contentMode='loop'` via
      controller; assert overlay reappears.
- [ ] T016 [P] [US3] Karma spec for FR-008 index preservation: start
      in `loop` at index 2 of a 4-item queue; switch to `iframe`;
      switch back; assert cursor at index 2.
- [ ] T017 [P] [US3] Karma spec for cadence counter (T046 from 018):
      1 recurring at cadence 3 + 4 regular; advance 16 times;
      recurring appears 5 times at advances 4, 8, 12, 16.
- [ ] T018 [P] [US3] Karma spec for two recurring items (T047):
      recurring-A at cadence 2 + recurring-B at cadence 4;
      advance 16 times; verify alternating.
- [ ] T019 [P] [US3] Karma spec for fixed-mode pinning (T053): enter
      `mode='fixed'` with a video fixed content; assert
      `isPaused=false`, no timers armed, video has `loop=true`;
      after 5 s, no advance; switch back to `loop`; assert previous
      index preserved.
- [ ] T020 [P] [US3] Karma spec for fixed-mode display (T054): template
      renders fixed content's `<img>` or `<video [loop]>`, ad-region
      continues rotating, branding overlay visible.

**Checkpoint**: `npm --prefix frontend run test` shows all kiosk
specs green.

---

## Phase 6: User Story 4 — Backend Integration Tests for Pause/Resume/Fixed

- [ ] T021 [P] [US4] Integration test for pause/resume matrix
      (`backend/tests/integration/test_display_control_pause_resume.py`):
      `command='pause'` with `content_mode='loop'` returns 200 +
      emits `display_control_paused`; with `content_mode='iframe'`
      or `'fixed'` returns 409. Same matrix for `command='resume'`.
- [ ] T022 [P] [US4] Integration test for fixed-mode (T050-T051)
      (`backend/tests/integration/test_display_control_fixed_mode.py`):
      `contentMode='fixed'` + `selectedFixedContentId` whose target
      has `is_fixed=true` returns 200; with target `is_fixed=false`
      returns 400 `target_not_fixed`; without `selectedFixedContentId`
      returns 400 `fixed_requires_target`. Auto-fallback path:
      delete fixed item; `GET /api/display/state` returns
      `contentMode='loop'` and emits `display_control_fixed_changed`.

**Checkpoint**: `pytest backend/tests -q` green for all pause/
resume/fixed tests.

---

## Phase 7: User Story 5 — Backend Contract Tests for Autodetect

- [ ] T023 [P] [US5] Contract test for admin upload autodetect
      (`backend/tests/integration/test_content_upload_admin_018.py`):
      `.jpg` with `contentType` omitted → `photo`; `.mp4` with
      `contentType` omitted → `video`; `.mp4` with `contentType='photo'`
      → `video` (extension wins) + emits `content_type_autodetected`;
      `.xyz` → HTTP 415.
- [ ] T024 [P] [US5] Contract test for public upload autodetect
      (`backend/tests/integration/test_content_upload_public_018.py`):
      `.jpg` → `photo`; `.mp4` → `video`; `.xyz` → 415;
      `.mp4` with `isFixed=true` and `recurringEveryXIterations=3`
      → persisted as `is_fixed=false, recurring_every_x_iterations=null`.

**Checkpoint**: all content-upload contract tests green.

---

## Phase 8: User Story 6 — Remote-Control Pause/Resume/Fixed UI

- [ ] T025 [P] [US6] Karma spec for Pause/Resume buttons
      (`frontend/src/app/features/remote-control/remote-control.component.spec.ts`):
      when `mode()==='loop'`, Pause + Resume buttons enabled; when
      `mode()==='iframe'` or `'fixed'`, both disabled
      (`aria-disabled='true'`); clicking disabled Pause does NOT
      call facade.
- [ ] T026 [P] [US6] Karma spec for Fixed radio (T052): when
      `displayState.fixedEligibleContentIds` is empty, Fixed radio
      is disabled with tooltip "No hay content fijo disponible";
      when populated, Fixed radio is enabled and the select dropdown
      shows the items.

**Checkpoint**: all remote-control specs green.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T027 [P] Run `pytest backend/tests --cov=app.services.content_service
      --cov-report=term-missing`. Assert `content_service.py` line
      coverage ≥ 80%.
- [ ] T028 [P] Run `npm --prefix frontend run test:ci`. Assert
      `display-screen.component.ts` line coverage ≥ 70%.
- [ ] T029 [P] Run `alembic upgrade head` twice in a row; assert no
      exceptions and no duplicate columns/constraints.
- [ ] T030 [P] Run `npm --prefix frontend run build`. Confirm no
      type errors.
- [ ] T031 [P] Write `specs/020-display-control-rotation-tests/validation/final-acceptance.md`
      with pass/fail row per FR-001..FR-007 and per US acceptance
      scenario.
- [ ] T032 [P] Accessibility review: screen-reader announcement via
      `aria-label` for fixed-content region and Pause/Resume
      buttons; keyboard-accessible dropdown for Fixed mode.
- [ ] T033 [P] Security review: confirm public API never persists
      `is_fixed=true`; autodetect does not relax MIME validation;
      `contentMode='fixed'` PUT requires `is_fixed=true` server-side.
- [ ] T034 [P] Observability review: confirm `content_rotation_empty`
      debounce fires only once per 60 s.

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 (Setup): no dependencies.
- Phase 2 (Foundational): depends on Phase 1 (FR-001/FR-002/FR-003
  must exist for the tests to be valid).
- Phases 3-8 (per-user-story tests): depend on Phase 2.
- Phase 9 (Polish): depends on Phases 3-8.

### Within Each Phase

- T004-T009 can run in parallel (different test files).
- T010-T020 can run in parallel (different Karma specs / different
  describe blocks).
- T021-T024 can run in parallel (different integration test files).
- T025-T026 can run in parallel (different describe blocks).

### Parallel Opportunities

- Backend (T004-T009, T021-T024) and frontend (T010-T020, T025-T026)
  can run in parallel.
- T027-T028 (coverage) are the final gate.

---

## Implementation Strategy

### MVP First

1. Phase 1 (T001-T003): close the three behavior gaps.
2. Phase 2 (T004-T009): migration + service tests.
3. Phases 5-8: Karma + integration tests in parallel.
4. Phase 9: coverage + polish.

### Incremental Delivery

1. Phase 1 alone is meaningful: 018 is "behavior-complete" with the
   three gaps closed.
2. Phase 2 alone is meaningful: migration + service contracts are
   locked.
3. Phases 5-8 ship in any order; each adds test coverage.
4. Phase 9 closes the spec.

### Single-Contributor Path

- Phase 1: ~30 min (3 small edits).
- Phase 2: ~3 hours (5 test files + 1 fixture update).
- Phases 5-8: ~6 hours (10+ Karma specs, 4 integration tests).
- Phase 9: ~1 hour (coverage + polish).
- Total: ~10 hours for one engineer.