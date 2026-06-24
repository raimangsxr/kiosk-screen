# Tasks: Content Rotation Modes

**Input**: Design documents from
`specs/changes/007-content-rotation-modes/`.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Verify working branch and the four artefacts.
- [X] T002 [P] Confirm `0012_content_rotation_modes` migration
      adds `is_fixed`, `recurring_every_x_iterations`, the
      `selected_fixed_content_id` column, and the two CHECK
      constraints.

## Phase 2: Foundational

- [X] T003 [P] `TopContentItem` model updated at
      `backend/app/repositories/models/content.py` with the two
      new columns and the CHECK.
- [X] T004 [P] `DisplayControlState` model updated at
      `backend/app/repositories/models/display_control_state.py`
      with `selected_fixed_content_id` and the CHECK.

## Phase 3: User Story 1 — Fixed mode

- [X] T005 `DisplayControlService.update_state(...)` enforces
      `is_fixed=true` for the selected target and emits
      `display_control_fixed_changed` (already covered by spec
      005 US1).
- [X] T006 [P] `ContentService.create_uploaded(...)` and
      `update(...)` validate the `is_fixed` XOR
      `recurring_every_x_iterations` exclusivity (admin only).
- [X] T007 [P] Kiosk controller pin + video restart behaviour
      at
      `frontend/src/app/display/kiosk-rotation.controller.ts`
      (consumed in spec 014).

### Tests for User Story 1

- [X] T008 [P] [US1] Integration test: PUT `fixed` with a
      valid target → 200 +
      `display_control_fixed_changed` at
      `backend/tests/integration/test_fixed_mode.py`.
- [X] T009 [P] [US1] Integration test: PUT `fixed` with
      `is_fixed=false` → 400.
- [X] T010 [P] [US1] Integration test: content with both
      `is_fixed=true` and `recurringEveryXIterations=3` → 400
      at `backend/tests/integration/test_content_exclusivity.py`.

## Phase 4: User Story 2 — Recurring content

- [X] T011 [P] Kiosk controller cadence counter at
      `frontend/src/app/display/kiosk-rotation.controller.ts`:
      round-robin between multiple recurring items; freeze on
      `mode != 'loop'`; resume at the same value.
- [X] T012 [P] Backend accepts `recurringEveryXIterations=N`
      with N ≥ 1; CHECK enforces the bound.

### Tests for User Story 2

- [X] T013 [P] [US2] Integration test: content with
      `recurringEveryXIterations=0` → 400.
- [X] T014 [P] [US2] Karma spec for the cadence counter at
      `frontend/src/app/display/kiosk-rotation.controller.spec.ts`.

## Phase 5: User Story 3 — Pause / resume

- [X] T015 [P] Kiosk controller pause / resume behaviour at
      `frontend/src/app/display/kiosk-rotation.controller.ts`:
      `isPaused` signal, content and ad-band timers both
      freeze.
- [X] T016 [P] Backend already accepts `pause` / `resume` in
      `loop` only (spec 005 US2). Confirm the integration test
      still passes.

### Tests for User Story 3

- [X] T017 [P] [US3] Karma spec for the pause / resume
      behaviour at
      `frontend/src/app/display/kiosk-rotation.controller.spec.ts`.

## Phase 6: User Story 4 — Empty-queue POST and debounce

- [X] T018 `POST /api/display/rotation-event` at
      `backend/app/api/display.py:261` (already exists).
- [X] T019 [P] `DisplayControlService.record_rotation_event(...)`
      at
      `backend/app/application/display_control/service.py:264`
      records `content_rotation_empty` with
      `severity=warning`.
- [X] T020 [P] Kiosk controller 60 s debounce on
      `content_rotation_empty` emissions at
      `frontend/src/app/display/kiosk-rotation.controller.ts`.

### Tests for User Story 4

- [X] T021 [P] [US4] Integration test: kiosk POST → 202 + one
      audit event at
      `backend/tests/integration/test_rotation_event.py`.
- [X] T022 [P] [US4] Integration test: unsupported
      `eventType` → 400.
- [X] T023 [P] [US4] Karma spec for the 60 s debounce at
      `frontend/src/app/display/kiosk-rotation.controller.spec.ts`.

## Dependencies & Execution Order

- Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6.
- Phases 3, 4, 5, 6 are largely independent on the kiosk side;
  backend changes go first per phase.

## Implementation Strategy

Single-contributor path:

1. Phase 1 + 2: 10 min.
2. Phase 3: 1 h (fixed mode + exclusivity).
3. Phase 4: 30 min (recurring + cadence).
4. Phase 5: 30 min (pause / resume).
5. Phase 6: 30 min (empty-queue POST + debounce).
6. Spec 014 (display screen runtime) consolidates the four
   controller behaviours.
