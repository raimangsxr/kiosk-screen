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
  - CHG-037
  - CHG-040
related_adrs:
  []
---

# Admin Shell and Navigation Contract

## Purpose

This active contract is the current source of truth for `ADMIN.SHELL.NAVIGATION`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- Authenticated users see a Material admin shell with grouped sidenav navigation (Operación, Configuración, Acceso) and footer links to hall and kiosk mode.
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
- The admin dashboard at `/admin` is an **operations center**, not a duplicate of sidenav navigation. It answers readiness, live display status, recent activity, and programmed content order.

### Dashboard sections (above-the-fold order)

1. **Operations summary** — readiness chip; display online/offline; remote-control mode (rotación / iframe / fijo); ads visible/hidden; last updated; pinned content title in fixed mode; actions: Abrir display, Control remoto.
2. **Readiness alerts** — blockers and warnings with resolve navigation (same route heuristics as `/admin/readiness`). Omitted when ready with no warnings.
3. **Content queue** — active top content in `displayOrder` with labels for regular, recurrente (cada N), and fijo elegible; pinned item highlighted in fixed mode. Excludes novelty items from the list.
4. **Recent activity** — bounded list (≤15) of display audit events, newest first, with severity and timestamp. Section-level empty and error states; does not fail the whole page.

### Removed dashboard behavior

- Legacy **section-summary card grid** (Contenido, Anuncios, Evento, Iframes, Pantalla, Usuarios counts) MUST NOT be shown.
- Static **quick-action card grid** duplicated from sidenav MUST NOT be shown as primary navigation.

### Partial degradation

When an upstream source fails, only that section shows degraded/unavailable state; other sections continue to render. The operations hero shows a section-level retry control when the live-status source fails (re-fetches live slice without full page reload). Overall page MUST NOT blank except auth/session failure.

### Dashboard copy and layout

- All dashboard operator copy is Spanish.
- Dashboard MUST NOT introduce horizontal page scroll on compact or expanded admin viewports.
- Long content and event titles in queue/activity rows use ellipsis truncation; hero pinned title wraps up to two lines.

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
- CHG-037 — remove drawer search filter; short nav list is scannable without search.
- CHG-040 — operations dashboard: hero, readiness alerts, content queue, activity feed; legacy section grid removed.
