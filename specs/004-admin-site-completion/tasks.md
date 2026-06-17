# Tasks: Administration Site Completion

**Input**: Design documents from `/specs/004-admin-site-completion/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/admin-ui-contract.md`, `quickstart.md`

**Tests**: Tests are mandatory for changed behavior. Frontend behavior uses Angular-compatible component/service tests. Backend behavior uses pytest contract, integration, or unit tests only where API behavior changes.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other marked tasks in the same phase because it touches different files or only tests a defined contract.
- **[Story]**: User story traceability label from `spec.md`.
- Every task references one or more requirements and includes exact target files/modules.

---

## Phase 1: Setup (Shared Frontend Contracts)

**Purpose**: Establish shared contracts and helpers used by all administration screens without changing behavior yet.

- [X] T001 [P] Define admin navigation, dashboard, quick-action, and section-summary models for FR-001, FR-003A, FR-013 in `frontend/src/app/shared/admin-ui.models.ts`
- [X] T002 [P] Define dirty-form state contracts for FR-021 in `frontend/src/app/shared/dirty-form.models.ts`
- [X] T003 [P] Add shared admin test fixtures for navigation, readiness, content, ads, clients, domains, and configuration in `frontend/src/app/shared/admin-test-helpers.ts`
- [X] T004 [P] Add shared admin result and validation message model types for FR-015, FR-020 in `frontend/src/app/shared/admin-feedback.models.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement reusable infrastructure that must exist before individual admin screens can be completed.

**Critical**: No user story implementation should start until this phase is complete.

- [X] T005 [P] Add tests for required admin navigation entries and active-state mapping for FR-001, FR-003 in `frontend/src/app/admin/admin-navigation.service.spec.ts`
- [X] T006 Implement admin navigation service with all required destinations for FR-001, FR-002, FR-003 in `frontend/src/app/admin/admin-navigation.service.ts`
- [X] T007 [P] Add tests for unsaved-change stay/discard behavior for FR-021 in `frontend/src/app/shared/dirty-form.guard.spec.ts`
- [X] T008 Implement reusable dirty-form route guard for FR-021 in `frontend/src/app/shared/dirty-form.guard.ts`
- [X] T009 [P] Add tests for reusable empty, loading, success, and error states for FR-015, FR-018, FR-020 in `frontend/src/app/shared/admin-state.component.spec.ts`
- [X] T010 Implement reusable admin state presentation component for FR-015, FR-018, FR-020 in `frontend/src/app/shared/admin-state.component.ts`
- [X] T011 [P] Add tests for sanitized admin-facing API error mapping for FR-015, FR-020 in `frontend/src/app/shared/admin-error-mapper.spec.ts`
- [X] T012 Implement sanitized admin-facing API error mapping for FR-015, FR-020 in `frontend/src/app/shared/admin-error-mapper.ts`
- [X] T013 [P] Add admin API service contract tests for dashboard, readiness, configuration, domains, users, and roles data used by FR-003A, FR-011, FR-013 in `frontend/src/app/admin/admin-api.service.spec.ts`
- [X] T014 Update admin API service methods and typed responses for FR-003A, FR-011, FR-013 in `frontend/src/app/admin/admin-api.service.ts`

**Checkpoint**: Shared navigation, dirty-form handling, state display, error mapping, and admin API contracts are ready.

---

## Phase 3: User Story 1 - Navigate Complete Administration Site (Priority: P1) MVP

**Goal**: Administrators can land on a dashboard and reach every administration section from visible navigation within two clicks.

**Independent Test**: Sign in as administrator, open the administration site, and reach content, ads, clients, domains, display configuration, readiness, users, and roles from visible navigation without manual URL entry.

### Tests for User Story 1

- [X] T015 [P] [US1] Add admin shell component tests for visible navigation, active state, and two-click reachability for FR-001, FR-002, FR-003 in `frontend/src/app/admin/admin-shell.component.spec.ts`
- [X] T016 [P] [US1] Add dashboard component tests for setup status, quick actions, and section summaries for FR-003A, FR-013 in `frontend/src/app/admin/admin-dashboard.component.spec.ts`
- [X] T017 [P] [US1] Add route tests for dashboard default route and admin destinations for FR-001, FR-002 in `frontend/src/app/app.routes.spec.ts`
- [X] T018 [P] [US1] Add users and roles component tests for list, create, edit, active status, and existing role assignment behavior for FR-012 in `frontend/src/app/admin/users-roles.component.spec.ts`

### Implementation for User Story 1

- [X] T019 [US1] Update admin routes so `/admin` opens the dashboard and all required destinations are routeable for FR-001, FR-002, FR-003A in `frontend/src/app/app.routes.ts`
- [X] T020 [US1] Update admin shell to use persistent navigation, active state, and responsive section access for FR-001, FR-003, FR-019 in `frontend/src/app/admin/admin-shell.component.ts`
- [X] T021 [US1] Implement dashboard setup status, quick actions, and section summaries for FR-003A, FR-013 in `frontend/src/app/admin/admin-dashboard.component.ts`
- [X] T022 [US1] Add dashboard data aggregation using existing admin/readiness/configuration APIs for FR-003A, FR-013 in `frontend/src/app/admin/admin-dashboard.service.ts`
- [X] T023 [US1] Complete users and roles screen for list, create, edit, active status, and assignment of existing role types for FR-001, FR-012, FR-014 in `frontend/src/app/admin/users-roles.component.ts`

**Checkpoint**: User Story 1 is independently testable and provides the MVP administration entry experience.

---

## Phase 4: User Story 2 - Configure Kiosk Behavior End-to-End (Priority: P2)

**Goal**: Administrators can configure kiosk display defaults and use readiness guidance to resolve missing setup.

**Independent Test**: Change each display configuration setting from the admin UI, return to the screen to confirm persistence, and verify readiness links or directions identify how to resolve blockers.

### Tests for User Story 2

- [X] T024 [P] [US2] Add display configuration component tests for all editable settings, validation, success, and failure states for FR-011, FR-015, FR-016 in `frontend/src/app/admin/display-configuration.component.spec.ts`
- [X] T025 [P] [US2] Add readiness component tests for blocker/warning guidance and admin section links for FR-013, FR-020 in `frontend/src/app/readiness/readiness.component.spec.ts`
- [X] T026 [P] [US2] Add display API service tests for saved configuration round-trip fields for FR-011 in `frontend/src/app/display/display-api.service.spec.ts`

### Implementation for User Story 2

- [X] T027 [US2] Complete display configuration form fields for rotation timing, animation, animation duration, inline ad count, event duration, and enabled status for FR-011 in `frontend/src/app/admin/display-configuration.component.ts`
- [X] T028 [US2] Add client-side validation and sanitized save feedback for invalid configuration values for FR-015, FR-016, FR-020 in `frontend/src/app/admin/display-configuration.component.ts`
- [X] T029 [US2] Connect display configuration form to typed admin API calls for FR-011, FR-017 in `frontend/src/app/admin/admin-api.service.ts`
- [X] T030 [US2] Add readiness blocker/warning links or clear directions to relevant admin sections for FR-013, FR-020 in `frontend/src/app/readiness/readiness.component.ts`
- [X] T031 [US2] Verify display-side configuration contract remains aligned with saved admin settings for FR-011 in `frontend/src/app/display/display-api.service.ts`

**Checkpoint**: User Story 2 is independently testable through display configuration and readiness workflows.

---

## Phase 5: User Story 3 - Manage Content, Ads, and Iframes (Priority: P3)

**Goal**: Administrators can create and manage content, iframe entries, clients, ads, and approved domains from visible screens.

**Independent Test**: Create one image content item, one video content item, one iframe content item, one client, and one ad; then edit metadata, active status, ordering, and rotation overrides from the relevant lists/forms.

### Backend Tests for User Story 3

- [X] T032 [P] [US3] Add service tests for client update, active status, dependency-safe deletion, and event recording behavior for FR-009, FR-017 in `backend/tests/unit/test_ads_service.py`
- [X] T033 [P] [US3] Add API integration tests for client update, active status, dependency-safe delete blocking, validation, and authorization for FR-009, FR-015, FR-016 in `backend/tests/integration/test_ads_api.py`
- [X] T034 [P] [US3] Add OpenAPI contract tests for client update/delete responses for FR-009 in `backend/tests/contract/test_ads_openapi.py`
- [X] T035 [P] [US3] Add service tests for approved domain update, active status, dependency-safe deletion, and event recording behavior for FR-010, FR-017 in `backend/tests/unit/test_admin_readiness_services.py`
- [X] T036 [P] [US3] Add API integration tests for approved domain update, active status, dependency-safe delete blocking, validation, and authorization for FR-010, FR-015, FR-016 in `backend/tests/integration/test_admin_readiness_api.py`
- [X] T037 [P] [US3] Add OpenAPI contract tests for approved domain update/delete responses for FR-010 in `backend/tests/contract/test_admin_openapi.py`

### Frontend Tests for User Story 3

- [X] T038 [P] [US3] Add content list tests for meaningful rows, empty state, edit action, delete action, ordering, and active status for FR-004, FR-014, FR-018 in `frontend/src/app/content/content-list.component.spec.ts`
- [X] T039 [P] [US3] Add content form tests for upload content, iframe content, edit mode, validation, and dirty tracking for FR-005, FR-006, FR-015, FR-016, FR-021 in `frontend/src/app/content/content-form.component.spec.ts`
- [X] T040 [P] [US3] Add ad list and form tests for client association, upload, edit mode, validation, ordering, and active status for FR-007, FR-008, FR-014, FR-016 in `frontend/src/app/ads/ad-list.component.spec.ts` and `frontend/src/app/ads/ad-form.component.spec.ts`
- [X] T041 [P] [US3] Add client list and form tests for create, edit, active status, delete, empty state, and validation for FR-009, FR-014, FR-018 in `frontend/src/app/ads/client-list.component.spec.ts` and `frontend/src/app/ads/client-form.component.spec.ts`
- [X] T042 [P] [US3] Add approved domains component tests for list, create, active status, delete, empty state, and validation for FR-010, FR-014, FR-018 in `frontend/src/app/admin/approved-domains.component.spec.ts`
- [X] T043 [P] [US3] Add frontend tests that successful content/ad saves refresh list/detail state and failed older saves do not overwrite latest visible data for FR-017 in `frontend/src/app/content/content-form.component.spec.ts` and `frontend/src/app/ads/ad-form.component.spec.ts`

### Backend Implementation for User Story 3

- [X] T044 [US3] Implement client update, active-status change, dependency-safe delete checks, and admin event recording for FR-009, FR-017 in `backend/app/services/ads_service.py`
- [X] T045 [US3] Implement client update/delete repository methods including active dependent ad checks for FR-009 in `backend/app/repositories/clients.py`
- [X] T046 [US3] Expose client update and delete API endpoints with Pydantic validation and role checks for FR-009, FR-015, FR-016 in `backend/app/api/clients.py`
- [X] T047 [US3] Implement approved domain update and active-status change service methods for FR-010, FR-017 in `backend/app/services/admin_service.py`
- [X] T048 [US3] Add approved domain dependency-safe delete checks, organization ownership, not-found handling, and admin event recording for FR-010, FR-020 in `backend/app/services/admin_service.py`
- [X] T049 [US3] Expose approved domain update and delete API endpoints with Pydantic validation and role checks for FR-010, FR-015, FR-016 in `backend/app/api/approved_domains.py`
- [X] T050 [US3] Update API schemas for client and approved domain update payloads without adding database schema changes for FR-009, FR-010 in `backend/app/api/schemas.py`

### Frontend Implementation for User Story 3

- [X] T051 [US3] Update content API service for edit, delete, active status, ordering, and rotation override calls for FR-004, FR-005, FR-006 in `frontend/src/app/content/content-api.service.ts`
- [X] T052 [US3] Complete content list row details, empty state, edit/delete actions, active status, and ordering controls for FR-004, FR-014, FR-018 in `frontend/src/app/content/content-list.component.ts`
- [X] T053 [US3] Complete content form create/edit behavior for uploaded image/video and iframe entries with validation and dirty tracking for FR-005, FR-006, FR-015, FR-016, FR-021 in `frontend/src/app/content/content-form.component.ts`
- [X] T054 [US3] Update ads API service for ad/client edit, delete, active status, ordering, and rotation override calls for FR-007, FR-008, FR-009 in `frontend/src/app/ads/ads-api.service.ts`
- [X] T055 [US3] Complete ad list row details, empty state, edit/delete actions, active status, and ordering controls for FR-007, FR-014, FR-018 in `frontend/src/app/ads/ad-list.component.ts`
- [X] T056 [US3] Complete ad form create/edit behavior with client selection, upload validation, rotation override, and dirty tracking for FR-008, FR-015, FR-016, FR-021 in `frontend/src/app/ads/ad-form.component.ts`
- [X] T057 [US3] Complete client list row details, empty state, edit/delete-or-deactivate actions, dependency-safe delete feedback, and active status for FR-009, FR-014, FR-018 in `frontend/src/app/ads/client-list.component.ts`
- [X] T058 [US3] Complete client form create/edit behavior with validation and dirty tracking for FR-009, FR-015, FR-016, FR-021 in `frontend/src/app/ads/client-form.component.ts`
- [X] T059 [US3] Complete approved domains management for create, active status, delete-or-deactivate actions, dependency-safe delete feedback, empty state, validation, and dirty tracking for FR-010, FR-014, FR-018, FR-021 in `frontend/src/app/admin/approved-domains.component.ts`
- [X] T060 [US3] Ensure content/ad/client/domain save handlers refresh list/detail data after successful saves for last-save-wins behavior for FR-017 in `frontend/src/app/content/content-list.component.ts`, `frontend/src/app/content/content-form.component.ts`, `frontend/src/app/ads/ad-list.component.ts`, `frontend/src/app/ads/ad-form.component.ts`, `frontend/src/app/ads/client-list.component.ts`, and `frontend/src/app/admin/approved-domains.component.ts`
- [X] T061 [US3] Add edit routes and dirty-form guards for content, ads, clients, and domains for FR-002, FR-004, FR-007, FR-009, FR-010, FR-021 in `frontend/src/app/app.routes.ts`

**Checkpoint**: User Story 3 is independently testable through complete content, ad, client, iframe, and domain management workflows.

---

## Phase 6: User Story 4 - Use a Clear Administration Experience (Priority: P4)

**Goal**: Administrators can understand setup status, recover from errors, avoid losing unsaved work, and use the admin site on desktop and tablet screens.

**Independent Test**: A non-developer administrator can complete the primary setup flow using only visible labels, navigation, form feedback, and readiness guidance.

### Tests for User Story 4

- [X] T062 [P] [US4] Add admin shell accessibility and 1024x768/1440x900 responsive layout tests for keyboard navigation and visible required sections for FR-019 in `frontend/src/app/admin/admin-shell.component.spec.ts`
- [X] T063 [P] [US4] Add form feedback tests across content, ad, client, domain, and configuration forms, including 5-second feedback expectations, for FR-015, FR-016, FR-020, SC-007 in `frontend/src/app/shared/admin-error-mapper.spec.ts`
- [X] T064 [P] [US4] Add dirty-form guard integration tests on routed forms for FR-021 in `frontend/src/app/app.routes.spec.ts`

### Implementation for User Story 4

- [X] T065 [US4] Apply shared empty/error/success state presentation to consuming components for content, ads, clients, domains, configuration, readiness, and users for FR-015, FR-018, FR-020 in `frontend/src/app/content/content-list.component.ts`, `frontend/src/app/ads/ad-list.component.ts`, `frontend/src/app/ads/client-list.component.ts`, `frontend/src/app/admin/approved-domains.component.ts`, `frontend/src/app/admin/display-configuration.component.ts`, `frontend/src/app/readiness/readiness.component.ts`, and `frontend/src/app/admin/users-roles.component.ts`
- [X] T066 [US4] Attach dirty-form behavior to all editable admin forms and route exits for FR-021 in `frontend/src/app/app.routes.ts`
- [X] T067 [US4] Add consistent visible labels, focus states, and keyboard-friendly controls for administration screens at 1024x768 and 1440x900 for FR-019 in `frontend/src/styles.css`
- [X] T068 [US4] Add responsive admin shell layout that keeps navigation and actions readable at 1024x768 and 1440x900 for FR-019 in `frontend/src/app/admin/admin-shell.component.ts`
- [X] T069 [US4] Normalize frontend save, upload, authorization, validation, and storage failure messages without internal paths or secrets for FR-015, FR-020 in `frontend/src/app/shared/admin-error-mapper.ts`

**Checkpoint**: User Story 4 is independently testable through usability, accessibility, empty-state, failure-state, and dirty-form workflows.

---

## Phase 7: Polish & Cross-Cutting Validation

**Purpose**: Validate the complete feature and update developer-facing documentation for the final admin workflow.

- [X] T070 [P] Update feature quickstart with final admin setup smoke steps and expected outcomes for SC-001 through SC-008 in `specs/004-admin-site-completion/quickstart.md`
- [X] T071 [P] Update local developer README admin workflow notes if route or startup behavior changed for FR-001, FR-002 in `README.md`
- [X] T072 Run backend pytest validation for changed API/service behavior in `backend/tests`
- [X] T073 Run frontend Angular tests for changed admin, content, ads, readiness, display, and shared behavior in `frontend/src/app`
- [ ] T074 Run frontend production build validation for the completed admin UI in `frontend`
- [ ] T075 Perform manual quickstart smoke validation, including users/roles management, 5-second feedback timing, and 1024x768/1440x900 viewport checks, and record unresolved gaps against SC-001 through SC-008 in `specs/004-admin-site-completion/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1 and blocks all user stories.
- **Phase 3 US1**: Depends on Phase 2. This is the MVP.
- **Phase 4 US2**: Depends on Phase 2 and can be built after or alongside US1, but final navigation integration depends on US1 routes.
- **Phase 5 US3**: Depends on Phase 2 and can be built after or alongside US1, but final navigation integration depends on US1 routes.
- **Phase 6 US4**: Depends on the target forms/routes from US1-US3.
- **Phase 7 Polish**: Depends on all selected user stories.

