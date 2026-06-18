# Tasks: Remote Control Display

**Input**: Design documents from `/specs/006-remote-control-display/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are mandatory for changed behavior. Include unit tests for business logic and integration, contract, migration, frontend component/service, and manual validation tasks for cross-device display behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare feature structure, contract tracking, and validation records without changing runtime behavior.

- [X] T001 Create remote-control validation notes file in `specs/006-remote-control-display/validation/remote-control-smoke.md`
- [X] T002 Create hot configuration validation notes file in `specs/006-remote-control-display/validation/hot-configuration.md`
- [X] T003 [P] Add remote control contract tracking entry in `specs/006-remote-control-display/contracts/backend-contract.md`
- [X] T004 [P] Create backend remote control test fixture helpers in `backend/tests/unit/test_display_control_service.py`
- [X] T005 [P] Create frontend remote control feature test fixture helpers in `frontend/src/app/features/remote-control/remote-control.test-helpers.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared data, contracts, and configuration prerequisites that all user stories depend on.

**Critical**: No user story work can begin until this phase is complete.

### Foundational Tests

- [X] T006 [P] Add backend migration tests for `remote_control_polling_seconds` default and 1-60 constraint in `backend/tests/migration/test_remote_control_display_migration.py`
- [X] T007 [P] Add backend unit tests for remote control polling interval validation in `backend/tests/unit/test_display_control_service.py`
- [X] T008 [P] Add backend contract tests for display configuration `remoteControlPollingSeconds` in `backend/tests/contract/test_remote_control_display_contract.py`
- [X] T009 [P] Add frontend display configuration form tests for remote control polling interval validation in `frontend/src/app/features/display-config/display-config.component.spec.ts`

### Foundational Implementation

- [X] T010 Add Alembic migration for `remote_control_polling_seconds` on kiosk display configuration in `backend/alembic/versions/`
- [X] T011 Add `remote_control_polling_seconds` model field and check constraint in `backend/app/repositories/models/kiosk_configuration.py`
- [X] T012 Update backend configuration schemas for `remoteControlPollingSeconds` in `backend/app/api/schemas.py` and `backend/app/api/v1/display/schemas.py`
- [X] T013 Update backend display configuration service mapping for `remoteControlPollingSeconds` in `backend/app/application/display_config/service.py` and `backend/app/api/configuration.py`
- [X] T014 Update frontend configuration models for `remoteControlPollingSeconds` in `frontend/src/app/core/api/admin.api.ts` and `frontend/src/app/display/display-api.service.ts`
- [X] T015 Update display configuration form with 1-60 second polling interval control in `frontend/src/app/features/display-config/display-config.component.ts`
- [X] T016 Document default polling interval and hot-configuration expectation in `specs/006-remote-control-display/validation/hot-configuration.md`

**Checkpoint**: Display configuration contract includes polling interval with migration and validation coverage.

---

## Phase 3: User Story 1 - Control Kiosk Content Remotely (Priority: P1) MVP

**Goal**: An administrator can switch a running kiosk display between the normal content loop and an existing iframe without touching the kiosk.

**Independent Test**: Open display in one browser and remote control as administrator in another; select an existing iframe and then loop mode; verify display changes through polling without manual refresh.

### Tests for User Story 1

- [X] T017 [P] [US1] Add backend unit tests for default session remote control state and loop/iframe transitions in `backend/tests/unit/test_display_control_service.py`
- [X] T018 [P] [US1] Add backend unit tests for iframe eligibility rejection cases in `backend/tests/unit/test_display_control_service.py`
- [X] T019 [P] [US1] Add backend integration tests for administrator remote control read/update and non-admin denial in `backend/tests/integration/test_remote_control_api.py`
- [X] T020 [P] [US1] Add backend contract tests for remote control state, update, iframe options, and effective display state in `backend/tests/contract/test_remote_control_display_contract.py`
- [X] T021 [P] [US1] Add frontend API/facade tests for loading state, iframe options, immediate updates, and safe errors in `frontend/src/app/features/remote-control/remote-control.facade.spec.ts`
- [X] T022 [P] [US1] Add frontend component tests for mode selector, iframe selector, administrator-visible state, and error state in `frontend/src/app/features/remote-control/remote-control.component.spec.ts`
- [X] T023 [P] [US1] Add display polling tests for loop-to-iframe and iframe-to-loop changes in `frontend/src/app/display/display-screen.component.spec.ts`
- [X] T024 [P] [US1] Add route and hall entry tests for administrator remote control access in `frontend/src/app/app.routes.spec.ts` and `frontend/src/app/features/hall/hall.component.spec.ts`

