---
id: AUTH.RBAC
type: contract
status: active
source_of_truth: true
owns:
  - backend/app/auth/**
  - backend/app/domain/roles.py
  - backend/app/api/auth.py
  - backend/app/api/v1/auth/**
  - backend/app/api/v1/users/**
  - backend/app/application/users/**
  - frontend/src/app/auth/**
  - frontend/src/app/core/auth/**
  - frontend/src/app/features/users/**
tests:
  - backend/tests/**/*auth*
  - backend/tests/**/*user*
  - frontend/src/app/**/*auth*.spec.ts
  - frontend/src/app/features/users/**/*.spec.ts
related_changes:
  - CHG-001
  - CHG-010
  - CHG-029
  - CHG-031
related_adrs:
  - ADR-0008
---

# Authentication and RBAC Contract

## Purpose

This active contract is the current source of truth for `AUTH.RBAC`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- Bootstrap creates an administrator only when no administrator exists and never exposes bootstrap secrets.
- Authenticated sessions are stored in `user_auth_sessions` (PostgreSQL), signed with `SESSION_SECRET`, and validated on every backend instance. In-memory session maps are not used.
- Session cookies are HTTP-only; in `APP_ENV=production` they are also `Secure`. Development over HTTP keeps cookies usable without TLS.
- Production startup (`APP_ENV=production`) refuses documented development defaults for `SESSION_SECRET` and `BOOTSTRAP_ADMIN_PASSWORD`.
- `POST /auth/login` enforces per-client rate limiting on failed attempts (429 after threshold). Successful login clears the counter for that client.
- Logout revokes the session server-side; reusing the old cookie fails authentication.
- Session TTL is enforced server-side: 24 hours standard, 30 days with remember-me.
- Users can be listed, created, edited, activated/deactivated, and assigned roles by authorized administrators.
- The last active administrator cannot be removed or deactivated.
- Frontend guards redirect unauthenticated users to login and prevent access to unauthorized admin routes.
- The `authExpiredInterceptor` clears the client session and navigates to `/login` on HTTP 401 or 403 from protected API calls (excluding the login endpoint itself). Anonymous public reads are not affected.
- Auth, display, and user-admin failures return the application error envelope (`code`, `message`, `category`, optional `details`, optional `correlationId` from `x-request-id`).
- Invalid role strings stored for a user yield HTTP 403 with code `invalid_role` when RBAC is enforced (not an unhandled 500).
- Duplicate user email within an organization returns HTTP 409 with code `duplicate_email`.

## Public interfaces

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `/api/v1/auth/*`
- `/api/v1/users/*`

## Owned code paths

- `backend/app/auth/**`
- `backend/app/domain/roles.py`
- `backend/app/api/auth.py`
- `backend/app/api/v1/auth/**`
- `backend/app/api/v1/users/**`
- `backend/app/application/users/**`
- `frontend/src/app/auth/**`
- `frontend/src/app/core/auth/**`
- `frontend/src/app/features/users/**`

## Quality gates

- Changed behavior must be covered by automated tests or an explicit manual validation task with rationale.
- The manifest entry for this contract must be updated when owned paths or related changes move.
- Durable technical rationale belongs in `docs/adr/`, not only in feature `plan.md` files.

## Non-goals

- External identity providers and SSO are outside the current contract.

## Change history

- CHG-001
- CHG-010
- CHG-029
- CHG-031
- CHG-032
