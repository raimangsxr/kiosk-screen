# Tasks: Display Control State

**Input**: Design documents from `specs/005-display-control-state/`.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Verify working branch and the four artefacts.
- [X] T002 [P] Confirm `0004_display_control_state`,
      `0009_remote_control_navigation`, and
      `0010_remote_control_fullscreen` migrations create the
      table and add the navigation / fullscreen columns with
      the two CHECK constraints.

## Phase 2: Foundational

- [X] T003 [P] `DisplayControlState` model at
      `backend/app/repositories/models/display_control_state.py`.
- [X] T004 [P] `DisplayControlService` skeleton at
      `backend/app/application/display_control/service.py` with
      `latest_active_session` and `ensure_default_state`.

## Phase 3: User Story 1 — Switch content mode

- [X] T005 `DisplayControlService.update_state(...)` at
      `backend/app/application/display_control/service.py:100` with
      the `iframe` / `fixed` / `loop` validation and the
      `remote_control_invalid_iframe` warning event.
- [X] T006 `PUT /display/remote-control/state` at
      `backend/app/api/display.py:198`.
- [X] T007 [P] `GET /display/remote-control/state` at
      `backend/app/api/display.py:184`.

### Tests for User Story 1

- [X] T008 [P] [US1] Integration test: PUT
      `contentMode='iframe'` with a valid iframe → 200 +
      `remote_control_changed` at
      `backend/tests/integration/test_remote_control_state.py`.
- [X] T009 [P] [US1] Integration test: PUT
      `contentMode='iframe'` without selectedIframeId → 400 +
      `remote_control_invalid_iframe` warning.
- [X] T010 [P] [US1] Integration test: PUT from a
      `display_viewer` → 403 +
      `remote_control_access_denied` warning.

## Phase 4: User Story 2 — Issue navigation commands

- [X] T011 `DisplayControlService.issue_navigation_command(...)`
      at
      `backend/app/application/display_control/service.py:216` with
      the loop-only check and the
      `display_control_{paused,resumed}` /
      `remote_control_navigation_changed` events.
- [X] T012 `POST /display/remote-control/navigation` at
      `backend/app/api/display.py:225`.

### Tests for User Story 2

- [X] T013 [P] [US2] Integration test: `command='next'` in
      `loop` → 200 + `remote_control_navigation_changed` at
      `backend/tests/integration/test_remote_control_navigation.py`.
- [X] T014 [P] [US2] Integration test: `command='next'` in
      `iframe` → 400 "Navigation commands require rotation mode."
- [X] T015 [P] [US2] Integration test: `command='pause'` in
      `iframe` → 400 "Pause/Resume solo es válido en modo
      rotación."

## Phase 5: User Story 3 — Ads visibility and fullscreen

- [X] T016 `DisplayControlService.update_state(...)` emits
      `remote_control_ads_visibility_changed` and
      `remote_control_fullscreen_changed` on transition
      (already part of T005).
- [X] T017 [P] PUT `adsVisible=false` is gated only by
      `REMOTE_CONTROL_ROLES` (no extra role check).

### Tests for User Story 3

- [X] T018 [P] [US3] Integration test: PUT `adsVisible=true→
      false` records the visibility event at the same file.
- [X] T019 [P] [US3] Integration test: PUT with no change in
      `adsVisible` does NOT record an event.

## Phase 6: User Story 4 — Auto-fallback fixed → loop

- [X] T020 `DisplayControlService._auto_fallback_fixed(...)` at
      `backend/app/application/display_control/service.py:284` is
      invoked from `get_state_for_active_session(...)`.
- [X] T021 [P] Mapper at
      `backend/app/api/mappers.py` returns the post-fallback state
      in the next `GET /display/state`.

### Tests for User Story 4

- [X] T022 [P] [US4] Integration test: enter `fixed`, mark
      target `is_fixed=false`, next GET → `loop` +
      `display_control_fixed_changed` (warning) at
      `backend/tests/integration/test_auto_fallback_fixed.py`.
- [X] T023 [P] [US4] Integration test: same scenario in `loop`
      mode → no change, no event.

## Phase 7: Frontend

- [X] T024 [P] `RemoteControlApi` at
      `frontend/src/app/features/remote-control/remote-control.api.ts`.
- [X] T025 `RemoteControlComponent` at
      `frontend/src/app/features/remote-control/remote-control.component.ts`.
- [X] T026 [P] `RemoteControlFacade` at
      `frontend/src/app/features/remote-control/remote-control.facade.ts`.
- [X] T027 [P] Wire `/admin/remote-control` in
      `frontend/src/app/app.routes.ts`.
- [X] T028 [P] Karma spec for the remote control page at
      `frontend/src/app/features/remote-control/remote-control.component.spec.ts`.

## Dependencies & Execution Order

- Phase 2 → Phase 3 → Phase 4 → Phase 5.
- Phase 6 runs after Phase 5 (uses the same state object).
- Phase 7 is independent and can be parallel to Phases 4-6.

## Implementation Strategy

Single-contributor path:

1. Phase 1 + 2: 20 min.
2. Phase 3 + 4: 1.5 h (mode switch + navigation + tests).
3. Phase 5: 30 min (ads + fullscreen tests).
4. Phase 6: 30 min (auto-fallback tests).
5. Phase 7: 1.5 h (remote control page).
