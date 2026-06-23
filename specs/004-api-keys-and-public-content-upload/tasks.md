# Tasks: API Keys and Public Content Upload

**Input**: Design documents from
`specs/004-api-keys-and-public-content-upload/`.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Verify working branch and the four artefacts.
- [X] T002 [P] Confirm `0003_api_keys` migration creates the
      `api_keys` table with the `key_hash` and `key_prefix` CHECK
      constraints and the unique index on `key_prefix`.

## Phase 2: Foundational

- [X] T003 [P] `ApiKey` model at
      `backend/app/repositories/models/api_key.py`.
- [X] T004 [P] `ApiKeyRepository` at
      `backend/app/repositories/api_keys.py` with
      `get_by_id`, `list_for_organization`, `create`,
      `update_hash`, `revoke`, `delete`.
- [X] T005 [P] `ApiKeyService` at
      `backend/app/services/api_key_service.py` with
      `generate_raw_key` (32 bytes, prefix `ksk_live_` + 8 chars),
      `verify`, `create`, `rotate`, `revoke`, `delete`.
- [X] T006 [P] `create_api_key_event(...)` helper at
      `backend/app/domain/display_events.py:55`.

## Phase 3: User Story 1 — Create an API key

- [X] T007 `POST /admin/api-keys` at
      `backend/app/api/v1/api_keys/routes.py:71` returning
      `ApiKeyWithRawSecretSchema` and recording the audit event.
- [X] T008 [P] `ApiKeyRecordSchema`,
      `ApiKeyWithRawSecretSchema`, `CreateApiKeyRequest` at
      `backend/app/api/v1/api_keys/schemas.py`.
- [X] T009 [P] `GET /admin/api-keys` at
      `backend/app/api/v1/api_keys/routes.py:61` listing
      non-raw records.

### Tests for User Story 1

- [X] T010 [P] [US1] Integration test: create returns the raw
      key once and the row has the expected hash + prefix at
      `backend/tests/integration/test_api_key_admin.py`.
- [X] T011 [P] [US1] Integration test: empty label → 400
      `title_required`; > 120 chars → 400 `title_too_long`.
- [X] T012 [P] [US1] Integration test: `content_manager` is
      forbidden.

## Phase 4: User Story 2 — Rotate, revoke, delete

- [X] T013 `POST /admin/api-keys/{id}/rotate` at
      `backend/app/api/v1/api_keys/routes.py:119` returning a
      fresh raw key.
- [X] T014 `DELETE /admin/api-keys/{id}` at
      `backend/app/api/v1/api_keys/routes.py:146` (revoke,
      idempotent, single audit event on transition).
- [X] T015 `POST /admin/api-keys/{id}/delete` at
      `backend/app/api/v1/api_keys/routes.py:182` (only after
      revoke).

### Tests for User Story 2

- [X] T016 [P] [US2] Integration test: rotate returns a new raw
      key and updates `last_rotated_at` at
      `backend/tests/integration/test_api_key_admin.py`.
- [X] T017 [P] [US2] Integration test: revoke is idempotent
      (second call returns 204 without a second audit event).
- [X] T018 [P] [US2] Integration test: hard-delete requires
      revoke; otherwise 409 `api_key_not_revoked`.

## Phase 5: User Story 3 — Public content upload

- [X] T019 `ApiKeyPrincipal` dependency at
      `backend/app/auth/dependencies.py` that parses
      `Authorization: Bearer <key>` and returns the
      `ApiKeyPrincipal` (organization_id, key id, is_active).
- [X] T020 `POST /api/public/content/upload` at
      `backend/app/api/v1/public_content/routes.py:21`.
- [X] T021 [P] `parse_public_upload(...)` at
      `backend/app/api/v1/public_content/schemas.py` with the
      typed errors `file_required`, `title_required`, etc.
- [X] T022 [P] Mount the public router at `/api/public` in
      `backend/app/main.py:75`.

### Tests for User Story 3

- [X] T023 [P] [US3] Integration test: 201 happy path; updates
      `last_used_at` at
      `backend/tests/integration/test_public_content_upload.py`.
- [X] T024 [P] [US3] Integration test: 401 matrix
      (missing, basic scheme, unknown prefix, inactive key).
- [X] T025 [P] [US3] Integration test: 413 oversize, 415 wrong
      MIME, 400 empty file / empty title / > 120 chars title.
- [X] T026 [P] [US3] Integration test: `last_used_at` is NOT
      updated on any 4xx.

## Phase 6: Frontend

- [X] T027 [P] `ApiKeysApi` at
      `frontend/src/app/core/api/api-keys.api.ts` with the
      five operations.
- [X] T028 `ApiKeysListComponent` at
      `frontend/src/app/features/api-keys/api-keys-list.component.ts`
      with the list, create, rotate, revoke, delete actions.
- [X] T029 `ApiKeysCreateDialogComponent` at
      `frontend/src/app/features/api-keys/api-keys-create-dialog.component.ts`
      with the raw-key reveal panel.
- [X] T030 [P] `ApiKeysFacade` at
      `frontend/src/app/features/api-keys/api-keys.facade.ts`.
- [X] T031 [P] Wire `/admin/api-keys` in
      `frontend/src/app/app.routes.ts`.
- [X] T032 [P] Karma specs for the list and the create dialog
      at `frontend/src/app/features/api-keys/*.spec.ts`.

## Dependencies & Execution Order

- Phase 2 → Phase 3 → Phase 4 → Phase 5.
- Phase 6 is independent of Phase 5 but depends on Phase 3 and
  Phase 4 contracts.

## Implementation Strategy

Single-contributor path:

1. Phase 1 + 2: 20 min.
2. Phase 3 + 4: 1.5 h (admin endpoints + tests).
3. Phase 5: 1 h (bearer auth + public upload + tests).
4. Phase 6: 1.5 h (admin UI + tests).
