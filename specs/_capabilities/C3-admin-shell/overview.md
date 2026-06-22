# Capability: C3-admin-shell

The admin site's Material 3 shell: theme, layout, navigation, user
menu, shared components, and the bundled "polish" PRs that shipped in
the `010-admin-cleanup-and-polish` release.

## What this capability is

Owns the chrome that wraps every admin page. Includes
`frontend/src/app/features/admin-shell/`, the Material 3 theme, the
shared UI components (`admin-state`, `confirm-dialog`, `page-header`,
`section-actions`, `dirty-form.guard`), and the sidenav entries.

## Owning code

- `frontend/src/app/features/admin-shell/`
- `frontend/src/app/core/layout/`, `core/routing/`, `core/theme/`
- `frontend/src/app/app.config.ts`, `app.routes.ts`
- `frontend/src/app/shared/` (admin-state, confirm-dialog,
  page-header, section-actions, forms)
- `frontend/src/styles.scss`

## Living specs

- Archived: `specs/_archive/C3-admin-shell/004-admin-site-completion/`,
  `…/005-admin-refactor/`, `…/010-admin-polish-bundle/{010,011,012,013,014}…/`

## Stable contracts

- `requireRoles` route guard.
- `dirtyFormGuard` route guard (clean-form on navigate-away prompt).
- `api-error-adapter` (safe user-facing errors).
- Material 3 theme tokens (`mat.theme(azure, cyan)`).
- Breakpoint service (compact / medium / expanded).

## Cross-capability surfaces

- Every admin page (C2, C4, C5, C6, C7) is wrapped by the C3 shell.
- The Material 3 toolbar owns the user menu and the page title.
- The sidenav lists admin sections by capability.

## Recent amendments

- 015-remote-control-polish — Material 3 rewrite of the remote-control
  page (orphaned by reality; see
  `specs/_archive/C5-remote-control/015-remote-control-polish/reality.md`).
- 010-014 — bundled polish release (sidenav reorganization, brand in
  toolbar, compact dashboard, drop label, drop client).

## See also

- `sdd-optimization/05-capability-map-from-code.md`