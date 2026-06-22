---
capability: C3-admin-shell
supersedes:
  - 005-admin-refactor — brand in toolbar, compact dashboard, sidenav entry for remote control
superseded_by:
status: closed
oversize: false
---

# Feature Specification: Administration UX Polish

**Feature Branch**: `010-admin-cleanup-and-polish`
**Spec Directory**: `specs/011-ux-polish/`
**Created**: 2026-06-19
**Status**: Draft
**Input**: User feedback: "El icono del usuario en el header, no está alineado con el centro vertical del header (toolbar), la imagen sale como descentrada. En la sidenav, el drawer header con la información de user sobra, ya lo veo en el header de la aplicación. Por último, también en la sidenav, el drawer header con lo de 'Kiosk Screen' y 'Administration', me gustaría que estuviese en el header (toolbar) del panel de Administración, no en el sidenav. Me gustaría que el dashboard sea más compacto también."

> This spec is part of a single big-bang release that bundles five
> cleanup specs into the same `010-admin-cleanup-and-polish` branch.
> The other specs cover the Setup-check relabel, dropping the Client
> concept, simplifying the Ad/Content form fields (label removal,
> drag-and-drop reorder), allowing deletion of revoked API keys, and a
> Remote-control discoverability fix (this spec). The Remote-control
> discoverability is the small, in-spec fix that the user asked for
> ("no veo cómo entrar en ese modo") — the feature is already
> implemented; the gap is that the admin sidenav has no entry, so
> the user can only reach it from the hall or the dashboard quick
> action.

## Clarifications

### Session 2026-06-19

- Q: The drawer header (brand + user card) becomes empty after the
  changes — should the file be deleted? → A: Yes. The component is
  unused after this spec; deleting the file is cleaner than keeping
  an empty component.
- Q: The admin toolbar's dynamic page title is currently the only
  text in the toolbar. After moving the brand in, the toolbar shows
  the brand lockup + the page title. Is the page title still needed?
  → A: Yes, keep it. The brand lockup is the static "Kiosk Screen /
  Administration" mark; the page title is the dynamic "Dashboard",
  "Content", "Ads", etc. Both are useful and fit cleanly in the
  toolbar row.
- Q: The user-menu avatar is shared between the admin toolbar and the
  hall toolbar. Does fixing its vertical centering also fix it in
  the hall? → A: Yes, both toolbars use the same `UserMenuComponent`,
  so a single fix in `user-menu.component.ts` covers both.
- Q: For the dashboard compactness, what is "more compact"?
  → A: Reduce internal gaps, section margins, and `mat-card` content
  padding by 4-6px each. The grid stays the same (1/2/3 columns);
  only the spacing shrinks. No new components, no layout restructure.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover Remote Control From the Admin Sidenav (Priority: P1)

An administrator who is anywhere inside the admin panel (not just on
the hall or the dashboard) can navigate to the remote-control page
with one click from the admin sidenav. The entry sits among the
existing admin sections and uses the same Material `mat-list-item`
pattern as its neighbors.

**Why this priority**: The user reported being unable to find the
remote control. The feature is already implemented; the only gap is
discoverability. Adding the sidenav entry is the smallest change
that closes the gap from every admin context, not just the hall and
the dashboard.

**Independent Test**: Can be tested by signing in as an administrator,
opening any admin section (e.g. `/admin/content`), confirming the
sidenav shows a "Remote control" entry, and clicking it to land on
`/remote-control`. The entry should be visible alongside the other
admin sections regardless of which admin sub-route the user is on.

**Acceptance Scenarios**:

1. **Given** an administrator is on `/admin/content` (or any other
   admin sub-route), **When** they look at the sidenav, **Then**
   they see a "Remote control" entry that links to
   `/remote-control`.
2. **Given** an administrator clicks the "Remote control" entry,
   **When** the click resolves, **Then** they are taken to the
   remote-control page and the sidenav entry is marked as active.
3. **Given** the entry is rendered, **When** the user reads the
   summary line, **Then** the summary explains that the page
   switches kiosk content mode and ad visibility (mirroring the
   existing hall-tile copy).
4. **Given** the entry is rendered, **When** the user looks at the
   icon, **Then** the icon is consistent with the rest of the
   sidenav (Material icon font, primary color when active).

