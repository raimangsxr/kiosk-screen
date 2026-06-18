# Tasks: Public Content API with Novelty Priority

**Input**: Design documents from `/specs/009-public-content-api/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Tests are mandatory for changed behavior. Backend behavior uses pytest unit, integration, migration, and contract tests. Frontend behavior uses Angular-compatible component, service, and facade tests. Manual validation is recorded in `validation/final-acceptance.md`.

**Organization**: Tasks are grouped by user story. Each user story phase is independently implementable and testable. The plan is incremental, not big-bang.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other marked tasks in the same phase because it touches different files or only tests a defined contract.
- **[Story]**: User story traceability label from `spec.md` (US1–US5).
- Every task references the relevant functional requirements and includes the exact target files.

---

## Phase 1: Setup (Shared Baseline)

**Purpose**: Add the configuration knob, the new error envelope subtypes, and the validation record template used by all user stories.

- [X] T001 [P] Add `public_api_cors_origins` setting (comma-separated list, default empty) loaded from the `PUBLIC_API_CORS_ORIGINS` env var for FR-017A in `backend/app/config.py`
- [X] T002 [P] Add typed `ApplicationError` subclasses for the public API error codes (`InvalidApiKeyError`, `InactiveApiKeyError`, `MediaTooLargeError`, `UnsupportedMediaTypeError`, `MissingFileError`, `EmptyFileError`, `MissingTitleError`, `TitleTooLongError`, `ApiKeyNotFoundError`, `ApiKeyRevokedError`) for FR-003–FR-009 in `backend/app/shared/errors/application_errors.py`
- [X] T003 [P] Add the validation record template with pass, exception approver, exception reason, risk, evidence, and follow-up fields in `specs/009-public-content-api/validation/final-acceptance.md`
- [X] T004 [P] Add `ApiKeyRecord` and `ApiKeyWithRawSecret` types to the shared admin contracts for FR-019, FR-021 in `frontend/src/app/shared/contracts/admin-contracts.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the `ApiKey` entity, its migration, its repository, its service, the FastAPI dependency for bearer-token authentication, and the display-event helpers. **No user story work should start until this phase is complete.**

### Foundational Tests

- [X] T005 [P] Add unit tests for `ApiKeyService` covering `generate_raw_key` (length 47, prefix `ksk_live_`, hash 64 hex), `verify` (valid, unknown prefix, hash mismatch, inactive), `create` (raw returned once, hash stored), `rotate` (in-place, same id, new hash, last_rotated_at), `revoke` (idempotent) for FR-019, FR-020, FR-015 in `backend/tests/unit/test_api_key_service.py`

### Foundational Implementation

- [X] T006 Create `ApiKey` SQLAlchemy model with `id`, `organization_id` (FK), `label` (String 120), `key_prefix` (String 16, unique), `key_hash` (String 64), `is_active` (Boolean default true), `last_used_at` (DateTime nullable), `last_rotated_at` (DateTime nullable), `revoked_at` (DateTime nullable), `created_by_user_id` (FK nullable), `created_at`, `updated_at` for FR-001–FR-022, FK-Cascade from `organizations` and `users` in `backend/app/repositories/models/api_key.py`
- [X] T007 [P] Create Alembic migration `0003_api_keys.py` creating the `api_keys` table and the `ix_api_keys_organization_id` index, with a reversible `downgrade` that drops both, depending on `0002_admin_media_uploads` in `backend/alembic/versions/0003_api_keys.py`
- [X] T008 [P] Create `ApiKeyRepository` with `add`, `get_by_id` (org-scoped), `get_by_prefix` (used by `verify`), `list_by_organization`, `count` methods in `backend/app/repositories/api_keys.py`
- [X] T009 Implement `ApiKeyService` with `generate_raw_key` (using `secrets.token_urlsafe(32)`), `hash_key` (sha256 hex), `verify` (lookup by prefix, `hmac.compare_digest`, returns the `organization_id` of the matched key so callers can use it without trusting any client input — this is what implements FR-016), `create` (returns row + raw), `rotate` (in-place, sets new hash/prefix/last_rotated_at), `revoke` (sets is_active=false, revoked_at), `list_by_organization` in `backend/app/services/api_key_service.py`
- [X] T010 [P] Add FastAPI dependency `get_api_key_principal` that parses the `Authorization: Bearer <key>` header (using `HTTPBearer(auto_error=False)`), calls `ApiKeyService.verify`, and raises the typed errors for FR-002, FR-003, FR-004 in `backend/app/auth/dependencies.py`
- [X] T011 [P] Add `create_api_key_event` helper in `backend/app/domain/display_events.py` that records `event_type=api_key_changed`, `entity_type=api_key`, `entity_id=<id>`, `event_metadata={"action": "create"|"rotate"|"revoke", "key_label": "<label>"}`, and `severity="info"` for create/rotate or `"warning"` for revoke, for FR-022A in `backend/app/domain/display_events.py`

