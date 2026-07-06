---
id: USERS.ROLES.ADMIN
type: contract
status: active
source_of_truth: true
owns:
  - backend/app/api/users.py
  - backend/app/api/v1/users/**
  - backend/app/application/users/**
  - backend/app/domain/roles.py
  - frontend/src/app/features/users/**
  - frontend/src/app/core/auth/**
tests:
  - backend/tests/**/*auth*
  - backend/tests/**/*user*
  - frontend/src/app/**/*auth*.spec.ts
  - frontend/src/app/features/users/**/*.spec.ts
related_changes:
  - CHG-010
  - CHG-001
related_adrs:
  []
---

# Users and Roles Admin Contract

## Purpose

This active contract is the current source of truth for `USERS.ROLES.ADMIN`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- Authorized administrators can list users with active status and role assignments.
- New users require valid email, display name, at least one supported role, and an initial password (minimum 8 characters).
- Administrators can reset passwords for existing users in their organization.
- Editing user roles and active state preserves the last-administrator guard.
- Inactive users cannot continue using privileged admin workflows after session refresh.
- User-facing validation errors are clear and do not expose internals.

## Public interfaces

- `GET /users`
- `POST /users` (requires `password` in body)
- `PUT /users/{id}`
- `PUT /users/{id}/password`

## Owned code paths

- `backend/app/api/users.py`
- `backend/app/api/v1/users/**`
- `backend/app/application/users/**`
- `backend/app/domain/roles.py`
- `frontend/src/app/features/users/**`
- `frontend/src/app/core/auth/**`

## Quality gates

- Changed behavior must be covered by automated tests or an explicit manual validation task with rationale.
- The manifest entry for this contract must be updated when owned paths or related changes move.
- Durable technical rationale belongs in `docs/adr/`, not only in feature `plan.md` files.

## Non-goals

- Email invitation / magic-link onboarding is outside scope.

## Change history

- CHG-010
- CHG-001
- CHG-033
