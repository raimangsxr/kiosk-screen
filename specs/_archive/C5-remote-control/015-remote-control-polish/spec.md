---
capability: C5-remote-control
supersedes:
  - 006-remote-control-display — Material 3 page rewrite (orphaned by reality)
superseded_by:
status: closed
oversize: false
---

# Feature Specification: Remote Control Admin Polish

**Feature Branch**: `015-remote-control-polish`
**Spec Directory**: `specs/015-remote-control-polish/`
**Created**: 2026-06-19
**Status**: Draft

**Input**: User feedback: "Quiero hacer algunos ajustes: No me convence la
distribución y la UI de remote-control, revísalo y hazlo más amigable y con
mejor apariencia, puedes incluir algún toast de confirmación de acciones por
ejemplo. También en el dropdown de iframe esperaría poder listar los iframes
configurados en el site de administración. Revisa también la UX porque no
queda claro al usuario como funciona todo, no es especialmente intuitivo.
Recuerda que lo quiero mobile first y que siga las guidelines de Angular
Material. También quiero mejorar la navegabilidad de remote-control ya que no
es posible volver a hall."

## Clarifications

### Session 2026-06-19

- Q: When the kiosk has no active iframes, what should the Iframe option
  show? → A: The "Iframe" radio is rendered disabled with helper text
  "No iframes configured. Add one in the admin content section." plus a
  primary action linking to `/admin/content/new`. The user can still
  pick Rotation.
- Q: When the operator hides ads, do we need a confirm dialog? → A: No.
  Hiding ads is reversible in one toggle and the operator can immediately
  restore it. A snackbar confirming the change is enough. The spec does
  not add a confirm dialog.
- Q: When the API is offline and the initial load fails, what does the
  page show? → A: The page header and an `app-admin-state` error block
  with a retry button. The mode/ads controls are not rendered until the
  load succeeds. No local toolbar is rendered.
- Q: After an action succeeds, when does the snackbar appear relative to
  the API call? → A: The snackbar appears immediately on `next` from the
  facade observable. It is not shown on the optimistic state; it is shown
  when the backend confirms. On error, no snackbar; the inline
  `app-admin-state` block is rendered instead.
- Q: Who owns the navigation chrome (toolbar, back link, user menu)? → A:
  The surrounding admin shell (already deployed per spec 011) owns
  navigation. The remote-control page is responsible for the page content
  only and does not render a local toolbar, back button, or user menu.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch the kiosk mode from a clean, mobile-first layout (Priority: P1)

An operator who is on a phone, on a tablet, or on a desktop opens the
remote-control page. The page renders the page header, a status pill
summarizing the current state (mode + ads visibility + last update), and
a content-mode card with two clearly labelled options: **Rotation**
(cycle through all approved content) and **Iframe** (lock the display
on a single approved iframe). Picking a mode updates the kiosk
immediately. Navigation is provided by the surrounding admin shell.

**Why this priority**: The current layout mixes a single button, a
dropdown, and a free-text list in the same card. The operator cannot tell
at a glance what the kiosk is doing or how to change it. This is the
biggest reported pain and the foundation every other story depends on.

**Independent Test**: Can be tested by signing in, navigating to
`/remote-control`, and confirming that the page renders the page header,
the status pill, the Rotation/Iframe radio group, and the Ads card on
any viewport from 360×640 to 1280×800. Picking each radio fires the
corresponding facade call.

**Acceptance Scenarios**:

1. **Given** the operator is on `/remote-control`, **When** the page
   loads, **Then** the page header (eyebrow "Administration", title
   "Remote control") renders, followed by the status pill, the
   content-mode card, and the ads card. No local toolbar or back link
   is rendered by the page itself.
2. **Given** the state has loaded, **When** the operator looks at the
   status pill, **Then** it shows the current content mode (Rotation or
   Iframe), the ads visibility (Visible or Hidden), the display session
   state ("Display online" or "Display offline"), and a human-readable
   "Updated <time>" string.
3. **Given** the operator picks "Rotation", **When** the change succeeds,
   **Then** a snackbar appears with the text "Switched to rotation
   mode." and dismisses itself after 3 seconds.
4. **Given** the operator picks "Iframe" and there are no configured
   iframes, **When** the page renders, **Then** the Iframe option is
   disabled and shows helper text plus a primary action linking to
   `/admin/content/new`.
5. **Given** the operator is on a 360×640 viewport, **When** the page
   renders, **Then** all controls are reachable with the thumb without
   horizontal scrolling and the radio options are stacked vertically.

---

### User Story 2 - Pick the iframe from a visible list of configured iframes (Priority: P1)

