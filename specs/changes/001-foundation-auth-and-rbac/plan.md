# Implementation Plan: Foundation, Auth and RBAC

**Branch**: `001-foundation-auth-and-rbac` | **Date**: 2026-06-23
**Spec**: [spec.md](./spec.md)
**Migration**: `0001_initial_kiosk_schema` (partial: `organizations`,
`users`, `role_assignments`).

## Summary

Establish the three foundation tables, the password hashing flow,
the session-cookie authentication, the role-based access control
primitives, the bootstrap admin flow, and the Angular login
component + route guards.

## Technical Context

- **Language/Version**: Python 3.11+ (backend), TypeScript 5.8
  (frontend).
- **Primary Dependencies**: FastAPI, SQLAlchemy 2, Alembic, pydantic
  v2; Angular 17, RxJS, Material 3.
- **Storage**: PostgreSQL (production), SQLite in-memory (tests).
- **Testing**: pytest, Karma + Jasmine.
- **Target Platform**: Linux server (backend) + Chromium kiosk
  browser (frontend).

## Architecture

### Backend

- `backend/app/repositories/models/organization.py`,
  `user.py`, `role_assignment.py` — SQLAlchemy models.
- `backend/app/repositories/base.py` — `IdMixin` (UUID PK),
  `TimestampMixin` (`created_at`, `updated_at`).
- `backend/app/domain/roles.py` — `Role` enum, six role sets,
  helpers `normalize_roles`, `has_any_role`, `can_open_display`.
- `backend/app/auth/service.py` — `hash_password`, `verify_password`,
  `create_session_token`, `verify_session_token`.
- `backend/app/auth/dependencies.py` — `CurrentUser` typed
  dependency, `get_current_user`, `require_roles(...)` factory,
  `SESSION_COOKIE_NAME = "kiosk_session"`.
- `backend/app/services/bootstrap_service.py` — idempotent bootstrap
  admin creation; runs at app startup when the `users` table is
  empty.
- `backend/app/api/auth.py` — three handlers
  (`/auth/login`, `/auth/logout`, `/auth/me`).
- `backend/app/api/schemas.py` — `LoginRequest`, `UserSchema`.

### Frontend

- `frontend/src/app/auth/login.component.ts` — standalone Material
  form.
- `frontend/src/app/auth/session.guard.ts` — `sessionGuard`,
  `authRootGuard`.
- `frontend/src/app/core/auth/auth.service.ts` — signal-backed
  `AuthenticatedUser` store, login/logout/refresh, persistence in
  `localStorage` for fast boot.
- `frontend/src/app/app.routes.ts` — wires `/login` and the global
  guards.

## Constitution Check

- **Spec traceability**: every FR maps to a backend file in
  `backend/app/api/auth.py` or `backend/app/auth/`.
- **Requirement clarity**: 12 FRs, 3 SCs; no `NEEDS CLARIFICATION`.
- **Plan alignment**: foundational layer; no cross-spec surface.
- **Simplicity**: no new dependencies; only `passlib` for password
  hashing is required and is already in `pyproject.toml`.
- **Contracts**: the login cookie is the only contract; documented
  in `UserSchema` and `LoginRequest`.
- **Testing**: backend tests in
  `backend/tests/integration/test_auth.py`; frontend tests in
  `frontend/src/app/auth/login.component.spec.ts` and
  `session.guard.spec.ts`.
- **Security**: password hashing non-reversible; session cookie
  `httponly` + `samesite=lax`; 401 returns identical body for
  invalid email and invalid password (no enumeration).
- **No speculative scope**: out-of-scope list explicit.
- **Conflict handling**: this is the first spec; no conflicts.

## Project Structure

```
specs/changes/001-foundation-auth-and-rbac/
├── plan.md
├── spec.md
├── tasks.md
└── checklist.md
```

No new file is added to the source tree beyond the ones already
present in the corpus.

## Out of Scope

- Multi-tenant organization onboarding (out of MVP).
- Password reset flow (future spec).
- OAuth/SSO.
- Refresh tokens (sessions are short-lived and rotated on logout).
