# Tasks: Event Branding and Ads Section Title

**Input**: Design documents from `/specs/017-event-branding/`
- `plan.md` (required) — implementation plan, structure, dependencies
- `spec.md` (required) — user stories US1–US6 with priorities
- `research.md` — technical decisions and rejected alternatives
- `data-model.md` — `event_configurations` schema and migration contract
- `contracts/admin-event-configuration.md` — multipart PUT contract
- `contracts/public-event-branding.md` — public GET contract
- `contracts/audit-event-configuration-changed.md` — audit event contract
- `quickstart.md` — end-to-end validation recipe

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Mandatory for changed behaviour. Unit tests for business logic; integration/contract tests for external boundaries (admin API, public API, audit event, migration idempotency); Karma tests for new component and modified kiosk display component.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. Backend changes that serve multiple stories (migration, model, schemas, service, display/readiness/admin service consumers, `validate_logo_upload`) are placed in the Foundational phase because they are blocking prerequisites for US1, US4, and US6.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, …)
- Include exact file paths in descriptions

## Path Conventions

Web app layout per `plan.md`:
- Backend: `backend/app/...`, `backend/alembic/versions/...`, `backend/tests/...`
- Frontend: `frontend/src/app/...`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the workspace for new files and confirm baseline builds.

- [X] T001 Create `backend/app/api/event_configuration.py`, `backend/app/api/event_branding.py`, `backend/app/repositories/models/event_configuration.py`, `backend/app/services/event_configuration_service.py` as empty Python module skeletons (each with imports, no business logic). The frontend feature directory `frontend/src/app/features/event-config/` is created in Phase 3 when files land.
- [X] T002 [P] Create backend test stubs at `backend/tests/unit/test_event_configuration_service.py`, `backend/tests/integration/test_event_configuration_api.py`, `backend/tests/integration/test_event_branding_public.py`, `backend/tests/integration/test_migration_0011_event_branding.py`. Empty test classes / `pytest.mark.skip` markers; the real tests come in later phases.
- [X] T003 [P] Verify baseline backend tests pass: `pytest backend/tests -q` from repo root returns green (no regressions vs `main`).
- [X] T004 [P] Verify baseline frontend build and tests pass: `npm --prefix frontend run build` and `npm --prefix frontend run test` return green.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, model, service, schemas, and consumer migrations MUST be complete before any user story work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Implement Alembic migration `backend/alembic/versions/0011_event_branding.py` per FR-011, FR-011a, FR-012, Q12. Every step guarded by `_table_exists` / `_column_exists` / `_constraint_exists` checks (pattern from `0010_remote_control_fullscreen.py` and `0008_preconfigured_iframes_and_video_end.py`). Backfill uses `INSERT ... ON CONFLICT (organization_id) DO NOTHING`. Idempotent: rerunning `alembic upgrade head` MUST NOT raise and MUST NOT duplicate rows/columns/constraints. Down-migration restores the schema only, no data values.
- [X] T006 Create the `EventConfiguration` SQLAlchemy model in `backend/app/repositories/models/event_configuration.py` per `data-model.md` §1. Columns: `id`, `organization_id` (unique FK), `event_name`, `organizer_name`, `organizer_logo_media_id` (nullable FK to `media_file_references.id`, ON DELETE SET NULL), `event_duration_minutes`, audit fields. Check constraints `ck_event_duration_minutes_positive` (>0) and `ck_event_duration_minutes_max` (<=1440). Reuse `IdMixin` / `TimestampMixin`.
- [X] T007 [P] Export `EventConfiguration` from `backend/app/repositories/models/__init__.py`.
- [X] T008 Add Pydantic schemas `EventConfigurationSchema`, `EventConfigurationRequest`, `EventBrandingSchema` to `backend/app/api/schemas.py` per `contracts/admin-event-configuration.md` §6 and `contracts/public-event-branding.md` §7. CamelCase aliases. `EventConfigurationRequest` is for the multipart body (text fields only; the file is parsed separately by FastAPI). `EventBrandingSchema` carries only the three public fields.
- [X] T009 [P] Add mappers `to_event_configuration_schema(row, media)` and `to_event_branding_schema(row, media_url)` to `backend/app/api/mappers.py`.
- [X] T010 Add `validate_logo_upload(content_type: str, size_bytes: int)` to `backend/app/domain/media.py`. Allowed content types: `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`. Max size: `image_upload_max_bytes` (1 MB by default). Empty file rejected. Each failure raises `ValueError` with a specific message (reused by the router to produce HTTP 400).
- [X] T011 Implement `EventConfigurationService` in `backend/app/services/event_configuration_service.py`. Public methods: `get_or_create(organization_id) -> EventConfiguration` (auto-create with defaults on miss per FR-006 analog); `update(organization_id, user_id, payload: dict, file: UploadFile | None, remove_logo: bool) -> EventConfiguration`. Encapsulates the transactional flow described in `contracts/admin-event-configuration.md` §5: validate fields, validate logo file if present, raise on ambiguous intent (Q11 / FR-010a), call `MediaStorageService.save_upload(media_type='logo')`, atomically swap or clear the logo, persist other fields, emit `event_configuration_changed` audit event, return updated row. Imports `ConfigurationRepository`, `MediaStorageService`, `DisplayEventRepository`, `create_display_event`.
- [X] T012 [P] Modify `backend/app/services/bootstrap_service.py`: in `bootstrap_mvp_data`, also create an `EventConfiguration` row per organisation with `event_duration_minutes=240` (or the same value used for the old column), all text fields empty, no logo. Idempotent: skip if the row already exists for the organisation.
- [X] T013 Modify `backend/app/services/display_service.py` (`open_display`): read `event_duration_minutes` from `event_configurations` (auto-create the row via `EventConfigurationService.get_or_create` if missing) instead of `KioskDisplayConfiguration.configured_event_duration_minutes`. Drop any reference to the removed column.
- [X] T014 [P] Modify `backend/app/services/readiness_service.py`: same switch as T013; the `ReadinessInput.event_duration_minutes` now comes from `event_configurations`.
- [X] T015 [P] Modify `backend/app/services/admin_service.py` (`update_configuration`): remove the `configuration.configured_event_duration_minutes = payload.configured_event_duration_minutes` assignment and remove the field from the `KioskConfigurationRequest` payload handling. The display-config PUT MUST NOT touch event duration anymore.
- [ ] T016 Migration idempotency test in `backend/tests/integration/test_migration_0011_event_branding.py`: create a fresh SQLite-in-memory schema; run `alembic upgrade head`; rerun; assert no exception. Inspect the resulting tables: `event_configurations` exists with one row per organisation (or zero for a fresh DB), `kiosk_display_configurations` lacks `configured_event_duration_minutes`, check constraint `ck_kiosk_event_duration_positive` is gone.
- [ ] T017 [P] Data-preservation invariant test (same file as T016): seed `kiosk_display_configurations.configured_event_duration_minutes=120` for one org; run upgrade; assert `event_configurations.event_duration_minutes=120` for the same org. Also seed a row that does not get backfilled (no kiosk config); assert `bootstrap_service` flow produces an `EventConfiguration` with the default 240 (verified via a service-level test in `backend/tests/unit/test_event_configuration_service.py`).
- [ ] T018 [P] Service-level unit tests in `backend/tests/unit/test_event_configuration_service.py`: `get_or_create` creates a row with defaults when missing; `update` raises on `eventDurationMinutes <= 0`; `update` raises on `eventName` length > 255; `update` raises on file with bad content_type; `update` raises on file > 1 MB; `update` raises when both `file` and `removeLogo=True` (Q11 / FR-010a); `update` with valid `file` calls `MediaStorageService.save_upload` with `media_type='logo'` and updates the FK; `update` with `removeLogo=True` clears the FK and decrements the previous media reference count.
- [ ] T019 [P] Update existing backend tests/fixtures that reference `configured_event_duration_minutes` on `KioskDisplayConfiguration`: search via `grep -rn configured_event_duration_minutes backend/`, replace with `event_duration_minutes` from `event_configurations`. Affected files include `backend/tests/integration/test_display_api.py`, `backend/tests/integration/test_admin_api.py`, `backend/tests/integration/test_readiness_api.py`, `backend/tests/unit/test_*` where relevant. Use `pytest backend/tests -q` to verify no regressions.

