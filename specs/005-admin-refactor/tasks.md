# Tasks: Administration Refactor

**Input**: Design documents from `/specs/005-admin-refactor/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Tests are mandatory for changed behavior. Backend behavior uses pytest unit, integration, migration, and contract tests. Frontend behavior uses Angular-compatible component, service, facade, and routing tests. Manual validation is required for the big bang final acceptance gate.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing, but release is big bang per FR-024.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other marked tasks in the same phase because it touches different files or only tests a defined contract.
- **[Story]**: User story traceability label from `spec.md`.
- Every task references one or more requirements and includes exact target files/modules.

---

## Phase 1: Setup (Shared Refactor Baseline)

**Purpose**: Establish dependencies, folders, and baseline documentation used by all refactor work.

- [X] T001 Add Angular Material dependency and animation provider configuration for FR-005, FR-017 in `frontend/package.json`, `frontend/package-lock.json`, `frontend/src/app/app.config.ts`, and `frontend/angular.json`
- [X] T002 [P] Create frontend feature folder skeleton for FR-016 in `frontend/src/app/core/`, `frontend/src/app/shared/`, and `frontend/src/app/features/`
- [X] T003 [P] Create backend modular folder skeleton for FR-016 in `backend/app/api/v1/`, `backend/app/application/`, `backend/app/infrastructure/`, and `backend/app/shared/`
- [X] T004 [P] Add backend migration test package skeleton for FR-022, FR-023 in `backend/tests/migration/`
- [X] T005 [P] Add refactor validation record template with pass, exception approver, exception reason, risk, evidence, and follow-up fields for FR-025, FR-026 in `specs/005-admin-refactor/validation/final-acceptance.md`
- [X] T006 Update README local validation notes for refactor planning context for FR-026 in `README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create shared UI, form, routing, error, API, and backend primitives that all user stories depend on.

**Critical**: No user story implementation should start until this phase is complete.

### Foundational Tests

- [ ] T007 [P] Add frontend shared state component tests for loading, empty, saving, saved, validation, permission, conflict, upload, and unexpected states for FR-006, FR-007, FR-013 in `frontend/src/app/shared/ui/admin-state/admin-state.component.spec.ts`
- [ ] T008 [P] Add frontend confirmation dialog tests for destructive and navigation-loss flows for FR-007, FR-009 in `frontend/src/app/shared/ui/confirm-dialog/confirm-dialog.component.spec.ts`
- [ ] T009 [P] Add frontend form dirty-state tests for route, hall, kiosk, browser-back, and cancel navigation for FR-007 in `frontend/src/app/shared/forms/dirty-form.guard.spec.ts`
- [X] T010 [P] Add frontend API error adapter tests for safe user-facing messages for FR-013 in `frontend/src/app/core/errors/api-error-adapter.spec.ts`
- [X] T011 [P] Add backend application error contract tests for safe error envelopes for FR-013, FR-014 in `backend/tests/contract/test_application_errors.py`
- [ ] T012 [P] Add backend authorization regression tests for preserved role intent for FR-004, FR-010 in `backend/tests/integration/test_refactor_authorization.py`
- [X] T013 [P] Add migration fixture validation tests for existing records for FR-019, FR-022, FR-023 in `backend/tests/migration/test_existing_data_migration.py`

### Foundational Implementation

