---
description: "Task list for Drop the Client Concept"
---

# Tasks: Drop the Client Concept

**Input**: Design documents from `/specs/014-drop-client/`
**Prerequisites**: spec.md (required for user stories)

**Organization**: Tasks are grouped by user story to enable
independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Backend: `backend/app/`, `backend/alembic/versions/`, `backend/tests/`
- Frontend: `frontend/src/app/`

---

## Phase 1: Setup (Shared Infrastructure)

The project is already initialized. The change reuses the existing
advisory-lock helper, the existing OpenAPI contract, and the
existing audit log. No new infrastructure is required.

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T001 Verify the current state of
      `backend/app/repositories/models/ad.py:9-30`,
      `backend/app/api/ads.py:18-115`,
      `backend/app/services/ads_service.py:1-200`,
      `backend/app/services/display_service.py:31-60`,
      `backend/app/services/bootstrap_service.py:1-110`,
      `frontend/src/app/features/ads/ad-form.component.ts:1-410`,
      `frontend/src/app/features/ads/ad-list.component.ts:1-380`,
      `frontend/src/app/features/admin-shell/admin-navigation.service.ts:7-28`,
      and `frontend/src/app/app.routes.ts:1-62` to confirm the
      line numbers in the plan are accurate. If any line
      numbers have drifted, update the plan before proceeding.

**Checkpoint**: Foundation ready — user story implementation can
begin.

---

## Phase 3: User Story 1 - No Clients Section in the Admin Site (Priority: P1) 🎯 MVP

**Goal**: The `Client` model, the `clients` table, and the
`/api/clients` REST endpoint are removed. The "Clients" sidenav
entry and the `/admin/clients` route are removed. A direct
navigation to `/admin/clients` resolves to a 404.

**Independent Test**: Sign in as an administrator, open the admin
shell, and confirm the sidenav has no "Clients" entry. The
"Add client" quick action is gone. A direct navigation to
`/admin/clients` returns a not-found / 404 page. A
`GET /api/clients` returns 404.

### Tests for User Story 1 ⚠️

- [X] T002 [P] [US1] Backend integration test: `GET /api/clients`,
      `POST /api/clients`, `PUT /api/clients/{id}`,
      `DELETE /api/clients/{id}` all return 404 (the routes are
      removed), in `backend/tests/integration/test_ads_api.py`.

### Implementation for User Story 1

- [X] T003 [US1] Delete `backend/app/repositories/models/client.py`
      and remove `Client` from
      `backend/app/repositories/models/__init__.py` (already
      done).
- [X] T004 [US1] Delete `backend/app/repositories/clients.py`
      (the `ClientRepository` is no longer used), in
      `backend/app/repositories/clients.py` (already done).
- [X] T005 [US1] Delete `backend/app/api/clients.py` and
      `backend/app/api/v1/clients/` (no more routes), in
      `backend/app/api/clients.py` and
      `backend/app/api/v1/clients/` (already done).
- [X] T006 [US1] Remove the `clients_router` import and
      `include_router(clients_router)` from
      `backend/app/api/v1/router.py` (already done).
- [X] T007 [P] [US1] Update `backend/app/api/mappers.py` to
      remove `to_client_schema` and the `Client` import (already
      done).
- [X] T008 [P] [US1] Update `backend/app/api/schemas.py` to
      remove `ClientSchema` and `ClientRequest` (already done).
- [X] T009 [P] [US1] Update
      `frontend/src/app/features/admin-shell/admin-navigation.service.ts`
      to drop the "Clients" sidenav entry and the
      "Add client" quick action (already done).
- [X] T010 [P] [US1] Update
      `frontend/src/app/features/admin-shell/admin-shell.component.ts`
      to drop the `'/admin/clients'` case in `iconFor(route)`
      (already done).
- [X] T011 [P] [US1] Update
      `frontend/src/app/app.routes.ts` to drop the
      `/admin/clients`, `/admin/clients/new`, and
      `/admin/clients/:id/edit` routes and the
      `/clients` and `/clients/new` redirects (already done).
- [X] T012 [US1] Delete the
      `frontend/src/app/features/clients/` directory (already
      done).

**Checkpoint**: The "Clients" sidenav entry, the
`/admin/clients` route, the `/api/clients/*` endpoints, the
`Client` model, and the `clients` table are all gone. A direct
navigation to `/admin/clients` resolves to a 404.

---

## Phase 4: User Story 2 - Ad Form Uses a Free-Form Advertiser Field (Priority: P1)

**Goal**: The ad form replaces the client picker with a free-form
"Advertiser" text input (optional, max 120 chars). The
`AdItemRequest` schema gains an `advertiser` field and loses
`clientId`. The `ClientAdItem` SQLAlchemy model gains an
`advertiser` column and loses the `client_id` FK.

