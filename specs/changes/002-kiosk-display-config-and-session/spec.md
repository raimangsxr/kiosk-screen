---
id: CHG-002
type: change
status: consolidated
modifies:
  - DISPLAY.CONFIG_SESSION
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into:
  - DISPLAY.CONFIG_SESSION
requires_contract_update: false
read_by_default: false
---
# Feature Specification: Kiosk Display Configuration and Session

**Feature Branch**: `002-kiosk-display-config-and-session`
**Spec Directory**: `specs/changes/002-kiosk-display-config-and-session/`
**Created**: 2026-06-23
**Status**: Approved
**Input**: persistence of the kiosk layout knobs (region ratio, default
durations, animations, polling cadence, video end delay) and the
operator session lifecycle that opens the kiosk display.

## User Scenarios & Testing

### User Story 1 — Open a kiosk display (Priority: P1)

An operator with role `event_operator` (or `administrator`) clicks
"Open kiosk" in the hall. The backend creates an `operator_sessions`
row bound to the operator, to the active `kiosk_display_configurations`
row, and to the current time + the event duration. The session stays
valid until the operator ends it or `valid_until` elapses.

**Why this priority**: no other display-runtime spec is reachable
without an open session.

**Independent Test**: POST `/display/open` with a valid `event_operator`
user returns 200 + `DisplayStateSchema`; a second open by the same
user while a session is still valid returns 409.

**Acceptance Scenarios**:

1. **Given** a user with role `event_operator`, **When** POST
   `/display/open` is called, **Then** the response is 200, an
   `operator_sessions` row is created with `valid_until` derived
   from the event duration, and a `display_opened` audit event is
   recorded.
2. **Given** a user with role `display_viewer`, **When** POST
   `/display/open` is called, **Then** the response is 403.
3. **Given** an already-open operator session, **When** POST
   `/display/open` is called again by the same user, **Then** the
   response is 409 with a "session already open" detail.
4. **Given** an open session, **When** GET `/display/state` is
   called, **Then** the response includes the configuration, the
   eligible top content, the eligible ads, the remote control state,
   the selected iframe (if any), `fallbackActive`, and the
   `fixedEligibleContents` list.

### User Story 2 — Configure the kiosk knobs (Priority: P1)

An administrator (or a `content_manager` / `advertising_manager` for
cross-domain writes) edits the kiosk configuration: enable flag,
default top duration, default ad duration, animations, animation
duration, `inline_ad_count`, `remote_control_polling_seconds`, and
`video_end_delay_seconds`. The region ratio is fixed at 4fr/1fr and
is enforced by a CHECK constraint.

**Why this priority**: every other display spec reads these knobs.

**Independent Test**: PUT `/display/configuration` with a payload
that violates one of the CHECK constraints (e.g.
`remote_control_polling_seconds=0`) returns 400.

**Acceptance Scenarios**:

1. **Given** a payload with all valid values, **When** PUT
   `/display/configuration` is called by an `administrator`, **Then**
   the response is 200 and the row is updated.
2. **Given** `remote_control_polling_seconds=0`, **When** PUT
   `/display/configuration` is called, **Then** the response is 400
   with the CHECK constraint name in the detail.
3. **Given** `video_end_delay_seconds=31`, **When** PUT
   `/display/configuration` is called, **Then** the response is 400.
4. **Given** a `content_manager` user, **When** PUT
   `/display/configuration` is called, **Then** the response is 200
   (configuration management is cross-domain).
5. **Given** a successful PUT, **When** the audit log is read,
   **Then** a `configuration_changed` event is recorded with the
   user id and the diff metadata.
6. **Given** a successful PUT, **When** the kiosk polls
   `GET /display/state`, **Then** the next response carries the new
   values.

### User Story 3 — Kiosk polls state (Priority: P2)

The kiosk browser polls `GET /display/state` on a cadence driven by
`remote_control_polling_seconds`. If the backend fails to compute
the state (e.g. no active configuration), it records a
`display_state_calculation_failed` audit event and returns 409.