**Checkpoint**: Foundation ready — `pytest backend/tests -q` green, `alembic upgrade head` idempotent.

---

## Phase 3: User Story 1 — Configure event branding from admin (Priority: P1) 🎯 MVP

**Goal**: Administrators can open `/admin/event`, set organizer/event names, event duration, and upload a logo; the values persist and become available to the kiosk on next poll.

**Independent Test**: Sign in as `administrator`, navigate to `/admin/event`, fill in organizer name "ACME Events", event name "Spring Summit 2026", duration 180 minutes, upload a 200 KB PNG logo, click Save. Snackbar shows success; refresh the page; the form re-renders with the persisted values. Switch to `content_manager` or `advertising_manager`; the form is writable. With `display_viewer` or `event_operator`, the API returns 403.

### Tests for User Story 1

- [ ] T020 [P] [US1] Contract test for `PUT /api/event-configuration` (multipart) in `backend/tests/integration/test_event_configuration_api.py`: happy path returns 200 with the new `EventConfigurationSchema`; ambiguous intent (both `file` and `removeLogo=True`) returns 400 with the specific error message; oversized file returns 400; bad content type returns 400; non-multipart body returns 415; `content_manager` and `advertising_manager` can save; `display_viewer` and `event_operator` receive 403.
- [ ] T021 [P] [US1] Contract test for `GET /api/event-configuration` in `backend/tests/integration/test_event_configuration_api.py`: returns 200 with the current row; `display_viewer`/`event_operator` receive 403. Also assert the public counterpart: `GET /api/event-branding` returns HTTP 200 without a session and for any authenticated client, including `display_viewer` and `event_operator`, and that the response body carries exactly the three allowed fields (`eventName`, `organizerName`, `organizerLogoUrl`) and no others (closes SC-005 and the public-endpoint half of the SC).
- [ ] T022 [P] [US1] Integration test for the audit event emission in `backend/tests/integration/test_event_configuration_api.py` (SC-008): after a successful PUT, `GET /api/events` (or equivalent admin events endpoint) returns the `event_configuration_changed` event within 1 second with the right `changedFields`, `userId`, and no logo binary. After a failed PUT (validation error), the event is NOT emitted.

