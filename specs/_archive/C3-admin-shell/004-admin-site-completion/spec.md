---
capability: C3-admin-shell
supersedes:
superseded_by:
status: closed
oversize: false
---

# Feature Specification: Administration Site Completion

**Feature Branch**: `006-admin-site-completion`

**Created**: 2026-06-17

**Status**: Draft

**Input**: User description: "Administration site will be complete and it would be allow to be fully configured (all configurations, uploads, iframes, etc) by administrator. Also the look and feel of the administration site have to allow a easy way to configure all the kiosk-screen and have to provide a full navegability of the site"

## Clarifications

### Session 2026-06-17

- Q: What should be the primary administration entry experience after login? -> A: Show an administration dashboard with setup status, quick actions, and persistent navigation to every section.
- Q: What should happen when an administrator tries to navigate away from a form with unsaved changes? -> A: Show a warning and let the administrator choose whether to stay or discard changes.
- Q: When is deletion allowed for managed records? -> A: Content and ad records may be deleted by administrators when the existing backend allows deletion; client and approved-domain records should first support deactivate/reactivate, and hard delete is allowed only when no active dependent records would be broken. If a record cannot be deleted, the UI must hide or block delete with a clear explanation.
- Q: What users and roles management is required for this feature? -> A: Administrators must be able to view users, create users, edit display name/email/active status, and assign existing roles. Password reset flows and creation of new role types are out of scope.
- Q: What viewport sizes must be supported for administration usability? -> A: Administration screens must be usable at 1024x768 tablet/desktop minimum and 1440x900 desktop, with navigation still readable and all required actions visible.
- Q: What should "most recent successful save" mean for concurrent edits? -> A: The application accepts last-save-wins behavior: each successful save refreshes the list/detail data, and no older failed save may overwrite the latest successful persisted state.
- Q: How is the 95% usability success target validated for this MVP? -> A: It is a product success metric validated through manual smoke/usability review of the primary setup task set; automated implementation validation covers reachability, labels, feedback states, and viewport checks.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navigate Complete Administration Site (Priority: P1)

An administrator uses one coherent administration area with a dashboard, setup status, quick actions, and persistent navigation to reach all kiosk setup and management sections without needing direct URLs or developer knowledge.

**Why this priority**: The kiosk cannot be practically operated if administrators cannot discover and move between required configuration screens.

**Independent Test**: Can be tested by signing in as an administrator and reaching every administration section from visible navigation within two clicks.

**Acceptance Scenarios**:

1. **Given** an administrator is signed in, **When** they open the administration site, **Then** they see a dashboard with setup status, quick actions, and navigation entries for content, ads, clients, iframe/domain management, display configuration, readiness, users, and roles.
2. **Given** an administrator is in any administration section, **When** they choose another section from navigation, **Then** the selected section opens without requiring a page reload or manual URL entry.
3. **Given** an administrator is on a small screen, **When** they open the administration site, **Then** navigation remains usable and does not hide required sections.

---

### User Story 2 - Configure Kiosk Behavior End-to-End (Priority: P2)

An administrator configures the kiosk screen behavior from the administration site, including display timing, content rotation, ad rotation, inline ad count, animations, active status, ordering, and readiness-relevant settings.

**Why this priority**: Administrators need to fully configure the kiosk without modifying data outside the product interface.

**Independent Test**: Can be tested by changing each configurable kiosk setting from the administration site and confirming the display reflects the saved values.

**Acceptance Scenarios**:

1. **Given** an administrator opens display configuration, **When** they update rotation timing, animation, animation duration, inline ad count, and enabled status, **Then** the settings are saved and visible when returning to the configuration screen.
2. **Given** invalid configuration values are entered, **When** the administrator attempts to save, **Then** the save is blocked and clear validation guidance is shown.
3. **Given** kiosk readiness depends on configured content, ads, domains, and display settings, **When** an administrator opens readiness, **Then** blockers and warnings are shown with links or clear direction to the section that resolves them.

---

### User Story 3 - Manage Content, Ads, and Iframes (Priority: P3)

An administrator creates and manages all display content from the administration site, including uploaded image/video content, iframe content, client image ads, clients, active status, ordering, and rotation overrides.

**Why this priority**: Uploads and iframe entries are central to operating the kiosk and must be manageable without backend access.

**Independent Test**: Can be tested by creating one uploaded image content item, one uploaded video content item, one iframe content item, one client, and one uploaded ad, then confirming each appears in the relevant list with editable metadata.

**Acceptance Scenarios**:

