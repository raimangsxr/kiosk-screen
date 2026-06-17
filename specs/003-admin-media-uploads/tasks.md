# Tasks: Admin Media Uploads

**Input**: Design documents from `/specs/003-admin-media-uploads/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/openapi.yaml](./contracts/openapi.yaml), [quickstart.md](./quickstart.md)

**Tests**: Tests are mandatory for changed behavior. Backend API, service, migration, contract, frontend, and smoke validation tasks are included before or alongside implementation tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in the same phase when file ownership does not overlap.
- **[Story]**: Maps the task to a specific user story from `spec.md`.
- Every task includes exact file paths.

## Phase 1: Setup

**Purpose**: Prepare shared configuration, contracts, and deployment surfaces before schema or feature work.

- [X] T001 Add local media storage settings, upload size limits, and allowed animation values to `backend/app/config.py` (Req: FR-005, FR-020; Validate: `pytest backend/tests/unit/test_config.py`)
- [X] T002 [P] Add backend media storage path documentation to `backend/README.md` (Req: FR-005; Validate: review local lab instructions)
- [X] T003 [P] Add uploaded media directory ignore rules to `.gitignore` (Req: FR-005; Validate: `git status --short` does not show local uploads)
- [X] T004 [P] Add frontend shared upload and rotation type definitions in `frontend/src/app/shared/media-upload.models.ts` matching `contracts/openapi.yaml` (Req: TQ-003; Validate: `npm --prefix frontend run test -- --watch=false`)
- [X] T005 [P] Document Kubernetes media volume expectations in `deploy/README.md` without changing deployment manifests (Req: FR-005; Validate: review deployment notes before T070)

---

## Phase 2: Foundational

**Purpose**: Shared database, domain, storage, schema, and contract foundations that block user-story implementation.

**Critical**: No user story implementation starts until this phase is complete.

### Tests and Contracts

- [X] T006 [P] Add migration coverage for media and rotation schema changes in `backend/tests/integration/test_media_migration.py` (Req: FR-005, FR-006, FR-007, FR-008, FR-026; Validate: `pytest backend/tests/integration/test_media_migration.py`)
- [X] T007 [P] Add OpenAPI contract tests for upload, protected media, and rotation schema additions in `backend/tests/contract/test_media_upload_openapi.py` (Req: TQ-003, FR-027; Validate: `pytest backend/tests/contract/test_media_upload_openapi.py`)
- [X] T008 [P] Add backend unit tests for media validation and effective rotation rules in `backend/tests/unit/test_media_domain.py` (Req: FR-014A, FR-017, FR-019, FR-020; Validate: `pytest backend/tests/unit/test_media_domain.py`)
- [X] T009 [P] Add backend unit tests for reference-counted media deletion in `backend/tests/unit/test_media_repository.py` (Req: FR-026; Validate: `pytest backend/tests/unit/test_media_repository.py`)

### Database

- [X] T010 Create `MediaFileReference` SQLAlchemy model in `backend/app/repositories/models/media.py` and export it from `backend/app/repositories/models/__init__.py` (Req: FR-005, FR-006, FR-026; Validate: `pytest backend/tests/unit/test_media_repository.py`)
- [X] T011 Extend content, ad, and configuration SQLAlchemy models in `backend/app/repositories/models/content.py`, `backend/app/repositories/models/ad.py`, and `backend/app/repositories/models/kiosk_configuration.py` (Req: FR-007, FR-008, FR-009-FR-014A; Validate: `pytest backend/tests/integration/test_media_migration.py`)
- [X] T012 Create Alembic migration `backend/alembic/versions/0002_admin_media_uploads.py` for media references, rotation fields, animation fields, inline ad count, foreign keys, and check constraints (Req: FR-005-FR-014A, FR-026; Validate: `alembic -c backend/alembic.ini upgrade head`)

### Backend Domain and Persistence

- [X] T013 [P] Add media validation and animation option domain helpers in `backend/app/domain/media.py` (Req: FR-019, FR-020; Validate: `pytest backend/tests/unit/test_media_domain.py`)
- [X] T014 [P] Add effective rotation resolver in `backend/app/domain/rotation.py` for defaults plus optional per-item overrides (Req: FR-014A, FR-017; Validate: `pytest backend/tests/unit/test_media_domain.py`)
- [X] T015 Add media repository functions in `backend/app/repositories/media.py` for create, get, reference counts, and delete eligibility (Req: FR-005, FR-006, FR-026; Validate: `pytest backend/tests/unit/test_media_repository.py`)
- [X] T016 Extend content, ads, and configuration repositories in `backend/app/repositories/content.py`, `backend/app/repositories/ads.py`, and `backend/app/repositories/configuration.py` for media and rotation fields (Req: FR-007-FR-014A; Validate: `pytest backend/tests/integration/test_media_migration.py`)
- [X] T017 Add media storage service in `backend/app/services/media_storage_service.py` for safe file names, save, load, delete, size/type validation, and storage errors (Req: FR-005, FR-019, FR-020, FR-026; Validate: `pytest backend/tests/unit/test_media_storage_service.py`)
- [X] T018 [P] Add backend unit tests for media storage service in `backend/tests/unit/test_media_storage_service.py` (Req: FR-005, FR-019, FR-020, FR-026; Validate: `pytest backend/tests/unit/test_media_storage_service.py`)

### Backend API Foundation

- [X] T019 Extend Pydantic schemas in `backend/app/api/schemas.py` for `MediaFileReference`, rotation animation, animation duration, inline ad count, and upload responses (Req: FR-006-FR-014A, TQ-003; Validate: `pytest backend/tests/contract/test_media_upload_openapi.py`)
- [X] T020 Extend API mappers in `backend/app/api/mappers.py` for media references and effective rotation fields (Req: FR-006, FR-017; Validate: `pytest backend/tests/contract/test_media_upload_openapi.py`)
- [X] T021 Add protected media API route in `backend/app/api/media.py` and register it in `backend/app/api/router.py` with authentication and validation (Req: FR-027; Validate: `pytest backend/tests/integration/test_media_access_api.py`)
- [X] T022 [P] Add protected media API integration tests in `backend/tests/integration/test_media_access_api.py` for authenticated access, unauthenticated denial, forbidden access, and missing file errors (Req: FR-023, FR-027; Validate: `pytest backend/tests/integration/test_media_access_api.py`)

**Checkpoint**: Database, storage, schema, media access, and shared validation foundations are ready.

---

## Phase 3: User Story 1 - Upload Main Display Content (Priority: P1)

**Goal**: Authorized administrators and content managers can upload image/video main content or create iframe entries from the Admin panel.

**Independent Test**: Upload an image, upload a video, create an iframe entry, confirm all appear in the content list with metadata, and confirm unauthenticated media URL access is denied.

### Tests for User Story 1

- [X] T023 [P] [US1] Add content upload contract tests in `backend/tests/contract/test_content_upload_openapi.py` for `/content/upload` and `/content/iframe` from `contracts/openapi.yaml` (Req: FR-001-FR-003, TQ-003; Validate: `pytest backend/tests/contract/test_content_upload_openapi.py`)
- [X] T024 [P] [US1] Add content upload API integration tests in `backend/tests/integration/test_content_upload_api.py` for image upload, video upload, iframe create, size/type rejection, and permission denial (Req: FR-001-FR-003, FR-018-FR-022; Validate: `pytest backend/tests/integration/test_content_upload_api.py`)
- [X] T025 [P] [US1] Add content service tests in `backend/tests/unit/test_content_upload_service.py` for metadata validation, approved iframe source handling, media save rollback, and display event recording (Req: FR-003, FR-018-FR-025; Validate: `pytest backend/tests/unit/test_content_upload_service.py`)
- [X] T026 [P] [US1] Add Angular content upload API service tests in `frontend/src/app/content/content-api.service.spec.ts` against `contracts/openapi.yaml` paths `/content/upload` and `/content/iframe` (Req: FR-001-FR-003, TQ-003; Validate: `npm --prefix frontend run test -- --watch=false`)
- [X] T027 [P] [US1] Add Angular content form tests in `frontend/src/app/content/content-form.component.spec.ts` for image upload, video upload, iframe entry, validation messages, and accessibility states (Req: FR-001-FR-003, FR-018, FR-022; Validate: `npm --prefix frontend run test -- --watch=false`)

### Backend Implementation for User Story 1

- [X] T028 [US1] Extend content service in `backend/app/services/content_service.py` for image/video upload orchestration, iframe creation, metadata validation, storage rollback, and media event recording (Req: FR-001-FR-003, FR-018-FR-025; Validate: `pytest backend/tests/unit/test_content_upload_service.py`)
- [X] T029 [US1] Extend content API routes in `backend/app/api/content.py` with `/content/upload` multipart handling and `/content/iframe` JSON handling, including validation and tests (Req: FR-001-FR-003, FR-018-FR-022, TQ-003; Validate: `pytest backend/tests/integration/test_content_upload_api.py`)
- [X] T030 [US1] Extend content response mapping in `backend/app/api/mappers.py` to include media reference and optional rotation fields for content items (Req: FR-006, FR-007; Validate: `pytest backend/tests/contract/test_content_upload_openapi.py`)

### Frontend Implementation for User Story 1

- [X] T031 [US1] Extend content API service in `frontend/src/app/content/content-api.service.ts` to call `/content/upload` and `/content/iframe` per `contracts/openapi.yaml` (Req: FR-001-FR-003, TQ-003; Validate: `npm --prefix frontend run test -- --watch=false`)
- [X] T032 [US1] Extend content form UI in `frontend/src/app/content/content-form.component.ts` for file upload, iframe mode, rotation override inputs, animation input, and user-facing upload errors per `contracts/openapi.yaml` (Req: FR-001-FR-003, FR-018-FR-022; Validate: `npm --prefix frontend run test -- --watch=false`)
- [X] T033 [US1] Extend content list UI in `frontend/src/app/content/content-list.component.ts` to show uploaded/iframe source type, media reference status, and rotation override summary (Req: FR-006, FR-007, FR-024; Validate: `npm --prefix frontend run test -- --watch=false`)

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Upload Client Ads (Priority: P2)

**Goal**: Authorized administrators and advertising managers can upload image ads, associate them with clients, and see validation errors for missing client or invalid media.

**Independent Test**: Upload a valid image ad for a client, confirm it appears in the ad list, and confirm missing-client or invalid-file submissions are rejected.

### Tests for User Story 2

- [X] T034 [P] [US2] Add ad upload contract tests in `backend/tests/contract/test_ad_upload_openapi.py` for `/ads/upload` from `contracts/openapi.yaml` (Req: FR-004, TQ-003; Validate: `pytest backend/tests/contract/test_ad_upload_openapi.py`)
- [X] T035 [P] [US2] Add ad upload API integration tests in `backend/tests/integration/test_ad_upload_api.py` for valid upload, missing client, inactive client, size/type rejection, and permission denial (Req: FR-004, FR-018-FR-022; Validate: `pytest backend/tests/integration/test_ad_upload_api.py`)
- [X] T036 [P] [US2] Add ad service tests in `backend/tests/unit/test_ad_upload_service.py` for metadata validation, media save rollback, client validation, and display event recording (Req: FR-004, FR-008, FR-018-FR-025; Validate: `pytest backend/tests/unit/test_ad_upload_service.py`)
- [X] T037 [P] [US2] Add Angular ads API service tests in `frontend/src/app/ads/ads-api.service.spec.ts` against `contracts/openapi.yaml` path `/ads/upload` (Req: FR-004, TQ-003; Validate: `npm --prefix frontend run test -- --watch=false`)
- [X] T038 [P] [US2] Add Angular ad form tests in `frontend/src/app/ads/ad-form.component.spec.ts` for image upload, client selection, invalid file, missing client, validation messages, and accessibility states (Req: FR-004, FR-018, FR-022; Validate: `npm --prefix frontend run test -- --watch=false`)

### Backend Implementation for User Story 2

- [X] T039 [US2] Extend ads service in `backend/app/services/ads_service.py` for image ad upload orchestration, client validation, metadata validation, storage rollback, and media event recording (Req: FR-004, FR-008, FR-018-FR-025; Validate: `pytest backend/tests/unit/test_ad_upload_service.py`)
- [X] T040 [US2] Extend ads API routes in `backend/app/api/ads.py` with `/ads/upload` multipart handling, including validation and tests (Req: FR-004, FR-018-FR-022, TQ-003; Validate: `pytest backend/tests/integration/test_ad_upload_api.py`)
- [X] T041 [US2] Extend ad response mapping in `backend/app/api/mappers.py` to include media reference and optional rotation fields for ad items (Req: FR-006, FR-008; Validate: `pytest backend/tests/contract/test_ad_upload_openapi.py`)

### Frontend Implementation for User Story 2

- [X] T042 [US2] Extend ads API service in `frontend/src/app/ads/ads-api.service.ts` to call `/ads/upload` per `contracts/openapi.yaml` (Req: FR-004, TQ-003; Validate: `npm --prefix frontend run test -- --watch=false`)
- [X] T043 [US2] Extend ad form UI in `frontend/src/app/ads/ad-form.component.ts` for image upload, client association, rotation override inputs, animation input, and user-facing upload errors per `contracts/openapi.yaml` (Req: FR-004, FR-008, FR-018-FR-022; Validate: `npm --prefix frontend run test -- --watch=false`)
- [X] T044 [US2] Extend ad list UI in `frontend/src/app/ads/ad-list.component.ts` to show uploaded media status and rotation override summary (Req: FR-006, FR-008, FR-024; Validate: `npm --prefix frontend run test -- --watch=false`)

**Checkpoint**: User Story 2 is independently functional and testable.

---

## Phase 5: User Story 3 - Configure Rotation Behavior (Priority: P3)

**Goal**: Authorized users can configure default rotation timing, animation, animation duration, and inline ad count, with per-area permission boundaries.

**Independent Test**: Change main content defaults as a content manager, change ad defaults and inline ad count as an advertising manager, confirm unauthorized cross-area changes are denied, and confirm invalid values are rejected.

### Tests for User Story 3

- [X] T045 [P] [US3] Add configuration contract tests in `backend/tests/contract/test_rotation_configuration_openapi.py` for `/display/configuration` schema additions from `contracts/openapi.yaml` (Req: FR-009-FR-014A, TQ-003; Validate: `pytest backend/tests/contract/test_rotation_configuration_openapi.py`)
- [X] T046 [P] [US3] Add configuration API integration tests in `backend/tests/integration/test_rotation_configuration_api.py` for admin, content-manager, advertising-manager, forbidden cross-area updates, invalid values, and last-write-wins saves (Req: FR-009-FR-014A, FR-021, FR-028; Validate: `pytest backend/tests/integration/test_rotation_configuration_api.py`)
- [X] T047 [P] [US3] Add admin configuration service tests in `backend/tests/unit/test_rotation_configuration_service.py` for default settings, inline ad count, per-role permissions, validation, and last-write-wins saves (Req: FR-009-FR-014A, FR-021, FR-028; Validate: `pytest backend/tests/unit/test_rotation_configuration_service.py`)
- [X] T048 [P] [US3] Add Angular admin API service tests in `frontend/src/app/admin/admin-api.service.spec.ts` for rotation configuration request/response shape per `contracts/openapi.yaml` (Req: FR-009-FR-014A, TQ-003; Validate: `npm --prefix frontend run test -- --watch=false`)
- [X] T049 [P] [US3] Add Angular display configuration tests in `frontend/src/app/admin/display-configuration.component.spec.ts` for defaults, inline ad count, invalid values, and role-specific disabled controls (Req: FR-009-FR-014A, FR-021, FR-022; Validate: `npm --prefix frontend run test -- --watch=false`)

### Backend Implementation for User Story 3

- [X] T050 [US3] Extend admin service in `backend/app/services/admin_service.py` for rotation defaults, animation defaults, inline ad count, and per-role configuration authorization (Req: FR-009-FR-014A, FR-021; Validate: `pytest backend/tests/unit/test_rotation_configuration_service.py`)
- [X] T051 [US3] Extend configuration API route in `backend/app/api/configuration.py` with validation and permission handling for rotation defaults and inline ad count (Req: FR-009-FR-014A, FR-021, TQ-003; Validate: `pytest backend/tests/integration/test_rotation_configuration_api.py`)
- [X] T052 [US3] Extend configuration schemas in `backend/app/api/schemas.py` and mappers in `backend/app/api/mappers.py` for rotation defaults and inline ad count (Req: FR-009-FR-014A, TQ-003; Validate: `pytest backend/tests/contract/test_rotation_configuration_openapi.py`)

### Frontend Implementation for User Story 3

- [X] T053 [US3] Extend admin API service in `frontend/src/app/admin/admin-api.service.ts` for rotation configuration fields per `contracts/openapi.yaml` (Req: FR-009-FR-014A, TQ-003; Validate: `npm --prefix frontend run test -- --watch=false`)
- [X] T054 [US3] Extend display configuration UI in `frontend/src/app/admin/display-configuration.component.ts` for default rotations, animations, animation durations, inline ad count, validation messages, and role-specific controls (Req: FR-009-FR-014A, FR-021, FR-022; Validate: `npm --prefix frontend run test -- --watch=false`)

**Checkpoint**: User Story 3 is independently functional and testable.

---

## Phase 6: User Story 4 - Display Uploaded Media Reliably (Priority: P4)

**Goal**: The kiosk display loads protected uploaded media, applies effective rotation and animation settings, and avoids broken visual states.

**Independent Test**: Open the display after uploaded media and rotation settings exist, confirm content fills the top region one item at a time, ads render inline using the configured count, and missing media shows fallback/diagnostic behavior.

### Tests for User Story 4

- [X] T055 [P] [US4] Add display API integration tests in `backend/tests/integration/test_uploaded_media_display_api.py` for effective media URLs, effective rotation fields, inline ad count, and missing media diagnostics (Req: FR-015-FR-017, FR-023-FR-025; Validate: `pytest backend/tests/integration/test_uploaded_media_display_api.py`)
- [X] T056 [P] [US4] Add display service tests in `backend/tests/unit/test_uploaded_media_display_service.py` for effective rotation resolution and inline ad selection when requested count exceeds eligible ads (Req: FR-015-FR-017, FR-023; Validate: `pytest backend/tests/unit/test_uploaded_media_display_service.py`)
- [X] T057 [P] [US4] Add Angular display API service tests in `frontend/src/app/display/display-api.service.spec.ts` for media URL and effective rotation response fields per `contracts/openapi.yaml` (Req: FR-015-FR-017, TQ-003; Validate: `npm --prefix frontend run test -- --watch=false`)
- [X] T058 [P] [US4] Add Angular display component tests in `frontend/src/app/display/display-screen.component.spec.ts` for full-container uploaded media, inline ads, animation classes, and fallback state (Req: FR-015-FR-017, FR-023; Validate: `npm --prefix frontend run test -- --watch=false`)

### Backend Implementation for User Story 4

- [X] T059 [US4] Extend display service in `backend/app/services/display_service.py` to resolve protected media URLs, effective rotation settings, inline ad count, and load-failure diagnostics (Req: FR-015-FR-017, FR-023-FR-025; Validate: `pytest backend/tests/unit/test_uploaded_media_display_service.py`)
- [X] T060 [US4] Extend display API route in `backend/app/api/display.py` and schemas in `backend/app/api/schemas.py` to return effective media and rotation fields with validation (Req: FR-015-FR-017, FR-023-FR-025, TQ-003; Validate: `pytest backend/tests/integration/test_uploaded_media_display_api.py`)

### Frontend Implementation for User Story 4

- [X] T061 [US4] Extend display API service types in `frontend/src/app/display/display-api.service.ts` for media URLs, effective rotation, animation, animation duration, and inline ad count per `contracts/openapi.yaml` (Req: FR-015-FR-017, TQ-003; Validate: `npm --prefix frontend run test -- --watch=false`)
- [X] T062 [US4] Extend display rotation service in `frontend/src/app/display/display-rotation.service.ts` to honor effective per-item/default rotation durations and inline ad count (Req: FR-015-FR-017; Validate: `npm --prefix frontend run test -- --watch=false`)
- [X] T063 [US4] Extend display screen UI in `frontend/src/app/display/display-screen.component.ts` and `frontend/src/app/display/display-screen.component.css` for full-container uploaded media, inline ads, animation classes, animation duration styling, and fallback states (Req: FR-015-FR-017, FR-023; Validate: `npm --prefix frontend run test -- --watch=false`)

**Checkpoint**: User Story 4 is independently functional and testable.

---

## Phase 7: Polish and Cross-Cutting Concerns

**Purpose**: Documentation, deployment, observability, security, and end-to-end validation across all stories.

- [X] T064 [P] Add quickstart smoke checklist for upload-to-display validation, including backend restart persistence, in `scripts/smoke/admin_media_uploads.md` (Req: SC-001-SC-008; Validate: follow checklist manually)
- [X] T065 [P] Update root local lab documentation for media storage directory and upload validation in `README.md` (Req: FR-005, FR-020; Validate: review documented startup flow)
- [X] T066 [P] Update backend documentation for media storage settings and migration order in `backend/README.md` (Req: FR-005; Validate: review backend local setup)
- [X] T067 [P] Add observability review tests or assertions for media upload/delete/access events in `backend/tests/integration/test_media_observability.py` (Req: FR-022, FR-025, FR-027; Validate: `pytest backend/tests/integration/test_media_observability.py`)
- [X] T068 Add protected media security regression tests in `backend/tests/integration/test_media_access_api.py` for unauthenticated direct URL denial and role-bound access (Req: FR-021, FR-027, SC-008; Validate: `pytest backend/tests/integration/test_media_access_api.py`)
- [X] T069 Add frontend accessibility regression coverage for upload/configuration forms in `frontend/src/app/content/content-form.component.spec.ts`, `frontend/src/app/ads/ad-form.component.spec.ts`, and `frontend/src/app/admin/display-configuration.component.spec.ts` (Req: FR-022, TQ-004; Validate: `npm --prefix frontend run test -- --watch=false`)
- [X] T070 Update deployment assets for backend media persistent volume and environment setting in `deploy/kubernetes/backend.yaml`, `deploy/kubernetes/kustomization.yaml`, and `deploy/kubernetes/migration-job.yaml` (Req: FR-005; Validate: `kubectl kustomize deploy/kubernetes`)
- [X] T071 Run backend full validation and record results in `specs/003-admin-media-uploads/validation/backend.md` (Req: all backend requirements; Validate: `pytest backend/tests`)
- [X] T072 Run frontend full validation and record results in `specs/003-admin-media-uploads/validation/frontend.md` (Req: all frontend requirements; Validate: `npm --prefix frontend run test -- --watch=false`)
- [X] T073 Run contract, migration, backend restart media persistence, and quickstart validation and record results in `specs/003-admin-media-uploads/validation/integration.md` (Req: TQ-003, SC-001-SC-008; Validate: OpenAPI export, Alembic upgrade, restart persistence check, smoke checklist)

---

## Dependencies and Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1; blocks all user stories.
- **Phase 3 US1**: Depends on Phase 2.
- **Phase 4 US2**: Depends on Phase 2. Can run in parallel with US1 after shared foundations are complete.
- **Phase 5 US3**: Depends on Phase 2. Can run in parallel with US1/US2 if configuration model changes are complete.
- **Phase 6 US4**: Depends on Phase 2 and is most valuable after US1/US2/US3 produce media and rotation data.
- **Phase 7 Polish**: Depends on desired user stories being complete.

### User Story Dependencies

- **US1 Upload Main Display Content**: No user-story dependency after foundation.
- **US2 Upload Client Ads**: No user-story dependency after foundation.
- **US3 Configure Rotation Behavior**: No user-story dependency after foundation.
- **US4 Display Uploaded Media Reliably**: Depends on data produced by US1/US2/US3 for full smoke validation, but backend/frontend display handling can be implemented independently against fixtures.

### Within Each Story

- Tests and contracts before implementation.
- Models and repositories before services.
- Services before API route handlers.
- API services before frontend components.
- Story validation before moving to the next priority when working sequentially.

## Parallel Opportunities

- Setup tasks T002-T005 can run in parallel because they do not edit the same files as each other or deployment manifest task T070.
- Foundational tests T006-T009 can run in parallel.
- Foundational domain/model tasks T010, T013, T014, and T018 can run in parallel by file owner.
- US1 tests T023-T027 can run in parallel.
- US2 tests T034-T038 can run in parallel.
- US3 tests T045-T049 can run in parallel.
- US4 tests T055-T058 can run in parallel.
- Frontend and backend implementation tasks within the same story can proceed in parallel after API contract tests are written and shared schemas are agreed.

## Parallel Example: User Story 1

```text
Task: T023 Contract test for /content/upload and /content/iframe
Task: T024 API integration tests for content upload and iframe creation
Task: T025 Service tests for content upload orchestration
Task: T026 Angular content API service tests
Task: T027 Angular content form tests
```

## Parallel Example: User Story 2

```text
Task: T034 Contract test for /ads/upload
Task: T035 API integration tests for ad upload
Task: T036 Service tests for ad upload orchestration
Task: T037 Angular ads API service tests
Task: T038 Angular ad form tests
```

## Parallel Example: User Story 3

```text
Task: T045 Contract tests for display configuration schema
Task: T046 API integration tests for rotation configuration
Task: T047 Service tests for role-bound configuration updates
Task: T048 Angular admin API service tests
Task: T049 Angular display configuration component tests
```

## Parallel Example: User Story 4

```text
Task: T055 Display API integration tests
Task: T056 Display service tests
Task: T057 Angular display API service tests
Task: T058 Angular display component tests
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 setup.
2. Complete Phase 2 foundation.
3. Complete Phase 3 US1 for main display content upload.
4. Stop and validate US1 independently with backend tests, frontend tests, and a manual upload flow.

### Incremental Delivery

1. US1: Main content upload and protected media access.
2. US2: Client ad upload.
3. US3: Rotation configuration and inline ad count.
4. US4: Display playback integration.
5. Polish: docs, deployment, observability, security, accessibility, and full smoke validation.

### Review Boundaries

- Database changes are reviewable in migration/model tasks.
- Backend API behavior is reviewable through contract and integration tests.
- Frontend behavior is reviewable through API service and component tests.
- Deployment and documentation are isolated in Phase 7.