### Implementation for User Story 1

- [X] T023 [P] [US1] Implement admin API `backend/app/api/event_configuration.py`: `GET ""` and `PUT ""` (multipart) under `prefix="/event-configuration"`. `GET` requires `CONFIGURATION_MANAGEMENT_ROLES`; `PUT` requires the same. `PUT` parses the multipart body (`eventName`, `organizerName`, `eventDurationMinutes`, `file`, `removeLogo`), validates the ambiguous-intent guard (FR-010a / Q11), delegates to `EventConfigurationService.update`, returns the updated schema. `ValueError`s from validation map to HTTP 400 with the underlying message. Register the router in `backend/app/api/router.py`.
- [X] T024 [P] [US1] Frontend API service in `frontend/src/app/core/api/event-config.api.ts`: `EventConfigurationApiService` with `get(): Observable<EventConfiguration>` and `update(formData: FormData): Observable<EventConfiguration>`. Types match the backend schema (camelCase).
- [X] T025 [P] [US1] Frontend facade in `frontend/src/app/features/event-config/event-config.facade.ts`: signal state (`configuration`, `loading`, `saving`, `error`, `dirty`, `selectedLogoPreviewUrl`). Methods: `refresh()`, `save(formValue, file | null, removeLogo)`. Mirrors the pattern in `display-config.facade.ts`.
- [X] T026 [US1] Frontend component `frontend/src/app/features/event-config/event-config.component.ts` per the design in `plan.md` §Project Structure. Standalone, OnPush, uses `PageHeaderComponent`, `FormPageComponent`, `FileInputComponent`. Reactive form with `eventName` (maxlength 255, optional), `organizerName` (maxlength 255, optional), `eventDurationMinutes` (positive integer 1–1440, required). Logo preview via `FileInputComponent` with `accept="image/png,image/jpeg,image/webp,image/svg+xml"`, `showPreview`. After successful save, `markPristine()` and show a snackbar. Implements `DirtyFormAware` (`hasUnsavedChanges()` snapshot comparison + saving guard).
- [X] T027 [P] [US1] Register the route in `frontend/src/app/app.routes.ts`: `{ path: 'event', component: EventConfigComponent, canDeactivate: [dirtyFormGuard] }`. Wire the navigation entry `{ label: 'Event', route: '/admin/event', summary: 'Organizer, event name, logo, and duration' }` in `frontend/src/app/features/admin-shell/admin-navigation.service.ts` and the icon mapping `'event' | 'celebration'` in `frontend/src/app/features/admin-shell/admin-shell.component.ts` (`iconFor`).
- [ ] T028 [US1] Frontend Karma spec in `frontend/src/app/features/event-config/event-config.component.spec.ts`: form loads existing config; `eventDurationMinutes <= 0` blocks submit; upload of a 1.5 MB PNG is rejected client-side (or by the API surface in the test fixture); `removeLogo` is sent when no file is chosen and the user ticks the checkbox; `markPristine()` is called on successful save; navigating away while dirty triggers `dirtyFormGuard`. Also add a focused assertion for SC-007: after a `removeLogo=true` PUT with `eventName` and `organizerName` kept, the kiosk overlay DOM (asserted via the display-screen spec helper or a direct service call) contains text spans but NO `<img>` element.

