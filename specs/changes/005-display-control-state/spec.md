---
id: CHG-005
type: change
status: consolidated
modifies:
  - DISPLAY.CONTROL
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into:
  - DISPLAY.CONTROL
requires_contract_update: false
read_by_default: false
---
# Feature Specification: Display Control State

**Feature Branch**: `005-display-control-state`
**Spec Directory**: `specs/changes/005-display-control-state/`
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

## Addendum — Jump-to navigation command

The remote control can issue a `jump_to` navigation command that
points the kiosk rotation cursor at a specific top content item
and resumes the regular loop from there. This makes the
"Show on screen now" button on the admin Content list a first
class operation alongside `next` and `previous`.

### User Story 5 — Issue a jump-to navigation command (Priority: P2)

The operator clicks "Show on screen now" on a content row in the
admin Content list. The frontend posts a `jump_to` navigation
command with the content id; the backend validates that the
content exists, is active, belongs to the caller's organization,
and is not a fixed target (`is_fixed=false`), updates the
`display_control_states` row, and the kiosk picks the command up
on its next poll, resets the rotation cursor to that content id,
and continues the regular loop from there.

**Why this priority**: gives the operator one-click
spotlighting of a sponsor or announcement without entering
`fixed` mode (which would freeze the queue).

**Acceptance Scenarios**:

1. **Given** an active content `X` with `is_fixed=false`, **When**
   the operator posts `jump_to` with `targetContentId=X`, **Then**
   the response is 200, a fresh `navigationCommandId` (UUID v4)
   is stamped, and a `remote_control_jump_to` info event is
   recorded.
2. **Given** an unknown content id, **When** the operator posts
   `jump_to`, **Then** the response is 400 with
   "Selected content is not available." and a
   `remote_control_invalid_jump_to` warning event is recorded.
3. **Given** a content id belonging to a different organization,
   **When** the operator posts `jump_to`, **Then** the response
   is 400 with "Selected content is not available." and a
   `remote_control_invalid_jump_to` warning event is recorded.
4. **Given** `is_fixed=true`, **When** the operator posts
   `jump_to`, **Then** the response is 400 with
   "Fixed content cannot be a jump target." and a
   `remote_control_invalid_jump_to` warning event is recorded.
5. **Given** `contentMode='loop'`, **When** GET `/display/state`
   is polled after the `jump_to` was issued, **Then** the
   `navigationCommand` is `'jump_to'`, the
   `navigationCommandId` matches, and the kiosk resumes the loop
   with the cursor on the target content.
6. **Given** `contentMode='iframe'` or `'fixed'`, **When** the
   operator posts `jump_to`, **Then** the response is 400 with
   "Jump-to requires rotation mode." (the kiosk will read the
   `navigationCommand` after the operator returns to `loop`).

### Updated FR-002 (navigationCommand enum)

The `navigationCommand` enum MUST be one of
`next | previous | pause | resume | jump_to` (nullable when no
command is pending). The new `jump_to_content_id` column MUST be
a nullable UUID FK to `top_content_items.id` (ON DELETE SET NULL)
populated only when `navigationCommand='jump_to'`; it MUST be
NULL otherwise. The existing CHECK constraint
`ck_display_control_navigation_command` MUST be widened to
include `'jump_to'`.

### New Functional Requirements

- **FR-011**: POST `/display/remote-control/navigation` MUST
  accept `{command: 'jump_to', targetContentId: <UUID>}` and
  validate that the target exists, is active, belongs to the
  caller's organization, and has `is_fixed=false`; otherwise 400
  + `remote_control_invalid_jump_to` warning event.
- **FR-012**: A successful `jump_to` MUST stamp a fresh
  `navigationCommandId` (UUID v4), set
  `navigation_command='jump_to'`, set
  `jump_to_content_id=<target>`, and record a
  `remote_control_jump_to` info event with `targetContentId`.
- **FR-013**: `jump_to` MUST be rejected with 400 in `iframe` and
  `fixed` content modes with the message
  "Jump-to requires rotation mode." (a `jump_to` issued while
  the kiosk is in another mode is a no-op and is rejected at the
  API surface so the operator gets immediate feedback).
- **FR-014**: The `display_control_states` row MUST carry
  `jump_to_content_id` (UUID, nullable, FK
  `top_content_items.id` ON DELETE SET NULL); a CHECK constraint
  MUST enforce that `jump_to_content_id IS NOT NULL ⇒
  navigation_command = 'jump_to'`.

### New Audit Event

A `remote_control_jump_to` info event MUST be added to the
unified catalog in spec 012 with payload
`{targetContentId: <UUID>}`; the rejected-target warning event
MUST be added as `remote_control_invalid_jump_to` (warning).

### Behavioural Notes

- `jump_to` only takes effect in `loop` mode. Issuing it in
  another mode returns 400 (per FR-013); the cursor is not
  updated.
- On a successful `jump_to`, the kiosk resets its rotation
  cursor to the target content id and continues the regular loop
  from there. The cadence counter (spec 007) is reset to 0 so
  the recurring content cadence starts fresh.
- `jump_to` does not bypass the kiosk polling cadence; the
  command is delivered via the same
  `navigationCommand`/`navigationCommandId` poll that carries
  `next`, `previous`, `pause`, and `resume`.

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
- This addendum extends the `navigationCommand` enum with
  `jump_to`; the kiosk-side consumption lives in spec 014
  addendum 2.
