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
- New users require valid email, display name, and at least one supported role.
- Editing user roles and active state preserves the last-administrator guard.
- Inactive users cannot continue using privileged admin workflows after session refresh.
- User-facing validation errors are clear and do not expose internals.

## Public interfaces

- `GET /users`
- `POST /users`
- `PUT /users/{id}`

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

- Password reset flows are not part of this admin contract.

## Change history

- CHG-010
- CHG-001
