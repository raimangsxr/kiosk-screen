# Research: Remote Control Admin Polish

This research document captures the decisions made for the rewrite of the
remote-control admin page (`/remote-control`). It is the output of
Phase 0 of the implementation plan.

> **Note (2026-06-20)**: The original plan included a local `mat-toolbar`
> on the remote-control page. The user clarified that the surrounding
> admin shell (already deployed per spec 011) owns the navigation chrome
> (toolbar, back link, user menu), so the page no longer renders any
> navigation chrome of its own. The page header eyebrow was also changed
> from "Hall" to "Administration" to match the admin context.

## Decision 1: Use the existing `mat-radio-group` for the mode choice

- **Decision**: Render the Rotation / Iframe choice as a `mat-radio-group`
  with two `mat-radio-button` options. When the Iframe option is
  selected, render the list of available iframes as a nested
  `mat-radio-group` with one `mat-radio-button` per iframe.
- **Rationale**: The existing `mat-radio-group` Material component
  already implements the ARIA `radiogroup` role, keyboard navigation
  (arrow keys, space, enter), and a visible focus ring. The nested
  pattern (a second `mat-radio-group` rendered conditionally) is a
  supported Material pattern and keeps the operator on a single
  control surface (no mode dropdown + iframe dropdown combination to
  reason about).
- **Alternatives considered**:
  - `mat-select` for the mode + `mat-select` for the iframe: keeps
    the dropdown pattern from the current implementation but
    duplicates the dropdown affordance and does not solve the
    "list of configured iframes" feedback.
  - `mat-button-toggle-group` for the mode + `mat-radio-group` for
    the iframe: visually nice but `mat-button-toggle-group` is a
    toggle pattern, not a radio pattern, and is harder to make
    keyboard-accessible on small screens.
  - `mat-tab-group` with a "Rotation" tab and an "Iframe" tab:
    wrong metaphor; tabs are for parallel views, not for a single
    choice with dependent content.

## Decision 2: Use `mat-chip-set` for the status pill

- **Decision**: Render the status pill as a `mat-chip-set` with one
  `mat-chip` for the mode, one for the ads visibility, one for the
  display session state, and a trailing text node for the "Updated
  <time>" string.
- **Rationale**: `mat-chip` is the smallest Material 3 surface that
  fits the four pieces of information in one row. It supports
  `aria-live="polite"` (announced on change) and can be color-coded
  through the existing `StatusChipComponent` (`status-chip.component.ts`)
  already used by the dashboard.
- **Alternatives considered**:
  - A `mat-card` with four text rows: too tall on mobile.
  - A `mat-list` with four `mat-list-item` rows: even taller; same
    problem.
  - Four separate `mat-chip` components without the `mat-chip-set`
    wrapper: loses the announced region and the consistent spacing.

## Decision 3: Inline a tiny `relativeTime` helper

- **Decision**: Define a private pure function `relativeTime(iso: string): string`
  at the bottom of `remote-control.component.ts`. The function returns:
  - `"just now"` if the delta is < 30 seconds.
  - `"N seconds ago"` if the delta is < 60 seconds.
  - `"N minutes ago"` if the delta is < 60 minutes.
  - `"HH:MM"` if the delta is in the same day.
  - `"Yesterday HH:MM"` if the delta is in the previous day.
  - `"YYYY-MM-DD HH:MM"` beyond that.