**Why this priority**: the polling contract is the heartbeat of the
kiosk runtime.

**Independent Test**: with an empty database, GET `/display/state`
returns 409 and the audit event is recorded.

**Acceptance Scenarios**:

1. **Given** an open session and a valid configuration, **When**
   GET `/display/state` is called, **Then** the response is 200
   with the full `DisplayStateSchema`.
2. **Given** a `ValueError` from the state calculator, **When** GET
   `/display/state` is called, **Then** the response is 409 and a
   `display_state_calculation_failed` audit event is recorded with
   the user id.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST persist kiosk configurations in
  `kiosk_display_configurations` with the columns documented in the
  Key Entities section.
- **FR-002**: The system MUST enforce the region ratio as
  `top_region_ratio = 4` and `bottom_region_ratio = 1` via CHECK
  constraints.
- **FR-003**: The system MUST enforce the durations and animation
  parameters as positive integers via CHECK constraints, the
  polling cadence as `1..60`, and `video_end_delay_seconds` as
  `0..30`.
- **FR-004**: The system MUST expose `POST /display/open` that
  creates an `operator_sessions` row, returns 200 + the computed
  `DisplayStateSchema`, or returns 403 / 409 on permission or
  conflict errors.
- **FR-005**: The system MUST expose `GET /display/state` that
  returns the full `DisplayStateSchema` for the current session, or
  409 if the state cannot be calculated.
- **FR-006**: The system MUST expose `GET /display/configuration`
  and `PUT /display/configuration` for the kiosk configuration.
- **FR-007**: PUT `/display/configuration` MUST be restricted to
  `CONFIGURATION_MANAGEMENT_ROLES` (administrator, content_manager,
  advertising_manager).
- **FR-008**: The kiosk display Angular component MUST poll
  `GET /display/state` every `remote_control_polling_seconds`
  seconds and dedupe responses by fingerprint.
- **FR-009**: The frontend MUST expose the kiosk configuration form
  at `/admin/configuration` (`features/display-config`).

### Key Entities

- **KioskDisplayConfiguration**: `id`, `organization_id`, `name`,
  `is_enabled`, `top_region_ratio` (default 4, CHECK = 4),
  `bottom_region_ratio` (default 1, CHECK = 1),
  `default_top_duration_seconds` (default 10, CHECK > 0),
  `default_ad_duration_seconds` (default 10, CHECK > 0),
  `default_top_rotation_animation` (default `'none'`, CHECK in
  `{none,fade,slide}`),
  `default_ad_rotation_animation` (default `'none'`),
  `default_top_animation_duration_milliseconds` (default 300, CHECK
  > 0),
  `default_ad_animation_duration_milliseconds` (default 300, CHECK
  > 0), `inline_ad_count` (default 1, CHECK > 0),
  `remote_control_polling_seconds` (default 3, CHECK 1..60),
  `video_end_delay_seconds` (default 2, CHECK 0..30), timestamps.
- **OperatorSession**: `id`, `organization_id`, `user_id`,
  `display_configuration_id`, `valid_until`, `created_at`,
  `ended_at` (nullable).

## Success Criteria

- **SC-001**: A user with `event_operator` can open the kiosk and
  see content rotating within 5 s of the open call.
- **SC-002**: An invalid configuration PUT always returns 400 with
  the violated CHECK constraint name.
- **SC-003**: The kiosk polls at the configured cadence; on a 3 s
  cadence the backend handles 60 RPM with < 50 ms p95 latency per
  poll.

## Assumptions

- The polling cadence is a backend-truth knob; the frontend reads
  it on every `GET /display/state` and schedules the next poll
  accordingly.
- The first kiosk configuration row is seeded at bootstrap; no UI
  is provided to create a second row (multi-kiosk is out of scope).

## Supersedes

None.

## Superseded by

None yet.