**Checkpoint**: User Story 1 fully functional and independently testable. Admin can save and reload; audit event emitted; FK and FK-prevention work.

---

## Phase 4: User Story 2 — Branding overlay on the Top Content region (Priority: P1)

**Goal**: The kiosk's top region renders a compact overlay in the top-left corner with the organizer logo, name, and event name when configured; nothing when not configured.

**Independent Test**: With branding configured, open `/display`. The overlay shows logo + organizer + event. Clear all three values in `/admin/event`, refresh the kiosk. Overlay is absent from the DOM.

### Tests for User Story 2

- [ ] T029 [P] [US2] Frontend Karma spec in `frontend/src/app/display/display-screen.component.spec.ts`: when branding service exposes non-empty `eventName`/`organizerName`/`organizerLogoUrl`, the overlay is in the DOM with the configured pieces in order; when all three are empty, the overlay is NOT in the DOM (`document.querySelector('.branding-overlay')` returns `null`).
- [ ] T030 [P] [US2] Stale-while-error test (SC-001a): mock the kiosk's HTTP layer; first response is success with values, second response is HTTP 500, third is success with new values; assert the overlay persists across the failure and updates with the third response.
- [x] T031 [P] [US2] Iframe-mode test: with branding configured, set the kiosk to iframe mode (mock the display state). The overlay is still rendered. **OBSOLETE — superseded by `018-content-rotation-modes` US2 (FR-006).** The overlay is now hidden when `contentMode === 'iframe'`. See `specs/018-content-rotation-modes/spec.md` for the new rule.

### Implementation for User Story 2