An operator who wants to lock the display on a specific iframe sees, on
the same page, a vertical list of every active iframe that is currently
configured in the admin content section. Each item shows the iframe
title and the source URL (shortened). Picking an item immediately
switches the kiosk to that iframe and a snackbar confirms the change
with the iframe title.

**Why this priority**: The current implementation shows a dropdown that
only displays the iframe title, requires the operator to remember what
each title refers to, and offers no preview. The user explicitly asked
for the list of configured iframes to be discoverable. The data is
already returned by `/api/display/remote-control/iframe-options`; the
gap is purely presentation.

**Independent Test**: Can be tested by signing in, navigating to
`/remote-control`, and confirming that the Iframe option expands to a
list of cards, one per active iframe, each with a title and a
shortened source URL. Clicking a card switches the kiosk.

**Acceptance Scenarios**:

1. **Given** the admin has 3 active iframes configured, **When** the
   page renders, **Then** the iframe list shows exactly 3 items, each
   with the title from the admin and the source URL truncated to 48
   characters with an ellipsis when needed.
2. **Given** the operator picks an iframe from the list, **When** the
   change succeeds, **Then** the corresponding radio becomes selected,
   the Iframe option is the active mode, and a snackbar shows "Now
   showing: <title>." and dismisses after 3 seconds.
3. **Given** the operator picks the iframe that is currently selected
   on the backend, **When** the change fires, **Then** the network call
   is still made (the backend is idempotent) and the snackbar confirms
   "Now showing: <title>.".
4. **Given** the operator is on `/remote-control` and the backend has
   0 iframes, **When** the page renders, **Then** the Iframe radio is
   disabled and no iframe list is rendered (the empty state from US1
   covers this).

---

### User Story 3 - See a confirmation snackbar after every successful action (Priority: P2)

Every successful action on the remote-control page (mode change to
Rotation, mode change to a specific iframe, ads shown, ads hidden) is
acknowledged with a short snackbar at the top of the page. The snackbar
auto-dismisses after 3 seconds and includes a "Dismiss" button. The
operator never has to wonder whether the action went through.

**Why this priority**: Without confirmation, the only feedback is the
state pill updating (which the operator has to remember to check) and
the underlying API call. The user explicitly asked for toasts. This
story is small but cuts the perceived risk of the page significantly.

**Independent Test**: Can be tested by signing in, navigating to
`/remote-control`, performing each of the four actions, and confirming
that a snackbar appears with the expected text and disappears after
3 seconds. The snackbar must not appear for failed actions.

**Acceptance Scenarios**:

1. **Given** the operator switches the ads toggle to off, **When** the
   backend confirms, **Then** a snackbar with the text "Ads are now
   hidden." appears and auto-dismisses after 3 seconds.
2. **Given** the operator switches the ads toggle back to on, **When**
   the backend confirms, **Then** the snackbar text is "Ads are now
   visible.".
3. **Given** the operator triggers any action and the backend returns
   an error, **When** the error is surfaced, **Then** no snackbar is
   shown and the inline `app-admin-state` error block is rendered
   instead.
4. **Given** two actions are performed in quick succession, **When**
   the second action succeeds, **Then** the first snackbar is replaced
   by the second (only one snackbar is visible at a time).

---

## Edge Cases

- **No iframes configured**: the Iframe radio is disabled and shows a
  primary CTA to add a new iframe. The Rotation radio stays enabled.
- **Stale iframe**: an iframe that was active when the page loaded but
  was deactivated in the admin section afterwards. On the next page
  load, it is no longer in the list. If the iframe is the currently
  selected one and is removed from the list, the next user action
  shows the error "Selected iframe is not available."; the page does
  not auto-revert the mode.
- **No display session**: the backend reports `displaySessionActive=false`.
  The page renders normally but the status pill includes a "Display
  offline" chip so the operator knows the kiosk is not currently
  polling.
- **Network failure on initial load**: the page renders the page
  header plus an `app-admin-state` error block with a retry button.
  The mode/ads controls are not rendered.
- **Optimistic feedback**: actions are not optimistic. The snackbar
  appears only when the backend confirms. On failure, the snackbar is
  not shown and the inline error is rendered.
- **Multiple in-flight actions**: while a save is in progress, the
  radio group, the iframe list, and the ads toggle are disabled. The
  status pill shows a "Saving…" suffix.
- **User navigates away mid-save**: the save completes in the
  background; the snackbar is not shown because the user has left the
  page (the component is destroyed). The backend is the source of
  truth.
- **Time format**: the "Updated <time>" string uses a relative time
  helper ("just now", "2 minutes ago") for the last 60 minutes, and
  an absolute short format ("14:02", "Yesterday 14:02") beyond that.
  The format is the operator's locale.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The remote-control page MUST NOT render its own
  toolbar, back button, or user menu. The surrounding admin shell
  owns navigation. The page renders the `<app-page-header>` with
  eyebrow "Administration" and title "Remote control", followed by
  the content cards.