### User Story Dependencies

- **US1 (P1)**: Independent after foundational work; recommended MVP.
- **US2 (P2)**: Independent after foundational work; uses navigation from US1 for best validation.
- **US3 (P3)**: Independent after foundational work; includes minimal backend contract completion for clients/domains.
- **US4 (P4)**: Cross-cuts US1-US3 and should be completed after the primary screens exist.

### Backend Schema Dependency

- No database schema change is expected for this feature. If implementation reality requires a schema change, stop and update the approved spec/plan/tasks before adding an Alembic migration.

---

## Parallel Opportunities

- Phase 1 tasks T001-T004 can run in parallel.
- Phase 2 tests T005, T007, T009, T011, and T013 can run in parallel before implementation.
- US1 tests T015-T017 can run in parallel.
- US1 users/roles test T018 can run in parallel with T015-T017.
- US2 tests T024-T026 can run in parallel.
- US3 backend tests T032-T037 and frontend tests T038-T042 can run in parallel.
- US3 concurrency test T043 can run in parallel with other frontend tests.
- US3 backend client tasks T044-T046 can run in parallel with domain tasks T047-T050 until route integration.
- US3 frontend content tasks T051-T053 can run in parallel with ad/client tasks T054-T058 and domain task T059 until route integration T061.
- US3 refresh/integration task T060 depends on the relevant content/ad/client/domain save handlers.
- US4 tests T062-T064 can run in parallel.
- Polish documentation tasks T070-T071 can run in parallel.

