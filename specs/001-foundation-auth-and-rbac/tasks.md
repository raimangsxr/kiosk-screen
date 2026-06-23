# Tasks: Foundation, Auth and RBAC

**Input**: Design documents from `specs/001-foundation-auth-and-rbac/`.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Verify working branch is `001-foundation-auth-and-rbac`
      and that `specs/001-foundation-auth-and-rbac/` contains
      `spec.md`, `plan.md`, `tasks.md`, `checklist.md`.
- [X] T002 [P] Confirm `backend/alembic/versions/0001_initial_kiosk_schema.py`
      creates the `organizations`, `users`, `role_assignments`
      tables with the documented columns and the
      `uq_users_organization_email` and `uq_role_assignments_user_role`
      unique constraints.

## Phase 2: Foundational

- [X] T003 [P] `Organization` model at
      `backend/app/repositories/models/organization.py` with
      `users` back-populate cascade `all, delete-orphan`.
- [X] T004 [P] `User` model at
      `backend/app/repositories/models/user.py` with the
      `(organization_id, email)` unique constraint.
- [X] T005 [P] `RoleAssignment` model at
      `backend/app/repositories/models/role_assignment.py` with
      the `(user_id, role)` unique constraint and a `Role` enum
      string column.
- [X] T006 [P] `Role` enum and the six role sets in
      `backend/app/domain/roles.py`; helpers `normalize_roles`,
      `has_any_role`, `can_open_display`.

## Phase 3: User Story 1 — Login / Logout / Me

- [X] T007 `backend/app/auth/service.py` with `hash_password`,
      `verify_password`, `create_session_token`,
      `verify_session_token`. Cookie name `kiosk_session`.
- [X] T008 [P] `CurrentUser` dependency + `get_current_user` +
      `require_roles(...)` factory in
      `backend/app/auth/dependencies.py`.
- [X] T009 `POST /auth/login` at
      `backend/app/api/auth.py:25` returning `UserSchema` and
      setting the cookie with the duration derived from
      `rememberMe`.
- [X] T010 [P] `POST /auth/logout` at
      `backend/app/api/auth.py:49` removing the session and
      deleting the cookie.
- [X] T011 [P] `GET /auth/me` at `backend/app/api/auth.py:58`
      returning the authenticated `UserSchema`.
- [X] T012 [P] `LoginRequest` and `UserSchema` in
      `backend/app/api/schemas.py`.

### Tests for User Story 1

- [X] T013 [P] [US1] Integration test for the happy login path +
      24 h cookie in
      `backend/tests/integration/test_auth_login.py`.
- [X] T014 [P] [US1] Integration test for the 30 d cookie when
      `rememberMe=true` in the same file.
- [X] T015 [P] [US1] Integration test that 401 responses are
      identical for unknown email vs. wrong password.
- [X] T016 [P] [US1] Integration test for logout invalidating
      the session and clearing the cookie.

## Phase 4: User Story 2 — RBAC

- [X] T017 [P] Backend unit test for the six role sets and the
      `has_any_role` / `can_open_display` helpers at
      `backend/tests/unit/test_roles_domain.py`.
- [X] T018 [P] Backend integration test that 403 is returned
      when the user's role is not in the allowed set
      (parametrized over the six role sets) at
      `backend/tests/integration/test_rbac_matrix.py`.

## Phase 5: User Story 3 — Bootstrap admin

- [X] T019 [P] `bootstrap_service.ensure_bootstrap_admin(...)`
      at `backend/app/services/bootstrap_service.py` creating
      the user from `BOOTSTRAP_ADMIN_*` env vars when
      `users` is empty.
- [X] T020 [P] Wire the bootstrap call into the FastAPI startup
      event in `backend/app/main.py`.
- [X] T021 [P] Integration test for the idempotent bootstrap in
      `backend/tests/integration/test_bootstrap.py`.

## Phase 6: Frontend

- [X] T022 [P] `AuthService` at
      `frontend/src/app/core/auth/auth.service.ts` with the
      `AuthenticatedUser` signal, login/logout/refresh, and
      `localStorage` persistence.
- [X] T023 [P] `sessionGuard` and `authRootGuard` at
      `frontend/src/app/auth/session.guard.ts`.
- [X] T024 `LoginComponent` at
      `frontend/src/app/auth/login.component.ts` with the
      Material form and the 401 message handling.
- [X] T025 [P] Wire `/login` and the root redirect in
      `frontend/src/app/app.routes.ts`.

### Tests for User Story (frontend)

- [X] T026 [P] Karma spec for `LoginComponent` (happy + 401
      paths) at
      `frontend/src/app/auth/login.component.spec.ts`.
- [X] T027 [P] Karma spec for the two guards at
      `frontend/src/app/auth/session.guard.spec.ts`.

## Dependencies & Execution Order

- Phase 2 → Phase 3 (login depends on `Role` / `User` models).
- Phase 3 → Phase 4 (RBAC tests need `require_roles`).
- Phase 2 → Phase 5 (bootstrap creates a `User` row).
- All backend → Phase 6 (frontend reads the cookie from the
  backend).

## Implementation Strategy

Single-contributor path:

1. Phase 1 + 2: 30 min (read + sanity check on the existing
   migration and models; both already exist).
2. Phase 3: 1 h (login + me + logout + tests).
3. Phase 4: 30 min (parametrized RBAC tests).
4. Phase 5: 20 min (bootstrap).
5. Phase 6: 1.5 h (auth service, guards, login component,
   frontend tests).
