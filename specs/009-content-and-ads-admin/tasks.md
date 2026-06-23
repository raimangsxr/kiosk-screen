# Tasks: Content and Ads Admin

**Input**: Design documents from
`specs/009-content-and-ads-admin/`.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Verify working branch and the four artefacts.
- [X] T002 [P] Confirm `0001`, `0002`, `0006`, `0007` migrations
      create the content / ad tables and the rotation columns and
      drop the legacy `Client` and `label` columns.

## Phase 2: Foundational

- [X] T003 [P] `TopContentItem` and `ClientAdItem` models at
      `backend/app/repositories/models/content.py` /
      `ad.py`.
- [X] T004 [P] `ContentService` and `AdsService` skeletons.

## Phase 3: User Story 1 — Content CRUD

- [X] T005 `ContentService.create_uploaded(...)` and
      `update(...)` with the auto-detect override.
- [X] T006 The seven content endpoints at
      `backend/app/api/content.py`.
- [X] T007 [P] `ContentItemSchema`, `ContentItemRequest`,
      `ReorderRequest` at `backend/app/api/schemas.py`.

### Tests for User Story 1

- [X] T008 [P] [US1] Integration test: upload `.jpg` with
      `contentType='photo'` → 201 with
      `contentType='photo'` at
      `backend/tests/integration/test_content_upload_admin.py`.
- [X] T009 [P] [US1] Integration test: upload `.mp4` with
      `contentType='photo'` → 201 with `contentType='video'` +
      `content_type_autodetected` event.
- [X] T010 [P] [US1] Integration test: reorder with a mismatched
      list → 409 at
      `backend/tests/integration/test_content_reorder.py`.
- [X] T011 [P] [US1] Integration test: RBAC matrix
      (`content_manager` allowed, `event_operator` forbidden).

## Phase 4: User Story 2 — is_fixed / recurring exclusivity

- [X] T012 [P] `ContentService.create_uploaded(...)` and
      `update(...)` reject `is_fixed=true` AND
      `recurring_every_x_iterations != null` with 400 (CHECK).
- [X] T013 [P] `ContentService.create_uploaded(...)` and
      `update(...)` reject
      `recurring_every_x_iterations < 1` with 400 (CHECK).

### Tests for User Story 2

- [X] T014 [P] [US2] Integration test: `is_fixed=true,
      recurringEveryXIterations=3` → 400.
- [X] T015 [P] [US2] Integration test:
      `recurringEveryXIterations=0` → 400.
- [X] T016 [P] [US2] Integration test: each valid combination
      (`is_fixed=true` alone, `recurring=N` alone) → 201.

## Phase 5: User Story 3 — Ad CRUD

- [X] T017 `AdsService.create_ad`,
      `create_uploaded_ad`, `update_ad`, `delete_ad`, `reorder`.
- [X] T018 The seven ad endpoints at
      `backend/app/api/ads.py`.
- [X] T019 [P] `AdItemSchema`, `AdItemRequest` at
      `backend/app/api/schemas.py`.

### Tests for User Story 3

- [X] T020 [P] [US3] Integration test: POST with
      `advertiser='Acme Corp'` → 201 with the field.
- [X] T021 [P] [US3] Integration test: `content_manager` is
      forbidden, `advertising_manager` is allowed.

## Phase 6: Frontend

- [X] T022 [P] `ContentApi` and `AdsApi` at
      `frontend/src/app/core/api/content.api.ts` /
      `ads.api.ts`.
- [X] T023 `ContentListComponent` with CDK drag-drop reorder at
      `frontend/src/app/features/content/content-list.component.ts`.
- [X] T024 `ContentFormComponent` with the mutual-exclusion hint
      at
      `frontend/src/app/features/content/content-form.component.ts`.
- [X] T025 [P] `ContentFacade` at
      `frontend/src/app/features/content/content.facade.ts`.
- [X] T026 [P] `AdListComponent`, `AdFormComponent`,
      `AdsFacade` at
      `frontend/src/app/features/ads/*`.
- [X] T027 [P] Wire `/admin/content` and `/admin/ads` in
      `frontend/src/app/app.routes.ts`.
- [X] T028 [P] Karma specs for the list, the form, and the
      drag-drop reorder.

## Dependencies & Execution Order

- Phase 2 → Phase 3 → Phase 4 → Phase 5.
- Phase 6 is independent and can run after Phase 3.

## Implementation Strategy

Single-contributor path:

1. Phase 1 + 2: 10 min.
2. Phase 3: 1 h (content CRUD + tests).
3. Phase 4: 30 min (exclusivity).
4. Phase 5: 1 h (ad CRUD + tests).
5. Phase 6: 2 h (drag-drop UI + tests).