**Independent Test**: Sign in as an administrator, open the ad
creation form, confirm there is no client picker, enter an
advertiser name, save, and confirm the ad is persisted.
Reopen the form for the same ad and confirm the advertiser
value is pre-populated.

### Tests for User Story 2 ⚠️

- [X] T013 [P] [US2] Backend service test: `AdsService.create_ad`
      and `AdsService.update_ad` set the `advertiser` field on
      the row, in `backend/tests/unit/test_ads_service.py`.
- [X] T014 [P] [US2] Backend integration test: the ad form
      payload does not require `clientId` and the response
      includes `advertiser`, in
      `backend/tests/integration/test_ads_api.py`.

### Implementation for User Story 2

- [X] T015 [US2] Update the `ClientAdItem` model in
      `backend/app/repositories/models/ad.py` to add the
      `advertiser: Mapped[str | None] = mapped_column(String(120), nullable=True)`
      column and drop the `client_id` FK (already done).
- [X] T016 [US2] Update `AdItemRequest` and `AdItemSchema` in
      `backend/app/api/schemas.py` to drop `clientId` and add
      `advertiser` (already done).
- [X] T017 [US2] Update `AdsService.create_ad`,
      `AdsService.create_uploaded_ad`, and
      `AdsService.update_ad` in
      `backend/app/services/ads_service.py` to read and write
      `advertiser` and to remove the `client_id` validation
      (already done).
- [X] T018 [US2] Update the `POST /api/ads/upload` route in
      `backend/app/api/ads.py` to accept `advertiser` in the
      form data and to drop `client_id` (already done).
- [X] T019 [P] [US2] Update the upload form data in the
      frontend `AdsApiService.uploadAd` to send `advertiser`
      and to drop `clientId` (already done in
      `frontend/src/app/core/api/ads.api.ts`).
- [X] T020 [US2] Update the frontend
      `AdFormComponent` template in
      `frontend/src/app/features/ads/ad-form.component.ts` to
      replace the client picker with a free-form
      "Advertiser" `<input>` (maxlength 120, optional). Drop
      the `loadClients()` call. Update the form value interface
      and the `populate` helper to read `advertiser` (already
      done).

**Checkpoint**: The ad form no longer renders a client picker.
A new ad is saved with the free-form advertiser value. The
`ClientAdItem` model has an `advertiser` column and no
`client_id` column.

---

## Phase 5: User Story 3 - List and Bootstrap Reflect the New Shape (Priority: P2)

**Goal**: The ad list has a new "Advertiser" column. The
bootstrap data seeds at least one ad with
`advertiser = "Sample Client"`. The `AdItemSchema` includes
`advertiser` and no longer includes the embedded `clientId`
(deprecated on the wire if kept, removed otherwise).

**Independent Test**: Sign in as an administrator, open the
ads list, and confirm the table has an "Advertiser" column.
Run a fresh database bootstrap and confirm the seeded ad has
`advertiser = "Sample Client"`.

### Tests for User Story 3 ⚠️

- [X] T021 [P] [US3] Frontend test: the ad list renders the
      "Advertiser" column and the seeded ad shows
      `advertiser = "Sponsor"` (in the new shape, the bootstrap
      sample name is rendered as the advertiser), in
      `frontend/src/app/features/ads/ad-form.component.spec.ts`
      and the existing ad-list coverage in
      `backend/tests/integration/test_ads_api.py`.
- [X] T022 [P] [US3] Backend service test: the bootstrap data
      seeds an ad with `advertiser = "Sample Client"`, in
      `backend/tests/unit/test_bootstrap_service.py`.

### Implementation for User Story 3

- [X] T023 [US3] Update the bootstrap service in
      `backend/app/services/bootstrap_service.py` to remove
      the `Client` and the `client_id` on the ad and to set
      `advertiser = "Sample Client"` on the seeded ad (already
      done).
- [X] T024 [US3] Update the OpenAPI contract at
      `specs/002-kiosk-screen/contracts/openapi.yaml` to drop
      the `/clients` paths, the `Client` / `ClientRequest`
      schemas, and the `clientId` / `label` fields on
      `AdItem` / `AdItemRequest`. Add the `advertiser` field
      to both (already done).
- [X] T025 [US3] Update the frontend ad list in
      `frontend/src/app/features/ads/ad-list.component.ts` to
      add an "Advertiser" column showing the value or a dash
      (already done).
- [X] T026 [P] [US3] Update the dashboard service in
      `frontend/src/app/features/dashboard/dashboard.service.ts`
      to drop the `listClients()` call and the
      "Clients" section summary (already done).
- [X] T027 [P] [US3] Update the dashboard component
      `iconFor` in
      `frontend/src/app/features/dashboard/dashboard.component.ts`
      to drop the `'/admin/clients'` case (already done).
- [X] T028 [P] [US3] Update the readiness component
      `resolveRoute` in
      `frontend/src/app/features/readiness/readiness.component.ts`
      to drop the `'/admin/clients'` case (already done).