- [X] T032 [P] [US2] Public API service in `frontend/src/app/core/api/event-branding.api.ts`: `EventBrandingApiService.get(): Observable<EventBranding>`.
- [X] T033 [US2] Branding service in `frontend/src/app/core/event-branding.service.ts`: signal `branding(): EventBranding`. `refresh()` calls the API. Stale-while-error cache: on success, replace the signal atomically; on error, keep the last value (or empty defaults if none ever succeeded). Expose a `clear()` for tests.
- [X] T034 [US2] Modify `frontend/src/app/display/display-screen.component.ts`: inject `EventBrandingService` and `DisplayApiService`. On `ngOnInit` and on every `getState()` poll (Q10), issue a parallel `event-branding.get()` via `forkJoin`. Update the service's cache on success; preserve on error. Render the overlay in the top-left of the top region: a div `.branding-overlay` with `aria-label="Organizer and event branding"`, `pointer-events: none`, and conditional content (logo img with empty `alt`, organizer name span, optional separator dot, event name span). Hidden via `@if` when all three fields are empty.
- [X] T035 [P] [US2] Modify `frontend/src/app/display/display-screen.component.css`: style `.branding-overlay` with absolute positioning, dark semi-transparent backdrop, padding, font-size, z-index 3 (above media, below fullscreen prompt z-index 20). Mobile breakpoint at ≤760px (smaller padding and font, mirrors the existing kiosk rules in the same file).

**Checkpoint**: User Story 2 fully functional and independently testable. The kiosk overlay renders and reacts to the API.

---

## Phase 5: User Story 3 — "Patrocinadores del evento" title on the Ads region (Priority: P1)

**Goal**: The kiosk's bottom ads region displays the fixed visible title "Patrocinadores del evento" as an integrated label inside the gold band.

**Independent Test**: With ads configured, open `/display`. The label is visible inside the band. Hide ads via remote control. The label is gone (the entire band is gone).

### Tests for User Story 3

- [X] T036 [P] [US3] Frontend Karma spec in `frontend/src/app/display/display-screen.component.spec.ts`: when ads are visible, `.ad-region__title` contains the text "Patrocinadores del evento" and is the first child of the band; when `adsVisible=false`, the `.ad-region__title` is NOT in the DOM; the section's `aria-label` is "Patrocinadores del evento" (replacing "Client ads").

### Implementation for User Story 3

- [X] T037 [US3] Modify `frontend/src/app/display/display-screen.component.ts`: in the `.ad-region` template, prepend `<h2 class="ad-region__title">Patrocinadores del evento</h2>`. Update the section's `aria-label` from "Client ads" to "Patrocinadores del evento".
- [X] T038 [P] [US3] Modify `frontend/src/app/display/display-screen.component.css`: style `.ad-region__title` to integrate with the gold band (same colour, uppercase, font-weight, letter-spacing; margin-right 16px; no extra height). `pointer-events: none`.

**Checkpoint**: User Story 3 fully functional. The ads band shows the integrated label.

---

## Phase 6: User Story 4 — Move event duration from display configuration to event configuration (Priority: P1)

**Goal**: The "Event duration (minutes)" field disappears from the display configuration form; the new event configuration form holds it. The existing kiosk/open_display behaviour is unchanged from the operator's perspective.

**Independent Test**: With a kiosk configuration that had `configuredEventDurationMinutes=120`, after migration the value is in `event_configurations.event_duration_minutes` and `display_service.open_display` uses that value. The display configuration form no longer has the field.

### Tests for User Story 4

- [ ] T039 [P] [US4] Integration test in `backend/tests/integration/test_display_open_event_duration.py`: seed an organisation with `event_configurations.event_duration_minutes=120`; call `POST /api/display/open`; assert the resulting `OperatorSession.valid_until` is `now + 120 minutes`. (May be a single targeted test or an extension of an existing display API integration test.)
- [ ] T040 [P] [US4] Frontend Karma spec in `frontend/src/app/features/display-config/display-config.component.spec.ts` (extend existing): the form does not contain an "Event duration" field; submitting the form does not send `configuredEventDurationMinutes`.
- [ ] T041 [P] [US4] Frontend Karma spec in `frontend/src/app/core/api/admin.api.spec.ts` (extend existing or add new): `KioskConfiguration` interface lacks `configuredEventDurationMinutes`; `KioskConfigurationRequest` (if exposed) lacks the field.

### Implementation for User Story 4

