---
capability: C3-admin-shell
supersedes:
superseded_by:
status: closed
oversize: false
---

# Feature Specification: Administration Refactor

**Feature Branch**: `007-admin-refactor`

**Created**: 2026-06-17

**Status**: Draft

**Input**: User description: "Refactor the current kiosk-screen application so the administration experience and maintainability improve without changing approved kiosk business behavior. Preserve hall, administration, and kiosk flows; improve consistency, testability, accessibility, and maintainability; do not introduce speculative product behavior."

## Clarifications

### Session 2026-06-17

- Q: What is the minimum acceptable scope for this refactor? → A: Complete frontend and backend refactor covering administration, frontend separation, user-facing contracts, backend services, centralized errors, and modular structure.
- Q: What level of compatibility must existing visible contracts keep? → A: Redesign is permitted when changed contracts and flows are documented, migrated, and validated.
- Q: How far can the refactor go on existing persisted data? → A: Persisted data model redesign is permitted when a complete documented migration preserves existing data.
- Q: How should the refactor be delivered? → A: Big bang delivery as one complete release after the full refactor is finished.
- Q: What acceptance gate must block refactor completion? → A: Complete validation covering tests, build, manual smoke, data migration, accessibility, errors, and kiosk regression.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Use A Coherent Administration Experience (Priority: P1)

An administrator can use the administration site through a consistent, professional interface where navigation, actions, forms, tables, validation, loading, empty, and error states behave predictably across all administration sections.

**Why this priority**: The current administration experience feels inconsistent and difficult to maintain. A coherent administration experience is the highest-value slice because it improves daily kiosk setup work without changing kiosk business rules.

**Independent Test**: Sign in as an administrator, open the hall, enter administration, and complete the primary setup flow across content, ads, clients, domains, display configuration, readiness, and users using only visible controls.

**Acceptance Scenarios**:

1. **Given** an authenticated administrator on the hall, **When** they choose the administration option, **Then** they arrive at a clear administration area with persistent navigation to every required section.
2. **Given** an administrator viewing any administration list or form, **When** they interact with common controls, **Then** labels, actions, validation, loading, empty, success, and error states follow a consistent pattern.
3. **Given** an administrator with unsaved changes, **When** they attempt to leave the form, **Then** the system warns them and lets them stay or discard changes.

---

### User Story 2 - Configure Kiosk Content With Reliable Forms (Priority: P2)

An administrator can create and edit content, ads, clients, domains, display configuration, and users using forms that make valid input clear, prevent invalid saves, and preserve the existing kiosk rules.

**Why this priority**: The administration site exists to configure the kiosk. Form reliability and clarity directly affect whether the kiosk can be prepared without developer support.

**Independent Test**: Complete create and edit workflows for one content item, one ad, one client, one approved domain, display configuration, and one user, then verify the resulting data is visible in lists and readiness guidance.

**Acceptance Scenarios**:

1. **Given** an administrator opens a create or edit form, **When** required fields are missing or invalid, **Then** the form clearly identifies the problem before saving.
2. **Given** an administrator saves a valid form, **When** the save succeeds, **Then** the administrator sees confirmation and the list or detail state reflects the saved data.
3. **Given** a save fails because of validation, permission, dependency, upload, or storage issues, **When** the error is shown, **Then** the message is understandable and does not expose internal paths, secrets, or raw technical details.

---

### User Story 3 - Preserve Kiosk Runtime Behavior During Refactor (Priority: P3)

An operator can continue using the hall, kiosk mode, and administration panel exactly as approved while the internal structure is improved.

**Why this priority**: The refactor must not regress approved kiosk behavior. The kiosk display and navigation flow must remain stable during structural changes.

**Independent Test**: Use the hall to enter kiosk mode, confirm the kiosk display rotates eligible content and ads according to existing configuration, press Escape to return to the hall, and enter administration again.

**Acceptance Scenarios**:

1. **Given** an authenticated user on the hall, **When** they choose kiosk mode, **Then** the kiosk display opens with the approved display layout and playback behavior.
2. **Given** kiosk mode is active, **When** the user presses Escape, **Then** the user returns to the hall.
3. **Given** content and ads have existing rotation timing and animation configuration, **When** kiosk mode runs after the refactor, **Then** the same effective timing, ordering, and display rules are respected.

---

### User Story 4 - Maintain And Validate The Application Safely (Priority: P4)

A maintainer can understand, test, and change the application through clearly separated responsibilities, predictable contracts, and focused validation.

**Why this priority**: The refactor is justified by maintainability. The final system must be easier to modify without increasing regression risk.

**Independent Test**: A maintainer can identify where each administration capability is defined, where user-facing contracts live, and how to validate changed behavior through focused tests.

