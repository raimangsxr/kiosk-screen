---
capability: C1-kiosk-display-runtime
supersedes:
superseded_by:
status: closed
oversize: false
---

# Feature Specification: Kiosk Screen Content and Ads

**Feature Branch**: `002-kiosk-screen`

**Created**: 2026-06-16

**Status**: Draft

**Input**: User description: "Create the initial product specification for a
greenfield web application that creates a kiosk screen for big-screen display.
The screen has a top area taking four fifths of the full height for photos,
videos, or iframe content, and a bottom area taking one fifth of the full
height for client ads. Focus on target users, goals, journeys, requirements,
acceptance criteria, edge cases, roles, data, non-functional requirements,
out-of-scope items, and success metrics. Do not choose a technology stack, do
not write code, and do not create implementation tasks."

## Clarifications

### Session 2026-06-16

- Q: Should the public kiosk display be open, unlisted, login-protected, or restricted by device/location? -> A: Public display requires an operator login before it can be shown.
- Q: What embedded web content sources are allowed? -> A: Only administrator-approved domains can be used for embedded top content.
- Q: How should content and ads rotate on the kiosk display? -> A: Active items rotate in configured order using each item’s duration.
- Q: What happens to the live display when the operator session expires? -> A: Operator sessions must remain valid for the full configured event duration.
- Q: Who owns kiosk content, ads, clients, and users? -> A: A single organization owns all kiosk content, ads, clients, and users.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run a Kiosk Display (Priority: P1)

An event operator starts a kiosk display on a large screen so attendees can see
the primary event content in the top region and client ads in the bottom
region throughout the event.

**Why this priority**: The product has no value unless a display can reliably
show the defined split-screen layout.

**Independent Test**: Open a configured kiosk display and verify that the top
region occupies four fifths of the visible height, the bottom ad region occupies
one fifth, and both regions show scheduled content without overlapping.

**Acceptance Scenarios**:

1. **Given** an authorized operator is signed in and a kiosk display has at
   least one active top content item and one active ad, **When** the operator
   opens the kiosk display, **Then** the screen shows top content in the upper
   four fifths and ads in the lower one fifth.
2. **Given** the display is open on a large screen, **When** the visible area
   changes size, **Then** the layout preserves the four fifths and one fifth
   height relationship without cropping required controls or mixing regions.
3. **Given** a content item fails to load, **When** the display reaches that
   item, **Then** the display skips it or shows a safe fallback while continuing
   to show the remaining scheduled content.
4. **Given** an operator opens the kiosk display for a configured event
   duration, **When** the event is in progress, **Then** the operator session
   remains valid until the configured event duration ends.

---

### User Story 2 - Manage Main Content (Priority: P2)

A content manager creates and updates the set of photos, videos, and embedded
web content that will appear in the top region of the kiosk display.

**Why this priority**: Event teams need to control the primary content without
changing the display runtime manually.

**Independent Test**: Add one photo, one video, and one embedded content item to
the top content schedule with configured ordering and durations, then verify
each appears in the kiosk top region in that order and with the intended
availability.

**Acceptance Scenarios**:

1. **Given** a content manager has permission to manage display content,
   **When** they add a photo, video, or embedded content item with required
   details, **Then** the item is saved and becomes eligible for display if the
   embedded content source uses an administrator-approved domain.
2. **Given** multiple top content items are active, **When** the kiosk display
   cycles through content, **Then** only active items appear in configured order
   using each item's duration and inactive items are excluded.
3. **Given** a content item is no longer relevant, **When** the content manager
   disables or removes it, **Then** it no longer appears in the display rotation.

---

### User Story 3 - Manage Client Ads (Priority: P3)

An advertising manager creates and updates client ads that appear in the bottom
region of the kiosk display.

**Why this priority**: Client ads are the secondary content stream and must be
controlled separately from the main event content.

**Independent Test**: Add active ads for two clients with configured ordering
and durations, open the kiosk display, and verify that the bottom region rotates
only active ads in configured order while the top region remains independent.

**Acceptance Scenarios**:

1. **Given** an advertising manager has permission to manage ads, **When** they
   add an ad with client identity, media, and display availability, **Then** the
   ad is saved and becomes eligible for the bottom region.
2. **Given** multiple ads are active, **When** the kiosk display is running,
   **Then** ads appear only in the bottom one fifth of the screen in configured
   order using each ad's duration.
3. **Given** an ad reaches the end of its approved availability, **When** the
   kiosk display refreshes or advances, **Then** the ad is no longer shown.

