# Tasks: Admin Shell and Navigation

**Input**: Design documents from
`specs/changes/013-admin-shell-and-navigation/`.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Verify working branch and the four artefacts.
- [X] T002 [P] Confirm `app.routes.ts` already declares the
      `/admin/*` children (per the inventory in
      `frontend/src/app/app.routes.ts:33-56`).

## Phase 2: Foundational

- [X] T003 [P] `BreakpointService` with the three size classes
      (`compact | medium | expanded`) and the `AdminDensity`
      token at
      `frontend/src/app/core/layout/breakpoint.service.ts`
      and `core/theme/density.ts`.

## Phase 3: User Story 1 — Admin shell

- [X] T004 `AdminShellComponent` with the sidenav, the toolbar,
      and the `<router-outlet>` at
      `frontend/src/app/features/admin-shell/admin-shell.component.ts`.
- [X] T005 [P] `AdminToolbarComponent` and `UserMenuComponent`
      at
      `frontend/src/app/core/layout/admin-toolbar.component.ts`
      and `core/layout/user-menu.component.ts`.
- [X] T006 [P] `AdminNavigationService` at
      `frontend/src/app/features/admin-shell/admin-navigation.service.ts`.

### Tests for User Story 1

- [X] T007 [P] [US1] Karma spec: `AdminShellComponent` renders
      the sidenav and the toolbar.
- [X] T008 [P] [US1] Karma spec: `BreakpointService` reports
      the right size class at three viewport widths (375 px,
      1024 px, 1920 px).

## Phase 4: User Story 2 — Hall and dashboard

- [X] T009 `HallComponent` with the two cards at
      `frontend/src/app/features/hall/hall.component.ts`.
- [X] T010 `AdminDashboardComponent` with the readiness summary
      and the navigation grid at
      `frontend/src/app/features/dashboard/dashboard.component.ts`.
- [X] T011 [P] Hall disables "Open kiosk" when
      `ready=false` (delegates to spec 011).

### Tests for User Story 2

- [X] T012 [P] [US2] Karma spec: `HallComponent` enables /
      disables "Open kiosk" based on readiness.
- [X] T013 [P] [US2] Karma spec: `AdminDashboardComponent`
      renders the readiness summary and the navigation grid.

## Phase 5: User Story 3 — Dirty-form guard

- [X] T014 [P] `dirtyFormGuard` and `DirtyFormAware` at
      `frontend/src/app/shared/dirty-form.guard.ts` (already in
      place; verify all the form routes use it).
- [X] T015 [P] Confirm `canDeactivate: [dirtyFormGuard]` is
      applied to every new / edit route in
      `app.routes.ts:39, 40, 42, 43, 45, 46, 49, 53, 54`.

### Tests for User Story 3

- [X] T016 [P] [US3] Karma spec: `dirtyFormGuard` prompts on
      unsaved changes; "Stay" cancels, "Discard" proceeds.

## Dependencies & Execution Order

- Phase 2 → Phase 3 → Phase 4 → Phase 5.

## Implementation Strategy

Single-contributor path:

1. Phase 1 + 2: 15 min.
2. Phase 3: 1 h (shell + tests).
3. Phase 4: 1.5 h (hall + dashboard + tests).
4. Phase 5: 30 min (guard verification + tests).