- [X] T014 Implement Angular Material theme and admin design tokens for FR-005, FR-017 in `frontend/src/styles.css` and `frontend/src/app/shared/ui/admin-theme.css`
- [X] T015 [P] Implement shared admin state component for FR-006, FR-007, FR-013 in `frontend/src/app/shared/ui/admin-state/admin-state.component.ts`
- [X] T016 [P] Implement shared confirmation dialog component for FR-007, FR-009 in `frontend/src/app/shared/ui/confirm-dialog/confirm-dialog.component.ts`
- [X] T017 [P] Implement shared page header and section action components for FR-002, FR-005 in `frontend/src/app/shared/ui/page-header/page-header.component.ts` and `frontend/src/app/shared/ui/section-actions/section-actions.component.ts`
- [X] T018 [P] Implement shared typed form helpers and validators for FR-007, FR-008, FR-011 in `frontend/src/app/shared/forms/admin-form.models.ts` and `frontend/src/app/shared/forms/admin-validators.ts`
- [X] T019 Implement shared dirty-form route guard and discard confirmation integration for FR-007 in `frontend/src/app/shared/forms/dirty-form.guard.ts`
- [X] T020 Implement frontend safe API error adapter for FR-013 in `frontend/src/app/core/errors/api-error-adapter.ts`
- [X] T021 [P] Create frontend shared contract models for hall, admin sections, list state, form state, application error, and data migration for FR-015, FR-016 in `frontend/src/app/shared/contracts/admin-contracts.ts`
- [X] T022 Implement backend typed application errors and safe envelope model for FR-013, FR-014 in `backend/app/shared/errors/application_errors.py` and `backend/app/shared/errors/error_schema.py`
- [X] T023 Implement backend centralized FastAPI exception handlers for FR-013, FR-014 in `backend/app/api/v1/error_handlers.py` and `backend/app/main.py`
- [X] T024 [P] Create backend capability response/request schema packages for FR-016 in `backend/app/api/v1/content/schemas.py`, `backend/app/api/v1/ads/schemas.py`, `backend/app/api/v1/display/schemas.py`, `backend/app/api/v1/users/schemas.py`, and `backend/app/api/v1/common/schemas.py`
- [X] T025 [P] Create backend application service package interfaces for FR-016 in `backend/app/application/content/service.py`, `backend/app/application/ads/service.py`, `backend/app/application/display_config/service.py`, `backend/app/application/users/service.py`, and `backend/app/application/readiness/service.py`
- [X] T026 Implement v1 API router composition without broadening permissions for FR-004, FR-016 in `backend/app/api/v1/router.py` and `backend/app/api/router.py`
- [X] T027 Document changed contract tracking format for FR-004A, FR-021 in `specs/005-admin-refactor/contracts/contract-change-log.md`

**Checkpoint**: Shared frontend/backend refactor foundation is ready; user story work can proceed.

---

## Phase 3: User Story 1 - Use A Coherent Administration Experience (Priority: P1) MVP

**Goal**: Administrators use hall and administration through a consistent, professional interface with predictable navigation, layout, lists, states, and actions.

**Independent Test**: Sign in as administrator, open hall, enter administration, and reach every admin section using visible controls while seeing consistent loading/empty/error/success behavior.

### Tests for User Story 1

- [ ] T028 [P] [US1] Add hall routing and destination tests for FR-001 in `frontend/src/app/features/hall/hall.component.spec.ts`
- [ ] T029 [P] [US1] Add admin shell Material navigation tests for FR-002, FR-005, FR-017 in `frontend/src/app/features/admin-shell/admin-shell.component.spec.ts`
- [ ] T030 [P] [US1] Add admin dashboard view-model tests for FR-005, FR-006, FR-012 in `frontend/src/app/features/dashboard/dashboard.facade.spec.ts`
- [ ] T031 [P] [US1] Add admin route contract tests for all required destinations for FR-001, FR-002, FR-015 in `frontend/src/app/core/routing/app.routes.spec.ts`
- [ ] T032 [P] [US1] Add UI contract validation notes for hall/admin navigation for FR-015, FR-021 in `specs/005-admin-refactor/validation/admin-navigation.md`

### Implementation for User Story 1

