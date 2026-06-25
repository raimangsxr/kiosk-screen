# Tasks: Display Events Audit Log

**Input**: Design documents from
`specs/changes/012-display-events-audit-log/`.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Verify working branch and the four artefacts.
- [X] T002 [P] Confirm `display_events` is created in
      `0001_initial_kiosk_schema` with the documented columns
      and the JSON `metadata` column.

## Phase 2: Foundational

- [X] T003 [P] `DisplayEvent` model at
      `backend/app/repositories/models/display_event.py`.
- [X] T004 [P] `DisplayEventRepository.record(...)` at
      `backend/app/repositories/events.py`.
- [X] T005 [P] `SECRET_KEYS`, `DisplayEventRecord`,
      `sanitize_metadata(...)`, `create_display_event(...)` at
      `backend/app/domain/display_events.py`.

## Phase 3: User Story 1 — Record an event

- [X] T006 [P] `create_api_key_event(...)` at
      `backend/app/domain/display_events.py:55` with the action
      whitelist and the severity mapping.

### Tests for User Story 1

- [X] T007 [P] [US1] Unit test: `sanitize_metadata` strips each
      secret key at
      `backend/tests/unit/test_display_events.py`.
- [X] T008 [P] [US1] Integration test: every concerned spec's
      mutation records an event from the catalog (parametrized).

## Phase 4: User Story 2 — Browse the event log

- [X] T009 `GET /events` at
      `backend/app/api/events.py:13` returning the 50 most
      recent events for the caller's organization.
- [X] T010 [P] `DisplayEventSchema` at
      `backend/app/api/schemas.py`.

### Tests for User Story 2

- [X] T011 [P] [US2] Integration test: 60 events → response has
      50 rows, newest first at
      `backend/tests/integration/test_events_endpoint.py`.
- [X] T012 [P] [US2] Integration test: 401 if unauthenticated.

## Phase 5: User Story 3 — API key events

- [X] T013 [P] Spec 004 already records `api_key_changed` via
      `create_api_key_event(...)`. Verify the integration tests
      in spec 004 pass and the helper is called once per
      transition (and only once for the idempotent revoke).

## Dependencies & Execution Order

- Phase 2 → Phase 3 → Phase 4 → Phase 5.
- This spec depends on every other spec producing events
  through the helper; the catalog is the single source of
  truth.

## Implementation Strategy

Single-contributor path:

1. Phase 1 + 2: 15 min.
2. Phase 3: 30 min (helper + tests).
3. Phase 4: 30 min (endpoint + tests).
4. Phase 5: 15 min (verify spec 004 integration).