---

### User Story 4 - Review Display Readiness (Priority: P4)

An administrator reviews whether the kiosk has enough valid main content and
ads before an event starts.

**Why this priority**: Operators need a clear way to detect missing or invalid
content before the display is shown publicly.

**Independent Test**: Configure missing, invalid, and valid content states, then
verify the administrator can identify whether the display is ready for use.

**Acceptance Scenarios**:

1. **Given** required display content is missing, **When** the administrator
   reviews readiness, **Then** the system identifies the missing category.
2. **Given** a content item has invalid or inaccessible media, **When** readiness
   is reviewed, **Then** the system identifies the affected item.
3. **Given** all required content and ads are valid, **When** readiness is
   reviewed, **Then** the system indicates the display is ready.

### Edge Cases

- Top content has no active items: the kiosk display MUST show a neutral
  fallback in the top region and clearly indicate the missing content condition
  to authorized users.
- Bottom ads have no active items: the kiosk display MUST preserve the bottom
  region and show a neutral fallback instead of expanding the top region.
- A photo, video, or embedded content item is unavailable: the display MUST
  continue operating with remaining valid items.
- Embedded content cannot load, is blocked, or refuses display: the display MUST
  skip it or show a fallback without affecting ads.
- Embedded content uses a domain that has not been approved by an administrator:
  the content item MUST be rejected or kept inactive until the domain is
  approved.
- Video content has no audio policy defined: the default assumption is muted
  playback for public kiosk use.
- Content duration is missing: the default display duration for static content
  MUST be applied and documented in the content details.
- Rotation order is missing or duplicated: the system MUST provide a clear
  deterministic order before the affected items can appear.
- A screen has an unusual aspect ratio or resolution: the layout MUST preserve
  the top and bottom region proportions and avoid overlap.
- Network connectivity is interrupted after the display opens: already loaded
  content MUST remain visible or continue cycling, and unavailable future content
  MUST use fallback behavior.
- Two managers edit the same content near the same time: the final saved state
  MUST be clear to the user and avoid silently losing changes.
- Unauthorized users attempt to modify content or ads: the action MUST be denied
  and must not affect the running display.
- An unauthenticated user attempts to open the kiosk display: access MUST be
  denied and no event content or ads may be shown.
- An operator tries to open the display without a configured event duration:
  the system MUST require a duration before the live display can start.
- A user attempts to access data outside the owning organization: access MUST be
  denied because all first-release data belongs to a single organization.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a kiosk display view with two persistent
  regions: a top region occupying four fifths of the display height and a bottom
  region occupying one fifth.
- **FR-002**: The system MUST show top-region content independently from
  bottom-region ads so one region can change without resizing or replacing the
  other.
- **FR-003**: The system MUST support photo content items for the top region.
- **FR-004**: The system MUST support video content items for the top region.
- **FR-005**: The system MUST support embedded web content items for the top
  region.
- **FR-006**: The system MUST support client ad items for the bottom region.
- **FR-007**: The system MUST let authorized users create, view, update,
  activate, deactivate, and remove top-region content items.
- **FR-008**: The system MUST let authorized users create, view, update,
  activate, deactivate, and remove bottom-region ad items.
- **FR-009**: Each top content item MUST include type, title or label, source
  reference, active status, display duration or default duration, and optional
  availability window.
- **FR-010**: Each ad item MUST include client name, ad label, source reference,
  active status, display duration or default duration, and optional availability
  window.
- **FR-011**: The kiosk display MUST show only active items whose availability
  window includes the current display time.
- **FR-012**: The kiosk display MUST continue operating when an individual
  content item or ad fails to load.
- **FR-013**: The system MUST provide a readiness state that identifies whether
  the kiosk has at least one valid active top content item and one valid active
  ad.
- **FR-014**: The system MUST separate permissions for display operation,
  top-content management, ad management, and administration.
- **FR-015**: The system MUST prevent unauthorized users from creating,
  modifying, removing, or activating content and ads.
- **FR-016**: The system MUST make the current display state understandable to
  authorized users, including what content or ad is currently shown and whether
  fallbacks are active.
- **FR-017**: The system MUST record meaningful events for content changes,
  ad changes, readiness issues, and display failures.
- **FR-018**: The system MUST provide accessible management workflows for
  keyboard use, clear labels, visible focus states, and readable contrast.
- **FR-019**: The system MUST avoid exposing private management controls,
  secrets, or internal-only details on the public kiosk display.