- [ ] T033 [US1] Move hall implementation into feature structure for FR-001, FR-016 in `frontend/src/app/features/hall/hall.component.ts`
- [X] T034 [US1] Implement Material administration shell with persistent navigation and kiosk action for FR-002, FR-005, FR-017 in `frontend/src/app/features/admin-shell/admin-shell.component.ts`
- [ ] T035 [US1] Implement dashboard facade and view model for setup summaries for FR-006, FR-012, FR-016 in `frontend/src/app/features/dashboard/dashboard.facade.ts`
- [ ] T036 [US1] Implement Material dashboard component using shared state and action components for FR-005, FR-006 in `frontend/src/app/features/dashboard/dashboard.component.ts`
- [X] T037 [US1] Update app routing to use `features/` modules and keep hall/admin/kiosk flow for FR-001, FR-002, FR-003 in `frontend/src/app/core/routing/app.routes.ts` and `frontend/src/app/app.routes.ts`
- [X] T038 [US1] Migrate admin navigation service into core/feature contract structure for FR-015, FR-016 in `frontend/src/app/features/admin-shell/admin-navigation.service.ts`
- [ ] T039 [US1] Remove obsolete admin layout CSS and replace with Material-based layout classes for FR-005, FR-017 in `frontend/src/styles.css` and `frontend/src/app/features/admin-shell/admin-shell.component.css`
- [ ] T040 [US1] Validate US1 hall/admin navigation manually and record results for SC-001, SC-002, SC-004 in `specs/005-admin-refactor/validation/admin-navigation.md`

**Checkpoint**: User Story 1 is independently testable and provides the MVP refactored administration entry experience.

---

## Phase 4: User Story 2 - Configure Kiosk Content With Reliable Forms (Priority: P2)

**Goal**: Administrators create and edit kiosk configuration records through reliable Material forms and lists while preserving existing business behavior.

**Independent Test**: Complete create/edit workflows for content, ads, clients, approved domains, display configuration, and users; verify lists, validation, errors, and readiness reflect saved data.

### Backend Tests for User Story 2

- [ ] T041 [P] [US2] Add content v1 contract tests for preserved and changed payloads for FR-008, FR-021 in `backend/tests/contract/test_v1_content_contract.py`
- [ ] T042 [P] [US2] Add ads and clients v1 contract tests for preserved and changed payloads for FR-008, FR-009, FR-021 in `backend/tests/contract/test_v1_ads_contract.py`
- [ ] T043 [P] [US2] Add domains and display configuration v1 contract tests for FR-009, FR-011, FR-021 in `backend/tests/contract/test_v1_admin_contract.py`
- [ ] T044 [P] [US2] Add users and roles v1 contract tests for FR-010, FR-021 in `backend/tests/contract/test_v1_users_contract.py`
- [ ] T045 [P] [US2] Add backend service tests for content behavior preservation for FR-004, FR-008 in `backend/tests/unit/test_content_application_service.py`
- [ ] T046 [P] [US2] Add backend service tests for ads, clients, and dependency-safe delete behavior for FR-004, FR-008, FR-009 in `backend/tests/unit/test_ads_application_service.py`
- [ ] T047 [P] [US2] Add backend service tests for display config, readiness, domains, users, and roles for FR-010, FR-011, FR-012 in `backend/tests/unit/test_admin_application_services.py`
- [ ] T048 [P] [US2] Add backend integration tests for safe validation, permission, dependency, upload, and storage errors for FR-013, FR-014 in `backend/tests/integration/test_v1_admin_errors.py`

### Frontend Tests for User Story 2