**Checkpoint**: Foundation ready. User story implementation can begin.

---

## Phase 3: User Story 1 - Upload Content From An External System (Priority: P1) 🎯 MVP

**Goal**: An external system can authenticate with a bearer API key and POST a photo or video to the public endpoint, receiving 201 with the new content record; the file is written to disk; the content appears in the next display state fetch.

**Independent Test**: `curl -H "Authorization: Bearer <key>" -F file=@img.jpg -F title=X http://localhost:8000/api/public/content/upload` returns 201 with the new content record (including `displayOrder`), the file exists under `<MEDIA_STORAGE_PATH>/<org_id>/<media_id>-<uuid>.<ext>`, and a subsequent `GET /api/display/state` includes the new item.

### Tests for User Story 1

- [ ] T012 [P] [US1] Contract test that OpenAPI exposes `POST /api/public/content/upload` with the documented request/response schema and the documented error codes for FR-001, FR-003–FR-009 in `backend/tests/contract/test_public_content_openapi.py`
- [ ] T013 [P] [US1] Integration test for the happy path and every documented error path (400 `file_required` (FR-005)/`file_empty` (FR-005)/`title_required` (FR-006)/`title_too_long` (FR-007), 401 `missing_api_key` (FR-003)/`invalid_authorization_scheme` (FR-003)/`invalid_api_key` (FR-004), 403 `inactive_api_key` (FR-004), 413 `media_too_large` (FR-009), 415 `unsupported_media_type` (FR-008)) and verification that `lastUsedAt` is NOT updated on any 4xx but IS updated on 201, for FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-015 in `backend/tests/integration/test_public_content_upload.py`
- [ ] T014 [P] [US1] Multi-org isolation test: 10 concurrent uploads to org A and 10 concurrent to org B complete in parallel with each org's `displayOrder` forming a contiguous sequence (covers the cross-org independence of the advisory lock) for FR-013, SC-002 partial in `backend/tests/integration/test_public_content_multi_org.py`

### Implementation for User Story 1

- [ ] T015 [US1] Add `ContentService.append_via_public_api(organization_id, api_key_id, upload, title)` that acquires `pg_advisory_xact_lock(hashtext('content_append:' || organization_id))`, delegates file write to `MediaStorageService.save_upload`, computes `display_order = max(existing)+1` inside the locked transaction, creates the `TopContentItem` with `is_active=true`/`created_by_user_id=null`/`updated_by_user_id=null`, records a `content_changed` `DisplayEvent` with `event_metadata={"source": "public_api", "api_key_id": <id>}`, and updates `last_used_at` on the `ApiKey` only after commit. The returned `TopContentItem` MUST include the assigned `displayOrder` so the route can satisfy the 201 response shape (FR-012), for FR-010, FR-011, FR-012, FR-013, FR-014 in `backend/app/services/content_service.py`
- [ ] T016 [US1] Add `POST /api/public/content/upload` route in `backend/app/api/v1/public_content/routes.py` that uses the `get_api_key_principal` dependency (which returns the organization derived solely from the API key, per FR-016), validates `file` and `title` (calling the typed errors), calls `ContentService.append_via_public_api`, and returns the existing `ContentItemSchema` (201) including the assigned `displayOrder` field (FR-012). No `organizationId` parameter is accepted from the client (FR-016), for FR-001, FR-012, FR-016 — depends on T015
- [ ] T017 [P] [US1] Add CORS middleware scoped to the public router only: read `Settings.public_api_cors_origins` (empty default), add `Access-Control-Allow-Origin`/`Methods`/`Headers` on `OPTIONS` and on the response when non-empty, never enable credentials, for FR-017A in `backend/app/main.py`
- [ ] T018 [US1] Register the new public router in `backend/app/api/v1/router.py` — depends on T016

