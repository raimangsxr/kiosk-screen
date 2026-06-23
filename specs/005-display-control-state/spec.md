# Feature Specification: Display Control State

**Feature Branch**: `005-display-control-state`
**Spec Directory**: `specs/005-display-control-state/`
**Created**: 2026-06-23
**Status**: Approved
**Input**: the per-session display control state — the
`display_control_states` row, the three content modes
(`loop | iframe | fixed`), the four navigation commands
(`next | previous | pause | resume`), the `adsVisible` toggle, the
`fullscreenRequested` flag, and the auto-fallback behaviour when a
selected fixed target disappears.

## User Scenarios & Testing

### User Story 1 — Switch content mode (Priority: P1)

An operator with `REMOTE_CONTROL_ROLES` opens the remote control
page and changes the content mode from `loop` to `iframe` and
selects a preconfigured iframe. The backend validates that the
iframe belongs to the operator's organization, updates the
`display_control_states` row, and the kiosk picks up the change on
its next poll.

**Why this priority**: the remote control is the primary operator
interface during a live event.

**Independent Test**: PUT `/display/remote-control/state` with
`contentMode='iframe', selectedIframeId=<valid>` returns 200 and
`GET /display/state` shows `remoteControl.contentMode='iframe'`.

**Acceptance Scenarios**:

1. **Given** an `event_operator`, **When** PUT
   `/display/remote-control/state` is called with
   `contentMode='iframe', selectedIframeId=<valid>`, **Then** the
   response is 200, `remoteControl.selectedIframeId` is set, and a
   `remote_control_changed` audit event is recorded.
2. **Given** an `event_operator`, **When** PUT is called with
   `contentMode='iframe'` and no `selectedIframeId`, **Then** the
   response is 400 with "Iframe mode requires selected content."
   and a `remote_control_invalid_iframe` warning event.
3. **Given** an iframe id that does not belong to the org, **When**
   PUT is called, **Then** the response is 400 with "Selected
   iframe is not available." and a
   `remote_control_invalid_iframe` warning event.
4. **Given** a `display_viewer`, **When** PUT is called, **Then**
   the response is 403 and a `remote_control_access_denied`
   warning event is recorded.
5. **Given** a successful state change, **When** GET
   `/display/state` is polled, **Then** the next response carries
   the new `contentMode`, the matching `selectedIframe` (when
   `iframe`), and the `navigationCommand` is reset to `null`.

### User Story 2 — Issue navigation commands (Priority: P1)

The operator clicks `next`, `previous`, `pause`, or `resume` on the
remote control. The backend records the command, stamps a fresh
`navigationCommandId` (UUID v4), and the kiosk picks it up on its
next poll. `pause` and `resume` are only valid in `contentMode='loop'`;
issuing them in any other mode returns 400.

**Why this priority**: navigation is the operator's main
intervention during a live event.

**Independent Test**: POST `/display/remote-control/navigation`
with `command='next'` returns 200; the response includes
`navigationCommand='next'` and a fresh UUID `navigationCommandId`.

**Acceptance Scenarios**:

1. **Given** `contentMode='loop'`, **When** POST with
   `command='next'` is called, **Then** the response is 200 and a
   `remote_control_navigation_changed` event is recorded with the
   command id.
2. **Given** `contentMode='iframe'`, **When** POST with
   `command='next'` is called, **Then** the response is 400 with
   "Navigation commands require rotation mode."
3. **Given** `contentMode='iframe'`, **When** POST with
   `command='pause'` is called, **Then** the response is 400 with
   "Pause/Resume solo es válido en modo rotación."
4. **Given** `contentMode='loop'`, **When** POST with
   `command='pause'` is called, **Then** the response is 200 and a
   `display_control_paused` event is recorded.

### User Story 3 — Toggle ads visibility and request fullscreen (Priority: P2)

The operator toggles `adsVisible` and / or `fullscreenRequested`
from the remote control. The kiosk picks up the change on the next
poll and applies it.

**Why this priority**: live-event convenience; no spec depends on
it.

**Independent Test**: PUT with `adsVisible=false` returns 200; the
audit log shows `remote_control_ads_visibility_changed` with
`adsVisible=false`.

**Acceptance Scenarios**:

1. **Given** `adsVisible=true`, **When** PUT with
   `adsVisible=false` is called, **Then** the response is 200 and
   `remote_control_ads_visibility_changed` is recorded with the
   new value.
2. **Given** `fullscreenRequested=false`, **When** PUT with
   `fullscreenRequested=true` is called, **Then** the response is
   200 and `remote_control_fullscreen_changed` is recorded.
3. **Given** no transition on `adsVisible`, **When** PUT is called,
   **Then** no `ads_visibility_changed` event is recorded.

### User Story 4 — Auto-fallback when fixed target disappears (Priority: P2)

