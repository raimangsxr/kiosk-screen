# Feature Specification: Remote Control Display

**Feature Branch**: `008-remote-control-display`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "Add a new hall mode for remote control. An administrator uses a separate control device to decide what the kiosk display shows in the content area: the existing photo/video loop or a selected existing iframe. The display device polls for changes and applies them. There is only one kiosk and one control device. Only administrators can use remote control. Remote control can also show or hide ads; when ads are hidden, content occupies the full height. Changes apply immediately. The display starts in loop mode with ads visible. The polling interval is configurable from display configuration, and all display-related configuration must apply hot while the kiosk is already running because the remote display has no practical keyboard or manual refresh access."

## Clarifications

### Session 2026-06-18

- Q: What allowed bounds should apply to the configurable remote control polling interval? → A: 1 to 60 seconds.
- Q: How should close-together remote control updates be resolved? → A: Last valid change wins.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Control Kiosk Content Remotely (Priority: P1)

An administrator can open a remote control mode from the hall on a separate device and immediately switch the kiosk content area between the normal media loop and a selected existing iframe.

**Why this priority**: This is the central value of the feature. The kiosk display must be controllable without touching the kiosk device.

**Independent Test**: Open the kiosk display on one device and the remote control mode as an administrator on another device. Select an existing iframe in remote control and verify that the display changes from the normal loop to that iframe without manual refresh or keyboard input on the kiosk.

**Acceptance Scenarios**:

1. **Given** the kiosk display is open and showing the normal content loop, **When** an administrator selects an existing iframe from remote control, **Then** the kiosk content area changes to the selected iframe without manual interaction on the kiosk.
2. **Given** the kiosk display is showing a remotely selected iframe, **When** an administrator selects loop mode, **Then** the kiosk resumes the normal eligible content loop without manual interaction on the kiosk.
3. **Given** a non-administrator user is signed in, **When** they try to access or change remote control, **Then** the system prevents the action.

---

### User Story 2 - Control Ads Visibility Remotely (Priority: P2)

An administrator can immediately show or hide the ads region from remote control while the kiosk display remains open.

**Why this priority**: Remote presentations may need a full-height content area without ads, and the administrator must be able to make that change without touching the kiosk.

**Independent Test**: Open the kiosk display and remote control on separate devices. Toggle ads off and verify that the ads region disappears and content occupies the full display height; toggle ads on and verify the regular layout returns.

**Acceptance Scenarios**:

1. **Given** the kiosk display is showing content with ads visible, **When** an administrator hides ads from remote control, **Then** ads are removed and content occupies the full height of the display.
2. **Given** ads are hidden on the kiosk display, **When** an administrator shows ads from remote control, **Then** the ads region returns and content uses the regular display layout.
3. **Given** the display is showing either loop mode or iframe mode, **When** ads visibility changes, **Then** the current content mode remains selected.

---

### User Story 3 - Apply Display Configuration Hot (Priority: P3)

An administrator can change display-related configuration, including remote control polling interval, while the kiosk display is already open, and the display applies those changes without manual refresh.

**Why this priority**: The kiosk device may not have a usable keyboard or operator nearby. Any operational display setting must be remotely recoverable and adjustable while the display is running.

**Independent Test**: Open the kiosk display, change display configuration from the administration device, and verify that changed timing, layout, rotation, and remote polling behavior take effect without touching or refreshing the kiosk.

**Acceptance Scenarios**:

1. **Given** the kiosk display is open, **When** an administrator changes the remote control polling interval, **Then** the display uses the new interval for subsequent remote control checks without manual refresh.
2. **Given** the kiosk display is open, **When** an administrator changes display timing, animation, or visible ad count settings, **Then** the display applies the new effective configuration without manual refresh.
3. **Given** a hot configuration change makes current display content unavailable, **When** the display detects the change, **Then** it falls back to a safe visible state and remains recoverable through remote control.

---

