---
description: "Task list for Drop Label, Auto display_order, Drag-and-Drop Reorder"
---

# Tasks: Drop Label, Auto display_order, Drag-and-Drop Reorder

**Input**: Design documents from `/specs/013-drop-label-display-order-drag-drop/`
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
`ContentService`, `AdsService`, and the new
`app.services.display_order` helper that centralizes the
`max+1` computation and the per-organization advisory lock.

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T001 Verify the current state of
      `backend/app/repositories/models/ad.py:9-30`,
      `backend/app/services/ads_service.py:60-95`,
      `backend/app/services/content_service.py:55-90`,
      `backend/app/api/schemas.py:118-173`,
      `backend/app/services/display_order.py:1-89`,
      `backend/app/api/ads.py:95-115`,
      `backend/app/api/content.py:110-130`,
      `frontend/src/app/features/ads/ad-list.component.ts:1-300`,
      and `frontend/src/app/features/content/content-list.component.ts:1-300`
      to confirm the line numbers in
      `specs/013-drop-label-display-order-drag-drop/plan.md` are
      accurate. If any line numbers have drifted, update the
      plan before proceeding.

**Checkpoint**: Foundation ready — user story implementation can
begin.

---

## Phase 3: User Story 1 - No Label Field on Ads (Priority: P1) 🎯 MVP

**Goal**: The `label` column is removed from the `client_ad_items`
table, from the `ClientAdItem` model, from the Pydantic schemas,
from the OpenAPI document, from the frontend form, and from the
frontend list. The ad list shows "External source" (or the
filename) instead of the URL.

**Independent Test**: Sign in as an administrator, open the ad
creation form, confirm there is no Label field, create an ad
without a label, and confirm the ad appears in the list with
"External source" as the media label. The API does not require
`label` and the response does not include `label`.

### Tests for User Story 1 ⚠️

- [X] T002 [P] [US1] Migration test: round-trip
      `0006_drop_client_ad_items_label` on a fresh DB and on
      the seeded DB; assert the `label` column is gone and the
      existing tables are unaffected, in
      `backend/tests/integration/test_migrations.py`.
- [X] T003 [P] [US1] Add a service test that the ad form does not
      require `label` and the response does not include `label`,
      in `backend/tests/integration/test_ads_api.py` and
      `backend/tests/unit/test_content_ad_models.py`.
- [X] T004 [P] [US1] Add a frontend test that the ad list shows
      "External source" (not the raw URL) and the ad form has
      no label field, in
      `frontend/src/app/features/ads/ad-form.component.spec.ts`
      and
      `frontend/src/app/features/ads/ad-list.component.spec.ts`.

### Implementation for User Story 1

- [X] T005 [US1] Add the
      `0006_drop_client_ad_items_label` Alembic migration in
      `backend/alembic/versions/0006_drop_client_ad_items_label.py`
      (depends on `0005_merge_heads`) that drops the `label`
      column from `client_ad_items`. Use a column-presence
      check so the migration is a no-op on fresh databases
      that never had the column.
- [X] T006 [US1] Remove the `label` column from the
      `ClientAdItem` model in
      `backend/app/repositories/models/ad.py:9-30` (the column
      is already absent in the model — confirm).
- [X] T007 [US1] Remove the `label` field from the Pydantic
      schemas `AdItemSchema` and `AdItemRequest` in
      `backend/app/api/schemas.py:147-173` (the field is
      already absent — confirm).
- [X] T008 [US1] Remove the Label column from the ad list in
      `frontend/src/app/features/ads/ad-list.component.ts` —
      the column was already removed; confirm the
      `mediaLabel(ad)` helper returns "External source" for
      external URLs and the original filename for uploads.

**Checkpoint**: The `label` field is gone from the database, the
model, the schemas, the OpenAPI document, the form, and the
list. The ad list shows "External source" / filename. The
migration is reversible (downgrade re-adds the column).

---

## Phase 4: User Story 2 - Auto displayOrder on Create (Priority: P1)

**Goal**: The create forms for ads and content omit the
`displayOrder` field; the server assigns
`max(existing display_order) + 1` within a per-organization
advisory lock when the request omits the field. The edit forms
continue to expose the field so the operator can override the
value.

**Independent Test**: Sign in as an administrator, create two
ads in sequence without specifying a `displayOrder`, and
confirm the second ad has `displayOrder = 2` (assuming the
first has `displayOrder = 1`). Edit the second ad and set
`displayOrder = 99`; confirm the change persists.

### Tests for User Story 2 ⚠️

- [X] T009 [P] [US2] Add a service test that two consecutive
      creates with no `displayOrder` produce contiguous
      max+1 values, in
      `backend/tests/unit/test_content_service.py` and
      `backend/tests/unit/test_ads_service.py`.