- [X] T049 [P] [US2] Add content list/form facade tests for FR-006, FR-007, FR-008 in `frontend/src/app/features/content/content.facade.spec.ts`
- [X] T050 [P] [US2] Add content Material component tests for validation, upload, iframe, dirty state, and errors for FR-007, FR-008, FR-013 in `frontend/src/app/features/content/content-form.component.spec.ts`
- [X] T051 [P] [US2] Add ads list/form facade tests for FR-006, FR-007, FR-008 in `frontend/src/app/features/ads/ads.facade.spec.ts`
- [X] T052 [P] [US2] Add ads Material component tests for client association, upload, validation, dirty state, and errors for FR-007, FR-008, FR-013 in `frontend/src/app/features/ads/ad-form.component.spec.ts`
- [X] T053 [P] [US2] Add clients Material component tests for create, edit, active state, delete conflict, deactivate, and reactivate for FR-006, FR-009 in `frontend/src/app/features/clients/clients.component.spec.ts`
- [X] T054 [P] [US2] Add approved domains Material component tests for create, edit, active state, delete conflict, deactivate, and reactivate for FR-006, FR-009 in `frontend/src/app/features/domains/domains.component.spec.ts`
- [X] T055 [P] [US2] Add display configuration Reactive Forms tests for timing, animation, inline ads, event duration, and enabled state for FR-007, FR-011 in `frontend/src/app/features/display-config/display-config.component.spec.ts`
- [ ] T056 [P] [US2] Add users and roles Reactive Forms tests for list, create, edit, active status, and existing role assignment for FR-007, FR-010 in `frontend/src/app/features/users/users.component.spec.ts`
- [ ] T057 [P] [US2] Add readiness guidance component tests for blockers and section directions for FR-012 in `frontend/src/app/features/readiness/readiness.component.spec.ts`

### Backend Implementation for User Story 2

- [X] T058 [US2] Move content schemas and route handlers into v1 capability module for FR-008, FR-016 in `backend/app/api/v1/content/`
- [X] T059 [US2] Move content business behavior into application service while preserving upload and iframe rules for FR-004, FR-008, FR-016 in `backend/app/application/content/service.py`
- [X] T060 [US2] Move ads schemas and route handlers into v1 capability module for FR-008, FR-016 in `backend/app/api/v1/ads/`
- [X] T061 [US2] Move ad and client business behavior into application services while preserving dependency-safe delete for FR-004, FR-008, FR-009, FR-016 in `backend/app/application/ads/service.py` and `backend/app/application/clients/service.py`
- [X] T062 [US2] Move approved domain schemas and handlers into v1 capability module for FR-009, FR-016 in `backend/app/api/v1/domains/`
- [X] T063 [US2] Move approved domain behavior into application service while preserving iframe dependency rules for FR-004, FR-009, FR-016 in `backend/app/application/domains/service.py`
- [X] T064 [US2] Move display configuration schemas and handlers into v1 capability module for FR-011, FR-016 in `backend/app/api/v1/display/`
- [X] T065 [US2] Move display configuration and readiness behavior into application services for FR-011, FR-012, FR-016 in `backend/app/application/display_config/service.py` and `backend/app/application/readiness/service.py`
- [X] T066 [US2] Move users and roles schemas and handlers into v1 capability module for FR-010, FR-016 in `backend/app/api/v1/users/`
- [X] T067 [US2] Move user and role business behavior into application service while preserving existing role types for FR-010, FR-016, FR-018 in `backend/app/application/users/service.py`
- [ ] T068 [US2] Replace route-level generic exception mapping with typed application errors for FR-013, FR-014 in `backend/app/api/v1/content/`, `backend/app/api/v1/ads/`, `backend/app/api/v1/domains/`, `backend/app/api/v1/display/`, and `backend/app/api/v1/users/`
- [ ] T069 [US2] Update OpenAPI contract generation expectations after v1 modularization for FR-015, FR-021 in `backend/app/api/openapi.py` and `backend/tests/contract/test_openapi_contract.py`
- [ ] T070 [US2] Document changed backend contracts and compatibility notes for FR-004A, FR-021 in `specs/005-admin-refactor/contracts/contract-change-log.md`

### Frontend Implementation for User Story 2