If the kiosk is in `contentMode='fixed'` and the selected fixed
target is later deleted or unmarked (`is_fixed=false`), the next
`GET /display/state` automatically reverts to
`contentMode='loop'` and clears the fixed target. A
`display_control_fixed_changed` event is recorded with
`severity=warning`.

**Why this priority**: prevents the kiosk from getting stuck on a
phantom fixed target.

**Independent Test**: enter `fixed` mode with content `X`, then
mark `X.is_fixed=false`; the next poll shows `loop` and the audit
log has the fallback event.

**Acceptance Scenarios**:

1. **Given** `fixed` mode with a target whose `is_fixed` is
   flipped to `false`, **When** GET `/display/state` is called,
   **Then** the response shows `loop` and the
   `display_control_fixed_changed` event has
   `previousContentMode='fixed', newContentMode='loop',
   severity=warning`.
2. **Given** `loop` mode, **When** a fixed target is deleted,
   **Then** the kiosk state is unchanged.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST persist the display control state in
  `display_control_states` keyed by `display_session_id` (UNIQUE),
  scoped to the organization, and protected by the two CHECK
  constraints
  `ck_display_control_content_mode` and
  `ck_display_control_fixed_has_target`.
- **FR-002**: The `contentMode` enum MUST be one of
  `loop | iframe | fixed`. The `navigationCommand` enum MUST be one
  of `next | previous | pause | resume` (nullable when no command
  is pending).
- **FR-003**: The system MUST expose
  `GET /display/remote-control/state`,
  `PUT /display/remote-control/state`,
  `POST /display/remote-control/navigation`, and
  `GET /display/remote-control/iframe-options`, all gated by
  `REMOTE_CONTROL_ROLES`.
- **FR-004**: PUT MUST validate that the iframe (when in `iframe`
  mode) belongs to the caller's organization; otherwise 400 +
  `remote_control_invalid_iframe` warning.
- **FR-005**: The `display_control_states` row MUST be created on
  first read after a session opens, with defaults
  `contentMode='loop', adsVisible=true, fullscreenRequested=false`.
- **FR-006**: A successful state change MUST record a
  `remote_control_changed` info event plus the relevant transition
  events (`remote_control_ads_visibility_changed`,
  `remote_control_fullscreen_changed`, `display_control_fixed_changed`).
- **FR-007**: Navigation commands MUST update
  `navigationCommand` and stamp a fresh `navigationCommandId`
  (UUID v4). Pause and resume MUST only be valid in `loop`; they
  MUST record `display_control_paused` / `display_control_resumed`.
- **FR-008**: The auto-fallback path MUST revert
  `contentMode='fixed'` to `loop` and clear
  `selected_fixed_content_id` when the target is missing or no
  longer `is_fixed=true`; the fallback MUST record
  `display_control_fixed_changed` with `severity=warning`.
- **FR-009**: The frontend MUST expose the remote control page at
  `/admin/remote-control` with the mode radio, the iframe / fixed
  selector, the navigation buttons, the ads visibility toggle, and
  the fullscreen button.
- **FR-010**: When the iframe currently selected on the kiosk is
  deleted (via the iframes admin), the kiosk MUST auto-revert to
  `loop` and record `remote_control_iframe_deleted` (see spec 006).

### Key Entities

- **DisplayControlState**: `id`, `organization_id`,
  `display_session_id` (UNIQUE), `content_mode` (default `loop`,
  CHECK in `{loop, iframe, fixed}`), `selected_iframe_id` (nullable
  FK iframes, ON DELETE SET NULL), `selected_fixed_content_id`
  (nullable FK top_content_items, ON DELETE SET NULL),
  `ads_visible` (default true), `fullscreen_requested` (default
  false), `navigation_command` (nullable, CHECK in
  `{next, previous, pause, resume}`), `navigation_command_id`
  (UUID v4, nullable), `updated_by_user_id`, timestamps.

## Success Criteria

- **SC-001**: The operator can switch mode, issue a navigation
  command, and toggle ads visibility in under 5 s combined.
- **SC-002**: A forbidden access attempt records
  `remote_control_access_denied` and returns 403 within 100 ms.
- **SC-003**: The kiosk receives the state delta on its next poll
  and the rotation cursor is preserved on mode transitions (per
  spec 014).

## Assumptions

- The kiosk is the only consumer of `GET /display/state`; other
  consumers read the remote control admin schema directly.
- The auto-fallback runs lazily on read, not via a trigger; a
  target deletion does not synchronously push the state to `loop`.

## Supersedes

None.

## Superseded by

- `007-content-rotation-modes` extends this spec with
  `pause` / `resume` semantics in the kiosk controller and
  `content_rotation_empty` events (this spec only owns the
  backend surface; the kiosk behaviour lives in spec 014).
- `006-preconfigured-iframes-and-video-end` adds the
  `remote_control_iframe_deleted` event when the selected iframe
  is removed.