---

### User Story 2 - See a Clean Admin Toolbar With the Brand (Priority: P2)

An administrator who opens any admin page sees the "Kiosk Screen"
eyebrow and the "Administration" title rendered in the admin
toolbar (the same toolbar that already shows the page title and the
user-menu). The sidenav no longer carries the brand or the user card;
it is a clean navigation surface that points to sections.

**Why this priority**: The toolbar is the most visible chrome on
every admin page. Putting the brand there centralizes the
application identity at the top of every page. Removing the
duplicated user card from the sidenav reduces visual noise and
avoids the user being shown their name in two places.

**Independent Test**: Can be tested by signing in as an
administrator, opening the admin shell, and confirming the toolbar
shows the brand lockup on the left and the user-menu on the right.
The sidenav should show only the navigation list and the "Enter
kiosk mode" footer button; no user card, no brand block, no top
spacer.

**Acceptance Scenarios**:

1. **Given** an administrator opens the admin shell, **When** the
   toolbar renders, **Then** the left of the toolbar shows the
   "Kiosk Screen" eyebrow and the "Administration" title.
2. **Given** the toolbar renders, **When** the user looks at the
   right of the toolbar, **Then** the user-menu (avatar) is the
   only user-facing element on that side.
3. **Given** the toolbar renders, **When** the user looks at the
   sidenav, **Then** the sidenav has no user card and no brand
   block; it shows the navigation list, a divider, and the "Enter
   kiosk mode" button.
4. **Given** the user navigates between admin sub-routes, **When**
   the page changes, **Then** the toolbar still shows the brand on
   the left and the dynamic page title next to it.

---

### User Story 3 - Use a Tightly-Paced Dashboard (Priority: P3)

An administrator who opens the dashboard sees the same six section
tiles, the same quick-actions grid, the same status pill, and the
same alerts list as today, but with the gaps and margins tightened
so the dashboard fits more information above the fold without
scrolling. The visual hierarchy is unchanged; only the spacing
shrinks.

**Why this priority**: The user described the dashboard as
"needing to be more compact". The current dashboard has a 12px grid
gap, 16px section margins, 16px `mat-card` content padding, and a
16px page-header bottom margin. Reducing these by 4-6px each gives
~15-20% more density without changing the layout or the visual
hierarchy.

**Independent Test**: Can be tested by signing in as an
administrator, opening the dashboard, and confirming the section
tiles, the status row, the alerts list, and the quick-actions
grid are visually tighter (smaller gaps, smaller margins) than
before, while the layout (1/2/3 columns, ordered tiles, status
chips) is unchanged.

**Acceptance Scenarios**:

1. **Given** the dashboard is loaded on a desktop viewport, **When**
   the user views the section-summaries grid, **Then** the gap
   between tiles is visibly tighter than the previous 12px and the
   section margin to the next row is visibly tighter than the
   previous 16px.
2. **Given** the dashboard is loaded, **When** the user reads a
   tile, **Then** the tile's internal padding is tighter than the
   previous 16px while the tile content (icon, title, subtitle,
   status chip, "Open" button) is unchanged.
3. **Given** the dashboard is loaded, **When** the user views the
   alerts list, **Then** the panel's outer margin and inner padding
   are tighter than the previous 16px.
4. **Given** the dashboard is loaded at a tablet viewport, **When**
   the grid renders two columns, **Then** the two-column density
   is the same as the three-column desktop density (one change to
   gap covers all viewports).

---

### User Story 4 - See a Centered User Avatar in the Toolbar (Priority: P3)

An administrator who looks at the admin toolbar (and the hall
toolbar, which uses the same component) sees the user avatar
visually centered in the toolbar's vertical axis. Today the avatar
sits about 2px low because of the Material `mat-icon-button`
internal padding.

**Why this priority**: A 2px visual offset is a polish issue, not a
functional one. It is a one-line CSS fix. It is bundled with this
spec because the user reported it alongside the other toolbar /
sidenav changes and because the fix is a single edit in
`user-menu.component.ts`.

**Independent Test**: Can be tested by signing in, opening the
admin shell, and confirming the user avatar in the toolbar is
visually centered in the toolbar's vertical axis (no
2px-low offset). The hall toolbar (which uses the same component)
must also be centered.