### Implementation for User Story 1

- [X] T025 [US1] Add remote control state persistence model tied to display sessions in `backend/app/repositories/models/display_control_state.py`
- [X] T026 [US1] Include display control state model in repository metadata exports in `backend/app/repositories/models/__init__.py`
- [X] T027 [US1] Add Alembic migration for display control state storage in `backend/alembic/versions/`
- [X] T028 [US1] Implement remote control domain rules and content mode enum in `backend/app/domain/display_control.py`
- [X] T029 [US1] Implement display control application service with default state, iframe validation, and last-valid-change-wins updates in `backend/app/application/display_control/service.py`
- [X] T030 [US1] Update display open flow to initialize session remote control state in `backend/app/application/display/service.py` and `backend/app/services/display_service.py`
- [X] T031 [US1] Add remote control schemas in `backend/app/api/v1/display/schemas.py`
- [X] T032 [US1] Add remote control read/update and iframe option routes in `backend/app/api/v1/display/routes.py`
- [X] T033 [US1] Add administrator-only authorization checks for remote control routes using existing roles in `backend/app/domain/roles.py` and `backend/app/api/v1/display/routes.py`
- [X] T034 [US1] Add operational events or logs for denied control access, invalid iframe selections, and remote control updates in `backend/app/application/display_control/service.py` and `backend/app/domain/display_events.py`
- [X] T035 [US1] Extend effective display state mapping with remote control and selected iframe data in `backend/app/api/display.py` and `backend/app/api/v1/display/schemas.py`
- [X] T036 [US1] Add frontend remote control models in `frontend/src/app/features/remote-control/remote-control.models.ts`
- [X] T037 [US1] Add frontend remote control API adapter in `frontend/src/app/features/remote-control/remote-control.api.ts`
- [X] T038 [US1] Add frontend remote control facade for state, iframe options, immediate updates, and errors in `frontend/src/app/features/remote-control/remote-control.facade.ts`
- [X] T039 [US1] Add administrator remote control component in `frontend/src/app/features/remote-control/remote-control.component.ts`
- [X] T040 [US1] Wire remote control route and administrator guard behavior in `frontend/src/app/app.routes.ts` and `frontend/src/app/auth/session.guard.ts`
- [X] T041 [US1] Add hall remote control entry for administrators in `frontend/src/app/features/hall/hall.component.ts`
- [X] T042 [US1] Extend display API models with remote control state and selected iframe in `frontend/src/app/display/display-api.service.ts`
- [X] T043 [US1] Implement display polling and loop/iframe application in `frontend/src/app/display/display-screen.component.ts`
- [X] T044 [US1] Record US1 manual validation evidence in `specs/006-remote-control-display/validation/remote-control-smoke.md`

**Checkpoint**: User Story 1 is independently testable as the MVP remote content control flow.

---

## Phase 4: User Story 2 - Control Ads Visibility Remotely (Priority: P2)

**Goal**: An administrator can show or hide ads remotely, with content occupying full height when ads are hidden.

**Independent Test**: With display and remote control open, hide ads and verify content full height; show ads and verify regular layout returns in both loop and iframe modes.

### Tests for User Story 2

- [X] T045 [P] [US2] Add backend unit tests for `adsVisible` state transitions independent of content mode in `backend/tests/unit/test_display_control_service.py`
- [X] T046 [P] [US2] Add backend integration tests for ads visibility update/read behavior in `backend/tests/integration/test_remote_control_api.py`
- [X] T047 [P] [US2] Add frontend facade tests for ads visibility immediate update and latest state in `frontend/src/app/features/remote-control/remote-control.facade.spec.ts`
- [X] T048 [P] [US2] Add frontend component tests for ads visibility toggle and status feedback in `frontend/src/app/features/remote-control/remote-control.component.spec.ts`
- [X] T049 [P] [US2] Add display component tests for ads hidden full-height layout and ads restored layout in `frontend/src/app/display/display-screen.component.spec.ts`

### Implementation for User Story 2

