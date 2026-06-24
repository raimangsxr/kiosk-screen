---
id: ADMIN.SHELL.NAVIGATION
type: contract
status: active
source_of_truth: true
owns:
  - frontend/src/app/features/admin-shell/**
  - frontend/src/app/core/layout/**
  - frontend/src/app/core/routing/**
  - frontend/src/app/features/dashboard/**
  - frontend/src/app/shared/dirty-form.guard.ts
  - frontend/src/app/shared/ui/**
tests:
  - backend/tests/**/*
  - frontend/src/app/**/*.spec.ts
related_changes:
  - CHG-013
related_adrs:
  []
---

# Admin Shell and Navigation Contract

## Purpose

This active contract is the current source of truth for `ADMIN.SHELL.NAVIGATION`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- Authenticated users see a Material admin shell with persistent navigation to configured admin pages.
- The hall page and dashboard route operators to setup and live-event workflows.
- Dirty forms warn before navigation loses unsaved changes.
- Navigation respects route guards and user roles.
- Shared admin UI components provide consistent loading, empty, error, and confirmation states.

## Public interfaces

- `Angular routes under /admin`
- `Dirty-form guard contract`

## Owned code paths

- `frontend/src/app/features/admin-shell/**`
- `frontend/src/app/core/layout/**`
- `frontend/src/app/core/routing/**`
- `frontend/src/app/features/dashboard/**`
- `frontend/src/app/shared/dirty-form.guard.ts`
- `frontend/src/app/shared/ui/**`

## Quality gates

- Changed behavior must be covered by automated tests or an explicit manual validation task with rationale.
- The manifest entry for this contract must be updated when owned paths or related changes move.
- Durable technical rationale belongs in `docs/adr/`, not only in feature `plan.md` files.

## Non-goals

- A public marketing site is outside this contract.

## Change history

- CHG-013
