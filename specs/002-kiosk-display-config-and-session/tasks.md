# Tasks: Kiosk Display Configuration and Session

**Input**: Design documents from
`specs/002-kiosk-display-config-and-session/`.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Verify working branch and that the spec dir contains
      `spec.md`, `plan.md`, `tasks.md`, `checklist.md`.
- [X] T002 [P] Confirm `0001_initial_kiosk_schema` and
      `0003_remote_control_polling` migrations create the
      `kiosk_display_configurations` and `operator_sessions` tables
      with the documented columns and CHECK constraints.

## Phase 2: Foundational

- [X] T003 [P] `KioskDisplayConfiguration` model with the eight
      CHECK constraints at
      `backend/app/repositories/models/kiosk_configuration.py`.
- [X] T004 [P] `OperatorSession` model at
      `backend/app/repositories/models/operator_session.py`.

## Phase 3: User Story 1 — Open a kiosk display

- [X] T005 `DisplayService.open_display(...)` at
      `backend/app/services/display_service.py:open_display` that
      creates the `operator_sessions` row and records
      `display_opened`.
- [X] T006 `POST /display/open` at
      `backend/app/api/display.py:155` returning
      `DisplayStateSchema`, mapping 403 / 409 from
      `PermissionError` / `ValueError`.
- [X] T007 `DisplayService.get_display_state(...)` at
      `backend/app/services/display_service.py:get_display_state`
      that builds the `DisplayState` and records
      `fallback_activated` when the active configuration is
      missing.
- [X] T008 `GET /display/state` at
      `backend/app/api/display.py:166` returning
      `DisplayStateSchema`; 409 on `ValueError` with
      `display_state_calculation_failed` audit event.

### Tests for User Story 1

- [X] T009 [P] [US1] Integration test: open → 200 + audit event at
      `backend/tests/integration/test_display_open.py`.
- [X] T010 [P] [US1] Integration test: 403 for
      `display_viewer` at the same file.
- [X] T011 [P] [US1] Integration test: 409 on second open while
      a session is still valid.
- [X] T012 [P] [US1] Integration test: state GET returns 409 and
      records `display_state_calculation_failed` when the
      configuration is missing.

## Phase 4: User Story 2 — Configure the kiosk knobs

- [X] T013 [P] `AdminService.get_configuration(...)` and
      `update_configuration(...)` at
      `backend/app/services/admin_service.py`; PUT records
      `configuration_changed`.
- [X] T014 [P] `GET /display/configuration` and `PUT
      /display/configuration` at
      `backend/app/api/configuration.py:14, 19`; PUT requires
      `CONFIGURATION_MANAGEMENT_ROLES`.

### Tests for User Story 2

- [X] T015 [P] [US2] Integration test: PUT with all valid values
      → 200 + audit at
      `backend/tests/integration/test_display_configuration.py`.
- [X] T016 [P] [US2] Integration test: PUT with
      `remote_control_polling_seconds=0` → 400.
- [X] T017 [P] [US2] Integration test: PUT with
      `video_end_delay_seconds=31` → 400.
- [X] T018 [P] [US2] Integration test: `content_manager` is
      allowed, `event_operator` is forbidden.

## Phase 5: User Story 3 — Kiosk polls state

- [X] T019 [P] `DisplayApiService.watchState(...)` at
      `frontend/src/app/core/api/display.api.ts` that polls every
      `remote_control_polling_seconds` and dedupes by
      fingerprint.
- [X] T020 [P] Wire `watchState` from
      `frontend/src/app/display/display-screen.component.ts`
      (consumed in spec 014).

## Phase 6: Frontend

- [X] T021 [P] `DisplayConfigComponent` at
      `frontend/src/app/features/display-config/display-config.component.ts`
      with the Material form for all knobs.
- [X] T022 [P] `DisplayConfigFacade` at
      `frontend/src/app/features/display-config/display-config.facade.ts`.
- [X] T023 [P] Wire `/admin/configuration` in
      `frontend/src/app/app.routes.ts`.
- [X] T024 [P] Karma spec for the configuration form at
      `frontend/src/app/features/display-config/display-config.component.spec.ts`.

## Dependencies & Execution Order

- Phase 2 → Phase 3 → Phase 4 → Phase 5.
- Phase 6 is independent and can be parallel to Phase 5.

## Implementation Strategy

Single-contributor path:

1. Phase 1 + 2: 10 min (sanity check).
2. Phase 3: 1 h (open + state + tests).
3. Phase 4: 30 min (configuration + tests).
4. Phase 5: 30 min (polling on kiosk side).
5. Phase 6: 1 h (config form).
