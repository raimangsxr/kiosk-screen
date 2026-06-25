# Implementation Plan: Users and Roles Admin

**Branch**: `010-users-and-roles-admin` | **Date**: 2026-06-23
**Spec**: [spec.md](./spec.md)
**Migrations**: included in `0001_initial_kiosk_schema`.

## Summary

Expose the user CRUD endpoints, the role assignment validation,
the "last administrator" guard, and the admin user form at
`/admin/users`.

## Technical Context

- **Language/Version**: Python 3.11+ (backend), TypeScript 5.8
  (frontend).
- **Primary Dependencies**: SQLAlchemy 2, FastAPI; Angular 17.
- **Storage**: PostgreSQL (production).
- **Testing**: pytest, Karma + Jasmine.

## Architecture

### Backend

- `backend/app/services/admin_service.py` — `list_users`,
  `create_user`, `update_user` (records `user_changed`).
- `backend/app/api/users.py` — the three endpoints, gated by
  `ADMIN_ROLES`.

### Frontend

- `frontend/src/app/features/users/users-list.component.ts` —
  Material list.
- `frontend/src/app/features/users/user-form.component.ts` —
  multi-select for roles.
- `frontend/src/app/features/users/users.facade.ts` — exposes
  `AVAILABLE_ROLES`.

## Constitution Check

- **Spec traceability**: every FR maps to a backend file in
  `app/api/users.py` or `app/services/admin_service.py`, or a
  frontend file in `features/users/`.
- **Requirement clarity**: 7 FRs, 3 SCs.
- **Plan alignment**: no cross-spec surface beyond the
  `user_changed` audit event (spec 012).
- **Simplicity**: no new dependencies.
- **Contracts**: `UserSchema`, `UserRequest` are documented in
  `app/api/schemas.py`.
- **Testing**: integration tests for CRUD, the duplicate email
  409, the deactivated user 401, the last administrator 409.
- **Security**: all endpoints gated by `ADMIN_ROLES`.
- **No speculative scope**: out-of-scope list explicit.
- **Conflict handling**: this spec introduces `user_changed` to
  the audit log; spec 012 covers the full contract.

## Project Structure

```
specs/changes/010-users-and-roles-admin/
├── plan.md
├── spec.md
├── tasks.md
└── checklist.md
```

## Out of Scope

- User self-service password rotation (future spec).
- Email-based password reset (out of MVP).
- SCIM / user provisioning from external IdP.