### User Story 4 - Preserve Default Kiosk Startup (Priority: P4)

When the kiosk display is opened or restarted, it starts from the standard approved display behavior rather than remembering a prior temporary remote control choice.

**Why this priority**: The remote control state is operational and temporary. A fresh display session should be predictable and simple.

**Independent Test**: Use remote control to switch to an iframe and hide ads, then reopen the kiosk display. Verify that the display starts in loop mode with ads visible.

**Acceptance Scenarios**:

1. **Given** remote control previously selected an iframe, **When** the kiosk display is opened in a new display session, **Then** it starts in loop mode.
2. **Given** remote control previously hid ads, **When** the kiosk display is opened in a new display session, **Then** ads start visible.
3. **Given** the display starts in default mode, **When** an administrator makes a new remote control change, **Then** that change applies to the currently running display session.

### Edge Cases

- The selected iframe content is deleted, deactivated, no longer available, or no longer approved while the display is showing it.
- There are no eligible iframe contents available when the administrator selects iframe mode.
- Remote control update fails because the administrator session expires or the user lacks administrator permission.
- The kiosk temporarily cannot reach the server while polling for remote control state.
- The polling interval is set to an invalid, too low, or too high value.
- Ads are hidden while content is in loop mode, while content is an iframe, and while no eligible content is available.
- Display configuration changes while a content or ad rotation interval is already in progress.
- Two remote control updates are submitted close together from the administrator device; the last valid change becomes the current state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a hall-accessible remote control mode for administrators.
- **FR-002**: The system MUST prevent non-administrator users from accessing remote control state or changing remote control selections.
- **FR-003**: Administrators MUST be able to select loop mode for the kiosk content area.
- **FR-004**: Administrators MUST be able to select iframe mode using only existing iframe content records that are valid for display.
- **FR-005**: The system MUST reject iframe mode when the selected content does not exist, is not an iframe, is inactive, unavailable, or not approved for display.
- **FR-006**: Remote control content mode changes MUST apply to the running kiosk display without manual refresh, keyboard input, or local kiosk interaction.
- **FR-007**: Administrators MUST be able to show or hide the ads region from remote control.
- **FR-008**: When ads are hidden, the kiosk content area MUST occupy the full display height.
- **FR-009**: When ads are shown, the kiosk MUST return to the regular content-and-ads layout.
- **FR-010**: Remote control ads visibility changes MUST apply to the running kiosk display without manual refresh, keyboard input, or local kiosk interaction.
- **FR-011**: Each new display session MUST start in loop mode with ads visible, regardless of a prior remote control selection.
- **FR-012**: The system MUST expose the current effective remote control state to the running kiosk display so it can detect changes through polling.
- **FR-013**: The remote control polling interval MUST be configurable from display configuration.
- **FR-014**: The system MUST validate the remote control polling interval as a value from 1 to 60 seconds with safe user feedback for invalid values.
- **FR-015**: Changes to display-related configuration MUST apply to an already running kiosk display without manual refresh, keyboard input, or local kiosk interaction.
- **FR-016**: Hot-applied configuration changes MUST cover remote control polling interval, content timing, ad timing, animation settings, visible ad count, display enablement, and other display settings that affect the running display.
- **FR-017**: When hot-applied configuration changes affect active rotation intervals or layout, the display MUST recalculate the effective state and continue from a safe current state.
- **FR-018**: If the display cannot apply the selected remote control state, it MUST show a safe visible fallback and remain able to recover from a later valid remote control update.
- **FR-019**: Remote control changes MUST be reflected in administrator-visible state so the administrator can see the currently selected mode, selected iframe, ads visibility, and save/update status.
- **FR-020**: Failed remote control or configuration changes MUST show safe, understandable user-facing errors without exposing secrets, internal paths, stack traces, or raw technical details.
- **FR-021**: Remote control and hot display configuration behavior MUST be validated without requiring multiple kiosks or multiple control devices.
- **FR-022**: The feature MUST preserve existing approved hall, administration, kiosk display, content rotation, iframe rendering, ads rendering, and Escape-to-hall behavior unless explicitly changed by this specification.
- **FR-023**: The system MUST record or expose enough operational information for maintainers to diagnose failed remote control updates, invalid selections, and hot configuration application failures.
- **FR-024**: When multiple valid remote control updates occur close together, the latest valid update MUST become the current remote control state.
- **FR-025**: The administrator-facing remote control mode MUST provide clear labels, visible focus, keyboard-usable controls, and understandable status/error feedback.