- **Rationale**: The spec asks for a human-readable "Updated <time>"
  string without introducing a new dependency. The helper is a pure
  function with no external state, no `Date` constructor magic, and
  no locale switch (the kiosk is a single-tenant application for
  the operator's locale, which is set globally).
- **Alternatives considered**:
  - `date-fns` `formatDistanceToNow`: a 14 kB dependency for a
    30-line function is unjustified for a single-component feature.
  - Angular's `DatePipe`: works but does not handle the
    "yesterday" / "HH:MM" boundary the way the operator expects.
  - A shared `RelativeTimePipe`: the spec's Out of Scope list
    defers this; the helper stays private to the component for
    now.

## Decision 4: Use `MatSnackBar` with `duration: 3000` and "Dismiss"

- **Decision**: Emit a `MatSnackBar` immediately after the backend
  confirms any of the three actions. Use `duration: 3000` and
  include a "Dismiss" action label. The snackbar uses the default
  `MatSnackBar` provider.
- **Rationale**: The pattern is already established in the codebase
  (`display-config.component.ts:341`, `api-keys-list.component.ts:201-241`,
  `content-list.component.ts:370-390`). Reusing the same provider
  keeps the operator's mental model consistent.
- **Alternatives considered**:
  - A custom MDC snackbar: not necessary; the default
    `MatSnackBar` already implements `role="status"`, focus
    management, and stacking.
  - A `MatBottomSheet`: not a toast pattern; intrusive.
  - A toast library (e.g. `ngx-toastr`): not justified for one
    component.

## Decision 5: Disable the radio group, the iframe list, and the ads toggle when `facade.saving()` is true

- **Decision**: Add `[disabled]="facade.saving()"` on the mode
  `mat-radio-group`, on each iframe `mat-radio-button`, and on the
  `mat-slide-toggle`. Add a "Saving…" suffix to the status pill.
- **Rationale**: The backend enforces last-valid-change-wins, but
  the operator should see that a save is in progress to avoid
  double-clicking. The status pill is the single source of truth
  for "what is the kiosk doing right now".
- **Alternatives considered**:
  - Optimistic UI: the spec explicitly defers this; the snackbar
    only fires on the backend confirmation.
  - A spinner overlay on the whole page: too intrusive for a
    sub-second save.

## Decision 6: Reuse `app-page-header`, `app-admin-state`, and `MatSnackBar`

- **Decision**: The component imports `PageHeaderComponent` and
  `AdminStateComponent` (already used in the current implementation)
  and adds `MatSnackBar` from `@angular/material/snack-bar` (already
  used in the rest of the codebase). No new shared component is
  introduced.
- **Rationale**: The two shared components are part of the existing
  admin surface. Reusing them keeps the visual language consistent
  with the rest of the admin pages.
- **Alternatives considered**:
  - A new `RemoteControlHeaderComponent` for the inlined toolbar:
    not justified; the toolbar is a one-off visual contract, and
    the spec's Out of Scope list defers a shared toolbar.

## Decision 7: Reuse `BreakpointService` indirectly through CSS variables

- **Decision**: The mobile-first layout uses CSS only, no
  `BreakpointService` injection. The single-column layout at
  ≤ 599.98 px is enforced by the existing `var(--app-page-padding-xs)`
  token and a `@media (min-width: 600px)` rule.
- **Rationale**: The page is a stack of cards; there is no complex
  grid that needs a signal-driven column count. CSS is enough and
  avoids subscribing to `BreakpointObserver` from the component.
- **Alternatives considered**:
  - Use `BreakpointService` to switch between a 1-column and a
    2-column layout: the spec keeps it 1-column everywhere for
    simplicity. A 2-column "content-mode + ads" layout is
    deferred.

## Cross-cutting decisions

- **No new dependencies**: the rewrite uses only `@angular/material`,
  `@angular/router`, `@angular/cdk`, and `rxjs` (already in
  `package.json`).
- **No new icon font**: existing Material icons are reused
  (`arrow_back`, `loop`, `cast_connected`, `check_circle`,
  `campaign`, `visibility_off`, `arrow_forward`, `sync`,
  `error`, `check_circle`).
- **No new CSS tokens**: existing `--mat-sys-*`, `--app-page-*`,
  `--app-touch-target` are reused.
- **No new shared component**: the inlined toolbar, the inlined
  status pill, and the inlined `relativeTime` helper stay in the
  component.
- **No backend change**: the rewrite does not touch
  `RemoteControlFacade`, `RemoteControlApi`, or the routes.

## Open questions (none)

The four clarifications in `spec.md` cover every area of ambiguity.
There are no open questions to research further.
