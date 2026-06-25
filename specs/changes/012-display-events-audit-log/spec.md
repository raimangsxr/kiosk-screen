---
id: CHG-012
type: change
status: consolidated
modifies:
  - DISPLAY.EVENTS.AUDIT
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into:
  - DISPLAY.EVENTS.AUDIT
requires_contract_update: false
read_by_default: false
---
# Feature Specification: Display Events Audit Log

**Feature Branch**: `012-display-events-audit-log`
**Spec Directory**: `specs/changes/012-display-events-audit-log/`
**Created**: 2026-06-23
**Status**: Approved
**Input**: the `display_events` table, the `DisplayEventRecord`
factory, the secret-key sanitizer, the
`create_api_key_event(...)` helper, the `GET /events` endpoint, and
the unified catalog of `event_type` strings.

## User Scenarios & Testing

### User Story 1 — Record an event (Priority: P1)

Any backend service calls `create_display_event(organization_id,
event_type, severity, message, metadata=..., entity_type=...,
entity_id=..., created_by_user_id=...)` to record an event. The
helper sanitizes the metadata (strips any key in
`SECRET_KEYS = {"password", "token", "secret", "session"}`),
persists the row in `display_events`, and returns the immutable
`DisplayEventRecord`.

**Why this priority**: every other spec records events; the
helper is the only path to add a row.

**Independent Test**: `create_display_event(metadata={"token":
"abc", "eventType": "x"})` produces a row with
`event_metadata={"eventType": "x"}` (the `token` key is stripped).

**Acceptance Scenarios**:

1. **Given** a metadata dict with `token: "abc"`, **When** the
   helper is called, **Then** the persisted metadata does NOT
   contain the `token` key.
2. **Given** a metadata dict with `password: "..."`, **When** the
   helper is called, **Then** the persisted metadata does NOT
   contain the `password` key.
3. **Given** `severity` is not in `{info, warning}`, **When** the
   helper is called, **Then** the row is persisted anyway (the
   helper does not validate; the producer is responsible).

### User Story 2 — Browse the event log (Priority: P1)

A logged-in user (any role) opens the events page and sees the
most recent 50 events for the organization, newest first, with
type, severity, message, and timestamp.

**Why this priority**: observability is a constitution
cross-cutting standard.

**Independent Test**: GET `/events` returns the 50 most recent
events; older events are paginated via future spec (out of scope
here).

**Acceptance Scenarios**:

1. **Given** 60 events in the org, **When** GET `/events` is
   called, **Then** the response is 200 + the 50 most recent.
2. **Given** an unauthenticated request, **When** GET `/events`
   is called, **Then** the response is 401.

### User Story 3 — API key events (Priority: P1)

Every API key mutation (create, rotate, revoke, delete) records
an `api_key_changed` event with the action and the key label.
`revoke` and `delete` carry `severity=warning`; `create` and
`rotate` carry `severity=info`.

**Why this priority**: spec 004's mutations MUST produce audit
events; this spec owns the helper.

**Independent Test**: rotate a key, then GET `/events` and
confirm the `api_key_changed` row with
`metadata.action=rotate, severity=info`.

**Acceptance Scenarios**:

1. **Given** a key, **When** the admin creates it, **Then** one
   `api_key_changed` event with `action=create, severity=info` is
   recorded.
2. **Given** a key, **When** the admin revokes it, **Then** one
   `api_key_changed` event with `action=revoke, severity=warning`
   is recorded.
3. **Given** a revoked key, **When** the admin revokes it
   again, **Then** NO second event is recorded (idempotent).

## Requirements

### Functional Requirements

- **FR-001**: The system MUST persist events in `display_events`
  with the documented columns (`event_type`, `entity_type`,
  `entity_id`, `severity`, `message`, `event_metadata`, etc.).
  `entity_id` MUST NOT be a FK so the audit trail outlives
  deleted rows.
- **FR-002**: The system MUST expose
  `create_display_event(organization_id, event_type, severity,
  message, metadata=None, entity_type=None, entity_id=None,
  created_by_user_id=None) -> DisplayEventRecord` in
  `domain/display_events.py`; the metadata MUST be sanitized by
  `sanitize_metadata(...)` (stripping `SECRET_KEYS`).
- **FR-003**: The system MUST expose
  `create_api_key_event(organization_id, api_key_id, action,
  key_label, created_by_user_id=None) -> DisplayEventRecord`
  with the action whitelist
  `{"create", "rotate", "revoke", "delete"}` and the severity
  mapping `warning` for `revoke` / `delete`, else `info`.