**Checkpoint**: A valid API key can upload a file via the public endpoint and the file appears in the next display state fetch. CORS works only when the deployer configures it. The kiosk is not yet reactive — that is US3.

---

## Phase 4: User Story 2 - Administrator Manages API Keys From The Admin Site (Priority: P1)

**Goal**: An administrator can list, create, rotate, and revoke API keys from the new `/admin/api-keys` admin section. The raw key value is shown exactly once at creation/rotation. Revoked keys are rejected by the public endpoint. Every admin action is audited as a `DisplayEvent`.

**Independent Test**: Login as admin → open `/admin/api-keys` → click "Create key", enter label, click "Create", see raw key in reveal panel with copy button and warning → click "Done" → reload the page → the row shows label, prefix, created, status — but not the raw value → click "Rotate" → confirm → see new raw key → previous raw value now returns 401 on the public endpoint → click "Revoke" → confirm → public endpoint returns 403 for that key.

### Tests for User Story 2

- [ ] T019 [P] [US2] Backend integration tests for the four admin endpoints (`GET` list, `POST` create returning raw once, `POST` rotate returning new raw once and invalidating the old, `DELETE` revoke idempotent 204) and the role gate (non-admin → 403, missing session → 401, missing key id → 404, rotate on revoked → 409) for FR-018–FR-022, FR-022A in `backend/tests/integration/test_admin_api_keys.py`
- [ ] T020 [P] [US2] Frontend unit tests for `ApiKeysFacade`: `refresh()` populates signals; `create(label)` returns `{record, rawKey}` and refreshes; `rotate(id)` returns `{record, rawKey}` and refreshes; `revoke(id)` refreshes; errors map to `ApplicationErrorContract` for FR-018, FR-021 in `frontend/src/app/features/api-keys/api-keys.facade.spec.ts`
- [ ] T021 [P] [US2] Frontend component test for the list view: renders rows, handles empty/loading/error states, opens create dialog on button click, shows confirmation dialogs on rotate/revoke, for FR-021 in `frontend/src/app/features/api-keys/api-keys-list.component.spec.ts`
- [ ] T022 [P] [US2] Frontend component test for the create/rotate dialog: shows raw key reveal panel after success with copy + done, blocks Escape and click-outside while the raw key is on screen, surfaces typed errors as safe messages for FR-019 in `frontend/src/app/features/api-keys/api-keys-create-dialog.component.spec.ts`

### Implementation for User Story 2

- [ ] T023 [US2] Add admin `api_keys` routes (`GET /api/admin/api-keys`, `POST /api/admin/api-keys`, `POST /api/admin/api-keys/{id}/rotate`, `DELETE /api/admin/api-keys/{id}`) gated by `require_roles(ADMIN_ROLES)`, calling `create_api_key_event` (T011) on create (info), rotate (info), and revoke (warning) so every admin action is audited as a `DisplayEvent`, for FR-018, FR-019, FR-020, FR-022A in `backend/app/api/v1/api_keys/routes.py` — depends on T009, T011
- [ ] T024 [P] [US2] Register the new admin router in `backend/app/api/v1/router.py` — depends on T023
- [ ] T025 [P] [US2] Add `ApiKeysApiService` with `list`, `create`, `rotate`, `revoke` methods returning typed observables in `frontend/src/app/core/api/api-keys.api.ts`
- [ ] T026 [US2] Add `api-keys.facade.ts` with `keys`, `loading`, `saving`, `error`, `empty`, `ready` signals and `refresh`, `create`, `rotate`, `revoke`, `clearError` methods, following the `UsersFacade` pattern in `frontend/src/app/features/api-keys/api-keys.facade.ts` — depends on T025
- [ ] T027 [US2] Add `api-keys-list.component.ts` with the table, the empty/loading/error states (`AdminStateComponent`), the create/rotate/revoke action buttons, the `MatDialog` triggers, and the toast notifications in `frontend/src/app/features/api-keys/api-keys-list.component.ts` — depends on T026
- [ ] T028 [US2] Add `api-keys-create-dialog.component.ts` with label field, raw-key reveal panel (copy + done), focus trap, `aria-live` warning, and disabled-Escape/click-outside while raw key is on screen in `frontend/src/app/features/api-keys/api-keys-create-dialog.component.ts` — depends on T026
- [ ] T029 [US2] Register route `/admin/api-keys` in `frontend/src/app/core/routing/app.routes.ts` and add the section to the admin side navigation in `frontend/src/app/admin/admin-navigation.service.ts` — depends on T027
- [ ] T030 [P] [US2] Add `api-keys.models.ts` with `ApiKeyRecord`, `ApiKeyWithRawSecret`, and `CreateApiKeyRequest` types in `frontend/src/app/features/api-keys/api-keys.models.ts`

