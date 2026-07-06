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
  - CHG-035
related_adrs:
  []
---

# Admin Shell and Navigation Contract

## Purpose

This active contract is the current source of truth for `ADMIN.SHELL.NAVIGATION`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- Authenticated users see a Material admin shell with grouped sidenav navigation (Operación, Configuración, Acceso), search filter, and footer links to hall and kiosk mode.
- `BreakpointService.isCompact()` drives overlay sidenav: hamburger menu, backdrop, auto-close on navigation. This applies to handsets and narrow desktop windows.
- `BreakpointService.prefersCards()` (`isCompact() || isHandsetOrTablet()`) selects card vs table layout in `AdminListComponent`.
- `AdminRouteContextService` supplies toolbar and page title, subtitle (e.g. Editar on `/admin/content/:id/edit`), and breadcrumbs on expanded viewports.
- `AdminPageComponent` shows a compact page header on all viewports; expanded viewports also show breadcrumbs.
- Admin UI copy is Spanish. Shared primitives: `AdminPage`, `AdminList`, `AdminFormShell`, `AdminActionBar`, `AdminEntityCard`.
- List screens provide card view with full mobile parity: content/ads support selection, bulk actions, and reorder via up/down controls in card view; iframes have card view with edit/delete.
- Confirmations use `MatBottomSheet` on compact viewports and `MatDialog` on expanded viewports.
- Dirty forms warn before navigation loses unsaved changes.
- Navigation respects route guards and user roles.
- Admin pages never introduce horizontal page scroll. Tables scroll inside list cards; long identifiers wrap; `.app-page` and `.admin-shell__main` use `min-width: 0` and `overflow-x: clip`.

## Public interfaces

- `Angular routes under /admin`
- `Dirty-form guard contract`
- `AdminRouteContextService` (title, subtitle, breadcrumbs)
- `AdminNavigationService` (grouped nav items)

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
- Bottom navigation bar on mobile.

## Change history

- CHG-013
- Bug fix — hide redundant module name on handset viewports and prevent horizontal page scroll.
- CHG-035 — mobile-first refactor: grouped drawer, unified primitives, Spanish copy, list mobile parity.