- [X] T071 [US2] Implement content API adapter and contract models for FR-008, FR-015, FR-016 in `frontend/src/app/features/content/content.api.ts` and `frontend/src/app/features/content/content.models.ts`
- [X] T072 [US2] Implement content facade with list, get, save, upload, delete, refresh, and safe error states for FR-006, FR-007, FR-008, FR-013 in `frontend/src/app/features/content/content.facade.ts`
- [X] T073 [US2] Implement Material content list and Reactive Form content editor for FR-005, FR-007, FR-008, FR-017 in `frontend/src/app/features/content/content-list.component.ts` and `frontend/src/app/features/content/content-form.component.ts`
- [X] T074 [US2] Implement ads API adapter and contract models for FR-008, FR-015, FR-016 in `frontend/src/app/features/ads/ads.api.ts` and `frontend/src/app/features/ads/ads.models.ts`
- [X] T075 [US2] Implement ads facade with list, get, save, upload, delete, refresh, and safe error states for FR-006, FR-007, FR-008, FR-013 in `frontend/src/app/features/ads/ads.facade.ts`
- [X] T076 [US2] Implement Material ad list and Reactive Form ad editor for FR-005, FR-007, FR-008, FR-017 in `frontend/src/app/features/ads/ad-list.component.ts` and `frontend/src/app/features/ads/ad-form.component.ts`
- [X] T077 [US2] Implement clients API adapter, facade, Material list, and Reactive Form editor for FR-006, FR-007, FR-009 in `frontend/src/app/features/clients/`
- [X] T078 [US2] Implement domains API adapter, facade, Material list, and Reactive Form editor for FR-006, FR-007, FR-009 in `frontend/src/app/features/domains/`
- [X] T079 [US2] Implement display configuration API adapter, facade, and Material Reactive Form for FR-007, FR-011 in `frontend/src/app/features/display-config/`
- [ ] T080 [US2] Implement readiness API adapter, facade, and Material guidance screen for FR-006, FR-012 in `frontend/src/app/features/readiness/`
- [ ] T081 [US2] Implement users API adapter, facade, Material list, and Reactive Form editor for FR-007, FR-010 in `frontend/src/app/features/users/`
- [ ] T082 [US2] Wire all US2 feature routes under the refactored admin shell for FR-001, FR-002, FR-016 in `frontend/src/app/core/routing/app.routes.ts`
- [ ] T083 [US2] Record US2 UI contract changes and validation notes for FR-004A, FR-021 in `specs/005-admin-refactor/validation/admin-workflows.md`

**Checkpoint**: User Story 2 is independently testable through complete admin configuration workflows.

---

## Phase 5: User Story 3 - Preserve Kiosk Runtime Behavior During Refactor (Priority: P3)

**Goal**: Operators can continue using hall and kiosk mode with approved rotation, display, and Escape-to-hall behavior after refactor.

**Independent Test**: Enter kiosk mode from hall, verify migrated/refactored display state rotates eligible content and ads, press Escape, and return to hall.

### Tests for User Story 3

- [ ] T084 [P] [US3] Add frontend kiosk Escape-to-hall regression tests for FR-003, FR-004 in `frontend/src/app/display/display-screen.component.spec.ts`
- [ ] T085 [P] [US3] Add frontend display rotation regression tests for ordering, timing, animation class, and inline ads for FR-004, FR-008, FR-011 in `frontend/src/app/display/display-rotation.service.spec.ts` and `frontend/src/app/display/display-screen.component.spec.ts`
- [ ] T086 [P] [US3] Add backend display state v1 contract tests for migrated/refactored payloads for FR-004, FR-021 in `backend/tests/contract/test_v1_display_contract.py`
- [ ] T087 [P] [US3] Add backend display service regression tests for approved content/ad selection and effective settings for FR-004, FR-011 in `backend/tests/unit/test_display_application_service.py`
- [ ] T088 [P] [US3] Add manual kiosk regression checklist for FR-025, FR-026 in `specs/005-admin-refactor/validation/kiosk-regression.md`

### Implementation for User Story 3

