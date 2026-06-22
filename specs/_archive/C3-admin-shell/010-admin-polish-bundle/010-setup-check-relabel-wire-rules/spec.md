---
capability: C4-configuration-and-setup
supersedes:
superseded_by:
status: closed
oversize: false
---

# Feature Specification: Setup Check Relabel and Wire Empty Rules

**Feature Branch**: `010-admin-cleanup-and-polish`
**Spec Directory**: `specs/010-setup-check-relabel-wire-rules/`
**Created**: 2026-06-19
**Status**: Draft
**Input**: User description: "No entiendo para que vale el Readiness, o me lo explicas bien para que tenga sentido, o lo quitamos. Me gustaría que el dashboard sea más compacto también. [...] el campo de displayOrder en Ads y Content debe ser auto-incremental y editable tras crear [...]. Eliminar el concepto de client [...]."

> This spec is part of a single big-bang release that bundles five cleanup
> specs into the same `010-admin-cleanup-and-polish` branch. The other specs
> cover dropping the Client concept, simplifying the Ad/Content form fields
> (label removal, drag-and-drop reorder), allowing deletion of revoked API
> keys, and a small UX-polish pass on the admin layout. This spec is the
> first to be written because it is the smallest, most isolated change and
> is the natural starting point for the work.

## Clarifications

### Session 2026-06-19

- Q: Is the existing "Readiness" feature being kept or removed? → A: Kept and relabeled.
- Q: What new public name should the feature use? → A: "Setup check" in the
  user-facing surface (nav item label, dashboard button, page title, copy
  text, README, smoke script). The implementation may still be referred to
  internally as "readiness" in code, files, and the API endpoint to keep
  the change small and non-breaking on the wire.
- Q: Should the existing "Readiness" route path be kept? → A: Yes, the
  route path remains `/admin/readiness` so existing deep-links and tests
  continue to work; only the user-visible label, title, and copy change.
- Q: Should the two empty readiness rules be wired? → A: Yes, both
  `unapproved_embedded_domains` and `invalid_sources` should be computed at
  readiness time, blocking kiosk open for unapproved embedded domains and
  warning for media files that are no longer available on disk.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recognize What Setup Check Does (Priority: P1)

An administrator who opens the admin site can immediately understand what
the "Setup check" section is for, because the page title, navigation
label, and the explanatory copy on the page and the dashboard button all
clearly describe it as a preflight verification of the kiosk setup.

**Why this priority**: The single most reported confusion about the
current "Readiness" feature is that the name does not describe what the
feature does. Renaming is the smallest change that solves the largest
share of the user complaint.

**Independent Test**: Can be tested by signing in as an administrator,
opening the administration site, and confirming that the sidenav item,
the dashboard button, the page title, and the page description all read
"Setup check" and explain that the page verifies kiosk setup before
opening the display.

**Acceptance Scenarios**:

1. **Given** an administrator is signed in, **When** they look at the
   admin sidenav, **Then** they see an item labeled "Setup check" (not
   "Readiness").
2. **Given** an administrator opens the setup-check page, **When** the
   page loads, **Then** the page title and short description explain
   that the page verifies all kiosk setup is complete before opening
   the display for an event.
3. **Given** an administrator is on the admin dashboard, **When** the
   dashboard renders, **Then** the button next to the setup-status pill
   reads "Run setup check" (not "Review readiness").
4. **Given** an administrator reads the kiosk-display hint on the
   display configuration page, **When** they toggle the kiosk off,
   **Then** the hint says that the setup check will report the kiosk
   as not ready (the previous copy referred to "readiness" by name and
   is no longer consistent with the new label).

---

### User Story 2 - Catch Iframe Content Using Unapproved Domains (Priority: P2)

An administrator who configures iframe content is told, on the setup-check
page, that an iframe item is referencing a host that has not been approved
in the iframe-domains list, and is given a one-click path to the iframe
domain administration section where the host can be added (or the iframe
item deactivated).

**Why this priority**: Without this rule the kiosk will silently refuse
to display iframes whose host is not on the approved list, leaving the
administrator to debug the issue at runtime on the kiosk itself. Making
this a setup-check blocker surfaces the problem before the event.

**Independent Test**: Can be tested by creating one approved iframe
domain, one iframe content item whose URL host is the approved domain,
and one iframe content item whose URL host is *not* on the approved
list, then opening the setup-check page and confirming that exactly the
non-approved iframe appears as a blocker, with a link to the
iframe-domain administration section.

**Acceptance Scenarios**:

1. **Given** the organization has at least one approved domain and at
   least one iframe content item whose URL host is not on the approved
   list, **When** the administrator opens the setup-check page, **Then**
   the page lists a blocker of the form
   `Embedded domain is not approved: <host>` for each non-approved host
   used by an active iframe item.
2. **Given** all iframe content items reference hosts that are on the
   approved list, **When** the administrator opens the setup-check page,
   **Then** the page does not include any "Embedded domain is not
   approved" blocker.
