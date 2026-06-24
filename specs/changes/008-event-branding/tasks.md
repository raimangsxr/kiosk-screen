# Tasks: Event Branding

**Input**: Design documents from `specs/changes/008-event-branding/`.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Verify working branch and the four artefacts.
- [X] T002 [P] Confirm `0011_event_branding` migration creates
      `event_configurations`, backfills
      `event_duration_minutes` from
      `kiosk_display_configurations.configured_event_duration_minutes`,
      and drops the legacy column.

## Phase 2: Foundational

- [X] T003 [P] `EventConfiguration` model at
      `backend/app/repositories/models/event_configuration.py`.
- [X] T004 [P] `EventConfigurationService` at
      `backend/app/services/event_configuration_service.py` with
      `get_or_create` and `update`.

## Phase 3: User Story 1 — Configure the event identity

- [X] T005 `GET /event-configuration` and
      `PUT /event-configuration` at
      `backend/app/api/event_configuration.py:14, 24`.
- [X] T006 [P] `EventConfigurationSchema` at
      `backend/app/api/schemas.py`.
- [X] T007 [P] `EventConfigurationService.update(...)` records
      `event_configuration_changed`.

### Tests for User Story 1

- [X] T008 [P] [US1] Integration test: PUT valid multipart → 200
      + audit at
      `backend/tests/integration/test_event_configuration.py`.
- [X] T009 [P] [US1] Integration test: `eventDurationMinutes=0`
      → 400.
- [X] T010 [P] [US1] Integration test: 2 MB logo → 400.
- [X] T011 [P] [US1] Integration test: `content-type:
      application/json` → 415.

## Phase 4: User Story 2 — Public branding endpoint and kiosk overlay

- [X] T012 `GET /event-branding` at
      `backend/app/api/event_branding.py:14`.
- [X] T013 [P] `EventBrandingSchema` at
      `backend/app/api/schemas.py`.
- [X] T014 [P] `EventBrandingApi` at
      `frontend/src/app/core/api/event-branding.api.ts`.
- [X] T015 [P] `EventBrandingService` at
      `frontend/src/app/core/event-branding.service.ts` with the
      signal store and stale-while-error.
- [X] T016 [P] Overlay rendering in
      `frontend/src/app/display/display-screen.component.ts`
      (consumed in spec 014).

### Tests for User Story 2

- [X] T017 [P] [US2] Integration test: GET with no event row →
      200 with empty strings.
- [X] T018 [P] [US2] Integration test: GET with a row → 200 +
      populated `EventBrandingSchema`.
- [X] T019 [P] [US2] Karma spec for the overlay at
      `frontend/src/app/display/display-screen.component.spec.ts`
      (consumed in spec 014).

## Phase 5: Frontend — event admin form

- [X] T020 [P] `EventConfigComponent` at
      `frontend/src/app/features/event-config/event-config.component.ts`.
- [X] T021 [P] `EventConfigFacade` at
      `frontend/src/app/features/event-config/event-config.facade.ts`.
- [X] T022 [P] Wire `/admin/event` in
      `frontend/src/app/app.routes.ts`.
- [X] T023 [P] Karma spec for the form at
      `frontend/src/app/features/event-config/event-config.component.spec.ts`.

## Dependencies & Execution Order

- Phase 2 → Phase 3 → Phase 4 → Phase 5.
- Phase 5 is independent of Phase 4 but depends on the
  `EventConfigurationSchema`.

## Implementation Strategy

Single-contributor path:

1. Phase 1 + 2: 10 min.
2. Phase 3: 1 h (admin endpoints + tests).
3. Phase 4: 30 min (public endpoint + service + tests).
4. Phase 5: 1 h (form).
