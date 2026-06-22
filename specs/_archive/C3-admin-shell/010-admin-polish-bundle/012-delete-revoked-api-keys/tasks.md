---
description: "Task list for Delete Revoked API Keys"
---

# Tasks: Delete Revoked API Keys

**Input**: Design documents from `/specs/012-delete-revoked-api-keys/`
**Prerequisites**: plan.md (required), spec.md (required)

**Organization**: Tasks are grouped by user story to enable
independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- Backend: `backend/app/`, `backend/tests/`
- Frontend: `frontend/src/app/`

---

## Phase 1: Setup (Shared Infrastructure)

The project is already initialized. No new infrastructure is required.
The new endpoint and the new frontend action reuse the existing
`api_keys` router, the existing `api-keys` facade, and the existing
display-events audit log.

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T001 Verify the current state of
      `backend/app/repositories/api_keys.py:60-95`,
      `backend/app/services/api_key_service.py:99-130`,
      `backend/app/api/v1/api_keys/routes.py:130-215`,
      `backend/app/domain/display_events.py:55-75`,
      and `frontend/src/app/features/api-keys/api-keys-list.component.ts:95-130`
      to confirm the line numbers in
      `specs/012-delete-revoked-api-keys/plan.md` are accurate.
      If any line numbers have drifted, update the plan before
      proceeding.

**Checkpoint**: Foundation ready — user story implementation can
begin.

---

## Phase 3: User Story 1 - Remove a Revoked API Key From the List (Priority: P1) 🎯 MVP

**Goal**: An administrator can hard-delete a revoked API key from
the admin list via a "Delete" action button. The button is enabled
only on rows where the key has been revoked; the confirmation
dialog explains that the audit trail is preserved. On confirm, the
row is removed and the list refreshes.

**Independent Test**: Sign in as an administrator, open
`/admin/api-keys`, create a key, revoke it, and confirm a "Delete"
action appears on the row. Click "Delete", confirm in the dialog,
and confirm the row no longer appears after the next refresh.

### Tests for User Story 1 ⚠️

- [X] T002 [P] [US1] Existing service tests for revoke cover the
      pre-state check used by the new endpoint
      (`backend/tests/unit/test_api_key_service.py:101-122`).
- [X] T003 [P] [US1] Integration test: revoke a key, call
      `POST /api/admin/api-keys/{id}/delete`, assert 204; assert
      a subsequent `GET /api/admin/api-keys` does not include
      the key; assert exactly one `api_key_changed` event with
      `action="delete"` and `severity="warning"` was recorded,
      in `backend/tests/integration/test_admin_api_keys.py`.

### Implementation for User Story 1

- [X] T004 [US1] Add `delete(self, organization_id, key_id) -> bool`
      method to `ApiKeyService` in
      `backend/app/services/api_key_service.py:99-130` that
      fetches the record by org, raises `ApiKeyNotRevokedError`
      if the record is still active, and otherwise calls
      `self.repository.delete(record)` and returns `True`. The
      method returns `False` for a missing key (caller maps to
      404).
- [X] T005 [US1] Add `delete(self, key: ApiKey) -> None` method to
      `ApiKeyRepository` in
      `backend/app/repositories/api_keys.py:60-95` that calls
      `self.session.delete(key)` and `self.session.flush()`.
- [X] T006 [US1] Extend the `create_api_key_event` whitelist in
      `backend/app/domain/display_events.py:55-75` from
      `{"create", "rotate", "revoke"}` to
      `{"create", "rotate", "revoke", "delete"}`. The `delete`
      action maps to `severity="warning"` (mirroring `revoke`).
- [X] T007 [US1] Add `POST /api/admin/api-keys/{key_id}/delete`
      route in `backend/app/api/v1/api_keys/routes.py:130-215`
      gated by `require_roles(ADMIN_ROLES)`. The handler
      fetches the record by org, raises `ApiKeyNotFoundError`
      on 404, calls `ApiKeyService.delete(...)` and re-raises
      `ApiKeyNotRevokedError` on 409, and on success records
      a `create_api_key_event(... action="delete" ...)` and
      returns 204.
- [X] T008 [US1] Add `delete(id: string): Observable<void>` method
      to `ApiKeysApiService` in
      `frontend/src/app/core/api/api-keys.api.ts` that POSTs
      to `/api/admin/api-keys/{id}/delete` with empty body and
      expects 204.
- [X] T009 [US1] Add `delete(id: string)` method to
      `ApiKeysFacade` in
      `frontend/src/app/features/api-keys/api-keys.facade.ts`
      that wraps the API call, surfaces typed errors via the
      existing adapter, and refreshes the list on success.
- [X] T010 [US1] Add the "Delete" button + `onDelete(id, label)`
      handler in
      `frontend/src/app/features/api-keys/api-keys-list.component.ts:95-130`.
      The button is disabled when `key.isActive` (only revoked
      keys are deletable) and when `facade.saving()`. The
      handler opens the `ConfirmDialogService` with a
      destructive confirmation, then calls `facade.delete(id)`
      and shows a snackbar on success.

**Checkpoint**: The admin list shows a "Delete" action on revoked
rows; clicking it confirms, calls the endpoint, and refreshes the
list. The endpoint returns 409 for active keys and 404 for
missing keys.