**Checkpoint**: Admin can manage API keys end to end. Public endpoint (US1) honors the active/inactive state of the keys managed here.

---

## Phase 5: User Story 3 - New Content Is Prioritized Over Pending Base Rotation (Priority: P1)

**Goal**: While the kiosk is open and showing a base item, a new upload is enqueued and shown at the next transition (and the rest of the queue, in arrival order, before the kiosk returns to the base rotation). After the queue is drained, the new items continue to cycle in the regular rotation. The pre-transition poll 1 s before each transition catches last-moment uploads. The currently displayed item is never interrupted mid-display. Two open kiosks viewing the same organization each maintain an independent novelty queue and both pick up the new item.

**Independent Test**: Open kiosk mode with items A, B, C, D. While the kiosk is showing C, post E, F, G via the public endpoint. The next transition shows E, then F, then G, then D, then continues cycling. The transition latency from upload 201 to E first rendered is ≤ 6 s at p95. Open a second kiosk session in a separate test client; both see E, F, G, D in arrival order on their own novelty queues with no cross-contamination.

### Tests for User Story 3

- [ ] T031 [P] [US3] Update `display-rotation.service.spec.ts` to cover the novelty queue: enqueue on new ids, dequeue on `pickNext`, drain before returning to base, handle removal of queued items, handle removal of current item, reset state on `reset()` for FR-024, FR-025, FR-031, FR-032 in `frontend/src/app/display/display-rotation.service.spec.ts`
- [ ] T032 [P] [US3] Update `display-screen.component.spec.ts` to cover: novelty queue is reset on `ngOnInit` (kiosk open), poll result updates the queue when new ids appear, current item is not interrupted on poll, base pointer is remapped by id after reorder, transitions fire at `effectiveDurationSeconds` from the item in `display-screen.component.spec.ts` for FR-023, FR-024, FR-027, FR-028, FR-030
- [ ] T033 [P] [US3] Update `display-api.service.spec.ts` to cover `watchState()`: emits at the configured interval, `distinctUntilChanged` filters identical states by id+order only (not by `lastUsedAt` or `updatedAt`), `shareReplay` replays the last value to new subscribers for FR-023, FR-028 in `frontend/src/app/display/display-api.service.spec.ts`
- [ ] T037 [P] [US3] Multi-kiosk integration test: simulate two concurrent polling clients on the same organization, post a new item, assert each client's `GET /api/display/state` returns the new item independently, and assert the server's response payload is byte-identical for both clients (no per-client state coupling), for SC-008, FR-024 in `backend/tests/integration/test_multi_kiosk_independence.py`

### Implementation for User Story 3

- [ ] T034 [P] [US3] Add `watchState(pollIntervalMs = 5000)` to `DisplayApiService`: `timer(0, pollIntervalMs).pipe(switchMap(() => getState()), distinctUntilChanged(equalByIdAndOrder), shareReplay({ bufferSize: 1, refCount: true }))` where `equalByIdAndOrder` compares only the `(id, displayOrder)` of items in `topContent` and `ads` for FR-023, FR-028 in `frontend/src/app/display/display-api.service.ts`
- [ ] T035 [US3] Update `DisplayRotationService` to own the novelty queue state (`currentItemId`, `baseIndex`, `noveltyQueue`, `seenIds`), with `pickNext()`, `applyPollState()`, `reset()` methods, mirroring the contract in `contracts/kiosk-live-update-contract.md` for FR-024, FR-025, FR-031, FR-032 in `frontend/src/app/display/display-rotation.service.ts` — depends on T031
- [ ] T036 [US3] Rewrite `DisplayScreenComponent` to subscribe to `watchState()`, call `applyPollState()` on each emission, and `scheduleTransition(durationOf(currentItem))` on every state change. The scheduler also arms a `preTransitionPollTimer` at `duration - 1000ms` that fires a one-shot `getState()` and processes through `applyPollState()`. All timers and the poll subscription are cleared in `ngOnDestroy` and reset on `ngOnInit` for FR-023, FR-024, FR-026, FR-027, FR-030, FR-033 in `frontend/src/app/display/display-screen.component.ts` — depends on T034, T035