- **FR-004**: The system MUST expose `GET /events` returning the
  50 most recent events for the caller's organization, newest
  first; 401 if unauthenticated.
- **FR-005**: The unified event type catalog is the single
  source of truth. The full list of 22 strings, severities,
  entity types, and producer files is documented in the "Unified
  Audit Event Catalog" section below.

### Unified Audit Event Catalog

| `event_type` | severity | entity_type | producer (file:line) | concerned spec |
|---|---|---|---|---|
| `user_changed` | info | `user` | `backend/app/services/admin_service.py:83, 95` | 001, 010 |
| `display_opened` | info | `operator_session` | `backend/app/services/display_service.py:134` | 002 |
| `configuration_changed` | info | `kiosk_display_configuration` | `backend/app/services/admin_service.py:64` | 002 |
| `display_state_calculation_failed` | warning | `display_state` | `backend/app/api/display.py:174` | 002 |
| `fallback_activated` | warning | `kiosk_display_configuration` | `backend/app/services/display_service.py:148` | 002 |
| `media_uploaded` | info | `media_file` | `backend/app/services/ads_service.py:97`, `content_service.py:175` | 003, 009 |
| `api_key_changed` | info / warning | `api_key` | `backend/app/domain/display_events.py:67` (helper) | 004 |
| `remote_control_changed` | info | `display_control_state` | `backend/app/application/display_control/service.py:192` | 005 |
| `remote_control_access_denied` | warning | `display_control_state` | `backend/app/api/display.py:40` | 005 |
| `remote_control_invalid_iframe` | warning | `display_control_state` | `backend/app/application/display_control/service.py:123, 126` | 005 |
| `remote_control_iframe_deleted` | info | `iframe` | `backend/app/services/display_service.py:82`, `iframe_service.py:82` | 005, 006 |
| `remote_control_ads_visibility_changed` | info | `display_control_state` | `backend/app/application/display_control/service.py:155` | 005 |
| `remote_control_fullscreen_changed` | info | `display_control_state` | `backend/app/application/display_control/service.py:163` | 005 |
| `remote_control_navigation_changed` | info | `display_control_state` | `backend/app/application/display_control/service.py:247` | 005 |
| `remote_control_jump_to` | info | `display_control_state` | `backend/app/application/display_control/service.py:_issue_jump_to` | 005 |
| `remote_control_invalid_jump_to` | warning | `display_control_state` | `backend/app/application/display_control/service.py:_issue_jump_to` | 005 |
| `content_type_autodetected` | info | `top_content_item` | `backend/app/services/content_service.py:125` | 007, 009 |
| `display_control_paused` | info | `display_control_state` | `backend/app/application/display_control/service.py:237` | 007 |
| `display_control_resumed` | info | `display_control_state` | `backend/app/application/display_control/service.py:237` | 007 |
| `display_control_fixed_changed` | info / warning | `display_control_state` | `backend/app/application/display_control/service.py:181, 300` | 007 |
| `content_rotation_empty` | warning | `kiosk_rotation` | `backend/app/application/display_control/service.py:264-281` | 007 |
| `event_configuration_changed` | info | `event_configuration` | `backend/app/services/event_configuration_service.py:92` | 008 |
| `content_changed` | info | `top_content_item` | `backend/app/services/content_service.py:79, 102, 291, 328, 348` | 009 |
| `ad_changed` | info | `client_ad_item` | `backend/app/services/ads_service.py:150` | 009 |

### Key Entities

- **DisplayEvent**: `id`, `organization_id`, `event_type`,
  `entity_type` (nullable), `entity_id` (nullable, no FK),
  `severity`, `message`, `event_metadata` (JSON), `created_by_user_id`
  (nullable FK), `created_at`.

## Success Criteria

- **SC-001**: Every backend service that mutates state records
  an event from the catalog.
- **SC-002**: No row in `display_events` contains a `SECRET_KEY`
  value, ever.
- **SC-003**: GET `/events` returns within 100 ms p95 on a
  10 000-row table.

## Assumptions

- The audit log is append-only; no UPDATE / DELETE.
- The secret-key sanitizer is a defense-in-depth measure; the
  producers MUST NOT pass secret values into `metadata` in the
  first place.
- The catalog is the single source of truth; producers do NOT
  define new strings ad hoc — adding a row to the table is a
  spec change.

## Supersedes

- `019-display-control-canonical` (deleted by the SDD
  refactoring): its event type contract is obsolete (it listed
  `display_control_changed`, which the code never emits, and
  omitted 11 event types the code does emit). This spec is the
  new contract.

## Superseded by

None yet.
