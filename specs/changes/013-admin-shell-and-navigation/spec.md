---
id: CHG-013
type: change
status: consolidated
modifies:
  - ADMIN.SHELL.NAVIGATION
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into:
  - ADMIN.SHELL.NAVIGATION
requires_contract_update: false
read_by_default: false
---
# Feature Specification: Admin Shell and Navigation

**Feature Branch**: `013-admin-shell-and-navigation`
**Spec Directory**: `specs/changes/013-admin-shell-and-navigation/`
**Created**: 2026-06-23
**Status**: Approved
**Input**: the Material 3 admin shell, the sidenav, the
breakpoint-driven compact / standard / comfortable density, the
admin toolbar with the user menu, the dashboard, the hall page,
and the cross-cutting dirty-form guard.

## User Scenarios & Testing

### User Story 1 — Navigate the admin shell (Priority: P1)

An authenticated operator opens any `/admin/*` URL. The admin
shell renders a Material 3 sidenav with the navigation items, a
toolbar with the brand, and the user menu (avatar + sign out).
The shell adapts its density (compact / standard / comfortable)
based on the viewport width via the `BreakpointService`.

**Why this priority**: the shell is the only way to reach any
admin surface.

**Independent Test**: signing in and visiting `/admin` shows the
shell with the sidenav, the toolbar, and the dashboard.

**Acceptance Scenarios**:

1. **Given** a logged-in operator, **When** GET `/admin` is
   visited, **Then** the sidenav, the toolbar, and the
   `AdminDashboardComponent` are rendered.
2. **Given** a viewport under 768 px, **When** any `/admin/*`
   page is rendered, **Then** the sidenav collapses and the
   density is `compact`.
3. **Given** a viewport at 1024 px, **When** any `/admin/*` page
   is rendered, **Then** the sidenav is open and the density is
   `standard`.
4. **Given** an unauthenticated request, **When** GET `/admin` is
   visited, **Then** the session guard redirects to `/login`.

### User Story 2 — Hall page and the dashboard (Priority: P1)

The operator signs in and lands on `/hall`. The hall shows two
cards: "Kiosk display" (with the "Open kiosk" button, disabled
if `ready=false`) and "Administration" (a link to `/admin`). The
admin dashboard at `/admin` shows a readiness summary and a grid
of section cards (Content, Ads, Iframes, Configuration, Event,
Readiness, Users, API Keys, Remote Control).

**Why this priority**: the hall is the entry point; the
dashboard is the first thing the operator sees after `/hall`.

**Independent Test**: with readiness ready, both cards are
visible; with readiness not ready, the "Open kiosk" button is
disabled and the readiness panel is shown on the dashboard.

**Acceptance Scenarios**:

1. **Given** `ready=true`, **When** the operator visits `/hall`,
   **Then** the "Open kiosk" button is enabled and the
   "Administration" link is visible.
2. **Given** `ready=false`, **When** the operator visits `/hall`,
   **Then** the "Open kiosk" button is disabled and a "Resolve
   setup blockers" hint is shown.
3. **Given** the operator visits `/admin`, **Then** the
   dashboard shows a readiness summary, a navigation grid, and
   the brand in the toolbar.

### User Story 3 — Dirty-form guard (Priority: P2)

When the operator attempts to navigate away from a form with
unsaved changes, the guard prompts for confirmation. Escape and
click-outside do NOT trigger the prompt; the form's own
"discard changes" button does.

**Why this priority**: protects against accidental data loss;
not a critical path.

**Independent Test**: open a content form, type a title, try to
navigate to `/admin/users`; the guard prompts; "Stay" keeps the
form, "Discard" lets the navigation through.

**Acceptance Scenarios**:

1. **Given** an unsaved form, **When** the operator clicks a
   sidenav link, **Then** the dirty-form guard prompts for
   confirmation.
2. **Given** the prompt, **When** the operator clicks "Stay",
   **Then** the navigation is cancelled and the form keeps its
   state.
3. **Given** the prompt, **When** the operator clicks "Discard",
   **Then** the navigation proceeds and the form is reset.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST render the admin shell at any
  `/admin/*` route, with a sidenav, a Material 3 toolbar (brand
  on the left, user menu on the right), and a `<router-outlet>`.
- **FR-002**: The shell MUST use the `BreakpointService` to
  switch density (`compact` under 768 px, `standard` at
  768..1279 px, `comfortable` at ≥ 1280 px) and to collapse the
  sidenav under 768 px.
- **FR-003**: The user menu MUST show the operator's display
  name and a "Sign out" item; sign out calls
  `AuthService.logout()` and redirects to `/login`.
- **FR-004**: The hall page at `/hall` MUST show a "Kiosk
  display" card (with the "Open kiosk" button, gated by
  `ready` from `/readiness`) and an "Administration" card.
- **FR-005**: The admin dashboard at `/admin` MUST show a
  readiness summary, a navigation grid of section cards, and
  the brand in the toolbar.
- **FR-006**: The dirty-form guard MUST be applied to every
  `/admin/<entity>/new` and `/admin/<entity>/:id/edit` route via
  `canDeactivate: [dirtyFormGuard]`.
- **FR-007**: The auth guard MUST redirect unauthenticated users
  from any `/admin/*`, `/hall`, or `/display` route to `/login`,
  and MUST redirect authenticated users from `/login` to
  `/hall`.

### Key Entities

- `AdminNavigationItem` (`id`, `label`, `path`, `icon`,
  `requiredRoles`).
- `AdminSectionSummary` (`id`, `label`, `path`, `icon`,
  `description`).
- `AdminViewStateKind` (`idle | loading | empty | ready | saving
  | saved | validation-error | permission-error | conflict-error
  | upload-error | storage-error | unexpected-error`).

## Success Criteria

- **SC-001**: A new operator can sign in, see the hall, click
  "Administration", and reach any admin page in under 30 s.
- **SC-002**: The shell renders correctly on a 375 px mobile
  viewport, a 1024 px tablet, and a 1920 px desktop.
- **SC-003**: The dirty-form guard never blocks an unrelated
  navigation; it only fires on forms with unsaved changes.

## Assumptions

- The shell is a thin wrapper around the Angular router and the
  Material 3 primitives; no business logic lives here.
- The breakpoint service uses CSS media queries under the hood;
  the exact thresholds are listed in FR-002.

## Supersedes

None.

## Superseded by

None yet.