**Checkpoint**: Live update works end to end. New uploads appear on the running kiosk at the next transition, with the full novelty priority behavior and ≤ 6 s p95 latency. Two open kiosks on the same org each maintain their own queue.

---

## Phase 6: User Story 4 - Ordering Is Preserved Under Concurrent Uploads (Priority: P2)

**Goal**: 20 concurrent uploads to the same organization produce `displayOrder` values `max+1..max+20` with no gaps, no duplicates, and no server errors. 100 concurrent uploads to the same organization complete with no `displayOrder` collisions. 200 sequential uploads to the same organization all appear on the running kiosk in arrival order. Concurrent uploads to two different organizations do not block each other.

**Independent Test**: From a shell, fire 20 concurrent `curl` uploads with `&` and `wait`. After all complete, `SELECT display_order FROM top_content_items WHERE organization_id=... ORDER BY display_order DESC LIMIT 20` returns a contiguous descending sequence with no duplicates. Then fire 200 sequential uploads in a loop; the resulting `displayOrder` values must be `max+1..max+200` and the kiosk must show all 200 in order on the next open session.

### Tests for User Story 4

- [ ] T038 [P] [US4] Same-org concurrency test: 20 and 100 parallel uploads to one organization produce contiguous `displayOrder` sequences with no gaps, no duplicates, and no server errors; the upload wall-clock time is logged for SC-002/SC-003; the advisory lock acquisition is verified by inspecting `pg_locks` during the run for FR-013, SC-002, SC-003 in `backend/tests/integration/test_public_content_concurrency.py`
- [ ] T039 [P] [US4] Sequential 200-uploads test: 200 uploads fired serially against the same organization (no parallelism) complete in order, all 200 `TopContentItem` rows are committed, the `displayOrder` values form `max+1..max+200` with no gaps, and every item is present in the next `GET /api/display/state` response (asserts the file write + row commit + state fetch are all consistent for the burst that exceeds the SC-002/SC-003 thresholds) for SC-004 in `backend/tests/integration/test_public_content_burst.py`

**Checkpoint**: Burst ordering is guaranteed under load (concurrent and sequential). The advisory lock is exercised in production-like conditions. The kiosk can absorb a 200-item burst without dropping or reordering any item.

---

## Phase 7: User Story 5 - Operator Can Observe That A New Upload Has Reached The Kiosk (Priority: P3)

**Goal**: After a successful public upload, the operator can confirm the upload by checking the admin event log and the API key's `lastUsedAt`. The kiosk itself remains visually identical; there is no overlay, toast, or badge.

**Independent Test**: Upload a file via curl. The `display_events` table contains a row with `event_type='content_changed'` and `event_metadata->>'source'='public_api'`. The `api_keys.last_used_at` is updated. The kiosk UI does not show any visual cue between the upload and the next transition.

### Tests for User Story 5

- [ ] T040 [P] [US5] Audit event test: after a successful public upload, exactly one `content_changed` `DisplayEvent` exists with `event_metadata->>'source'='public_api'` and `event_metadata->>'api_key_id'=<key_id>`; no event is created on 4xx/5xx; `lastUsedAt` is updated only on 201; the kiosk screen does not show any overlay, toast, or badge (asserted by the display component spec T032) for FR-014, FR-015, FR-022A, US5 acceptance scenarios 1 and 3 in `backend/tests/integration/test_public_content_audit.py`
- [ ] T041 [P] [US5] Admin api-key audit test: each `create`, `rotate`, `revoke` call produces exactly one `api_key_changed` `DisplayEvent` with the correct `event_metadata.action`, `entity_id`, `created_by_user_id`, and severity (`info` for create/rotate, `warning` for revoke) for FR-022A in `backend/tests/integration/test_admin_api_keys_audit.py`

**Checkpoint**: Operator observability is complete via admin event log and `lastUsedAt`. The kiosk stays silent. Both sources of truth are validated.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening, documentation, non-regression checks, and validation that affect the feature as a whole.