- [X] T042 [US4] Modify `frontend/src/app/features/display-config/display-config.component.ts`: remove `configuredEventDurationMinutes` from `DisplayConfigFormValue`, from the form group, from the template (`<mat-label>Event duration (minutes)</mat-label>` and the surrounding row), and from the submit payload. Update the page-header description ("event duration" no longer applies here).
- [X] T043 [P] [US4] Modify `frontend/src/app/core/api/admin.api.ts`: remove `configuredEventDurationMinutes` from the `KioskConfiguration` interface.
- [X] T044 [P] [US4] Modify `frontend/src/app/core/api/display.api.ts`: remove `configuredEventDurationMinutes` from `DisplayKioskConfiguration`; remove the corresponding equality check from `sameDisplayConfiguration` so the kiosk's `distinctUntilChanged` fingerprint continues to work.

**Checkpoint**: User Story 4 fully functional. The kiosk uses `event_configurations.event_duration_minutes`; the display configuration form no longer has the field.

---

## Phase 7: User Story 5 — Dashboard reflects event configuration status (Priority: P2)

**Goal**: The admin dashboard shows an "Event" card with the configured event name (or "Not set") and a status badge.

**Independent Test**: With `eventName="Spring Summit 2026"` set, the dashboard shows "Spring Summit 2026" and a `ready` status. With all fields empty, the card shows "Not set" and a `warning` status.

### Tests for User Story 5

- [X] T045 [P] [US5] Frontend Karma spec in `frontend/src/app/features/dashboard/dashboard.component.spec.ts` (extend existing) or `dashboard.service.spec.ts` (extend): the `load()` observable emits an `AdminDashboardState` whose `sectionSummaries` includes an entry with `label: 'Event'`, `value: '<eventName>'` (or `'Not set'`), `route: '/admin/event'`, `status: 'ready' | 'warning'`.

### Implementation for User Story 5

- [X] T046 [US5] Modify `frontend/src/app/features/dashboard/dashboard.service.ts`: inject `EventConfigurationApiService`. Add a `eventConfig` request to the existing `forkJoin`. Add a section summary entry `{ label: 'Event', value: configuration.eventName || 'Not set', route: '/admin/event', status: configuration.eventName ? 'ready' : 'warning' }`.
- [X] T047 [P] [US5] Modify `frontend/src/app/features/dashboard/dashboard.component.ts`: map the `/admin/event` route to an icon (`event` or `celebration`) in the existing icon helper. Add a quick action entry in the admin shell's quick actions: `{ label: 'Edit event', route: '/admin/event', description: 'Set organizer, event name, logo, and duration.' }` in `admin-navigation.service.ts`.

**Checkpoint**: User Story 5 fully functional. The dashboard surfaces the event configuration status.

---

## Phase 8: User Story 6 — Logo upload respects allowed formats and size (Priority: P2)

**Goal**: The form rejects oversized files and unsupported content types with clear, non-blocking error messages. The previous logo is preserved when validation fails.

**Independent Test**: Try to upload a 2 MB PNG — form rejects with "File too large (max 1 MB)." Try a `.bmp` — rejected with "Unsupported file type. Allowed: PNG, JPG, WebP, SVG." Upload a 200 KB PNG — accepted and shown in the preview.

### Tests for User Story 6