### Traceability & Quality Requirements *(mandatory)*

- **TQ-001**: Each functional requirement MUST map to at least one user story and one measurable success criterion.
- **TQ-002**: Changed behavior MUST have a testable validation method described in this specification or deferred to the implementation plan.
- **TQ-003**: Public, integration, data, and user-interface boundaries MUST list expected contracts or explicitly state that no boundary is introduced.
- **TQ-004**: Security, observability, and accessibility considerations MUST be captured as requirements, assumptions, or out-of-scope decisions.
- **TQ-005**: Speculative or future-scope behavior MUST be listed as out of scope rather than implemented implicitly.

### Key Entities *(include if feature involves data)*

- **Remote Control State**: The current temporary operating choice for the running kiosk display. It includes content mode, selected iframe content when applicable, ads visibility, last update time, and update status visible to the administrator.
- **Display Configuration**: The existing operational configuration for the kiosk display, extended to include the remote control polling interval and treated as hot-applied for settings that affect a running display.
- **Iframe Content Option**: An existing content record of iframe type that is eligible for display and can be selected from remote control.
- **Display Session**: A running instance of the kiosk display. A new display session starts from loop mode with ads visible and then responds to remote control updates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can switch a running kiosk display from loop mode to an existing iframe and back to loop mode without touching or refreshing the kiosk.
- **SC-002**: An administrator can hide ads and restore ads on a running kiosk display without touching or refreshing the kiosk.
- **SC-003**: When ads are hidden, the content area visibly occupies the full display height in both loop and iframe modes.
- **SC-004**: A new display session starts in loop mode with ads visible, regardless of the prior remote control choice.
- **SC-005**: A valid remote control change is reflected on the running kiosk within the configured polling interval plus normal network response time.
- **SC-006**: A changed polling interval from 1 to 60 seconds is used by the running kiosk for subsequent checks without manual refresh.
- **SC-007**: Display timing, animation, layout, and visible ad count configuration changes apply to an already running display without manual refresh.
- **SC-008**: Non-administrator users cannot view or change remote control state.
- **SC-009**: Invalid iframe selections are rejected before affecting the kiosk display.
- **SC-010**: Existing kiosk regression checks for content rotation, iframe rendering, ads rendering, and Escape-to-hall continue to pass.
- **SC-011**: The feature can be validated with one kiosk display session and one administrator control session.
- **SC-012**: When multiple valid remote control updates are made in quick succession, the running display reflects the latest valid update.
- **SC-013**: The administrator-facing remote control mode can be used with keyboard navigation and visible status feedback.

## Assumptions

- There is exactly one kiosk display and one administrator control device for this feature scope.
- Remote control is intended for temporary operational control of a running display session, not for persisted scheduling or multi-kiosk orchestration.
- Iframe choices come only from existing administratively managed iframe content records.
- Existing authentication and role information remain the source of truth for administrator-only access.
- The display has network connectivity to poll the backend during normal operation.
- If the display loses connectivity, it continues showing the last safe state until it can recover or show a safe fallback.
- Remote control changes are immediate from the administrator perspective; the kiosk applies them when its next configured polling check succeeds.
- This feature does not introduce scheduling, multiple kiosks, multiple simultaneous control devices, arbitrary URL entry, new media types, public unauthenticated control, or local keyboard recovery flows.