**Acceptance Scenarios**:

1. **Given** a maintainer needs to change a single administration capability, **When** they inspect the application, **Then** the relevant screen, state behavior, user-facing contract, and validation tests are discoverable without searching unrelated sections.
2. **Given** user-facing behavior changes, **When** validation is run, **Then** tests cover the changed behavior at the appropriate boundary.
3. **Given** an application failure occurs, **When** it reaches the user interface, **Then** it is translated into a clear user-facing error and remains observable for maintainers.

---

### Edge Cases

- The administrator opens the administration panel directly instead of entering through the hall.
- The user presses Escape while kiosk mode is loading, after load failure, or while media is rotating.
- A list has no records, many records, inactive records, or records that cannot be deleted because active dependencies exist.
- A form has unsaved changes and the user navigates to the hall, kiosk mode, another admin section, or browser back.
- A save succeeds on the server but the list refresh fails.
- A backend validation or authorization failure occurs after client-side validation passed.
- Uploaded media is too large, unsupported, unavailable, or fails during storage.
- Existing kiosk data was created before the refactor and lacks optional newer metadata.
- Administration pages are used at desktop and tablet-sized viewports.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST keep the hall as the authenticated decision point for entering kiosk mode or the administration panel.
- **FR-002**: The administration panel MUST provide a clear visible action to enter kiosk mode from any administration section.
- **FR-003**: Kiosk mode MUST allow the user to return to the hall using Escape.
- **FR-004**: The refactor MUST preserve all previously approved kiosk business behavior unless a behavior change is explicitly approved in a future specification.
- **FR-004A**: The refactor MAY change visible contracts, navigation details, field grouping, or user flows when the change is documented, migrated, and validated against the same approved business goals.
- **FR-005**: The administration experience MUST use a consistent visual and interaction language for navigation, buttons, forms, tables, status messages, confirmations, and destructive actions.
- **FR-006**: Administration lists MUST provide consistent loading, empty, error, row action, status, and refresh behavior.
- **FR-007**: Administration forms MUST provide consistent validation, dirty-change protection, save confirmation, cancel behavior, and failure feedback.
- **FR-008**: Content and ad configuration workflows MUST continue to support images, videos, iframe content, rotation timing, rotation animation, animation duration, ordering, active status, and existing upload behavior.
- **FR-009**: Client and approved-domain workflows MUST preserve dependency-safe delete behavior and offer deactivate/reactivate as the safe alternative when active dependencies exist.
- **FR-010**: User and role administration MUST continue to support listing, creating, editing, active status, and assignment of existing role types only.
- **FR-011**: Display configuration MUST continue to support existing timing, animation, inline ad count, event duration, name, and enabled settings.
- **FR-012**: Readiness guidance MUST continue to identify blockers and warnings and direct administrators to the section needed to resolve them.
- **FR-013**: User-facing errors MUST be understandable, actionable, and free of internal paths, secrets, raw session data, or stack traces.
- **FR-014**: Application failures that affect administration or kiosk setup MUST remain observable for maintainers through existing or equivalent operational records.
- **FR-015**: The refactor MUST make each administration capability independently testable through visible behavior and stable user-facing contracts.
- **FR-016**: The refactor MUST cover both frontend and backend structure by separating user-interface presentation, screen state, user-facing contracts, backend service responsibilities, application errors, and business rules so future changes can be made in the smallest relevant area.
- **FR-017**: The administration interface MUST remain keyboard usable and readable at 1024x768 and 1440x900 viewport sizes.
- **FR-018**: The refactor MUST not introduce new product features such as analytics, scheduling, billing, targeting, new media types, password reset, or new role types.
- **FR-019**: Existing persisted data MUST remain usable after the refactor without requiring administrators to recreate kiosk content, ads, clients, domains, users, or display configuration.
- **FR-020**: Any intentional behavior or contract change discovered as necessary during planning MUST be documented, justified, and approved before implementation changes direction.
- **FR-021**: Any changed user-facing contract or flow MUST include a migration or compatibility note explaining how existing users, tests, and data continue to work after the refactor.
- **FR-022**: The refactor MAY redesign persisted data structures when the change includes a complete documented migration that preserves existing kiosk content, ads, clients, domains, users, roles, display configuration, media references, and operational records.
- **FR-023**: Any persisted data redesign MUST include validation that migrated data supports the same approved kiosk and administration goals after migration.
- **FR-024**: The refactor MUST be delivered as one complete release rather than incremental production releases.
- **FR-025**: Because delivery is a single complete release, completion MUST include full validation of hall, kiosk mode, administration workflows, changed contracts, migrated data, accessibility, and operational failure handling before acceptance.
- **FR-026**: The refactor MUST NOT be accepted as complete until automated tests, application build, manual hall/admin/kiosk smoke validation, persisted data migration validation, desktop/tablet accessibility validation, user-facing error validation, and kiosk regression validation all pass or have approved documented exceptions.