- **FR-020**: The system MUST let authorized users preview the kiosk layout
  before showing it on the event screen.
- **FR-021**: The system MUST require an authorized operator or administrator to
  sign in before the kiosk display can be opened.
- **FR-022**: The system MUST allow embedded top content only from
  administrator-approved domains.
- **FR-023**: The system MUST let administrators manage the approved-domain list
  for embedded top content.
- **FR-024**: The kiosk display MUST rotate active top content items in
  configured order using each item's duration or the configured default
  duration.
- **FR-025**: The kiosk display MUST rotate active ad items in configured order
  using each ad's duration or the configured default duration.
- **FR-026**: The system MUST require a configured event duration before opening
  the live kiosk display.
- **FR-027**: The operator session used to open the live kiosk display MUST
  remain valid for the full configured event duration.
- **FR-028**: The first release MUST use a single-organization ownership model
  for kiosk configuration, top content, ads, clients, users, roles, approved
  domains, and display events.
- **FR-029**: Authenticated sessions MUST use secure cookie settings,
  invalidation on logout, and cross-site request protections appropriate for
  the configured frontend/backend deployment.

### Traceability & Quality Requirements *(mandatory)*

- **TQ-001**: Each functional requirement MUST map to at least one user story and
  one measurable success criterion.
- **TQ-002**: Changed behavior MUST have a testable validation method described
  in this specification or deferred to the implementation plan.
- **TQ-003**: Public, integration, data, and user-interface boundaries MUST list
  expected contracts or explicitly state that no boundary is introduced.
- **TQ-004**: Security, observability, and accessibility considerations MUST be
  captured as requirements, assumptions, or out-of-scope decisions.
- **TQ-005**: Speculative or future-scope behavior MUST be listed as out of scope
  rather than implemented implicitly.

### Permissions and Roles

- **Display Viewer**: Can view the kiosk display only after an authorized
  operator or administrator has opened it. Cannot change content, ads, readiness
  settings, or permissions.
- **Event Operator**: Can sign in, open the kiosk display, preview it, and
  review current display state. Cannot manage content, ads, or permissions
  unless granted additional roles.
- **Content Manager**: Can manage top-region content items. Cannot manage ads or
  permissions unless granted additional roles.
- **Advertising Manager**: Can manage bottom-region client ads. Cannot manage
  top-region content or permissions unless granted additional roles.
- **Administrator**: Can manage users, roles, readiness review, content, ads, and
  display configuration, including the approved-domain list for embedded top
  content.

All roles operate within the single owning organization for the first release.
Cross-organization access, delegation, and data isolation are outside the first
release scope.

### Data Involved

- **Organization**: Represents the single owner of all first-release kiosk data,
  including configuration, content, ads, clients, users, roles, approved domains,
  and display events.
- **Kiosk Display Configuration**: Defines the display identity, enabled state,
  layout ratio, default durations, rotation rules, configured event duration,
  and readiness rules.
- **Top Content Item**: Represents a photo, video, or embedded web content item
  intended for the top region, including its configured display order.
- **Client Ad Item**: Represents an advertisement associated with a client and
  intended for the bottom region, including its configured display order.
- **Client**: Represents the organization or person whose ad is displayed.
- **Availability Window**: Defines when a content item or ad is eligible to
  appear.
- **Approved Embedded Domain**: Represents a domain authorized by an
  administrator for embedded top content.
- **User**: Represents a person who can view or manage the system.
- **Role Assignment**: Represents what actions a user is allowed to perform.
- **Display Event**: Represents operational events such as content changes,
  ad changes, load failures, readiness warnings, and display start or stop.

### Non-Functional Requirements

- **NFR-001**: The kiosk display MUST remain readable on a large screen from a
  typical event viewing distance.
- **NFR-002**: The display layout MUST remain stable during content transitions,
  failures, and screen resizing.
- **NFR-002A**: Content and ad transitions MUST follow deterministic configured
  order so the display can be verified before an event.
- **NFR-003**: Management workflows MUST be understandable to non-technical event
  staff without requiring implementation knowledge.
- **NFR-004**: The display MUST recover gracefully from individual media or
  embedded content failures without requiring an operator to restart the event
  screen.
- **NFR-005**: The system MUST protect management actions behind role-based
  permissions.
- **NFR-005A**: Operator authentication for a live display MUST remain valid for
  the configured event duration to avoid authorization loss during an event.
- **NFR-006**: The system MUST expose enough operational information for
  authorized users to diagnose missing content, invalid ads, or load failures.
