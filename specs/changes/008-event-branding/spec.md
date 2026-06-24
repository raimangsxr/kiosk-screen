---
id: CHG-008
type: change
status: consolidated
modifies:
  - EVENT.BRANDING
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into:
  - EVENT.BRANDING
requires_contract_update: false
read_by_default: false
---
# Feature Specification: Event Branding

**Feature Branch**: `008-event-branding`
**Spec Directory**: `specs/changes/008-event-branding/`
**Created**: 2026-06-23
**Status**: Approved
**Input**: the per-organization event configuration
(`event_configurations`), the public `event-branding` endpoint, the
kiosk overlay, and the move of `event_duration_minutes` out of the
kiosk configuration into the event configuration.

## User Scenarios & Testing

### User Story 1 — Configure the event identity (Priority: P1)

An administrator (or `content_manager` / `advertising_manager` for
cross-domain writes) opens the event configuration form at
`/admin/event`, edits the event name, organizer name, event
duration, optionally uploads an organizer logo, and saves. The
backend stores the row in `event_configurations` and emits an
`event_configuration_changed` audit event.

**Why this priority**: every kiosk session depends on the event
identity being readable.

**Independent Test**: PUT `/event-configuration` (multipart) with
`eventName="Acme Summit 2026", organizerName="Acme Corp",
eventDurationMinutes=480, file=<a 200 KB PNG logo>` returns 200
+ the row; subsequent GET `/event-configuration` returns the
same.

**Acceptance Scenarios**:

1. **Given** a `content_manager`, **When** PUT
   `/event-configuration` is called, **Then** the response is 200
   and an `event_configuration_changed` event is recorded.
2. **Given** `eventDurationMinutes=0`, **When** PUT is called,
   **Then** the response is 400 (CHECK
   `ck_event_duration_minutes_positive`).
3. **Given** `eventDurationMinutes=2000`, **When** PUT is called,
   **Then** the response is 400 (CHECK
   `ck_event_duration_minutes_max`).
4. **Given** a 2 MB logo, **When** PUT is called, **Then** the
   response is 400 (logo cap 1 MB).
5. **Given** a non-multipart content-type, **When** PUT is called,
   **Then** the response is 415 with "multipart/form-data
   required."
6. **Given** the form sends `removeLogo=true`, **When** PUT is
   called, **Then** the logo is cleared (FK to
   `media_file_references` is set NULL via the ON DELETE SET NULL
   on the column).

### User Story 2 — Kiosk renders the branding overlay (Priority: P1)

The kiosk Angular component polls `GET /event-branding` (public,
no auth) and renders the organizer name, event name, and organizer
logo as a Material card overlay anchored at the top of the screen.
The overlay is hidden when `contentMode='iframe'` (per spec 007,
which is the cross-spec surface).

**Why this priority**: the overlay is the primary on-screen
identification during a live event.

**Independent Test**: with `eventName="Acme Summit 2026"` set,
the kiosk overlay displays the name; switching to `iframe` mode
hides the overlay.

**Acceptance Scenarios**:

1. **Given** `eventName="Acme"`, **When** GET `/event-branding`
   is called, **Then** the response is 200 + `EventBrandingSchema`
   with the name.
2. **Given** no event configuration exists, **When** GET
   `/event-branding` is called, **Then** the response is 200 with
   empty strings and `organizerLogoUrl=null`.
3. **Given** `contentMode='iframe'`, **When** the kiosk renders,
   **Then** the overlay is NOT in the DOM.
4. **Given** `contentMode='loop'`, **When** the kiosk renders,
   **Then** the overlay IS in the DOM with the event name and
   organizer name.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST persist per-organization event
  identity in `event_configurations` with the documented columns
  and the two CHECK constraints
  (`ck_event_duration_minutes_positive`,
  `ck_event_duration_minutes_max`) and the
  `(organization_id)` UNIQUE constraint.
- **FR-002**: The system MUST expose
  `GET /event-configuration` and `PUT /event-configuration`,
  gated by `CONFIGURATION_MANAGEMENT_ROLES`; PUT MUST accept
  `multipart/form-data` with `eventName`, `organizerName`,
  `eventDurationMinutes`, optional `file`, optional `removeLogo`.
- **FR-003**: PUT MUST validate the logo via
  `validate_logo_upload(...)` from `domain/media.py`; the cap is
  1 MB.
- **FR-004**: PUT MUST record an
  `event_configuration_changed` audit event on every successful
  save.
- **FR-005**: The system MUST expose `GET /event-branding` (public,
  no auth) returning `{eventName, organizerName, organizerLogoUrl}`.
  When no event configuration exists, the response is 200 with
  empty strings and `organizerLogoUrl=null`.
- **FR-006**: The kiosk Angular component MUST poll
  `GET /event-branding` independently of the display state poll
  and render the overlay; the overlay MUST be hidden when
  `contentMode='iframe'` (per spec 007).
- **FR-007**: The frontend MUST expose the event configuration
  form at `/admin/event` with the four fields and the logo
  upload control.
- **FR-008**: The previous
  `kiosk_display_configurations.configured_event_duration_minutes`
  column MUST have been migrated to
  `event_configurations.event_duration_minutes` (consumed in
  spec 002's session-open path).

### Key Entities

- **EventConfiguration**: `id`, `organization_id` (UNIQUE,
  ON DELETE CASCADE), `event_name`, `organizer_name`,
  `organizer_logo_media_id` (nullable FK
  `media_file_references.id` ON DELETE SET NULL),
  `event_duration_minutes` (default 240, CHECK > 0 and ≤ 1440),
  audit fields.

## Success Criteria

- **SC-001**: A `content_manager` can save the event
  configuration in under 5 s; the audit log records the change.
- **SC-002**: The kiosk overlay never blocks the polling
  heartbeat; if `GET /event-branding` fails, the kiosk keeps the
  last good value (stale-while-error).
- **SC-003**: The overlay is hidden in `iframe` mode and visible
  in `loop` and `fixed` modes.

## Assumptions

- The kiosk uses `lastValidValue` semantics on the branding poll:
  a network failure does NOT clear the overlay.
- The migration
  `0011_event_branding` backfills
  `event_configurations.event_duration_minutes` from
  `kiosk_display_configurations.configured_event_duration_minutes`
  on upgrade; the legacy column is dropped.

## Supersedes

None.

## Superseded by

- `007-content-rotation-modes` hides the overlay in `iframe`
  mode (the kiosk-side enforcement of FR-006).
