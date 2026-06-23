# Tasks: Users and Roles Admin

**Input**: Design documents from
`specs/010-users-and-roles-admin/`.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Verify working branch and the four artefacts.

## Phase 2: Foundational

- [X] T002 [P] Confirm `AdminService` already has
      `list_users`, `create_user`, `update_user` skeletons (per
      `backend/app/services/admin_service.py`).

## Phase 3: User Story 1 — List and create users

- [X] T003 [P] `GET /users`, `POST /users` at
      `backend/app/api/users.py:14, 19`.
- [X] T004 [P] `UserRequest` and `UserSchema` validation
      (already in `app/api/schemas.py`); add the
      `AVAILABLE_ROLES` list to the admin service so the
      frontend can populate the multi-select.

### Tests for User Story 1

- [X] T005 [P] [US1] Integration test: create + list at
      `backend/tests/integration/test_users_admin.py`.
- [X] T006 [P] [US1] Integration test: duplicate email → 409.
- [X] T007 [P] [US1] Integration test: `content_manager` →
      403.

## Phase 4: User Story 2 — Edit and deactivate users

- [X] T008 `PUT /users/{id}` at
      `backend/app/api/users.py:29` with the "last administrator"
      guard (409 if the edit would leave the org with zero
      `administrator` users).
- [X] T009 [P] `AdminService.update_user(...)` records a
      `user_changed` event with the diff metadata.

### Tests for User Story 2

- [X] T010 [P] [US2] Integration test: deactivate → user can no
      longer sign in.
- [X] T011 [P] [US2] Integration test: "last administrator"
      guard returns 409.
- [X] T012 [P] [US2] Integration test: role change is
      reflected in the next login.

## Phase 5: Frontend

- [X] T013 [P] `UsersListComponent` at
      `frontend/src/app/features/users/users-list.component.ts`.
- [X] T014 `UserFormComponent` with the multi-select for roles
      and the `isActive` toggle at
      `frontend/src/app/features/users/user-form.component.ts`.
- [X] T015 [P] `UsersFacade` at
      `frontend/src/app/features/users/users.facade.ts`.
- [X] T016 [P] Wire `/admin/users` in
      `frontend/src/app/app.routes.ts`.
- [X] T017 [P] Karma specs for the list and the form at
      `frontend/src/app/features/users/*.spec.ts`.

## Dependencies & Execution Order

- Phase 2 → Phase 3 → Phase 4 → Phase 5.

## Implementation Strategy

Single-contributor path:

1. Phase 1 + 2: 10 min.
2. Phase 3: 30 min (list + create + tests).
3. Phase 4: 30 min (edit + last-administrator guard + tests).
4. Phase 5: 1 h (admin UI).