- [ ] T089 [US3] Keep kiosk display outside Material admin layout while updating imports to new shared contracts for FR-003, FR-004, FR-016 in `frontend/src/app/display/display-screen.component.ts`
- [ ] T090 [US3] Move display API adapter to refactored core/feature boundary while preserving display state contract for FR-004, FR-015, FR-016 in `frontend/src/app/display/display-api.service.ts` and `frontend/src/app/display/display.models.ts`
- [X] T091 [US3] Move backend display open/state handlers into v1 module while preserving authorization and behavior for FR-004, FR-016 in `backend/app/api/v1/display/routes.py`
- [X] T092 [US3] Move display state business behavior into application service while preserving rotation inputs and fallback behavior for FR-004, FR-011, FR-016 in `backend/app/application/display/service.py`
- [ ] T093 [US3] Document display contract changes and compatibility notes for FR-004A, FR-021 in `specs/005-admin-refactor/contracts/contract-change-log.md`
- [ ] T094 [US3] Validate US3 kiosk smoke flow manually and record results for SC-001, SC-006, SC-014 in `specs/005-admin-refactor/validation/kiosk-regression.md`

**Checkpoint**: User Story 3 is independently testable through hall-to-kiosk and Escape-to-hall regression.

---

## Phase 6: User Story 4 - Maintain And Validate The Application Safely (Priority: P4)

**Goal**: Maintainers can locate capability boundaries, contracts, validation, migrations, and error paths quickly and safely.

**Independent Test**: Pick one administration capability and trace its screen, facade, API adapter, backend route, application service, contract tests, migration notes, and error mapping in under 5 minutes.

### Tests for User Story 4

- [X] T095 [P] [US4] Add architecture boundary tests or import lint checks for frontend feature/shared/core separation for FR-016 in `frontend/src/app/architecture-boundaries.spec.ts`
- [X] T096 [P] [US4] Add backend architecture boundary tests for api/application/domain/infrastructure separation for FR-016 in `backend/tests/unit/test_architecture_boundaries.py`
- [X] T097 [P] [US4] Add contract-change-log completeness test for changed contracts for FR-021 in `backend/tests/contract/test_contract_change_log.py`
- [X] T098 [P] [US4] Add migration documentation completeness test for data redesign decisions for FR-022, FR-023 in `backend/tests/migration/test_migration_contract_documentation.py`
- [X] T099 [P] [US4] Add safe error observability tests for diagnostics and user-facing messages for FR-013, FR-014 in `backend/tests/integration/test_error_observability.py`

### Implementation for User Story 4

- [X] T100 [US4] Implement frontend boundary documentation and barrel exports for feature/core/shared ownership for FR-016 in `frontend/src/app/core/README.md`, `frontend/src/app/shared/README.md`, and `frontend/src/app/features/README.md`
- [X] T101 [US4] Implement backend boundary documentation for api/application/domain/infrastructure/shared ownership for FR-016 in `backend/app/api/README.md`, `backend/app/application/README.md`, `backend/app/domain/README.md`, `backend/app/infrastructure/README.md`, and `backend/app/shared/README.md`
- [X] T102 [US4] Implement contract change log entries for every changed UI/API/error/migration contract for FR-004A, FR-021 in `specs/005-admin-refactor/contracts/contract-change-log.md`
- [ ] T103 [US4] Implement migration decision record stating structural migration required or not required for FR-022, FR-023 in `specs/005-admin-refactor/validation/migration-validation.md`
- [X] T104 [US4] Implement final acceptance validation record with pass/exception slots, approver, reason, risk, evidence, and follow-up fields for FR-025, FR-026 in `specs/005-admin-refactor/validation/final-acceptance.md`
- [X] T105 [US4] Update developer README with refactored architecture navigation and validation commands for FR-015, FR-016, FR-026 in `README.md`
- [ ] T106 [US4] Validate maintainer traceability manually and record timing for SC-008, SC-011 in `specs/005-admin-refactor/validation/maintainer-traceability.md`

**Checkpoint**: User Story 4 is independently testable through maintainability and validation traceability.

---

## Phase 7: Data Migration And Compatibility