3. **Given** a blocker is shown, **When** the administrator clicks the
   "Resolve" action on the blocker, **Then** they are taken to the
   iframe-domain administration section (the existing deep-link
   behavior used by other readiness blockers).
4. **Given** an iframe content item is inactive, **When** the
   administrator opens the setup-check page, **Then** that item is not
   considered when computing the unapproved-embedded-domains blocker.

---

### User Story 3 - Notice When Uploaded Media Has Gone Missing (Priority: P3)

An administrator who previously uploaded a media file (image or video)
is told, on the setup-check page, that the file is no longer available
on disk for one or more active content or ad items, so they can re-upload
or deactivate the affected item before the event.

**Why this priority**: A missing media file causes a silent visual
degradation on the kiosk during the event (broken image, blank video
tile). Surfacing this as a setup-check warning gives the administrator a
chance to act before opening the display.

**Independent Test**: Can be tested by uploading a content image,
deleting the underlying file from disk, and confirming the setup-check
page reports a warning of the form
`Source may be unavailable: <title>` for the affected item.

**Acceptance Scenarios**:

1. **Given** an active content or ad item has an uploaded media file
   whose bytes are no longer present at the expected disk location,
   **When** the administrator opens the setup-check page, **Then** the
   page lists a warning of the form
   `Source may be unavailable: <title>` for that item.
2. **Given** all active content and ad items have their media files
   present on disk, **When** the administrator opens the setup-check
   page, **Then** the page does not include any "Source may be
   unavailable" warning.
3. **Given** an item is inactive, **When** the administrator opens the
   setup-check page, **Then** that item is not considered when computing
   the missing-media warning.

---

### Edge Cases

- The setup-check page is opened while the kiosk display is currently
  running. The check is a read-only snapshot; opening the display does
  not change the result, and the running display continues to apply its
  own filtering independently.
- An iframe URL is malformed (cannot be parsed into host + path) or
  uses a non-HTTP(S) scheme. The setup-check page treats the item the
  same way as a non-approved host: the host (or a placeholder) is
  reported as not approved.
- A content or ad item references a media file id that does not exist
  in the media-file-references table. The setup-check page treats the
  item as a missing-media warning.
- The setup check is run while the media storage directory is
  temporarily inaccessible (permission error). The check degrades
  gracefully: missing-media warnings are reported as "could not be
  verified" rather than crashing the page; the existing blockers and
  warnings from the in-DB rules still appear.
- An organization has zero content and zero ads. The setup-check page
  still loads and shows the existing "≥1 active content" and
  "≥1 active ad" blockers; the relabel and the two new rules do not
  change this behavior.
- The setup-check page is loaded by a non-administrator role. The page
  is not exposed to non-admin users today; this spec does not change
  the visibility rules.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The administration site MUST display the navigation item
  that points to the setup-check page with the label "Setup check"
  (not "Readiness").
- **FR-002**: The setup-check page MUST show a page title of "Setup
  check" and a short description that explains the page verifies kiosk
  setup is complete before opening the display for an event.
- **FR-003**: The admin dashboard MUST label the action that opens the
  setup-check page as "Run setup check".
- **FR-004**: The kiosk-display configuration page hint that mentions
  the setup check (when the kiosk is disabled) MUST NOT use the word
  "readiness" in user-visible copy.
- **FR-005**: The repository documentation and the manual smoke script
  MUST be updated so that references to the old name are replaced with
  "Setup check" in user-visible text; the API endpoint, the route path,
  the database columns, and the code-internal identifiers MAY continue
  to use the existing "readiness" naming where changing them would
  expand the scope of this spec.
- **FR-006**: The setup-check computation MUST include, for each active
  iframe content item, a check that the URL host is on the
  organization-approved-domains list, and MUST report one
  `Embedded domain is not approved: <host>` blocker per non-approved
  host that is used by at least one active iframe item.
- **FR-007**: The setup-check computation MUST include, for each
  active content or ad item that references an uploaded media file, a
  check that the underlying file is present on disk under the expected
  media-storage path, and MUST report one
  `Source may be unavailable: <title>` warning per item whose file is
  not present.
- **FR-008**: The setup-check computation MUST consider only active
  items for the unapproved-embedded-domains and missing-media checks
  (consistent with the existing "≥1 active content / ad" rules).
- **FR-009**: The setup-check response shape (`ready`, `blockers`,
  `warnings`) MUST remain unchanged from the current contract; this
  spec only changes the contents of the two lists.

### Traceability & Quality Requirements *(mandatory)*

- **TQ-001**: Each functional requirement MUST map to at least one user
  story and one measurable success criterion.
- **TQ-002**: Changed behavior MUST have a testable validation method
  described in this specification or deferred to the implementation
  plan.
- **TQ-003**: Public, integration, data, and user-interface boundaries
  MUST list expected contracts or explicitly state that no boundary is
  introduced.