- [ ] T042 [P] Update `backend/tests/integration/test_migrations.py` to add a round-trip test for `0003_api_keys.py`: `upgrade head` on a fresh DB, `downgrade -1`, then `upgrade head` again on the seeded DB; assert the new table is empty and the existing tables are unaffected, for FR-036, data-model migration in `backend/tests/integration/test_migrations.py`
- [ ] T043 [P] Update `backend/tests/contract/test_openapi.py` to assert the OpenAPI document includes all five new endpoints (`POST /api/public/content/upload`, `GET/POST/DELETE /api/admin/api-keys`, `POST /api/admin/api-keys/{id}/rotate`) with the documented request/response schemas and the documented error codes, for FR-001, FR-018, TQ-003 in `backend/tests/contract/test_openapi.py`
- [ ] T044 [P] Add a section to `README.md` documenting the public content API: how to create a key from the admin, how to upload via curl, the `Authorization: Bearer <key>` header, the `PUBLIC_API_CORS_ORIGINS` env var, the rate and size limits, and a link to `specs/009-public-content-api/quickstart.md`, for AGENTS.md delivery rules in `README.md`
- [ ] T045 [P] Run the `quickstart.md` flow end to end against the local lab stack: docker compose up postgres, alembic upgrade head, uvicorn + npm start, login as admin, create a key, upload a file via curl, see the file on the running kiosk, rotate the key, revoke the key; record pass/fail in `specs/009-public-content-api/validation/final-acceptance.md` for SC-001–SC-010
- [ ] T046 [P] Final code review pass: ensure no internal paths, secrets, or stack traces appear in any error response payload; ensure `RequestIdMiddleware` adds `X-Request-Id` to public endpoint responses; ensure the `Authorization` header value is never logged at any level; ensure `lastUsedAt` semantics are correct across all paths (server-side update on 201 only, per FR-015); ensure no client-side code references the obsolete `FR-029` pattern, for FR-017, observability
- [ ] T047 [P] Update `AGENTS.md` SPECKIT pointer back to the next active feature (or leave pointing at 009 if it remains the active context) in `AGENTS.md`
- [ ] T048 [P] Non-regression run: execute the full pre-existing test suite (`pytest backend/tests` and `npm --prefix frontend run test`) on the branch and record the result in `specs/009-public-content-api/validation/final-acceptance.md`. The run MUST pass without modifications to any file under `specs/005-admin-refactor/`. Specifically assert: the existing admin `POST /api/content/upload` still works (FR-034), the existing `GET /api/display/state` still returns the same shape (FR-035), and the existing `TopContentItem` / `MediaFileReference` / `DisplayEvent` schemas are byte-identical to before (FR-036), for FR-034, FR-035, FR-036

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion. BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion.
- **User Story 2 (Phase 4)**: Depends on Phase 2 completion. May integrate with US1 but is independently testable.
- **User Story 3 (Phase 5)**: Depends on Phase 2 completion. Uses US1's server endpoints but is independently testable (frontend-only).
- **User Story 4 (Phase 6)**: Depends on Phase 3 (US1) completion. Adds same-org concurrency verification on top of the advisory lock.
- **User Story 5 (Phase 7)**: Depends on Phase 3 (US1) and Phase 4 (US2) completion. Verifies the audit + lastUsedAt semantics on top of the existing implementation.
- **Polish (Phase 8)**: Depends on all desired user stories being complete.

### Within Each User Story

- Tests are written FIRST and must fail before implementation where automated testing is feasible (per the AGENTS.md testing rule).
- Models before services, services before routes, routes before registration.
- Core implementation before integration tests.

### Parallel Opportunities

- Phase 1: T001, T002, T003, T004 are independent and can run in parallel.
- Phase 2: T005 (test) and T006 (model) and T008 (repo) and T011 (event helper) are independent. T007 depends on T006. T009 depends on T006, T008. T010 depends on T009.
- Phase 3: T012, T013, T014 (tests) can run in parallel. T017 (CORS) is independent of T015/T016 and can run in parallel.
- Phase 4: T019, T020, T021, T022 (tests) can run in parallel. T024 (router registration) depends on T023. T029 (route) depends on T027. T025, T030 (api/models) are independent.
- Phase 5: T031, T032, T033, T037 (tests) can run in parallel. T034 (api service) is independent of T035 (rotation service). T036 depends on both.
- Phase 6: T038, T039 (tests) are independent.
- Phase 7: T040, T041 (tests) are independent.
- Phase 8: T042, T043, T044, T046, T047, T048 are independent. T045 depends on T042–T044 being merged.

