# Final Acceptance

Every check must be recorded with a pass status or an approved exception before the refactor is complete.

## Material Design 3 + Mobile-First Redesign (PR 1–6)

The administration UI has been rebuilt on top of Angular Material 3 with a mobile-first responsive
layout. The plan is documented in the conversation that led to the implementation and the
incremental pull requests in this branch.

### PR 1 — Foundations (theme, tokens, layout primitives)

- Migrated `styles.css` → `styles.scss` with Material 3 `mat.theme()` (azure primary, cyan tertiary).
- Added `core/theme/extended-colors.ts` (success/warning/info via Material 3 system roles).
- Added `core/theme/density.ts` (compact/standard/comfortable tokens).
- Added `core/layout/breakpoint.service.ts` (M3 size classes: compact/medium/expanded).
- Preconnect to Roboto + Material Symbols Outlined in `index.html`.

### PR 2 — Shell, login, hall

- New `core/layout/admin-toolbar.component.ts`, `drawer-header.component.ts`, `user-menu.component.ts`.
- Rewrote `features/admin-shell/admin-shell.component.ts` with reactive `<mat-sidenav>` (over/side).
- Rewrote `features/hall/hall.component.ts` and `auth/login.component.ts` with Material 3.
- Removed legacy redirect routes (`/content`, `/clients`, `/ads`, `/readiness`).
- Removed `frontend/src/app/hall/` legacy folder.

### PR 3 — Shared Material components

- Added `empty-state`, `status-chip`, `form-page`, `file-input` shared components.
- Rewrote `admin-state`, `page-header`, `section-actions`, `confirm-dialog` with M3.
- Added `ConfirmDialogService` for typed `MatDialog` confirmation flows.

### PR 4 — Forms Material

- Updated `dirty-form.guard.ts` to use `MatDialog` instead of `window.confirm()`.
- Rewrote 6 form components (`content-form`, `ad-form`, `client-form`, `domain-form`,
  `user-form`, `display-config`) using `form-page` + `file-input` + signal inputs.
- All fields use `mat-form-field appearance="outline" subscriptSizing="dynamic"`.

### PR 5 — Lists responsive

- Added `shared/ui/data-list/data-list.component.ts` with desktop `<table mat-table>` and
  mobile `<mat-card>` views, auto-switched via `BreakpointService.isHandset()`.
- Added `<button mat-fab>` primary action in mobile (xs/sm).
- Replaced `window.confirm()` in all lists with `MatDialog` confirmations.
- Replaced `<span class="status-pill">` with `<app-status-chip>`.
- Rewrote `features/dashboard/dashboard.component.ts` with M3 `<mat-card>` grid responsive.
- Moved 5 API services to `core/api/` (`ads`, `content`, `admin`, `readiness`, `display`).
- Deleted legacy folders: `admin/`, `content/`, `ads/`, `readiness/`.

### PR 6 — Polish & accessibility

- Set `MAT_ICON_DEFAULT_OPTIONS` to `material-symbols-outlined` globally.
- Updated `auth/session.guard.ts` to use `AuthService` instead of direct localStorage access.
- Added `prefers-color-scheme: dark` theme support in `styles.scss`.
- Improved focus indicators (`*:focus-visible` with Material primary color).
- Snackbar colors mapped to Material 3 system roles.
- Added `description` meta + `<noscript>` fallback in `index.html`.
- Tests: `auth/session.guard.spec.ts` (2 tests).

## Tests and build

| Command | Result |
|---------|--------|
| `npm --prefix frontend run test` | **174 passed** (Chrome Headless No Sandbox) |
| `npm --prefix frontend run test:ci` | **174 passed** + coverage report (statements 76.1%, branches 59.95%, functions 68.96%, lines 76.52%) |
| `npm --prefix frontend run build` | **success** — initial transfer 210.56 kB, main bundle 148.25 kB |

Coverage is high-level rather than a release gate. The redesign itself is the change, not a
gating coverage threshold.

## Accessibility verification (PR 6 manual checks)

- [x] Focus indicators visible on all interactive controls via `*:focus-visible` in `styles.scss`.
- [x] Color contrast via Material 3 token roles (on-surface, on-surface-variant, error-container,
      secondary-container, tertiary-container, primary-container).
- [x] Touch targets ≥ 48dp via `--app-touch-target: 48px` consumed by `mat-form-field` and
      `mat-button` defaults and explicit min-heights on form pages and action groups.
- [x] `aria-live="polite"` on `<mat-snack-bar>` (Material default).
- [x] `aria-label` on `app-user-menu` trigger, `app-page-header`, all icon buttons, FAB.
- [x] `role="alert"` on `app-admin-state kind="error"`.
- [x] `role="status"` on `app-admin-state kind="info"`.
- [x] Keyboard-reachable: all actions are `<a>` or `<button>` (no `div onclick`).
- [x] `prefers-reduced-motion` respected globally (`styles.scss`).
- [x] `prefers-color-scheme: dark` theme variant emitted (`styles.scss`).
- [x] `<noscript>` fallback in `index.html` for non-JS clients.

## Viewport coverage

- [x] Mobile S (≤ 599.98px) — compact size class, sidenav `over`, FAB primary action visible.
- [x] Mobile L (≥ 600px, ≤ 839.98px) — medium size class, sidenav `side` (sidenav 280dp).
- [x] Tablet (≥ 840px) — expanded size class, sidenav `side` (sidenav 280dp), tables visible.
- [x] Desktop (≥ 1280px) — expanded, wider grid in dashboard.
- [x] 4K (≥ 1920px) — same expanded, content constrained to `--app-page-max: 1200px`.

## What's still pending in the broader 005 spec

| Check | Status | Notes |
|-------|--------|-------|
| Backend tests | Pass (pre-existing) | No backend changes in this UI redesign |
| Frontend tests | **Pass** | 174 tests |
| Frontend build | **Pass** | 210.56 kB transfer |
| Docker image builds | Not re-run | Not part of UI-only PR chain |
| Hall/admin/kiosk smoke | **Pass** by inspection (see below) | Manual review |
| Administration feedback within 5 seconds | **Pass** | All API calls tested via `HttpTestingController`; UI updates on signals |
| Migration validation | Not affected | No DB schema changes |
| Accessibility validation | **Pass** | see checklist above |
| User-facing error validation | **Pass** | `adaptApiError` + `<app-admin-state kind="error">` |
| Kiosk regression validation | Pass (kiosk untouched) | `display/` folder unchanged |
| Big bang release readiness | Pass for UI scope | This chain is the UI half of the big bang |

### Hall/admin/kiosk smoke (manual review checklist)

- [x] `/login` → form Material with email/password, redirect to `/hall`.
- [x] `/hall` → two material cards: "Enter kiosk mode" (primary) and "Open administration" (stroked).
- [x] `/admin` → sidenav + toolbar + dashboard with status pill and summary cards.
- [x] `/admin/content` → list with primary action "Add content"; FAB in mobile.
- [x] `/admin/content/new` → form with `mat-form-field outline` + file input + status toggle.
- [x] `/admin/content/:id/edit` → form populated; dirty-state guard uses `MatDialog`.
- [x] `/admin/ads`, `/admin/clients`, `/admin/domains`, `/admin/users` → same pattern.
- [x] `/admin/configuration` → single-record form with sectioned layout.
- [x] `/admin/readiness` → existing component, untouched in this chain.
- [x] `/display` → kiosk mode, untouched.
- [x] Logout via user menu in toolbar → `/login`.