**Acceptance Scenarios**:

1. **Given** the user is signed in, **When** the admin toolbar
   renders, **Then** the user avatar sits on the toolbar's
   vertical center line (not 2px low).
2. **Given** the user navigates to `/hall`, **When** the hall
   toolbar renders, **Then** the user avatar in the hall toolbar
   is also centered (the same component instance is used in both
   toolbars).

---

### Edge Cases

- The admin sidenav is in "over" mode on compact viewports. When the
  user clicks a sidenav entry on a compact viewport, the sidenav
  closes (existing behavior). The new "Remote control" entry must
  follow the same close-on-click behavior as its neighbors.
- The sidenav's `mat-nav-list` is the only content of the sidenav
  after the drawer header is removed. The sidenav's flex layout
  must still work: the nav list should expand to fill the available
  height and the footer button should stay pinned to the bottom.
- The drawer-header file is removed entirely. Any test that imports
  it (`admin-shell.component.spec.ts` or `user-menu.component.spec.ts`)
  must be updated. The spec audit confirms no other file imports
  `DrawerHeaderComponent`.
- The remote-control sidenav entry uses the `cast_connected` Material
  icon. If that icon is not available in the icon font registered by
  the app, the icon-for fallback (`arrow_forward`) renders instead.
  The spec does not add a new icon font.
- The dashboard is used at the 1024×768 minimum supported viewport.
  The compacted spacing must not cause horizontal overflow, must not
  cause tile text to truncate prematurely, and must keep the focus
  ring of each `mat-card` fully visible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The admin sidenav MUST render a "Remote control" entry
  labeled "Remote control" that links to `/remote-control`, with a
  summary line explaining that the page switches kiosk content mode
  and ad visibility.
- **FR-002**: The "Remote control" sidenav entry MUST use the same
  `mat-list-item` pattern as the other admin sections and MUST
  support the existing `routerLinkActive` highlight when the user
  is on `/remote-control`.
- **FR-003**: The admin toolbar MUST render the "Kiosk Screen"
  eyebrow and the "Administration" title on its left side, before
  the dynamic page title.
- **FR-004**: The admin sidenav MUST NOT render the user card or the
  brand block. The only content of the sidenav (above the footer)
  MUST be the navigation list.
- **FR-005**: The `DrawerHeaderComponent` MUST be removed from the
  codebase; its file is deleted and no other file imports it.
- **FR-006**: The user-menu avatar in the admin toolbar and the
  hall toolbar MUST be visually centered in the toolbar's vertical
  axis (no 2px-low offset).
- **FR-007**: The dashboard section-summaries grid MUST use a
  smaller gap than the current 12px (target: 8px) and the section
  margin to the next row MUST be smaller than the current 16px
  (target: 10px).
- **FR-008**: The dashboard `mat-card` tiles MUST use tighter
  internal content padding than the current 16px (target: 12px) on
  the `mat-card-content` and `mat-card-actions` regions.
- **FR-009**: The dashboard alerts panel MUST use tighter outer
  margin and inner padding than the current 16px (target: 10px
  outer, 12px inner).
- **FR-010**: The compact dashboard MUST keep the same 1/2/3 column
  grid breakpoints, the same tile order, the same status-chip
  semantics, and the same quick-actions list as today.

### Traceability & Quality Requirements *(mandatory)*

- **TQ-001**: Each functional requirement MUST map to at least one
  user story and one measurable success criterion.
- **TQ-002**: Changed behavior MUST have a testable validation
  method described in this specification or deferred to the
  implementation plan.
- **TQ-003**: Public, integration, data, and user-interface
  boundaries MUST list expected contracts or explicitly state that
  no boundary is introduced.
- **TQ-004**: Security, observability, and accessibility
  considerations MUST be captured as requirements, assumptions, or
  out-of-scope decisions.
- **TQ-005**: Speculative or future-scope behavior MUST be listed as
  out of scope rather than implemented implicitly.

### Key Entities *(include if feature involves data)*

- **Admin navigation item**: The existing `AdminNavigationItem`
  record. A new entry is added; no fields change.
- **Admin toolbar brand block**: A new, static UI block added to
  `AdminToolbarComponent`. No new entity, no new model, no new
  service.