### Traceability & Quality Requirements *(mandatory)*

- **TQ-001**: Each functional requirement MUST map to at least one user story and one measurable success criterion.
- **TQ-002**: Changed behavior MUST have a testable validation method described in this specification or deferred to the implementation plan.
- **TQ-003**: Public, integration, data, and user-interface boundaries MUST list expected contracts or explicitly state that no boundary is introduced.
- **TQ-004**: Security, observability, and accessibility considerations MUST be captured as requirements, assumptions, or out-of-scope decisions.
- **TQ-005**: Speculative or future-scope behavior MUST be listed as out of scope rather than implemented implicitly.

### Key Entities *(include if feature involves data)*

- **Hall Destination**: A user-facing entry option that directs an authenticated user to kiosk mode or administration.
- **Administration Section**: A navigable area for configuring content, ads, clients, domains, display settings, readiness, users, or roles.
- **Administration Form**: A user-facing workflow for creating or editing an existing configuration record while enforcing validation and dirty-change protection.
- **Administration List**: A user-facing collection view with record status, available actions, empty states, and failure states.
- **User-Facing Contract**: The externally observable behavior, fields, validations, messages, and navigation outcomes that users and tests rely on.
- **Application Error**: A failure condition that must be translated into safe user-facing feedback and remain observable for maintainers.
- **Data Migration**: A documented transition that preserves existing persisted records while moving them to any redesigned data structure.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of approved hall, kiosk, and administration navigation flows continue to pass after the refactor.
- **SC-002**: An administrator can reach every administration section from the hall or admin navigation in two clicks or fewer.
- **SC-003**: An administrator can complete the primary kiosk setup flow across content, ads, clients, domains, display configuration, readiness, and users without manual URL entry.
- **SC-004**: At least 90% of administration screens use the same observable patterns for loading, empty, success, validation, and error states.
- **SC-005**: All create/edit administration forms prevent invalid saves and warn before losing unsaved changes.
- **SC-006**: Existing kiosk display rotation, ordering, timing, animation, and Escape-to-hall behavior remain unchanged in validation.
- **SC-007**: User-facing failure messages for validation, permission, dependency, upload, and storage errors reveal no internal paths, secrets, stack traces, or raw session data.
- **SC-008**: A maintainer can locate the user-facing contract and validation coverage for a changed administration capability within 5 minutes.
- **SC-009**: Changed behavior has automated or documented validation coverage before completion.
- **SC-010**: Administration pages remain readable and keyboard usable at 1024x768 and 1440x900 viewport sizes.
- **SC-011**: A maintainer can locate the relevant frontend screen state, user-facing contract, backend service behavior, and error handling path for each administration capability within 5 minutes.
- **SC-012**: 100% of intentionally changed user-facing contracts and flows have documented migration or compatibility validation before completion.
- **SC-013**: 100% of migrated persisted records required for approved kiosk operation remain available and usable after migration validation.
- **SC-014**: The final release candidate passes complete regression validation for all approved hall, kiosk, administration, contract, migration, accessibility, and error-handling flows before acceptance.
- **SC-015**: 100% of final acceptance gate checks are recorded with pass status or explicit approved exception before the refactor is considered complete.

## Assumptions

- Existing authentication, roles, permissions, content, ads, clients, domains, display configuration, readiness, uploads, media storage, and kiosk runtime behavior remain approved behavior.
- The refactor may reorganize implementation internals, visual components, validation structure, and visible contracts when changes are documented, migrated, and validated against approved business goals.
- Existing local development, deployment, and testing workflows remain the baseline unless a future technical plan identifies a necessary change.
- Existing uploaded files and persisted database records may be migrated to redesigned structures, but the migration must preserve their business meaning and usability.
- Mobile phone layouts are not a primary target for this refactor; desktop and tablet-sized administration use are required.
- New product capabilities are out of scope unless later specified through a separate feature.

## Superseded by

- `011-ux-polish` — compact dashboard, brand in toolbar, sidenav
  entry for remote control.
- `015-remote-control-polish` — Material 3 remote-control page
  rewrite (orphaned by reality; design source only).

Amendment chain:
- `specs/_archive/C3-admin-shell/010-admin-polish-bundle/011-ux-polish/supersedes-005.md`
- `specs/_archive/C5-remote-control/015-remote-control-polish/supersedes-006.md`