- [X] T050 [US2] Add `ads_visible` support to backend control state model and schemas in `backend/app/repositories/models/display_control_state.py` and `backend/app/api/v1/display/schemas.py`
- [X] T051 [US2] Implement ads visibility update behavior in `backend/app/application/display_control/service.py`
- [X] T052 [US2] Add operational events or logs for ads visibility remote changes in `backend/app/application/display_control/service.py` and `backend/app/domain/display_events.py`
- [X] T053 [US2] Include ads visibility in effective display state mapping in `backend/app/api/display.py`
- [X] T054 [US2] Add ads visibility toggle to remote control UI in `frontend/src/app/features/remote-control/remote-control.component.ts`
- [X] T055 [US2] Apply ads hidden/restored layout classes in `frontend/src/app/display/display-screen.component.ts` and `frontend/src/app/display/display-screen.component.css`
- [X] T056 [US2] Ensure current content mode is preserved when ads visibility changes in `frontend/src/app/features/remote-control/remote-control.facade.ts`
- [X] T057 [US2] Record US2 manual validation evidence in `specs/006-remote-control-display/validation/remote-control-smoke.md`

**Checkpoint**: User Stories 1 and 2 work independently and together.

---

## Phase 5: User Story 3 - Apply Display Configuration Hot (Priority: P3)

**Goal**: Display-related configuration changes, including polling interval, timing, animation, ad count, and enabled state, apply to a running display without manual refresh.

**Independent Test**: With display open, change display configuration from admin; verify polling interval and display behavior update while display remains open.

### Tests for User Story 3

- [X] T058 [P] [US3] Add backend contract tests for effective display state including hot-applied configuration in `backend/tests/contract/test_remote_control_display_contract.py`
- [X] T059 [P] [US3] Add backend integration tests for configuration update reflected in display state in `backend/tests/integration/test_remote_control_api.py`
- [X] T060 [P] [US3] Add frontend display polling tests for changed polling interval rescheduling in `frontend/src/app/display/display-screen.component.spec.ts`
- [X] T061 [P] [US3] Add frontend display rotation regression tests for hot timing, animation, and ad count changes in `frontend/src/app/display/display-rotation.service.spec.ts` and `frontend/src/app/display/display-screen.component.spec.ts`
- [X] T062 [P] [US3] Add frontend display configuration tests for saving polling interval and safe validation errors in `frontend/src/app/features/display-config/display-config.component.spec.ts`

### Implementation for User Story 3

- [X] T063 [US3] Extend effective display state service to return current configuration snapshot on every display poll in `backend/app/application/display/service.py`
- [X] T064 [US3] Ensure display configuration updates are visible to running display polling without session restart in `backend/app/application/display_config/service.py`
- [X] T065 [US3] Add operational events or logs for hot configuration state calculation failures in `backend/app/application/display/service.py` and `backend/app/domain/display_events.py`
- [X] T066 [US3] Add display frontend state comparison and polling interval reschedule logic in `frontend/src/app/display/display-screen.component.ts`
- [X] T067 [US3] Refactor display rotation restart behavior for hot timing, animation, and ad count changes in `frontend/src/app/display/display-screen.component.ts`
- [X] T068 [US3] Apply display enabled or invalid configuration fallback behavior in `frontend/src/app/display/display-screen.component.ts`
- [X] T069 [US3] Update display configuration UI copy and validation for hot-applied settings in `frontend/src/app/features/display-config/display-config.component.ts`
- [X] T070 [US3] Record hot configuration validation evidence in `specs/006-remote-control-display/validation/hot-configuration.md`

**Checkpoint**: Running display hot-applies remote control polling and display configuration changes.

---

## Phase 6: User Story 4 - Preserve Default Kiosk Startup (Priority: P4)

**Goal**: New display sessions always start in loop mode with ads visible, regardless of prior temporary remote control selections.

**Independent Test**: Change remote state to iframe and ads hidden, open a new display session, and verify loop mode with ads visible.

### Tests for User Story 4

- [X] T071 [P] [US4] Add backend unit tests for new display session default control state in `backend/tests/unit/test_display_control_service.py`
- [X] T072 [P] [US4] Add backend integration tests for new display session resetting remote control defaults in `backend/tests/integration/test_display_api.py`
- [X] T073 [P] [US4] Add frontend display startup regression tests for default loop and ads visible state in `frontend/src/app/display/display-screen.component.spec.ts`

### Implementation for User Story 4

- [X] T074 [US4] Ensure display open always creates or resets session control state to loop and ads visible in `backend/app/application/display/service.py`
- [X] T075 [US4] Ensure stale session control state is ignored for new display sessions in `backend/app/application/display_control/service.py`
- [X] T076 [US4] Keep frontend display startup default behavior compatible with legacy state in `frontend/src/app/display/display-screen.component.ts`
- [X] T077 [US4] Record startup default validation evidence in `specs/006-remote-control-display/validation/remote-control-smoke.md`