- **TQ-004**: Security, observability, and accessibility considerations
  MUST be captured as requirements, assumptions, or out-of-scope
  decisions.
- **TQ-005**: Speculative or future-scope behavior MUST be listed as
  out of scope rather than implemented implicitly.

### Key Entities *(include if feature involves data)*

- **Setup-check report**: The existing `ReadinessReport` payload shape
  (`ready: bool`, `blockers: list[str]`, `warnings: list[str]`). The
  shape is not changed; the strings inside `blockers` and `warnings`
  may grow as new rules are wired. The user-visible surface that
  exposes this payload (the setup-check page and the dashboard alerts
  list) renames itself from "Readiness" to "Setup check".
- **Approved domain**: The existing `ApprovedDomain` entity
  (`host`, `is_active`). It is read-only for the unapproved-domains
  rule; no fields or rows are added or modified by this spec.
- **Top content item / ad item / media file reference**: The existing
  entities. The missing-media check reads the `media_file_id` of each
  active item and the file path from the media-storage service. No
  fields are added.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the user-visible labels, titles, descriptions,
  and buttons that previously referred to "Readiness" by name now
  refer to "Setup check", and 0% of the user-visible surface uses the
  word "readiness" in copy.
- **SC-002**: An administrator who creates one approved domain and one
  iframe content item whose host matches the approved domain sees zero
  unapproved-embedded-domains blockers on the setup-check page.
- **SC-003**: An administrator who creates one iframe content item
  whose host is not on the approved list sees exactly one
  `Embedded domain is not approved: <host>` blocker on the setup-check
  page; the dashboard alerts list shows the same blocker; clicking the
  "Resolve" action navigates to the iframe-domain administration
  section.
- **SC-004**: An administrator who deletes from disk the media file
  backing an active content or ad item sees exactly one
  `Source may be unavailable: <title>` warning on the setup-check
  page within one page reload.
- **SC-005**: The setup-check page continues to load in under 2
  seconds for an organization with up to 1,000 active content and ad
  items, on the same hardware as today. This is a manual validation
  criterion (not an automated test): a single `Path.exists()` call per
  active item on a Linux server with a warm filesystem cache is well
  within budget for 1,000 items, and no automated benchmark is added
  in this spec to keep the change small. The plan documents the
  budget; the validation is a smoke measurement, recorded in
  `quickstart.md`.
- **SC-006**: 100% of the existing readiness-related unit, integration,
  and contract tests continue to pass after the relabel and the new
  rules are added; new unit and integration tests cover the new
  behaviors (unapproved iframe host, missing media file).

## Assumptions

- The current `ReadinessReport` schema (`ready`, `blockers`, `warnings`)
  is the public contract; no consumer is relying on the strings being
  limited to the five current blocker rules. Adding new entries to
  `blockers` and `warnings` is a backward-compatible change.
- The route path `/admin/readiness` is not user-visible in copy; it is
  the only stable deep-link target and is kept as-is to preserve
  existing bookmarks, tests, and links from the admin sidenav.
- The existing media-storage service exposes a deterministic path for
  each media file reference (under
  `<MEDIA_STORAGE_PATH>/<organization_id>/<media_id>-<uuid>.<ext>`).
  This spec uses the same path-resolution helper the rest of the
  application uses; it does not introduce a new storage layout.
- The "Source may be unavailable" check is run on-demand when the
  setup-check page is opened. It is not run continuously, and it is
  not persisted.
- The current setup-check rules (configuration-enabled, event-duration,
  ≥1 active content, ≥1 active ad) remain unchanged in name and shape.
- Non-administrator users do not see the setup-check page; visibility
  rules are out of scope for this spec.
- The dashboard "Review readiness" button is renamed to "Run setup
  check"; the click target and deep-link behavior are unchanged.

## Out of Scope

- Removing the readiness feature entirely. (User decision: keep and
  relabel, not remove.)
- Renaming the API endpoint, route path, database column, code symbols,
  or spec folder from "readiness" to "setup-check". Only the
  user-visible surface is renamed; the internal naming is preserved
  to keep this spec small.
- Automatic media-file repair, re-upload prompts, or
  inventory of orphaned media. The setup-check page surfaces the
  problem; resolution is left to the existing content / ad
  administration sections.
- Continuous or scheduled setup-check evaluation. The check is
  on-demand only.
- A new "iframe scheme allow-list" rule (e.g. blocking `javascript:`
  or `file:` iframes). The unapproved-domains rule already
  filters on the host; schemes are out of scope for this spec.
- Adding a new "Setup check" entry to the kiosk-side runtime. The
  kiosk continues to be controlled by the existing kiosk-enabled
  toggle and the remote control.
- Changing the dashboard tile layout. (The compact-dashboard change
  is a separate spec — `011-ux-polish` in this release.)
- Any change to the existing five setup-check rules (configuration
  enabled, event duration, ≥1 active content, ≥1 active ad,
  pre-existing unapproved-embedded-domains — the latter was declared
  but never produced; this spec wires it).
