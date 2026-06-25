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
related_adrs:
  []
---

# Authentication and RBAC Contract

## Purpose

This active contract is the current source of truth for `AUTH.RBAC`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- Bootstrap creates an administrator only when no administrator exists and never exposes bootstrap secrets.
- Authenticated sessions use secure, HTTP-only cookies and all privileged endpoints validate role membership.
- Users can be listed, created, edited, activated/deactivated, and assigned roles by authorized administrators.
- The last active administrator cannot be removed or deactivated.
- Frontend guards redirect unauthenticated users to login and prevent access to unauthorized admin routes.

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