**Checkpoint**: The bootstrap seeds an ad with
`advertiser = "Sample Client"`. The ad list shows the
"Advertiser" column. The OpenAPI contract no longer has
`/clients` paths or `clientId` / `label` fields on the ad
schema.

---

## Phase 6: Database Migration

**Purpose**: A single migration drops the `clients` table, drops
the `client_id` FK on `client_ad_items`, and adds the
`advertiser` column on `client_ad_items` in a single
transaction.

- [X] T029 [US1+2+3] Add the
      `0007_drop_client_concept` Alembic migration in
      `backend/alembic/versions/0007_drop_client_concept.py`
      that runs the four steps in this exact order: (a) add
      the `advertiser` column, (b) backfill `advertiser` from
      the joined `clients.name`, (c) drop the
      `client_ad_items.client_id` column and the
      `client_ad_items_client_id_fkey` FK, (d) drop the
      `clients` table. The downgrade recreates the table
      from the `advertiser` values for test environments
      (already done).

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T030 [P] Run `pytest backend/tests` and confirm 100% of
      backend tests pass.
- [X] T031 [P] Run `npm --prefix frontend run test` and
      confirm 100% of frontend tests pass.
- [X] T032 [P] Run `npm --prefix frontend run build` and
      confirm the production build succeeds.
- [X] T033 Run a quick smoke check: `alembic -c
      backend/alembic.ini upgrade head` on a fresh database,
      followed by `ensure_mvp_bootstrap_data(...)`, produces
      a row with `advertiser = "Sample Client"`. The
      `display_service.get_display_state` returns the seeded
      ad. A `GET /api/clients` returns 404.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No-op.
- **Foundational (Phase 2)**: T001 is a verification task; the
  implementation work itself does not block on T001.
- **User Stories (Phase 3–5)**: US1 and US2 are independent
  (US1 removes the Client concept; US2 replaces the picker).
  US3 depends on US1 (the model must be in the new shape)
  and US2 (the advertiser column must exist).
- **Phase 6**: The migration is best done last (it depends on
  the model changes in Phase 4 and 5).
- **Polish (Phase 7)**: Depends on all phases.

### User Story Dependencies

- **US1 (P1)**: No dependencies.
- **US2 (P1)**: Independent of US1 (the advertiser column
  must exist on the model, but US1 does not change the
  model).
- **US3 (P2)**: Depends on US1 (Client removed) and US2
  (advertiser added).

### Within Each User Story

- US1 is a deletion-heavy story: model → repository → routes
  → router → mapper → schema → frontend nav → frontend shell
  → frontend routes → frontend folder. Each step depends on
  the previous.
- US2 is a model + schema + service + form story. Tests
  first, then the implementation, then the frontend.
- US3 is a small list / bootstrap / contract story.

### Parallel Opportunities

- T002, T013, T014, T021, T022 (tests) can run in parallel.
- T003 / T004 / T005 / T006 (backend deletion) can run in
  parallel.
- T007 / T008 (backend mappers / schemas) can run in
  parallel.
- T009 / T010 / T011 / T012 (frontend deletion) can run in
  parallel.
- T019 / T020 (frontend ad form) can run in parallel.
- T026 / T027 / T028 (frontend dashboard / readiness
  cleanup) can run in parallel.
- T030 / T031 (test commands) can run in parallel as
  separate shell invocations.

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

1. Complete Phase 1 + Phase 2 (no-op + T001 verification).
2. Complete Phase 3 (US1: drop the Client concept).
3. Complete Phase 4 (US2: free-form advertiser).
4. **STOP and VALIDATE**: Test US1 + US2 independently. The
   Client entity is gone, the ad form has a free-form
   advertiser, the model has the new column, the schema has
   the new field. The test suite passes.
5. Deploy/demo if ready (US1 + US2 are the user-visible
   change).

### Incremental Delivery

1. Phase 1 + Phase 2 → no-op.
2. US1 (drop Client) → test → deploy.
3. US2 (free-form advertiser) → test → deploy.
4. US3 (list + bootstrap) → test → deploy.
5. Phase 6 migration → test → deploy.
6. Phase 7 polish.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps each task to a specific user story from
  `spec.md`.
- Each user story MUST be independently completable and
  testable.
- The `clients` table is hard-dropped in the same migration
  that drops the `client_id` FK on `client_ad_items` and
  adds the `advertiser` column.
- The migration backfills `advertiser` from the joined
  `clients.name` before dropping the FK so no data is lost.
- Verify tests fail before implementing.
- Commit after each user story (or at the end of the spec).
- Stop at any checkpoint to validate the story independently.
- Stop and explain before changing direction if
  implementation conflicts with the approved spec or plan.
- Avoid: same-file conflicts, cross-story dependencies that
  break independence.
