# Tasks: Preconfigured Iframes and Video End Delay

**Input**: Design documents from
`specs/changes/006-preconfigured-iframes-and-video-end/`.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Verify working branch and the four artefacts.
- [X] T002 [P] Confirm `0008_iframes_video_end` migration
      creates the `iframes` table with
      `UNIQUE (organization_id, url)` and adds
      `video_end_delay_seconds` to `kiosk_display_configurations`
      with CHECK 0..30.

## Phase 2: Foundational

- [X] T003 [P] `Iframe` model at
      `backend/app/repositories/models/iframe.py`.

## Phase 3: User Story 1 — Iframe CRUD

- [X] T004 `IframeService` at
      `backend/app/services/iframe_service.py` with `list`,
      `create`, `get`, `update`, `delete`.
- [X] T005 `GET /iframes`, `POST /iframes`, `GET /iframes/{id}`,
      `PUT /iframes/{id}`, `DELETE /iframes/{id}` at
      `backend/app/api/iframes.py:21-77`.
- [X] T006 [P] `IframeSchema`, `IframeListResponse`,
      `IframeRequest` at `backend/app/api/schemas.py`.

### Tests for User Story 1

- [X] T007 [P] [US1] Integration test: create + list + get +
      update at
      `backend/tests/integration/test_iframes_crud.py`.
- [X] T008 [P] [US1] Integration test: duplicate URL → 409
      `iframe_url_already_exists`.
- [X] T009 [P] [US1] Integration test: `event_operator` →
      403.

## Phase 4: User Story 2 — Video end delay

- [X] T010 [P] `video_end_delay_seconds` validation in
      `AdminService.update_configuration(...)` (already covered
      by the CHECK constraint; add explicit error mapping).
- [X] T011 [P] The kiosk controller in
      `frontend/src/app/display/kiosk-rotation.controller.ts`
      reads `video_end_delay_seconds` from the polled state and
      waits the right number of seconds (consumed in spec 014).

### Tests for User Story 2

- [X] T012 [P] [US2] Integration test: PUT with 31 → 400 at
      `backend/tests/integration/test_display_configuration.py`
      (parametrized).
- [X] T013 [P] [US2] Frontend Karma spec for the controller's
      video-end behaviour at
      `frontend/src/app/display/kiosk-rotation.controller.spec.ts`
      (consumed in spec 014).

## Phase 5: User Story 3 — Auto-revert when iframe deleted

- [X] T014 `IframeService.delete(...)` checks
      `display_control_states.selected_iframe_id` and records
      `remote_control_iframe_deleted` when the deleted iframe is
      currently selected. The next `GET /display/state` returns
      `loop` via the existing auto-fallback machinery in spec 005.
- [X] T015 [P] Mapper at `backend/app/api/mappers.py` returns
      the post-fallback state.

### Tests for User Story 3

- [X] T016 [P] [US3] Integration test: select iframe `X`,
      DELETE `/iframes/{X}`, next poll → `loop` +
      `remote_control_iframe_deleted` at
      `backend/tests/integration/test_auto_fallback_iframe.py`.
- [X] T017 [P] [US3] Integration test: deleting a non-selected
      iframe does not change the kiosk state.

## Phase 6: Frontend

- [X] T018 [P] `IframeApi` at
      `frontend/src/app/core/api/iframe.api.ts`.
- [X] T019 [P] `IframeListComponent` at
      `frontend/src/app/features/iframes/iframe-list.component.ts`.
- [X] T020 [P] `IframeFormComponent` at
      `frontend/src/app/features/iframes/iframe-form.component.ts`.
- [X] T021 [P] `IframeFacade` at
      `frontend/src/app/features/iframes/iframe.facade.ts`.
- [X] T022 [P] Wire `/admin/iframes` in
      `frontend/src/app/app.routes.ts`.
- [X] T023 [P] Karma specs for the list and the form at
      `frontend/src/app/features/iframes/*.spec.ts`.

## Dependencies & Execution Order

- Phase 2 → Phase 3 → Phase 4 → Phase 5.
- Phase 6 is independent.

## Implementation Strategy

Single-contributor path:

1. Phase 1 + 2: 10 min.
2. Phase 3: 1 h (CRUD + tests).
3. Phase 4: 20 min (delay validation; kiosk behaviour is in
   spec 014).
4. Phase 5: 30 min (auto-revert tests).
5. Phase 6: 1 h (admin UI).