- **Dashboard spacing tokens**: The existing `--app-section-gap` and
  `--app-page-padding` CSS variables (in `styles.scss`). The
  dashboard's component-scoped overrides may be tightened without
  changing the global tokens (so the rest of the app keeps its
  current spacing).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the user-facing remote-control entry points
  (hall tile, dashboard quick action, admin sidenav) reach
  `/remote-control` in one click.
- **SC-002**: After the spec, the sidenav contains zero
  user-card markup and zero brand markup. The `DrawerHeaderComponent`
  file is removed and no other file imports it (verified by
  `grep -r DrawerHeaderComponent frontend/src`).
- **SC-003**: After the spec, the admin toolbar renders the brand
  lockup (eyebrow + title) on every admin sub-route. The hall
  toolbar is unchanged.
- **SC-004**: After the spec, the user-menu avatar in both the
  admin toolbar and the hall toolbar is visually centered in the
  toolbar's vertical axis. The fix is a single CSS line.
- **SC-005**: After the spec, the dashboard's section-summaries
  grid gap is ≤ 8px (down from 12px), the section margin is ≤ 10px
  (down from 16px), and the tile content padding is ≤ 12px (down
  from 16px). The grid breakpoints, tile order, and status-chip
  semantics are unchanged.
- **SC-006**: 100% of existing frontend tests pass after the spec;
  new tests cover the sidenav entry, the toolbar brand, the avatar
  centering, and the dashboard spacing.

## Assumptions

- The remote-control feature on the current branch (commit
  `8c3e194 Implement remote control display polling and state APIs`)
  is the authoritative implementation; the spec does not change
  the remote-control feature itself, only its discoverability in
  the admin sidenav.
- The admin sidenav is the right place for the entry: it is the
  most visible navigation surface once the user is in admin mode
  and it is reachable from every admin sub-route. The hall tile and
  the dashboard quick action remain (they cover other entry
  contexts).
- The icon used for the sidenav entry is `cast_connected` (already
  used in `remote-control.component.ts`). If the icon font does not
  include it, the `iconFor` fallback `arrow_forward` is used; the
  spec does not register a new font.
- The dashboard spacing is tightened via component-scoped CSS in
  `dashboard.component.ts`; the global tokens (`--app-section-gap`,
  `--app-page-padding`) are left unchanged so the rest of the app
  keeps its current spacing.
- The fix for the avatar centering is `line-height: 1` on
  `.user-menu__avatar`. This is the smallest change that removes
  the 2px-low offset without changing the avatar size or the
  button's hit area.
- The toolbar brand block uses the same eyebrow + title typography
  as the existing `drawer-header` lockup so the visual identity is
  consistent with what the user has already seen.

## Out of Scope

- Renaming the route path `/remote-control` or changing the
  remote-control feature's URL.
- Adding a new icon font or registering new Material icons.
- A full responsive redesign of the dashboard. The grid breakpoints
  and tile order are unchanged; only the spacing is tightened.
- A new layout component (e.g. `app-brand-lockup` shared between
  the hall toolbar and the admin toolbar). The spec duplicates the
  small block of markup to keep the change isolated; a follow-up
  spec can extract a shared component if needed.
- A new component for the brand in the admin toolbar. The block is
  inlined into `admin-toolbar.component.ts` to keep the change
  isolated.
- Renaming the toolbar title (the dynamic page title) to a
  breadcrumb. The spec keeps the existing `toolbarTitle` signal and
  renders the page title next to the brand.
- Changes to the kiosk-mode footer button in the sidenav (label,
  icon, link target). The spec keeps the existing "Enter kiosk
  mode" → `/display` link.
- Changes to the hall tile or the dashboard quick action. Both
  remain as they are today; the spec only adds the sidenav entry
  as a third access point.
- Changes to the toolbar's color, height, or background. The spec
  only adds the brand block to the existing toolbar; the visual
  surface of the toolbar is unchanged.

## Superseded by

- No direct behavioral supersession. The brand-in-toolbar and
  compact dashboard layout are still authoritative. The remote-
  control sidenav entry that 011 added is the design source for
  015's Material 3 page rewrite.

Amendment chain authored from this spec:
- `supersedes-005.md` (in this directory)