---

## Phase 4: User Story 2 - Backend Blocks Deletion of Active Keys (Priority: P2)

**Goal**: A buggy or non-admin client that POSTs to the new
delete endpoint for an active (non-revoked) key receives a 409
response with the safe error envelope (`api_key_not_revoked`). A
POST for a non-existent key receives 404 (`api_key_not_found`).
A successful delete is auditable as a `display_event`.

**Independent Test**: Sign in as an administrator and POST to
`/api/admin/api-keys/{id}/delete` for an active key. Confirm a
409 response with code `api_key_not_revoked` and the row still
present. Then revoke the key and retry: confirm 204 and the row
removed. Then POST to a non-existent id and confirm 404 with
code `api_key_not_found`.

### Tests for User Story 2 ⚠️

- [X] T011 [P] [US2] Add integration test for the 409 path (delete
      of an active key) in
      `backend/tests/integration/test_admin_api_keys.py` —
      assert response code 409, body code `api_key_not_revoked`,
      and the row is still in the database.
- [X] T012 [P] [US2] Add integration test for the 404 path (delete
      of a non-existent id) in
      `backend/tests/integration/test_admin_api_keys.py` —
      assert response code 404 and body code `api_key_not_found`.
- [X] T013 [P] [US2] Add audit test: each successful hard delete
      records exactly one `api_key_changed` event with
      `action="delete"`, `severity="warning"`, and the right
      `entity_id` and `key_label` in
      `backend/tests/integration/test_admin_api_keys_audit.py`.

### Implementation for User Story 2

- [X] T014 [US2] The 409 / 404 paths are already implemented in
      T004 and T007 (service raises `ApiKeyNotRevokedError`,
      route raises `ApiKeyNotFoundError`). Confirm the typed
      errors produce the documented envelopes via the
      application error handler in
      `backend/app/shared/errors/application_errors.py`.

**Checkpoint**: All four boundary conditions (204, 404, 409,
and the audit event) are covered by tests and produce the
documented envelopes. The endpoint is a no-op on 4xx (no row
mutation, no audit event).

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T015 [P] Run `pytest backend/tests` and confirm 100% of
      backend tests pass.
- [X] T016 [P] Run `npm --prefix frontend run test` and confirm
      100% of frontend tests pass.
- [X] T017 [P] Run `npm --prefix frontend run build` and confirm
      the production build succeeds.
- [X] T018 Run the manual smoke flow described in the spec
      (create → revoke → delete → confirm row removed) and
      record the pass/fail in
      `specs/012-delete-revoked-api-keys/validation/final-acceptance.md`
      (created if missing).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No-op.
- **Foundational (Phase 2)**: T001 is a verification task; the
  implementation work itself does not block on T001.
- **User Stories (Phase 3–4)**: US2 is the test-heavy companion
  to US1's endpoint; US1 must land first because US2 exercises
  the US1 code path.
- **Polish (Phase 5)**: Depends on both US1 and US2 being
  complete.

### User Story Dependencies

- **US1 (P1)**: No dependencies on other stories.
- **US2 (P2)**: Depends on US1's endpoint and service method
  being in place.

### Within Each User Story

- Tests first (where a spec file exists), then implementation.
- US1 is implementation-heavy: backend service → repository →
  route → frontend api → facade → list component. Each step
  depends on the previous.
- US2 is test-heavy: integration tests + audit test, plus a
  confirmation that the typed errors map to the right envelopes.

### Parallel Opportunities

- T002 / T003 (US1 tests) can run in parallel.
- T008 / T009 (US1 frontend api + facade) can run in parallel
  with T004 / T005 / T006 / T007 (backend service + repo +
  event whitelist + route).
- T011 / T012 / T013 (US2 tests) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 + Phase 2 (no-op + T001 verification).
2. Complete Phase 3 (US1: backend endpoint, frontend action,
   tests).
3. **STOP and VALIDATE**: Test US1 independently. The admin
   list shows a "Delete" action on revoked rows; clicking it
   confirms, calls the endpoint, and refreshes the list.
4. Deploy/demo if ready (US1 is the only user-visible change
   for the operator).

### Incremental Delivery

1. Phase 1 + Phase 2 → no-op.
2. US1 (admin list delete action + backend endpoint) → test →
   deploy.
3. US2 (negative tests for 409 / 404 + audit assertion) →
   test → deploy.
4. Each story adds value without breaking previous stories.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps each task to a specific user story from
  `spec.md`.
- Each user story MUST be independently completable and
  testable.
- The new endpoint is `POST /api/admin/api-keys/{id}/delete`
  (not `DELETE .../delete`) because the existing
  `DELETE /api/admin/api-keys/{id}` is contract-pinned to
  "revoke (idempotent 204)" (see
  `specs/009-public-content-api/contracts/api-key-contract.md`).
- The `delete` action is added to the
  `create_api_key_event` whitelist but does not change how
  events are stored or queried.
- Verify tests fail before implementing (the spec's "tests
  first" rule).
- Commit after each user story (or at the end of the spec).
- Stop at any checkpoint to validate the story independently.
- Stop and explain before changing direction if implementation
  conflicts with the approved spec or plan.
- Avoid: same-file conflicts, cross-story dependencies that
  break independence.