1. **Given** an administrator opens content management, **When** they create image, video, or iframe content with required metadata, **Then** the item appears in the content list and is available to the kiosk display when active.
2. **Given** an administrator opens ads management, **When** they create a client and upload an image ad for that client, **Then** the ad appears in the ads list and is available to the kiosk display when active.
3. **Given** an administrator edits content or ad metadata, **When** they save changes, **Then** the list and display use the most recent saved values.
4. **Given** an administrator attempts to delete a managed record, **When** deletion is allowed by the record policy, **Then** the record is removed and no active dependent record is broken; otherwise deletion is unavailable or blocked with clear guidance.

---

### User Story 4 - Use a Clear Administration Experience (Priority: P4)

An administrator can understand the current kiosk setup status, complete common tasks efficiently, and recover from validation or upload errors without external instructions.

**Why this priority**: A complete administration site must be usable during live kiosk preparation, when mistakes and missing setup need to be obvious.

**Independent Test**: Can be tested by asking a non-developer administrator to complete the primary setup flow using only visible labels, navigation, and feedback.

**Acceptance Scenarios**:

1. **Given** an administrator opens any management list, **When** records exist, **Then** the list shows meaningful status, ordering, type, and action information.
2. **Given** no records exist in a section, **When** the administrator opens that section, **Then** the empty state explains what can be added and provides the relevant action.
3. **Given** a save or upload fails, **When** the error is shown, **Then** the administrator can identify the failed item and what needs correction.
4. **Given** an administrator has unsaved form changes, **When** they try to navigate away, **Then** they are warned and can choose to stay or discard the changes.
5. **Given** an administrator opens users and roles, **When** they create or edit a user, **Then** the user details, active state, and existing role assignments are saved and visible in the list.

### Edge Cases

- Administrator opens a section with no content, ads, clients, users, domains, or readiness data.
- Administrator attempts to save invalid rotation values, missing required metadata, unsupported files, or oversized uploads.
- Administrator navigates away from a form with unsaved changes; the site warns them and lets them stay or discard the changes.
- Administrator attempts to create iframe content before an approved domain exists.
- Administrator uploads media while another administrator edits the same item; the most recent successful save is retained.
- Uploaded media is missing or cannot be loaded after it was previously saved.
- Administration navigation is used at the 1024x768 minimum supported viewport, 1440x900 desktop viewport, or a large kiosk-management monitor.
- A backend or storage error occurs during save, upload, or configuration update.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The administration site MUST provide visible navigation to content, ads, clients, iframe/domain management, display configuration, readiness, users, and roles.
- **FR-002**: Administrators MUST be able to reach every administration section from the administration site without manually entering a URL.
- **FR-003**: The administration site MUST show the current active section and provide a consistent way to return to other sections.
- **FR-003A**: The administration site MUST provide a dashboard entry screen with setup status, quick actions, and persistent navigation to every administration section.
- **FR-004**: Administrators MUST be able to create, view, edit, activate/deactivate, order, and delete main display content when existing backend deletion succeeds.
- **FR-005**: Administrators MUST be able to upload image and video content with required metadata and optional item-level rotation settings.
- **FR-006**: Administrators MUST be able to create iframe content entries with required metadata and approved source information.
- **FR-007**: Administrators MUST be able to create, view, edit, activate/deactivate, order, and delete client ads when existing backend deletion succeeds.
- **FR-008**: Administrators MUST be able to upload image ads with required metadata, client association, and optional item-level rotation settings.
- **FR-009**: Administrators MUST be able to create, view, edit, activate/deactivate, and delete clients only when no active ads depend on the client; otherwise the client MUST be deactivated instead of deleted.
- **FR-010**: Administrators MUST be able to create, view, edit, activate/deactivate, and delete approved iframe domains only when no active iframe content depends on the domain; otherwise the domain MUST be deactivated instead of deleted.
- **FR-011**: Administrators MUST be able to configure display-level defaults for content rotation, ad rotation, animation, animation duration, inline ad count, event duration, and enabled status.
- **FR-012**: Administrators MUST be able to view users, create users, edit user email/display name/active status, and assign existing role types needed to operate the kiosk; password reset flows and creating new role types are out of scope.
- **FR-013**: The administration site MUST show readiness blockers and warnings with enough context for administrators to resolve missing setup.
- **FR-014**: Lists MUST show meaningful row information including name or title, type, active status, order where relevant, and whether uploaded media or iframe/source data is present.
- **FR-015**: Forms MUST show clear success, validation failure, authorization failure, upload failure, and storage failure states in language understandable to non-technical administrators.
- **FR-016**: The administration site MUST prevent invalid or incomplete changes from being saved when required fields or value limits are violated.
- **FR-017**: The administration site MUST preserve the most recent successful save when concurrent administrator edits affect the same item or configuration, using last-save-wins behavior and refreshing list/detail data after each successful save.
- **FR-018**: The administration site MUST provide usable empty states with an action to add the first record for sections that support creation.
- **FR-019**: The administration site MUST provide navigation and forms that are usable with keyboard input and readable at 1024x768 and 1440x900 viewport sizes.
- **FR-020**: The administration site MUST avoid exposing internal file paths, secret values, or raw session data in normal screens or error messages.
- **FR-021**: The administration site MUST warn administrators before leaving a form with unsaved changes and allow them to stay or discard those changes.

