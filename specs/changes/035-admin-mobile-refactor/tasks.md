# Tasks: CHG-035 Admin Mobile-First Refactor

## Phase 0 — SDD

- [x] Create change spec and context pack
- [x] Update `ADMIN.SHELL.NAVIGATION` contract
- [x] Register CHG-035 in manifest

## Phase 1 — Foundation

- [ ] `admin-breakpoints.css` + import in `styles.scss`
- [ ] Extend `BreakpointService` (`prefersCards`, `showOverlayNav`)
- [ ] `AdminRouteContextService`
- [ ] `admin-copy.ts`

## Phase 2 — Layout

- [ ] Grouped `AdminNavigationService`
- [ ] `AdminNavDrawerComponent`
- [ ] Refactor shell + toolbar

## Phase 3 — Primitives

- [ ] `AdminPageComponent`
- [ ] `AdminListComponent`
- [ ] `AdminFormShellComponent`
- [ ] `AdminActionBarComponent`
- [ ] `AdminEntityCardComponent`
- [ ] Confirm bottom sheet on compact

## Phase 4 — Migrate screens

- [ ] content-list, ad-list, users-list, api-keys-list, iframe-list
- [ ] content-form, ad-form, user-form, iframe-form, display-config, event-config
- [ ] dashboard, remote-control, readiness

## Phase 5 — Cleanup & validate

- [ ] Remove legacy page-header, data-list, form-page, section-actions
- [ ] Adaptive density
- [ ] Tests green, build green