- [X] T010 [P] [US2] Add a concurrent-creates test: two
      `POST /api/ads` calls in parallel both omit
      `displayOrder`; assert the two ads have distinct,
      contiguous `displayOrder` values with no collisions or
      gaps, in
      `backend/tests/integration/test_ads_api.py` and
      `backend/tests/integration/test_content_api.py`.
- [X] T011 [P] [US2] Frontend test: the create form hides the
      `displayOrder` field; the edit form shows it
      pre-populated, in
      `frontend/src/app/features/ads/ad-form.component.spec.ts`
      and
      `frontend/src/app/features/content/content-form.component.spec.ts`.

### Implementation for User Story 2

- [X] T012 [US2] Confirm the
      `ContentItemRequest.display_order` and
      `AdItemRequest.display_order` fields are
      `int | None = Field(default=None, ...)` in
      `backend/app/api/schemas.py:118-173` (already done).
- [X] T013 [US2] Update `AdsService.create_ad` and
      `AdsService.create_uploaded_ad` in
      `backend/app/services/ads_service.py:60-136` to call
      `next_display_order(self.session, ClientAdItem,
      organization_id, "ad")` when the payload omits
      `display_order` (already done).
- [X] T014 [US2] Update `ContentService.create` and
      `ContentService.create_uploaded` in
      `backend/app/services/content_service.py:55-150` to call
      `next_display_order(self.session, TopContentItem,
      organization_id, "content")` when the payload omits
      `display_order` (already done).
- [X] T015 [US2] Hide the `displayOrder` field in the create
      forms (`frontend/src/app/features/ads/ad-form.component.ts`
      and
      `frontend/src/app/features/content/content-form.component.ts`)
      via `*ngIf="mode === 'edit'"` so the field is removed
      from the accessibility tree. Show the field in edit
      mode pre-populated with the current value.

**Checkpoint**: The create form does not show the `displayOrder`
field; the server auto-assigns `max+1` per organization; the
edit form still exposes the field. Concurrent creates produce
distinct, contiguous `displayOrder` values.

---

## Phase 5: User Story 3 - Drag-and-Drop Reorder With Multi-Select (Priority: P2)

**Goal**: The ad and content lists render a `mat-checkbox` per
row, support multi-select, and allow drag-and-drop reorder via
`cdkDragDrop`. The frontend computes the new order including
all selected siblings and calls
`POST /api/ads/reorder` (or `/api/content/reorder`) with the
new ordered id list. The server renumbers `display_order` per
the new list, guarded by the per-organization advisory lock.

**Independent Test**: Sign in as an administrator, open the ad
list, drag the first row to the third position, and confirm
the new order persists. Then check three rows, drag one of
them to a new position, and confirm the three rows stay
together in the new position.

### Tests for User Story 3 ⚠️

- [X] T016 [P] [US3] Add a backend service test for the reorder
      endpoint: send an ordered id list, assert the
      `display_order` values are renumbered 1..N, in
      `backend/tests/integration/test_ads_api.py` and
      `backend/tests/integration/test_content_api.py`.
- [X] T017 [P] [US3] Add a backend service test for the
      mismatch path: send an ordered id list that does not
      match the database set, assert 409 with code
      `reorder_ids_mismatch`, in
      `backend/tests/integration/test_ads_api.py` and
      `backend/tests/integration/test_content_api.py`.
- [X] T018 [P] [US3] Frontend test: drag a single row and
      assert the new order; select multiple rows, drag one
      of them, and assert the selection moves as a block, in
      `frontend/src/app/features/ads/ad-list.component.spec.ts`
      and
      `frontend/src/app/features/content/content-list.component.spec.ts`.

### Implementation for User Story 3

- [X] T019 [US3] Confirm the
      `POST /api/ads/reorder` and
      `POST /api/content/reorder` routes exist in
      `backend/app/api/ads.py:95-115` and
      `backend/app/api/content.py:110-130` (already
      implemented). The handler validates the body
      (`ReorderRequest.ordered_ids`), calls
      `AdsService.reorder(...)` /
      `ContentService.reorder(...)`, and returns 204.
- [X] T020 [US3] Confirm `AdsService.reorder` /
      `ContentService.reorder` in
      `backend/app/services/ads_service.py:148-164` and
      `backend/app/services/content_service.py:293-310`
      validate the set of ids, raise
      `ReorderIdsMismatchError` on mismatch, and call
      `assign_ordered_display_orders` to renumber (already
      implemented).