- [ ] T048 [P] [US6] Frontend Karma spec in `frontend/src/app/features/event-config/event-config.component.spec.ts` (extend US1 spec): uploads a 1.5 MB PNG and asserts the form shows the size error; uploads a `.bmp` and asserts the type error; asserts that after a rejected upload the previously stored logo remains intact (the form's `previewUrl` is unchanged).
- [ ] T049 [P] [US6] Backend integration test in `backend/tests/integration/test_event_configuration_api.py` (extend US1 spec): upload a 1.5 MB PNG returns 400 with the size message; upload a `.bmp` returns 400 with the type message; upload a 200 KB PNG returns 200 and the new logo is reflected in subsequent GETs (SC-006).

### Implementation for User Story 6

(No new code beyond what's already in Phase 2 / Phase 3. This story's acceptance criteria are met by:
- `validate_logo_upload` (T010) on the backend.
- The `FileInputComponent` preview + `accept` attribute on the frontend (already configured in T026).
- The contract in `contracts/admin-event-configuration.md` §3.

This task is effectively a test-driven consolidation: T048 and T049 confirm the existing pieces work together. If a gap is found in T048 / T049, file a follow-up and stop per the constitution's §III "plan alignment" rule.)

**Checkpoint**: User Story 6 fully functional. Logo upload validation works end-to-end.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, documentation, validation, and quality gates.

- [ ] T050 [P] Run the `quickstart.md` recipe end-to-end on a local stack. Capture a manual smoke transcript in `specs/017-event-branding/quickstart-validation.md` (or as a comment in the PR) confirming each step of §1–§7 in the recipe passes. Document any deviations and resolve them with a follow-up task.
- [ ] T051 [P] Update `backend/README.md` and `frontend/README.md` (or the top-level `README.md`) with one paragraph each pointing to the new module: "Event configuration lives at `/admin/event` (see `specs/017-event-branding/`)." No deep docs, just a discoverability breadcrumb.
- [X] T052 [P] Run `pytest backend/tests -q` and `npm --prefix frontend run test`. Both must be green before declaring the feature complete.
- [X] T053 [P] Run `npm --prefix frontend run build`. Confirm no type errors or bundle regressions.
- [ ] T054 [P] Run a final constitution check: re-read `.specify/memory/constitution.md` §Core Principles and §Development Workflow; confirm the spec, plan, tasks, and implementation are aligned. Document the result in the PR description.
- [ ] T055 Accessibility review: visually inspect the overlay on the kiosk at desktop and mobile breakpoints; confirm the overlay does not block the "Enter fullscreen" button; confirm the screen-reader announcement via `aria-label`. If any visual issue is found, open a follow-up task (do not fix in this PR per §III "no speculative scope").
- [ ] T056 [P] Security review: confirm the multipart PUT enforces MIME validation server-side; confirm `removeLogo` does not bypass the ambiguous-intent guard; confirm the public `/api/event-branding` returns only the three declared fields (use a one-off curl and grep the JSON keys).
- [ ] T057 [P] Observability review: confirm a successful PUT produces exactly one `event_configuration_changed` event visible in the admin events listing; confirm a failed PUT does NOT produce the event.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Stories (Phase 3–Phase 8)**: All depend on Foundational phase completion.
  - User stories can then proceed in parallel (if staffed).
  - Or sequentially in priority order: P1 (US1 → US2 → US3 → US4) then P2 (US5 → US6).
- **Polish (Phase 9)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — No dependencies on other stories.
- **US2 (P1)**: Can start after Foundational — Frontend-only; depends on the public `/api/event-branding` endpoint, which is delivered as part of US1 / Foundational. Independent of US1's admin UI.
- **US3 (P1)**: Can start after Foundational — Frontend-only template change; no dependencies.
- **US4 (P1)**: Can start after Foundational — Backend consumer switch is in Phase 2 (T013–T015). The frontend simplification is a small follow-up.
- **US5 (P2)**: Can start after US1 — Needs `EventConfigurationApiService` (T024) and the data shape.
- **US6 (P2)**: Can start after US1 — Needs `validate_logo_upload` (T010) and `FileInputComponent` integration (T026). All pieces already in Phase 2 / 3; this story is the test-driven consolidation.

### Within Each User Story

- Tests MUST be written and fail before implementation where automated testing is feasible (per template §Within Each User Story).
- Models before services (Phase 2 enforces this).
- Services before endpoints (Phase 3 enforces this for US1).
- Core implementation before integration (display screen integration in US2 follows the service in US1).
- Story complete before moving to next priority.

### Parallel Opportunities

- All Setup tasks marked [P] (T002, T003, T004) can run in parallel.
- Within Foundational: T007 [P] export, T008 [P] schemas, T009 [P] mappers, T010 [P] validator, T014 [P] readiness switch, T016 [P] migration test, T017 [P] data-preservation test, T018 [P] service tests, T019 [P] fixture cleanup — can run in parallel after T006 and T005 are stable.
- Within US1 tests: T020, T021, T022 can be written in parallel.
- Within US1 implementation: T024 [P] API, T025 [P] facade, T027 [P] navigation can run in parallel after T026 is shaped.
- Within US2 tests: T029, T030, T031 can run in parallel.
- Within US2 implementation: T032 [P] API service before T033; T033 before T034; T035 [P] styles can run after T034's template is shaped.
- Across stories: US2 and US3 touch different parts of the same component template and CSS file, so they are best done sequentially (US2 first, US3 second) — or coordinated to avoid CSS merge conflicts.

---

## Parallel Example: User Story 1

```bash
# Launch US1 tests together (T020, T021, T022):
Task: "Contract test for PUT /api/event-configuration in backend/tests/integration/test_event_configuration_api.py"
Task: "Contract test for GET /api/event-configuration in backend/tests/integration/test_event_configuration_api.py"
Task: "Integration test for audit event emission in backend/tests/integration/test_event_configuration_api.py"

# Launch US1 models/services-adjacent work in parallel (T024, T025, T027 — after T026 shape is set):
Task: "Frontend API service in frontend/src/app/core/api/event-config.api.ts"
Task: "Frontend facade in frontend/src/app/features/event-config/event-config.facade.ts"
Task: "Register route + navigation entry + icon in frontend/src/app/app.routes.ts and admin-shell"
```

---

## Parallel Example: User Story 2

```bash
# Launch US2 tests in parallel (T029, T030, T031):
Task: "Karma spec for overlay DOM in frontend/src/app/display/display-screen.component.spec.ts"
Task: "Stale-while-error spec in frontend/src/app/display/display-screen.component.spec.ts"
Task: "Iframe-mode spec in frontend/src/app/display/display-screen.component.spec.ts"

# Launch US2 implementation in sequence (T032 → T033 → T034 → T035):
# T032 (API service) → T033 (service with cache) → T034 (display-screen integration) → T035 (CSS)
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phase 1: Setup (T001–T004).
2. Complete Phase 2: Foundational (T005–T019). This is the longest phase; the migration is the riskiest step.
3. Complete Phase 3: User Story 1 (T020–T028). The admin can configure branding.
4. **STOP and VALIDATE**: Run `pytest backend/tests -q`, `npm --prefix frontend run test`, run the quickstart §1–§2 manually. Confirm the admin form works end-to-end.
5. Deploy/demo if ready (US1 alone is a meaningful, demoable increment: the admin can configure branding and the values persist).

### Incremental Delivery

1. Setup + Foundational → Foundation ready.
2. Add US1 → Test independently → Demo (MVP).
3. Add US2 → Test independently → Demo (overlay visible).
4. Add US3 → Test independently → Demo (ads label visible).
5. Add US4 → Test independently → Demo (event duration moved; display-config form simplified).
6. Add US5 → Test independently → Demo (dashboard card).
7. Add US6 → Test (no visible behaviour change; this is a test-driven consolidation).
8. Polish: T050–T057.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001–T019).
2. Once Foundational is done:
   - Developer A: US1 (T020–T028).
   - Developer B: US2 (T029–T035).
   - Developer C: US3 (T036–T038).
3. US2 and US3 both modify `display-screen.component.ts` and its CSS — coordinate via small PRs (or sequential within the same file).
4. US4 (T039–T044) and US5 (T045–T047) follow once US1 is in.
5. US6 (T048–T049) follows last as a test-driven consolidation.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability (TQ-001 in spec).
- Each user story MUST be independently completable and testable.
- Verify tests fail before implementing where automated testing is feasible (Phase 2/3/4/6 follow this; US6 is the only story whose implementation is mostly already done by US1).
- Commit after each task or logical group. The plan's constitution §III says to STOP when implementation conflicts with the approved spec, plan, or requirements.
- Stop and explain before changing direction if implementation conflicts with the approved spec or plan.
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence.