- **NFR-007**: User-facing management screens MUST meet baseline accessibility
  expectations for keyboard navigation, semantic labeling, visible focus, and
  readable contrast.
- **NFR-008**: The kiosk display MUST avoid showing sensitive administrative
  information to event attendees.
- **NFR-009**: Embedded web content MUST be limited to approved domains to
  reduce the risk of unsafe, broken, or unintended pages appearing on the event
  screen.
- **NFR-010**: Session cookies MUST be protected from client-side script access
  and cross-site misuse while preserving the operator's configured event
  duration.

### Out of Scope

- Choosing the technology stack, hosting model, libraries, or implementation
  architecture.
- Writing application code, implementation tasks, or test code.
- Billing, invoicing, ad sales management, or client contract management.
- Advanced ad targeting, impression billing, auctions, or personalization.
- Full digital asset management beyond the content and ad data needed for kiosk
  display.
- Multi-event scheduling beyond optional availability windows for content and
  ads.
- Multi-organization or multi-tenant ownership.
- Client self-service portals for managing their own ads.
- Real-time collaborative editing.
- Native mobile applications.
- Remote hardware control for televisions, projectors, or media players.

### Traceability Matrix

| Requirement | Primary User Story | Success Criteria | Validation Method |
|-------------|--------------------|------------------|-------------------|
| FR-001, FR-002, FR-026, FR-027 | US1 | SC-001, SC-002, SC-008, SC-010 | Display layout and session-duration acceptance test |
| FR-003, FR-004, FR-005, FR-007, FR-009, FR-022, FR-023, FR-024 | US2 | SC-003, SC-006, SC-009 | Content management and domain approval acceptance tests |
| FR-006, FR-008, FR-010, FR-025 | US3 | SC-004, SC-009 | Ad management acceptance tests |
| FR-011, FR-012, FR-024, FR-025 | US1 | SC-002, SC-005, SC-009 | Display rotation and failure handling tests |
| FR-013, FR-016, FR-017 | US4 | SC-007 | Readiness and operational state tests |
| FR-014, FR-015, FR-019, FR-021, FR-028, FR-029 | US1, US2, US3, US4 | SC-006, SC-011 | Role, ownership, session security, and unauthorized access tests |
| FR-018, FR-020 | US1, US4 | SC-002, SC-007, SC-008 | Accessibility and preview validation |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of tested display sizes, the kiosk preserves the four
  fifths top region and one fifth bottom region without visible overlap.
- **SC-002**: An event operator can open a ready kiosk display and confirm both
  regions are showing eligible content within 30 seconds.
- **SC-003**: A content manager can add a valid photo, video, or embedded content
  item and make it eligible for display in under 2 minutes per item.
- **SC-004**: An advertising manager can add a valid client ad and make it
  eligible for display in under 2 minutes.
- **SC-005**: At least 95% of individual content-item load failures during a
  display session do not interrupt the rest of the kiosk display.
- **SC-006**: 100% of unauthorized content and ad modification attempts are
  denied without changing display data.
- **SC-006A**: 100% of embedded content items from unapproved domains are
  rejected or kept inactive before they can appear on the kiosk display.
- **SC-007**: Administrators can identify whether a kiosk is ready for an event
  and see blocking issues in under 1 minute.
- **SC-008**: During stakeholder review, at least 90% of event staff testers can
  correctly explain which region shows event content and which region shows ads
  after viewing the display.
- **SC-009**: In 100% of rotation tests, active top content and active ads
  appear in their configured order using their configured or default durations.
- **SC-010**: In 100% of live-display session tests, an operator session remains
  valid until the configured event duration ends.
- **SC-011**: 100% of first-release content, ads, clients, users, roles,
  approved domains, and display events are associated with the single owning
  organization.

## Assumptions

- The product is for event venues or event teams showing content on a large
  screen visible to attendees.
- The kiosk display is primarily landscape-oriented, but the layout proportions
  must remain valid for other screen sizes.
- Photos, videos, embedded content, and ad media are provided by authorized
  users or trusted sources.
- Opening the kiosk display requires an authenticated authorized operator or
  administrator; attendees view the physical screen and do not interact with the
  application.
- Static content and ads use a configurable default duration when no explicit
  duration is provided.
- Public kiosk video playback is muted by default unless a future approved spec
  defines an audio behavior.
- The first product version manages one kiosk display configuration unless a
  later approved spec adds multi-kiosk or multi-event management.
- The first product version is owned and operated by one organization; support
  for multiple organizations or client-owned ad management requires a future
  approved specification.