---

## Parallel Example: User Story 3

```bash
# Backend contract/test work
Task: "T032 service tests for client update/delete in backend/tests/unit/test_ads_service.py"
Task: "T035 service tests for approved domain update/delete in backend/tests/unit/test_admin_readiness_services.py"

# Frontend management screens
Task: "T052 complete content list in frontend/src/app/content/content-list.component.ts"
Task: "T056 complete ad form in frontend/src/app/ads/ad-form.component.ts"
Task: "T059 complete approved domains management in frontend/src/app/admin/approved-domains.component.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1).
3. Validate that an administrator can reach every required section within two clicks.
4. Stop and review before expanding into configuration and management workflows.

### Incremental Delivery

1. Add US1 navigation/dashboard.
2. Add US2 display configuration and readiness guidance.
3. Add US3 management completion for content, ads, clients, and domains.
4. Add US4 clarity, dirty-form, accessibility, and responsive polish.
5. Run Phase 7 validation.

### Traceability

- US1 maps to FR-001, FR-002, FR-003, FR-003A, FR-012, FR-013, FR-019 and SC-001, SC-003, SC-005, SC-006.
- US2 maps to FR-011, FR-013, FR-015, FR-016, FR-017, FR-020 and SC-002, SC-003, SC-004, SC-007, SC-008.
- US3 maps to FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-014, FR-015, FR-016, FR-017, FR-018, FR-021 and SC-002, SC-003, SC-004, SC-007.
- US4 maps to FR-015, FR-016, FR-018, FR-019, FR-020, FR-021 and SC-005, SC-006, SC-007, SC-008.