**Checkpoint**: New kiosk display sessions are predictable and do not retain prior temporary choices.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, and quality gates that span all stories.

- [X] T078 [P] Update backend OpenAPI expectations for remote control display contracts in `backend/tests/contract/test_openapi_contract.py`
- [X] T079 [P] Update architecture boundary tests for new backend display_control application module in `backend/tests/unit/test_architecture_boundaries.py`
- [X] T080 [P] Update frontend architecture boundary tests for `features/remote-control` in `frontend/src/app/architecture-boundaries.spec.ts`
- [X] T081 [P] Update feature README/navigation documentation for remote control boundaries in `frontend/src/app/features/README.md`
- [X] T082 [P] Update backend application boundary documentation for display control service ownership in `backend/app/application/README.md`
- [X] T083 Run backend validation with `pytest backend/tests`
- [X] T084 Run frontend validation with `npm --prefix frontend run test`
- [X] T085 Run frontend build validation with `npm --prefix frontend run build`
- [X] T086 Execute quickstart smoke flow and record results in `specs/006-remote-control-display/validation/remote-control-smoke.md`
- [X] T087 Complete requirements readiness checklist in `specs/006-remote-control-display/checklists/remote-control-readiness.md`
- [X] T088 Update final implementation notes and residual risk in `specs/006-remote-control-display/validation/hot-configuration.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and integrates with US1 control state, but remains independently testable.
- **User Story 3 (Phase 5)**: Depends on Foundational and display polling from US1.
- **User Story 4 (Phase 6)**: Depends on Foundational and session state from US1.
- **Polish (Phase 7)**: Depends on desired user stories being complete.

### User Story Dependencies

- **US1**: Required MVP foundation for administrator content mode control.
- **US2**: Builds on the same remote state but can be validated independently for ads visibility.
- **US3**: Requires display polling path from US1 to apply configuration hot.
- **US4**: Requires session-scoped state from US1 to validate reset behavior.

### Within Each User Story

- Tests first and expected to fail before implementation.
- Data model and migrations before backend service behavior.
- Backend service behavior before routes.
- API contracts before frontend adapters.
- Frontend adapters/facades before components.
- Display state model before display rendering changes.
- Manual validation after automated tests pass.

## Parallel Opportunities

- T003-T005 can run in parallel after T001-T002.
- T006-T009 can run in parallel before foundational implementation.
- US1 tests T017-T024 can run in parallel.
- Backend implementation T028-T035 and frontend implementation T036-T043 can be split after model/migration tasks T025-T027.
- US2 tests T045-T049 can run in parallel.
- US3 tests T058-T062 can run in parallel.
- US4 tests T071-T073 can run in parallel.
- Polish documentation tasks T078-T082 can run in parallel.

## Parallel Example: User Story 1

```text
Task: "Add backend unit tests for default session remote control state and loop/iframe transitions in backend/tests/unit/test_display_control_service.py"
Task: "Add backend integration tests for administrator remote control read/update and non-admin denial in backend/tests/integration/test_remote_control_api.py"
Task: "Add frontend API/facade tests for loading state, iframe options, immediate updates, and safe errors in frontend/src/app/features/remote-control/remote-control.facade.spec.ts"
Task: "Add display polling tests for loop-to-iframe and iframe-to-loop changes in frontend/src/app/display/display-screen.component.spec.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundational configuration and migration work.
3. Complete Phase 3 User Story 1.
4. Validate backend tests, frontend tests, and manual two-browser loop/iframe smoke.
5. Stop before ads visibility or broad hot configuration unless User Story 1 is stable.

### Incremental Delivery

1. Add US1 remote content control.
2. Add US2 ads visibility and full-height content.
3. Add US3 hot configuration application.
4. Add US4 startup default preservation.
5. Complete cross-cutting validation and documentation.

### Stop Conditions

- Stop if implementation requires multiple kiosks, arbitrary URL entry, scheduling, or persistent remote mode across new display sessions.
- Stop if session-scoped state cannot be implemented without changing approved startup behavior.
- Stop if hot-applying a display configuration setting conflicts with existing display safety behavior; update spec/plan before proceeding.

## Notes

- [P] tasks use different files or can be safely worked in parallel.
- [US1]-[US4] labels map tasks to spec user stories.
- Tests are mandatory because every story changes runtime behavior.
- Do not mark a task complete until its validation path passes or an approved exception is recorded.