---

## Parallel Examples

### Setup (run in parallel)

```text
T001 Add public_api_cors_origins setting
T002 Add ApplicationError subclasses
T003 Add validation record template
T004 Add ApiKeyRecord type to admin-contracts
```

### Foundational (run in parallel where marked)

```text
T005 [P] ApiKeyService unit tests
T006 Create ApiKey model
T008 [P] Create ApiKeyRepository
T011 [P] Add create_api_key_event helper
```

### User Story 1 (test first, then implementation)

```text
# Tests in parallel:
T012 [P] [US1] Contract test for OpenAPI
T013 [P] [US1] Integration test for happy + every error path
T014 [P] [US1] Multi-org isolation test

# Implementation sequentially:
T015 [US1] Add ContentService.append_via_public_api with advisory lock
T016 [US1] Add public_content routes
T018 [US1] Register public router

# In parallel with T015–T018:
T017 [P] [US1] Add CORS middleware scoped to public router
```

### User Story 2 (frontend can start in parallel with backend)

```text
# Backend (sequential):
T019 [P] [US2] Backend integration tests
T023 [US2] Add admin api_keys routes
T024 [P] [US2] Register admin router

# Frontend (parallel):
T020 [P] [US2] Frontend facade unit tests
T021 [P] [US2] List component tests
T022 [P] [US2] Create dialog tests
T025 [P] [US2] Add ApiKeysApiService
T030 [P] [US2] Add api-keys.models

# Frontend (sequential, depends on T025):
T026 [US2] Add ApiKeysFacade
T027 [US2] Add list component
T028 [US2] Add create dialog
T029 [US2] Register route
```

### User Story 3 (frontend-only, no backend changes)

```text
# Tests in parallel:
T031 [P] [US3] Update rotation service spec
T032 [P] [US3] Update display screen spec
T033 [P] [US3] Update display api spec
T037 [P] [US3] Multi-kiosk independence integration test

# Implementation:
T034 [P] [US3] Add watchState to display-api.service
T035 [US3] Update display-rotation.service with novelty queue
T036 [US3] Rewrite display-screen.component
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T011)
3. Complete Phase 3: User Story 1 (T012–T018)
4. **STOP and VALIDATE**: An external system can upload a file with a bearer key and see it in the display state. CORS works only when configured.
5. This MVP is useful on its own: admins can still create keys manually (via SQL or via a future admin UI), and partners can already integrate.

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add US1 (MVP) → external systems can upload via curl
3. Add US2 → admins can manage keys from the admin UI without SQL
4. Add US3 → the running kiosk reacts to uploads in real time
5. Add US4 → burst ordering is verified under load
6. Add US5 → observability and audit complete
7. Polish → migration tests, OpenAPI tests, README, final smoke, non-regression

Each user story adds value without breaking previous stories. US3 is the user-visible "wow" moment; US1+US3 alone deliver the headline feature. US2, US4, US5 are quality and operational hardening.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001–T011).
2. Once Foundational is done:
   - Developer A: User Story 1 (T012–T018) — public endpoint, advisory lock, CORS.
   - Developer B: User Story 2 (T019–T030) — admin UI, admin routes.
   - Developer C: User Story 3 (T031–T036, T037) — kiosk live update, multi-kiosk test.
3. US4 (T038, T039) and US5 (T040, T041) are test-heavy and slot in after US1+US2+US3 land.
4. Polish (T042–T048) is done by whoever has bandwidth at the end.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks.
- [Story] label maps each task to a user story from `spec.md` (US1–US5).
- Each user story is independently completable and testable.
- Tests must fail before implementation; the test must encode the FR.
- Commit after each task or logical group; the existing `AGENTS.md` delivery rule asks for changed-files and tests-executed reports per commit.
- Stop at any checkpoint to validate the story independently before moving on.
- Stop and explain if implementation conflicts with the approved spec or plan.
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence.
- The existing `005-admin-refactor` is a separate, in-flight release. This feature does not modify any file under `specs/005-admin-refactor/` and does not touch files owned by that release.
- FR-029 was identified as a stale/contradictory requirement during `/speckit-analyze` (it duplicated and contradicted the server-side `lastUsedAt` semantics of FR-015) and has been removed from the spec. Do not reintroduce client-side `lastUsedAt` logic.
