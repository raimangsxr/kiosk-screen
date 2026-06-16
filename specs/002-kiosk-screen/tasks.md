# Tasks: Kiosk Screen Content and Ads

**Input**: Design documents from `/specs/002-kiosk-screen/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml, quickstart.md

**Tests**: Required for changed behavior. Every task includes a test or validation step.

**Organization**: Tasks are grouped by setup, foundational work, then user stories in priority order so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel when different files are touched and dependencies are complete
- **[Story]**: Maps implementation tasks to user stories from spec.md
- **Req**: Requirement or success criterion reference from spec.md
- **Validate**: Expected test or validation command/scope for the task

## Phase 1: Setup (Scaffolding)

**Purpose**: Establish the Angular/FastAPI/PostgreSQL workspace without implementing product behavior.

- [X] T001 Create repository source directories in `frontend/`, `backend/`, and `deploy/` plus placeholder README files in `frontend/README.md`, `backend/README.md`, and `deploy/README.md` (Req: plan Project Structure; Validate: `find frontend backend deploy -maxdepth 2 -type d`)
- [X] T002 Scaffold Angular app metadata and scripts in `frontend/package.json`, `frontend/angular.json`, `frontend/tsconfig.json`, and `frontend/src/main.ts` (Req: plan Technical Context; Validate: `npm --prefix frontend run test -- --watch=false` once dependencies exist)
- [X] T003 Scaffold FastAPI Python project metadata in `backend/pyproject.toml`, `backend/app/main.py`, and `backend/app/api/router.py` (Req: plan Technical Context; Validate: `pytest backend/tests/unit` once dependencies exist)
- [X] T004 Configure backend application settings in `backend/app/config.py` and `backend/tests/unit/test_config.py` for database URL, session secret, frontend origin, and bootstrap admin values (Req: quickstart Local Services; Validate: `pytest backend/tests/unit/test_config.py`)
- [X] T005 Configure local PostgreSQL development service in `docker-compose.yml` and document startup in `backend/README.md` (Req: quickstart Local Services; Validate: `docker compose config`)
- [X] T006 Initialize Alembic structure in `backend/alembic.ini`, `backend/alembic/env.py`, and `backend/alembic/versions/.gitkeep` without automatic production schema creation (Req: FR-028, plan Storage; Validate: `alembic -c backend/alembic.ini current`)
- [X] T007 Add backend test layout and fixtures in `backend/tests/conftest.py`, `backend/tests/unit/.gitkeep`, `backend/tests/integration/.gitkeep`, and `backend/tests/contract/.gitkeep` (Req: plan Testing Strategy; Validate: `pytest backend/tests`)
- [X] T008 Add frontend test layout and base test setup in `frontend/src/app/app.config.ts`, `frontend/src/app/app.routes.ts`, and `frontend/src/test.ts` (Req: plan Testing Strategy; Validate: `npm --prefix frontend run test -- --watch=false`)
- [X] T009 Add OpenAPI contract validation script placeholder in `backend/tests/contract/test_openapi_contract.py` using `specs/002-kiosk-screen/contracts/openapi.yaml` (Req: TQ-003; Validate: `pytest backend/tests/contract/test_openapi_contract.py`)
- [X] T010 Add base CI workflow skeleton in `.github/workflows/release-images.yml` for release-triggered build/test/image upload gates (Req: plan CI/CD Considerations; Validate: `git diff --check .github/workflows/release-images.yml`)

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared data, auth, API, and frontend foundations required before user stories.

### Database and Models

- [X] T011 Create SQLAlchemy base/session wiring in `backend/app/repositories/session.py` and `backend/app/repositories/base.py` (Req: plan Data Model; Validate: `pytest backend/tests/unit/test_repository_session.py`)
- [X] T012 [P] Create organization and user SQLAlchemy models in `backend/app/repositories/models/organization.py` and `backend/app/repositories/models/user.py` with unit tests in `backend/tests/unit/test_user_model.py` (Req: FR-028; Validate: `pytest backend/tests/unit/test_user_model.py`)
- [X] T013 [P] Create role assignment and operator session models in `backend/app/repositories/models/role_assignment.py` and `backend/app/repositories/models/operator_session.py` with unit tests in `backend/tests/unit/test_auth_models.py` (Req: FR-014, FR-027; Validate: `pytest backend/tests/unit/test_auth_models.py`)
- [X] T014 [P] Create kiosk configuration and approved domain models in `backend/app/repositories/models/kiosk_configuration.py` and `backend/app/repositories/models/approved_domain.py` with unit tests in `backend/tests/unit/test_configuration_models.py` (Req: FR-001, FR-022, FR-026; Validate: `pytest backend/tests/unit/test_configuration_models.py`)
- [X] T015 [P] Create top content, client, ad, and display event models in `backend/app/repositories/models/content.py`, `backend/app/repositories/models/client.py`, `backend/app/repositories/models/ad.py`, and `backend/app/repositories/models/display_event.py` with model tests in `backend/tests/unit/test_content_ad_models.py` (Req: FR-003-FR-010, FR-017; Validate: `pytest backend/tests/unit/test_content_ad_models.py`)
- [X] T016 Create initial Alembic migration for all MVP tables in `backend/alembic/versions/0001_initial_kiosk_schema.py` (Req: plan Storage, FR-028; Validate: `alembic -c backend/alembic.ini upgrade head && pytest backend/tests/integration/test_migrations.py`)

### Domain Logic

- [X] T017 Create role enum and authorization policy in `backend/app/domain/roles.py` with tests in `backend/tests/unit/test_roles.py` (Req: FR-014, FR-015; Validate: `pytest backend/tests/unit/test_roles.py`)
- [X] T018 [P] Create availability and duration rules in `backend/app/domain/availability.py` with tests in `backend/tests/unit/test_availability.py` (Req: FR-011, FR-024, FR-025; Validate: `pytest backend/tests/unit/test_availability.py`)
- [X] T019 [P] Create deterministic rotation rules in `backend/app/domain/rotation.py` with tests in `backend/tests/unit/test_rotation.py` (Req: FR-024, FR-025, SC-009; Validate: `pytest backend/tests/unit/test_rotation.py`)
- [X] T020 [P] Create approved embedded domain validation in `backend/app/domain/embedded_domains.py` with tests in `backend/tests/unit/test_embedded_domains.py` (Req: FR-022, NFR-009, SC-006A; Validate: `pytest backend/tests/unit/test_embedded_domains.py`)
- [X] T021 [P] Create readiness evaluation rules in `backend/app/domain/readiness.py` with tests in `backend/tests/unit/test_readiness.py` (Req: FR-013, SC-007; Validate: `pytest backend/tests/unit/test_readiness.py`)
- [X] T022 [P] Create display event recording value objects in `backend/app/domain/display_events.py` with tests in `backend/tests/unit/test_display_events.py` (Req: FR-017, NFR-006; Validate: `pytest backend/tests/unit/test_display_events.py`)

### Backend Services and API Foundation

- [X] T023 Create repository classes for shared entities in `backend/app/repositories/users.py`, `backend/app/repositories/configuration.py`, and `backend/app/repositories/events.py` with repository tests in `backend/tests/integration/test_shared_repositories.py` (Req: FR-014, FR-017, FR-028; Validate: `pytest backend/tests/integration/test_shared_repositories.py`)
- [X] T024 Create Pydantic schemas matching OpenAPI shared schemas in `backend/app/api/schemas.py` with contract tests in `backend/tests/contract/test_schema_contract.py` (Req: TQ-003; Validate: `pytest backend/tests/contract/test_schema_contract.py`)
- [X] T025 Create authentication service in `backend/app/auth/service.py` with password hashing and session duration rules plus tests in `backend/tests/unit/test_auth_service.py` (Req: FR-021, FR-027; Validate: `pytest backend/tests/unit/test_auth_service.py`)
- [X] T026 Create FastAPI auth dependencies and role guards in `backend/app/auth/dependencies.py` with API tests in `backend/tests/integration/test_auth_guards.py` (Req: FR-014, FR-015; Validate: `pytest backend/tests/integration/test_auth_guards.py`)
- [X] T027 Create common API error response handling in `backend/app/api/errors.py` with tests in `backend/tests/unit/test_api_errors.py` (Req: TQ-003, FR-015; Validate: `pytest backend/tests/unit/test_api_errors.py`)
- [X] T028 Create structured logging and request ID middleware in `backend/app/observability/logging.py` and `backend/app/api/middleware.py` with tests in `backend/tests/unit/test_observability.py` (Req: FR-017, NFR-006; Validate: `pytest backend/tests/unit/test_observability.py`)
- [X] T029 Create backend health and readiness endpoints in `backend/app/api/health.py` with tests in `backend/tests/integration/test_health_api.py` (Req: plan Observability; Validate: `pytest backend/tests/integration/test_health_api.py`)
- [X] T030 Create MVP bootstrap and seed service in `backend/app/services/bootstrap_service.py` and tests in `backend/tests/unit/test_bootstrap_service.py` for initial organization, administrator, operator, kiosk configuration, sample top content, client, and ad fixtures (Req: FR-001, FR-021, FR-026, FR-028, SC-002; Validate: `pytest backend/tests/unit/test_bootstrap_service.py`)

### Frontend Foundation

- [ ] T031 Create Angular route shell and layout tokens in `frontend/src/app/app.routes.ts`, `frontend/src/app/shared/layout/`, and `frontend/src/styles.css` with tests in `frontend/src/app/app.routes.spec.ts` (Req: plan Frontend modules; Validate: `npm --prefix frontend run test -- --watch=false`)
- [ ] T032 Create frontend API client foundation in `frontend/src/app/shared/api/api-client.service.ts` and `frontend/src/app/shared/api/api-types.ts` with tests in `frontend/src/app/shared/api/api-client.service.spec.ts` (Req: TQ-003; Validate: `npm --prefix frontend run test -- --watch=false`)
- [ ] T033 Create frontend auth state service and route guard in `frontend/src/app/auth/auth.service.ts` and `frontend/src/app/auth/auth.guard.ts` with tests in `frontend/src/app/auth/auth.service.spec.ts` (Req: FR-021; Validate: `npm --prefix frontend run test -- --watch=false`)
- [ ] T034 Create shared error and fallback UI primitives in `frontend/src/app/shared/errors/` with component tests in `frontend/src/app/shared/errors/error-state.component.spec.ts` (Req: FR-012, NFR-004; Validate: `npm --prefix frontend run test -- --watch=false`)

**Checkpoint**: Foundation ready. User story implementation can begin.

## Phase 3: User Story 1 - Run a Kiosk Display (Priority: P1) MVP

**Goal**: An authorized operator can open a ready kiosk display and show top content plus bottom ads in a stable 4:1 layout.

**Independent Test**: Sign in as an event operator, open a ready display, verify the 4/5 top and 1/5 bottom split, configured-order rotation, fallback behavior, and session validity for configured event duration.

### Tests for User Story 1

- [ ] T035 [P] [US1] Add backend API tests for `/auth/login`, `/auth/me`, `/auth/logout`, `/display/open`, and `/display/state` in `backend/tests/integration/test_display_api.py` (Req: FR-001, FR-021, FR-026, FR-027; Validate: `pytest backend/tests/integration/test_display_api.py`)
- [ ] T036 [P] [US1] Add backend domain tests for display state eligibility and fallback behavior in `backend/tests/unit/test_display_service.py` (Req: FR-011, FR-012, SC-005; Validate: `pytest backend/tests/unit/test_display_service.py`)
- [ ] T037 [P] [US1] Add frontend tests for login guard, display shell layout, readability, layout stability, display privacy, and fallback states in `frontend/src/app/display/display-screen.component.spec.ts` and `frontend/src/app/auth/login.component.spec.ts` (Req: FR-001, FR-019, FR-021, NFR-001, NFR-002, NFR-008, SC-008; Validate: `npm --prefix frontend run test -- --watch=false`)
- [ ] T038 [P] [US1] Add OpenAPI contract tests for display and auth paths in `backend/tests/contract/test_display_openapi.py` (Req: TQ-003; Validate: `pytest backend/tests/contract/test_display_openapi.py`)

### Implementation for User Story 1

- [ ] T039 [US1] Implement auth API routes in `backend/app/api/auth.py` and register them in `backend/app/api/router.py` with secure cookie settings, logout invalidation, and cross-site request protection (Req: FR-021, FR-027, FR-029, NFR-005, NFR-005A, NFR-010; Validate: `pytest backend/tests/integration/test_display_api.py`)
- [ ] T040 [US1] Implement display service in `backend/app/services/display_service.py` for open-display authorization, event duration, eligible content/ad selection, fallback flags, and session validity through configured duration (Req: FR-001, FR-011, FR-012, FR-026, FR-027, SC-010; Validate: `pytest backend/tests/unit/test_display_service.py`)
- [ ] T041 [US1] Implement display API routes in `backend/app/api/display.py` for `/display/open` and `/display/state` (Req: FR-001, FR-002, FR-021; Validate: `pytest backend/tests/integration/test_display_api.py`)
- [ ] T042 [US1] Implement frontend login component in `frontend/src/app/auth/login.component.ts` and route wiring in `frontend/src/app/app.routes.ts` (Req: FR-021; Validate: `npm --prefix frontend run test -- --watch=false`)
- [ ] T043 [US1] Implement frontend display API service in `frontend/src/app/display/display-api.service.ts` (Req: TQ-003, FR-016; Validate: `npm --prefix frontend run test -- --watch=false`)
- [ ] T044 [US1] Implement full-screen kiosk display component and styles in `frontend/src/app/display/display-screen.component.ts` and `frontend/src/app/display/display-screen.component.css` with 4/5 and 1/5 regions, readability, and stable layout transitions (Req: FR-001, FR-002, NFR-001, NFR-002, SC-001, SC-002; Validate: `npm --prefix frontend run test -- --watch=false`)
- [ ] T045 [US1] Implement frontend deterministic rotation and fallback state handling in `frontend/src/app/display/display-rotation.service.ts` (Req: FR-012, FR-024, FR-025, NFR-002A, SC-009; Validate: `npm --prefix frontend run test -- --watch=false`)
- [ ] T046 [US1] Add display event recording for open-display and fallback activation in `backend/app/services/display_service.py` and `backend/app/repositories/events.py` (Req: FR-017; Validate: `pytest backend/tests/unit/test_display_service.py backend/tests/integration/test_display_api.py`)

**Checkpoint**: US1 MVP is independently usable with seeded eligible content and ads.

## Phase 4: User Story 2 - Manage Main Content (Priority: P2)

**Goal**: A content manager can manage photo, video, and approved-domain embedded web content for the top display region.

**Independent Test**: Sign in as content manager, create photo/video/embedded content, reject unapproved embedded domains, set order/duration/availability, and verify active items are eligible for display.

### Tests for User Story 2

- [ ] T047 [P] [US2] Add backend API tests for `/content` and `/content/{contentId}` in `backend/tests/integration/test_content_api.py` (Req: FR-003-FR-005, FR-007, FR-009, FR-022; Validate: `pytest backend/tests/integration/test_content_api.py`)
- [ ] T048 [P] [US2] Add backend service tests for content validation, approved domains, ordering, durations, availability, and activation in `backend/tests/unit/test_content_service.py` (Req: FR-009, FR-022, FR-024, NFR-009, SC-003, SC-006A; Validate: `pytest backend/tests/unit/test_content_service.py`)
- [ ] T049 [P] [US2] Add frontend content management tests in `frontend/src/app/content/content-list.component.spec.ts` and `frontend/src/app/content/content-form.component.spec.ts` for accessible, non-technical workflows (Req: FR-007, FR-018, NFR-003, NFR-007; Validate: `npm --prefix frontend run test -- --watch=false`)
- [ ] T050 [P] [US2] Add contract tests for top content schemas and paths in `backend/tests/contract/test_content_openapi.py` (Req: TQ-003; Validate: `pytest backend/tests/contract/test_content_openapi.py`)

### Implementation for User Story 2

- [ ] T051 [US2] Implement content repository in `backend/app/repositories/content.py` for top content CRUD and eligibility queries (Req: FR-003-FR-005, FR-007, FR-009; Validate: `pytest backend/tests/integration/test_content_api.py`)
- [ ] T052 [US2] Implement content service in `backend/app/services/content_service.py` for validation, activation, ordering, duration, availability, and approved-domain checks (Req: FR-007, FR-009, FR-022, FR-024, NFR-009; Validate: `pytest backend/tests/unit/test_content_service.py`)
- [ ] T053 [US2] Implement top content API routes in `backend/app/api/content.py` and register them in `backend/app/api/router.py` (Req: FR-007, TQ-003; Validate: `pytest backend/tests/integration/test_content_api.py`)
- [ ] T054 [US2] Implement frontend content API service in `frontend/src/app/content/content-api.service.ts` (Req: TQ-003; Validate: `npm --prefix frontend run test -- --watch=false`)
- [ ] T055 [US2] Implement content list component in `frontend/src/app/content/content-list.component.ts` with active/inactive and order visibility (Req: FR-007, FR-016; Validate: `npm --prefix frontend run test -- --watch=false`)
- [ ] T056 [US2] Implement content form component in `frontend/src/app/content/content-form.component.ts` for photo, video, and embedded web content fields (Req: FR-003-FR-005, FR-009, FR-018; Validate: `npm --prefix frontend run test -- --watch=false`)
- [ ] T057 [US2] Add content change DisplayEvent recording in `backend/app/services/content_service.py` (Req: FR-017; Validate: `pytest backend/tests/unit/test_content_service.py`)

**Checkpoint**: US2 is independently testable by managing top content and verifying eligibility.

## Phase 5: User Story 3 - Manage Client Ads (Priority: P3)

**Goal**: An advertising manager can manage clients and bottom-region ads with configured order, duration, activation, and availability.

**Independent Test**: Sign in as advertising manager, create a client and ad, set order/duration/availability, and verify only active eligible ads are selected for the bottom region.

### Tests for User Story 3

- [ ] T058 [P] [US3] Add backend API tests for `/clients`, `/ads`, and `/ads/{adId}` in `backend/tests/integration/test_ads_api.py` (Req: FR-006, FR-008, FR-010, FR-025; Validate: `pytest backend/tests/integration/test_ads_api.py`)
- [ ] T059 [P] [US3] Add backend service tests for client/ad validation, ordering, duration, availability, and active-client checks in `backend/tests/unit/test_ads_service.py` (Req: FR-008, FR-010, FR-025, SC-004; Validate: `pytest backend/tests/unit/test_ads_service.py`)
- [ ] T060 [P] [US3] Add frontend ads and clients tests in `frontend/src/app/ads/client-list.component.spec.ts` and `frontend/src/app/ads/ad-form.component.spec.ts` for accessible, non-technical workflows (Req: FR-008, FR-018, NFR-003, NFR-007; Validate: `npm --prefix frontend run test -- --watch=false`)
- [ ] T061 [P] [US3] Add contract tests for client and ad schemas and paths in `backend/tests/contract/test_ads_openapi.py` (Req: TQ-003; Validate: `pytest backend/tests/contract/test_ads_openapi.py`)

### Implementation for User Story 3

- [ ] T062 [US3] Implement client and ad repositories in `backend/app/repositories/clients.py` and `backend/app/repositories/ads.py` (Req: FR-006, FR-008, FR-010; Validate: `pytest backend/tests/integration/test_ads_api.py`)
- [ ] T063 [US3] Implement ads service in `backend/app/services/ads_service.py` for client/ad validation, activation, ordering, duration, and availability (Req: FR-008, FR-010, FR-025; Validate: `pytest backend/tests/unit/test_ads_service.py`)
- [ ] T064 [US3] Implement clients and ads API routes in `backend/app/api/clients.py` and `backend/app/api/ads.py` (Req: FR-008, TQ-003; Validate: `pytest backend/tests/integration/test_ads_api.py`)
- [ ] T065 [US3] Implement frontend ads API service in `frontend/src/app/ads/ads-api.service.ts` (Req: TQ-003; Validate: `npm --prefix frontend run test -- --watch=false`)
- [ ] T066 [US3] Implement client list/form UI in `frontend/src/app/ads/client-list.component.ts` and `frontend/src/app/ads/client-form.component.ts` (Req: FR-008, FR-018; Validate: `npm --prefix frontend run test -- --watch=false`)
- [ ] T067 [US3] Implement ad list/form UI in `frontend/src/app/ads/ad-list.component.ts` and `frontend/src/app/ads/ad-form.component.ts` (Req: FR-006, FR-008, FR-010, FR-018; Validate: `npm --prefix frontend run test -- --watch=false`)
- [ ] T068 [US3] Add ad and client DisplayEvent recording in `backend/app/services/ads_service.py` (Req: FR-017; Validate: `pytest backend/tests/unit/test_ads_service.py`)

**Checkpoint**: US3 is independently testable by managing clients and ads and verifying bottom-region eligibility.

## Phase 6: User Story 4 - Review Display Readiness (Priority: P4)

**Goal**: An administrator can review readiness blockers and manage the supporting admin data needed to make the display ready.

**Independent Test**: Sign in as administrator, manage users/roles/configuration/approved domains, review missing and valid readiness states, and verify blocking issues are clear.

### Tests for User Story 4

- [ ] T069 [P] [US4] Add backend API tests for `/readiness`, `/display/configuration`, `/approved-domains`, `/events`, and admin user/role routes in `backend/tests/integration/test_admin_readiness_api.py` (Req: FR-013, FR-014, FR-016, FR-017, FR-023, FR-028; Validate: `pytest backend/tests/integration/test_admin_readiness_api.py`)
- [ ] T070 [P] [US4] Add backend service tests for readiness blockers, approved domains, configuration, role assignment, and single-organization ownership in `backend/tests/unit/test_admin_readiness_services.py` (Req: FR-013, FR-023, FR-026, FR-028, SC-007, SC-011; Validate: `pytest backend/tests/unit/test_admin_readiness_services.py`)
- [ ] T071 [P] [US4] Add frontend readiness and admin tests in `frontend/src/app/readiness/readiness.component.spec.ts` and `frontend/src/app/admin/admin-shell.component.spec.ts` for accessibility and clear non-technical diagnostics (Req: FR-016, FR-018, FR-020, NFR-003, NFR-007; Validate: `npm --prefix frontend run test -- --watch=false`)
- [ ] T072 [P] [US4] Add contract tests for readiness, configuration, domains, events, and admin paths in `backend/tests/contract/test_admin_openapi.py` (Req: TQ-003; Validate: `pytest backend/tests/contract/test_admin_openapi.py`)

### Implementation for User Story 4

- [ ] T073 [US4] Implement readiness service in `backend/app/services/readiness_service.py` using content, ad, domain, order, source, and duration checks (Req: FR-013, FR-016, SC-007; Validate: `pytest backend/tests/unit/test_admin_readiness_services.py`)
- [ ] T074 [US4] Implement admin services for configuration, approved domains, users, roles, and ownership in `backend/app/services/admin_service.py` (Req: FR-014, FR-023, FR-026, FR-028; Validate: `pytest backend/tests/unit/test_admin_readiness_services.py`)
- [ ] T075 [US4] Implement readiness, configuration, approved-domain, event, and user/role API routes in `backend/app/api/readiness.py`, `backend/app/api/configuration.py`, `backend/app/api/approved_domains.py`, `backend/app/api/events.py`, and `backend/app/api/users.py` (Req: FR-013, FR-014, FR-016, FR-017, FR-023; Validate: `pytest backend/tests/integration/test_admin_readiness_api.py`)
- [ ] T076 [US4] Implement frontend readiness API service and component in `frontend/src/app/readiness/readiness-api.service.ts` and `frontend/src/app/readiness/readiness.component.ts` (Req: FR-016, FR-020, SC-007; Validate: `npm --prefix frontend run test -- --watch=false`)
- [ ] T077 [US4] Implement frontend admin API services and shell in `frontend/src/app/admin/admin-api.service.ts` and `frontend/src/app/admin/admin-shell.component.ts` (Req: FR-014, FR-023, FR-028; Validate: `npm --prefix frontend run test -- --watch=false`)
- [ ] T078 [US4] Implement approved-domain management UI in `frontend/src/app/admin/approved-domains.component.ts` (Req: FR-022, FR-023, SC-006A; Validate: `npm --prefix frontend run test -- --watch=false`)
- [ ] T079 [US4] Implement display configuration and role management UI in `frontend/src/app/admin/display-configuration.component.ts` and `frontend/src/app/admin/users-roles.component.ts` (Req: FR-014, FR-026, FR-028; Validate: `npm --prefix frontend run test -- --watch=false`)

**Checkpoint**: US4 is independently testable by reviewing readiness and managing admin data.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate the integrated MVP and prepare local/deployment workflows.

- [ ] T080 [P] Add backend OpenAPI export/validation command in `backend/pyproject.toml` and `backend/app/api/openapi.py` (Req: TQ-003; Validate: `pytest backend/tests/contract`)
- [ ] T081 [P] Add Dockerfiles for frontend and backend in `frontend/Dockerfile` and `backend/Dockerfile` (Req: plan CI/CD Considerations; Validate: `docker build -f backend/Dockerfile backend && docker build -f frontend/Dockerfile frontend`)
- [ ] T082 [P] Add Kubernetes manifests for backend, frontend, PostgreSQL connection settings, secrets references, and migration job in `deploy/kubernetes/` (Req: plan CI/CD Considerations; Validate: `kubectl kustomize deploy/kubernetes`)
- [ ] T083 [P] Complete GitHub Actions release workflow in `.github/workflows/release-images.yml` for tests, migration validation, image builds, and Docker Hub upload (Req: plan CI/CD Considerations; Validate: `git diff --check .github/workflows/release-images.yml`)
- [ ] T084 [P] Add local development documentation in `README.md`, `backend/README.md`, and `frontend/README.md` for PostgreSQL, Alembic, FastAPI, Angular, and tests (Req: quickstart.md; Validate: follow documented quickstart commands)
- [ ] T085 Add end-to-end smoke validation script or checklist in `scripts/smoke/kiosk_mvp.md` covering login, setup, readiness, display open, rotation, unauthorized access, and OpenAPI validation (Req: quickstart Smoke Validation; Validate: execute documented smoke checklist)
- [ ] T086 Run full backend validation and record results in `specs/002-kiosk-screen/validation/backend.md` (Req: all backend requirements; Validate: `pytest backend/tests`)
- [ ] T087 Run full frontend validation and record results in `specs/002-kiosk-screen/validation/frontend.md` (Req: all frontend requirements; Validate: `npm --prefix frontend run test -- --watch=false`)
- [ ] T088 Run full contract and quickstart validation and record results in `specs/002-kiosk-screen/validation/integration.md` (Req: TQ-003, quickstart.md; Validate: OpenAPI contract validation plus smoke checklist)

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No product behavior; must finish before foundational work.
- **Foundational (Phase 2)**: Blocks all user stories.
- **User Story 1 (Phase 3)**: First MVP increment after foundation.
- **User Story 2 (Phase 4)**: Can start after foundation, but full display validation benefits from US1.
- **User Story 3 (Phase 5)**: Can start after foundation, but full display validation benefits from US1.
- **User Story 4 (Phase 6)**: Can start after foundation, but readiness is most useful after US2 and US3 data paths exist.
- **Polish (Phase 7)**: Depends on desired user stories being complete.

### User Story Dependencies

- **US1**: Requires seeded or fixture content/ad data from foundational models.
- **US2**: Independent content-management slice after foundation.
- **US3**: Independent ad-management slice after foundation.
- **US4**: Uses data from US1-US3 for complete readiness validation.

### Within Each User Story

- Write tests before implementation tasks in that story.
- Implement backend domain/service behavior before API routes.
- Implement API services before frontend components.
- Run listed validation before marking any task complete.
- Stop and update the spec/plan if implementation reality conflicts with approved requirements.

## Parallel Opportunities

- Setup tasks T002-T010 can run in parallel after T001 where files do not overlap.
- Foundational model tasks T012-T015 can run in parallel after T011.
- Foundational domain tasks T018-T022 can run in parallel after related models exist.
- Test tasks at the start of each story phase can run in parallel.
- US2 and US3 can be implemented in parallel after Phase 2 if teams coordinate shared display eligibility contracts.
- Polish tasks T080-T084 can run in parallel after related implementation surfaces exist.

## Parallel Example: User Story 2

```text
Task: T047 Add backend API tests for content routes in backend/tests/integration/test_content_api.py
Task: T048 Add backend service tests in backend/tests/unit/test_content_service.py
Task: T049 Add frontend content management tests in frontend/src/app/content/
Task: T050 Add content OpenAPI contract tests in backend/tests/contract/test_content_openapi.py
```

## Parallel Example: User Story 3

```text
Task: T058 Add backend API tests for client and ad routes in backend/tests/integration/test_ads_api.py
Task: T059 Add backend service tests in backend/tests/unit/test_ads_service.py
Task: T060 Add frontend ads and clients tests in frontend/src/app/ads/
Task: T061 Add ads OpenAPI contract tests in backend/tests/contract/test_ads_openapi.py
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1) with seeded fixture data.
3. Validate login, open display, 4:1 layout, rotation, fallbacks, and event-duration session behavior.
4. Stop and demo the display increment before adding management surfaces.

### Incremental Delivery

1. Add US2 so real top content can be managed.
2. Add US3 so real clients and ads can be managed.
3. Add US4 so administrators can review readiness and manage supporting admin data.
4. Finish polish, deployment, and smoke validation.

## Task Counts

- Setup: 10 tasks
- Foundational: 24 tasks
- US1: 12 tasks
- US2: 11 tasks
- US3: 11 tasks
- US4: 11 tasks
- Polish: 9 tasks
- Total: 88 tasks