**Purpose**: Implement and validate persisted data redesign if required, or explicitly record that no structural data migration was needed.

- [ ] T107 [P] Create representative pre-refactor fixture data for migration validation for FR-019, FR-022, FR-023 in `backend/tests/fixtures/refactor_existing_data.py`
- [ ] T108 Decide and document exactly one migration path for FR-022, FR-023 in `specs/005-admin-refactor/validation/migration-validation.md`: Path A requires persisted data redesign and executes T109-T110; Path B requires no persisted data redesign and executes T111
- [ ] T109 [Path A] Implement Alembic migration preserving existing records for FR-019, FR-022, FR-023 in `backend/alembic/versions/`
- [ ] T110 [Path A] Update SQLAlchemy models and repositories for FR-019, FR-022, FR-023 in `backend/app/infrastructure/database/models/` and `backend/app/infrastructure/database/repositories/`
- [ ] T111 [Path B] Add compatibility validation proving existing records remain usable without structural migration for FR-019, FR-023 in `backend/tests/migration/test_existing_data_compatibility.py`
- [ ] T112 Run migration validation against representative fixture data and record results for SC-013 in `specs/005-admin-refactor/validation/migration-validation.md`

---

## Phase 8: Polish & Cross-Cutting Final Acceptance

**Purpose**: Complete big bang release validation across tests, build, smoke, accessibility, errors, contracts, migration, and kiosk regression.

- [ ] T113 [P] Update OpenAPI and backend contract validation documentation for FR-015, FR-021 in `specs/005-admin-refactor/validation/backend-contracts.md`
- [ ] T114 [P] Update admin UI contract validation documentation for FR-015, FR-021 in `specs/005-admin-refactor/validation/admin-ui-contracts.md`
- [X] T115 [P] Run backend pytest validation for FR-026 and record command output summary in `specs/005-admin-refactor/validation/final-acceptance.md`
- [X] T116 [P] Run frontend Angular tests for FR-026 and record command output summary in `specs/005-admin-refactor/validation/final-acceptance.md`
- [ ] T117 Run frontend production build validation for FR-026 and record command output summary in `specs/005-admin-refactor/validation/final-acceptance.md`
- [ ] T118 Run backend and frontend Docker image build validation for FR-026 and record command output summary in `specs/005-admin-refactor/validation/final-acceptance.md`
- [ ] T119 Perform manual hall/admin/kiosk smoke validation, including primary admin setup navigation and administration feedback within 5 seconds, for FR-001, FR-002, FR-003, FR-025, FR-026 and SC-003 in `specs/005-admin-refactor/validation/final-acceptance.md`
- [ ] T120 Perform desktop/tablet keyboard and readability accessibility checks for FR-017, FR-026, SC-010 in `specs/005-admin-refactor/validation/accessibility.md`
- [ ] T121 Perform safe user-facing error validation for validation, permission, dependency, upload, storage, migration, and unexpected errors for FR-013, FR-026, SC-007 in `specs/005-admin-refactor/validation/error-handling.md`
- [ ] T122 Confirm all contract changes have compatibility or migration validation for FR-021, FR-026, SC-012 in `specs/005-admin-refactor/contracts/contract-change-log.md`
- [ ] T123 Finalize the ongoing implementation conflict log for FR-020, confirming each conflict with the approved spec, plan, or tasks recorded the stop point, explanation, artifact update, and approval evidence before affected implementation continued in `specs/005-admin-refactor/validation/implementation-conflicts.md`
- [ ] T124 Record big bang release readiness, including evidence that no incremental production release is treated as complete before Phase 8 final acceptance for FR-024 in `specs/005-admin-refactor/validation/final-acceptance.md`
- [ ] T125 Complete final acceptance gate summary with pass statuses or approved exceptions, including exception approver and evidence, for SC-005, SC-009, SC-014, SC-015 in `specs/005-admin-refactor/validation/final-acceptance.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1 and blocks all user stories.
- **Phase 3 US1**: Depends on Phase 2 and is the MVP administration entry experience.
- **Phase 4 US2**: Depends on Phase 2 and integrates with US1 navigation.
- **Phase 5 US3**: Depends on Phase 2 and integrates with hall navigation from US1.
- **Phase 6 US4**: Depends on Phases 2 through 5 because it verifies traceability across implemented capabilities.
- **Phase 7 Migration**: Can begin after backend design in Phase 2 but final validation depends on US2 and US3 behavior.
- **Phase 8 Final Acceptance**: Depends on all implementation and migration phases.

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2.
- **US2 (P2)**: Can start after Phase 2 but final route integration depends on US1 shell routes.
- **US3 (P3)**: Can start after Phase 2 but final hall integration depends on US1.
- **US4 (P4)**: Depends on completed boundaries from US1-US3.

### Big Bang Release Constraint

- Even when stories are independently testable, no production release is complete until Phase 8 final acceptance passes or exceptions are explicitly approved.

### Conflict Handling Gate

- FR-020 is an active stop-the-line gate throughout implementation. If implementation reality conflicts with the approved spec, plan, or tasks, the affected implementation must stop, the conflict must be recorded in T123's target log, and the approved artifacts must be updated before that work continues.

---

## Parallel Opportunities

- Setup tasks T002-T005 can run in parallel.
- Foundational tests T007-T013 can run in parallel.
- Foundational implementation tasks T015-T018, T021, T024, and T025 can run in parallel after shared naming is agreed.
- US1 tests T028-T032 can run in parallel.
- US2 backend tests T041-T048 and frontend tests T049-T057 can run in parallel.
- US2 backend capability refactors T058-T067 can run by capability in parallel if write scopes stay separate.
- US2 frontend feature implementations T071-T081 can run by feature in parallel if shared UI APIs are stable.
- US3 tests T084-T088 can run in parallel.
- US4 tests T095-T099 can run in parallel.
- Final validation documentation tasks T113-T116 can run in parallel, but T124 and T125 depend on all final gate evidence.

---

## Parallel Example: User Story 2

```bash
# Backend capability tests
Task: "T041 content v1 contract tests in backend/tests/contract/test_v1_content_contract.py"
Task: "T042 ads and clients v1 contract tests in backend/tests/contract/test_v1_ads_contract.py"
Task: "T043 domains and display configuration v1 contract tests in backend/tests/contract/test_v1_admin_contract.py"