### Traceability & Quality Requirements *(mandatory)*

- **TQ-001**: Each functional requirement MUST map to at least one user story and one measurable success criterion.
- **TQ-002**: Changed behavior MUST have a testable validation method described in this specification or deferred to the implementation plan.
- **TQ-003**: Public, integration, data, and user-interface boundaries MUST list expected contracts or explicitly state that no boundary is introduced.
- **TQ-004**: Security, observability, and accessibility considerations MUST be captured as requirements, assumptions, or out-of-scope decisions.
- **TQ-005**: Speculative or future-scope behavior MUST be listed as out of scope rather than implemented implicitly.

### Key Entities

- **Administration Section**: A navigable area for a specific kiosk-management responsibility such as content, ads, clients, domains, configuration, readiness, users, or roles.
- **Main Content Item**: A photo, video, or iframe entry shown in the top display region with metadata, active status, ordering, and optional rotation overrides.
- **Client Ad Item**: An image ad associated with a client and shown in the bottom display region with metadata, active status, ordering, and optional rotation overrides.
- **Client**: An advertiser or sponsor associated with ads.
- **User and Role Assignment**: An administrator account record with display details, active status, and one or more existing role assignments.
- **Display Configuration**: Settings that control kiosk display timing, animation, inline ad count, event duration, and enabled state.
- **Readiness Status**: The current set of blockers and warnings that affect whether the kiosk can be used successfully.
- **Administrator**: A signed-in user with permission to manage all kiosk configuration and administration data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can reach every administration section from the administration site in two clicks or fewer.
- **SC-002**: An administrator can complete the basic kiosk setup flow, including content upload, iframe entry, client creation, ad upload, and display configuration, in under 10 minutes using only the administration site.
- **SC-003**: 100% of required kiosk settings, uploads, iframe/domain setup, clients, ads, users, and roles are configurable from visible administration screens.
- **SC-004**: 100% of invalid required fields, invalid numeric values, unsupported upload types, and oversized upload attempts are blocked before saving active kiosk data.
- **SC-005**: At least 95% of non-developer administrators can identify where to change content, ads, clients, domains, display settings, readiness, and users during manual usability review of the primary setup task set.
- **SC-006**: Administration lists and forms remain usable without overlapping text or hidden required actions at 1024x768 and 1440x900 viewport sizes.
- **SC-007**: Administrators receive actionable feedback for save, upload, validation, and storage failures within 5 seconds of the failed action.
- **SC-008**: No normal administration screen or user-facing error exposes internal file paths, secrets, or raw session data.

## Assumptions

- Existing administrator authentication and administrator role concepts remain in use.
- This feature focuses on the administrator experience; non-administrator role-specific screens are outside this feature unless needed for navigation clarity.
- Existing kiosk display behavior, media storage behavior, upload limits, and approved-domain policy remain in force.
- The administration site is primarily used on desktop or tablet devices by operators preparing or maintaining the kiosk.
- Mobile phone optimization is limited to keeping navigation and forms usable, not creating a separate mobile-first administration product.
- Deletion is secondary to deactivation for clients and approved domains because active dependent ads or iframe content must not be broken.

## Out of Scope

- New kiosk display playback behavior beyond configuration visibility and management.
- New media types beyond existing supported content and ad types.
- Advanced workflow approval, scheduled publishing, analytics, billing, or ad targeting.
- Multi-organization administration.
- Password reset flows and creation of new role types.
- Visual rebranding beyond improving administration usability, clarity, and navigation.

## Superseded by

- `005-admin-refactor` — Material 3 admin shell redesign.
- `011-ux-polish` — compact dashboard, brand in toolbar.

Amendment chain:
- `specs/_archive/C3-admin-shell/005-admin-refactor/`
- `specs/_archive/C3-admin-shell/010-admin-polish-bundle/011-ux-polish/supersedes-005.md`
