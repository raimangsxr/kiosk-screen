# Implementation Plan: Admin Shell and Navigation

**Branch**: `013-admin-shell-and-navigation` | **Date**: 2026-06-23
**Spec**: [spec.md](./spec.md)
**Migration**: none.

## Summary

Wire the Material 3 admin shell, the sidenav, the toolbar, the
breakpoint-driven density, the hall page, the dashboard, and the
dirty-form guard.

## Technical Context

- **Language/Version**: TypeScript 5.8 (frontend only).
- **Primary Dependencies**: Angular 17, Material 3, Angular CDK.
- **Storage**: N/A (state lives in the backend).
- **Testing**: Karma + Jasmine.

## Architecture

### Frontend

- `frontend/src/app/features/admin-shell/admin-shell.component.ts`
  — sidenav + toolbar + `<router-outlet>`.
- `frontend/src/app/features/admin-shell/admin-navigation.service.ts`
  — drives the nav items and the quick actions.
- `frontend/src/app/core/layout/admin-toolbar.component.ts` —
  shared toolbar.
- `frontend/src/app/core/layout/user-menu.component.ts` —
  sign-out menu.
- `frontend/src/app/core/layout/breakpoint.service.ts` —
  reactive breakpoint signals.
- `frontend/src/app/core/theme/density.ts` — `ADMIN_DENSITY`
  injection token.
- `frontend/src/app/features/hall/hall.component.ts` — hall page.
- `frontend/src/app/features/dashboard/dashboard.component.ts` —
  admin dashboard.
- `frontend/src/app/shared/dirty-form.guard.ts` — `dirtyFormGuard`.

## Constitution Check

- **Spec traceability**: every FR maps to a frontend file in
  `features/admin-shell/`, `core/layout/`, `core/theme/`,
  `features/hall/`, `features/dashboard/`, or
  `shared/dirty-form.guard.ts`.
- **Requirement clarity**: 7 FRs, 3 SCs.
- **Plan alignment**: no cross-spec surface; the shell is a
  thin wrapper.
- **Simplicity**: no new dependencies; everything is in Material
  3 and Angular CDK.
- **Contracts**: the cross-spec contracts are the routes in
  `app.routes.ts` (already in place).
- **Testing**: Karma specs for the shell, the dashboard, the
  hall, the dirty-form guard, and the breakpoint service.
- **Security**: the session guard and the auth-root guard are
  the only auth-related surfaces.
- **No speculative scope**: out-of-scope list explicit.
- **Conflict handling**: no new audit events; the sign-out
  action is part of the auth flow (spec 001).

## Project Structure

```
specs/013-admin-shell-and-navigation/
├── plan.md
├── spec.md
├── tasks.md
└── checklist.md
```

## Out of Scope

- Custom theming per organization.
- Admin notifications / toasts.
- Bulk actions across sections.