# Frontend feature tests
Task: "T049 content facade tests in frontend/src/app/features/content/content.facade.spec.ts"
Task: "T051 ads facade tests in frontend/src/app/features/ads/ads.facade.spec.ts"
Task: "T055 display configuration form tests in frontend/src/app/features/display-config/display-config.component.spec.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1).
3. Validate hall and administration navigation independently.
4. Stop and review before expanding to workflow and backend contract changes.

### Big Bang Delivery Strategy

1. Complete all phases in dependency order.
2. Keep each user story independently testable during development.
3. Do not mark the refactor complete until Phase 8 final acceptance is fully recorded.
4. If implementation reality conflicts with spec or plan, stop and update the approved artifacts before changing direction.

### Traceability

- US1 maps to FR-001, FR-002, FR-005, FR-006, FR-007, FR-015, FR-016, FR-017 and SC-001, SC-002, SC-004, SC-010.
- US2 maps to FR-004, FR-004A, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-016, FR-021 and SC-003, SC-004, SC-005, SC-007, SC-012.
- US3 maps to FR-001, FR-003, FR-004, FR-008, FR-011, FR-015, FR-021 and SC-001, SC-006, SC-012, SC-014.
- US4 maps to FR-013, FR-014, FR-015, FR-016, FR-020, FR-021, FR-025, FR-026 and SC-008, SC-009, SC-011, SC-014, SC-015.
- Migration work maps to FR-019, FR-022, FR-023 and SC-013.