- **FR-002**: (Intentionally reserved; navigation is provided by the
  admin shell and is not the responsibility of this page.)
- **FR-003**: The page MUST render a status pill below the page
  header that shows: the current content mode ("Rotation" or
  "Iframe"), the ads visibility ("Visible" or "Hidden"), the display
  session state ("Display online" or "Display offline"), and a
  human-readable "Updated <time>" string.
- **FR-004**: The page MUST render a content-mode card with a radio
  group of two options: "Rotation" and "Iframe". The currently active
  mode MUST be the selected radio.
- **FR-005**: When the Iframe radio is selected and at least one
  iframe is configured, the page MUST show a list of one radio item
  per active iframe, each with the iframe title, a shortened source
  URL (truncated to 48 characters with an ellipsis), and a
  "Currently showing" badge on the currently-selected iframe.
- **FR-006**: When no iframes are configured, the Iframe radio MUST
  be disabled and the page MUST show helper text "No iframes
  configured. Add one in the admin content section." plus a primary
  action linking to `/admin/content/new`.
- **FR-007**: The page MUST render an ads card with a slide toggle
  labelled "Show ads". The toggle's checked state MUST reflect the
  current `adsVisible` value.
- **FR-008**: The page MUST emit a snackbar (3-second auto-dismiss,
  with a "Dismiss" button) immediately after the backend confirms any
  of the following actions: switch to Rotation, switch to a specific
  iframe, set ads visible, set ads hidden.
- **FR-009**: The snackbar text MUST be one of: "Switched to rotation
  mode.", "Now showing: <title>.", "Ads are now visible.", "Ads are
  now hidden.".
- **FR-010**: When a save is in progress, the content-mode radio
  group, the iframe list, and the ads toggle MUST be disabled and the
  status pill MUST show a "Saving…" suffix.
- **FR-011**: The layout MUST be mobile-first: at viewport widths
  ≤ 599.98px the page header, status pill, and all cards render in
  a single column with no horizontal scrolling. At widths
  ≥ 600px the content uses the standard `var(--app-page-max)` width
  and the cards may render side-by-side.
- **FR-012**: Every interactive control MUST meet the minimum touch
  target of `var(--app-touch-target)` (48px) on both axes.
- **FR-013**: The status pill and the cards MUST use the existing
  Material 3 surface and on-surface tokens (no new colors). Buttons
  and toggles MUST use the existing Material 3 `mat-button`,
  `mat-slide-toggle`, `mat-radio`, and `mat-card` components.
- **FR-014**: On initial-load failure, the page MUST render the
  page header and an `app-admin-state` error block with a retry
  action. The mode/ads controls MUST NOT be rendered.
- **FR-015**: Errors during a save MUST be surfaced as an inline
  `app-admin-state` error block. A snackbar MUST NOT be shown for
  failed actions.
- **FR-016**: The page MUST follow the existing Angular Material
  theming (`mat.theme`, `--mat-sys-*` tokens) and MUST NOT introduce
  new colors, fonts, or icon fonts.
- **FR-017**: The page MUST NOT add a new icon font. Existing Material
  icons (`cast_connected`, `loop`, `check_circle`, `campaign`,
  `visibility_off`, etc.) MUST be reused.

### Traceability & Quality Requirements *(mandatory)*

- **TQ-001**: Each functional requirement MUST map to at least one
  user story and one measurable success criterion.
- **TQ-002**: Changed behavior MUST have a testable validation
  method described in this specification or deferred to the
  implementation plan.
- **TQ-003**: Public, integration, data, and user-interface boundaries
  MUST list expected contracts or explicitly state that no boundary
  is introduced. The backend API is unchanged; no new boundary is
  introduced.
- **TQ-004**: Security, observability, and accessibility
  considerations MUST be captured as requirements, assumptions, or
  out-of-scope decisions. Accessibility: the radio group uses a
  fieldset/legend for screen readers; the snackbar uses
  `role="status"`; the status pill uses `aria-live="polite"`; the
  iframe list uses a nested `fieldset` with its own legend; the
  "Currently showing" badge uses `aria-label` for screen readers.
- **TQ-005**: Speculative or future-scope behavior MUST be listed as
  out of scope rather than implemented implicitly.

### Key Entities *(include if feature involves data)*

- **RemoteControlState**: the existing `RemoteControlState` from
  `remote-control.models.ts` (contentMode, selectedContentId,
  selectedIframe, adsVisible, updatedAt, displaySessionActive). No
  new fields.
- **RemoteControlIframeOption**: the existing
  `RemoteControlIframeOption` (id, title, sourceReference, isActive).
  No new fields.