- [X] T021 [US3] Confirm the frontend list components render
      a `mat-checkbox` per row, track a `selection: Set<string>`
      signal, and use `cdkDropList` + `cdkDrag` (already
      implemented in
      `frontend/src/app/features/ads/ad-list.component.ts:50-145`
      and
      `frontend/src/app/features/content/content-list.component.ts:50-145`).
- [X] T022 [US3] Confirm the drop handler computes the new
      order including all selected siblings, calls
      `facade.reorder(newOrder)`, and shows a snackbar on
      success / error (already implemented in
      `ad-list.component.ts:328-357` and
      `content-list.component.ts:345-372`).
- [X] T023 [US3] Add `reorderAds(orderedIds)` /
      `reorderContent(orderedIds)` methods to
      `frontend/src/app/core/api/ads.api.ts` and
      `frontend/src/app/core/api/content.api.ts` (already
      implemented).
- [X] T024 [US3] Add `reorder(orderedIds)` to
      `AdsFacade` and `ContentFacade` (already
      implemented).

**Checkpoint**: The lists support drag-and-drop with
multi-select. A single-row drag persists the new order; a
multi-row drag moves the selection as a block. The reorder
endpoint is 204 on success and 409 on mismatch. The
interaction is keyboard-accessible via the existing Material
checkbox + CDK drag-drop built-in support.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T025 [P] Run `pytest backend/tests` and confirm 100% of
      backend tests pass.
- [X] T026 [P] Run `npm --prefix frontend run test` and confirm
      100% of frontend tests pass.
- [X] T027 [P] Run `npm --prefix frontend run build` and confirm
      the production build succeeds.
- [X] T028 Run the manual smoke flow described in the spec and
      record the pass/fail in
      `specs/013-drop-label-display-order-drag-drop/validation/final-acceptance.md`
      (created if missing).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No-op.
- **Foundational (Phase 2)**: T001 is a verification task; the
  implementation work itself does not block on T001.
- **User Stories (Phase 3–5)**: Each story is independently
  testable. US1 must land before US3 because the migration is
  a hard drop and the model/schema must be in sync first.
- **Polish (Phase 6)**: Depends on all three user stories
  being complete.

### User Story Dependencies

- **US1 (P1)**: No dependencies.
- **US2 (P1)**: No dependencies (the auto-assign code path
  is independent of the label drop).
- **US3 (P2)**: Independent of US1 and US2.

### Within Each User Story

- Tests first (where a spec file exists), then implementation.
- US1: migration → model → schemas → frontend list / form.
  T005 must land before T002 (the migration test).
- US2: service test → service impl → frontend form. The
  schemas are already correct (T012 is a verify-only task).
- US3: backend service / route / frontend list / frontend
  api / frontend facade. Most steps are already implemented
  (T019–T024 are verify-only tasks).

### Parallel Opportunities

- T002 / T003 / T004 (US1 tests) can run in parallel.
- T005 / T006 / T007 / T008 (US1 implementation) can run in
  parallel — they touch different files.
- T009 / T010 / T011 (US2 tests) can run in parallel.
- T016 / T017 / T018 (US3 tests) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

1. Complete Phase 1 + Phase 2 (no-op + T001 verification).
2. Complete Phase 3 (US1: drop the label column).
3. Complete Phase 4 (US2: auto displayOrder).
4. **STOP and VALIDATE**: Test US1 + US2 independently. The
   ad form no longer has a label field, the create form
   hides `displayOrder`, and concurrent creates produce
   contiguous max+1 values.
5. Deploy/demo if ready (US1 + US2 are the operator-visible
   changes to the form).

### Incremental Delivery

1. Phase 1 + Phase 2 → no-op.
2. US1 (drop label) → test → deploy.
3. US2 (auto displayOrder) → test → deploy.
4. US3 (drag-and-drop reorder) → test → deploy.
5. Each story adds value without breaking previous stories.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps each task to a specific user story from
  `spec.md`.
- Each user story MUST be independently completable and
  testable.
- The `display_order` form field is hidden via `*ngIf`, not
  via CSS `display: none`, so the field is removed from the
  accessibility tree on the create view.
- The advisory lock is `pg_advisory_xact_lock(hashtext('ad_append:'
  || org_id))` for ads and `'content_append:'` for content.
  Different entity types use different lock keys so a content
  append and an ad append do not block each other.
- The migration uses a column-presence check so it is a no-op
  on fresh databases that never had the column (the model
  no longer declares it).
- Verify tests fail before implementing.
- Commit after each user story (or at the end of the spec).
- Stop at any checkpoint to validate the story independently.
- Stop and explain before changing direction if implementation
  conflicts with the approved spec or plan.
- Avoid: same-file conflicts, cross-story dependencies that
  break independence.