- **StatusPillViewModel**: a UI-only derived model rendered by the
  component. Not persisted. Fields: `mode`, `adsVisible`,
  `displayOnline`, `updatedLabel`, `saving`. Computed from
  `RemoteControlState` and the facade's saving signal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the actions available on the remote-control
  page (switch to Rotation, switch to a specific iframe, toggle ads
  visible, toggle ads hidden) emit a snackbar within 1 second of the
  backend confirmation.
- **SC-002**: The page renders without horizontal scrolling at every
  viewport from 360×640 to 1920×1080. Verified by visual inspection
  in Chrome DevTools.
- **SC-003**: (Intentionally reserved; navigation is provided by the
  admin shell and is not tested at this level.)
- **SC-004**: When no iframes are configured, the Iframe radio is
  disabled and a primary action linking to `/admin/content/new` is
  visible. Verified by a unit test that sets `iframeOptions` to `[]`
  and asserts the disabled state and the link.
- **SC-005**: On initial-load failure, only the page header and the
  error block are rendered (no local toolbar). Verified by a unit
  test that returns an error from `facade.refresh()` and asserts the
  mode/ads controls are not in the DOM.
- **SC-006**: 100% of existing frontend tests pass after the spec;
  new tests cover the radio selection, the iframe list rendering with
  the "Currently showing" badge, the snackbar emission per action,
  the empty-iframes disabled state, the error-on-load state, the
  in-progress disabled state, the status pill labels, and the
  absence of a local toolbar / hall link.
- **SC-007**: `npm --prefix frontend run build` succeeds with no
  errors or warnings introduced by the spec.
- **SC-008**: The page uses only existing `--mat-sys-*` tokens and
  existing Material icons. Verified by `git diff` showing no new
  color, font, or icon registration.

## Assumptions

- The `RemoteControlFacade` and the `RemoteControlApi` are unchanged.
  The signals exposed today (`state`, `iframeOptions`, `loading`,
  `saving`, `error`, `ready`) are sufficient to drive the new layout.
- The `/api/display/remote-control/iframe-options` endpoint returns
  exactly the iframes the operator expects to see (active
  `embedded_web` items, ordered by `displayOrder`).
- The Angular Material version and the existing `app-page-header`,
  `app-admin-state`, `ConfirmDialogService`, and `BreakpointService`
  are reused. No new shared UI component is introduced.
- The relative time helper ("just now", "2 minutes ago") is inlined
  in the component as a pure function. A library like `date-fns` is
  not introduced.
- The snackbar uses the global `MatSnackBar` provider (already
  available via `provideAnimationsAsync` in `app.config.ts`). No
  custom snackbar component is introduced.
- The surrounding admin shell (already deployed per spec 011) owns
  the navigation chrome (toolbar, sidenav, user menu, back link).
  The remote-control page is responsible for the page content only
  and renders no local navigation chrome of its own.
- The remote-control route stays a top-level route (`/remote-control`)
  and is not moved inside the `AdminShellComponent`. The hall tile
  and the admin sidenav entry (from spec 011) are the entry points.
- The spec does not introduce a new i18n key, route, or
  translation. All copy is in English, matching the rest of the
  admin UI.

## Out of Scope

- Changing the `/api/display/remote-control/*` endpoints or
  introducing new backend fields.
- Renaming the route path `/remote-control` or moving the
  remote-control page inside the `AdminShellComponent`.
- Rendering a local toolbar, back button, or user menu inside the
  remote-control page. Navigation is provided by the admin shell.
- A relative-time pipe or shared utility. The relative time helper
  is a private function in the component.
- A different toast/snackbar component (e.g. custom MDC snackbar).
  The existing `MatSnackBar` is used.
- Adding a confirm dialog for "Hide ads". The spec trusts the
  operator and uses a snackbar instead.
- A real-time status update (e.g. WebSocket). The status pill
  reflects the last `refresh()` call.
- Changing the hall page or the admin sidenav. The sidenav entry
  for "Remote control" is the work covered by spec 011.
- Adding a "Save" / "Cancel" pattern. The page is now a control
  panel that writes through immediately, like the current
  implementation.
- Adding undo support to the snackbar. The spec keeps the
  "Dismiss" button only; the operator can revert through the
  same control (e.g. toggle ads back on).

## Superseded by

- This spec is orphaned by reality (see `reality.md`). The
  Material 3 page rewrite shipped on `main` PR #10; the spec's
  `tasks.md` was never used as the working checklist. The runtime
  behavior is governed by 006 (canonical schema) and amended by 016,
  017, 018. The canonical anchor for display-control amendments is
  `specs/019-display-control-canonical/`.

Amendment chain authored from this spec:
- `specs/_archive/C5-remote-control/015-remote-control-polish/supersedes-006.md`
