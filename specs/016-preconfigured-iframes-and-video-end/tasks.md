---
description: "Task list for feature 016 — preconfigured iframes and video plays to end"
---

# Tasks: Pre-configured Iframes and Video Plays To End

**Input**: Design documents from `/specs/016-preconfigured-iframes-and-video-end/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are mandatory for changed behavior. Unit tests for business logic; integration tests for admin/remote-control/kiosk boundaries; frontend Karma specs for the new and modified components, facade, service, and rotation cursor.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/app/...` and `backend/alembic/versions/...`
- **Frontend**: `frontend/src/app/...`
- **Web app**: see plan.md project structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the branch and prepare the working environment.

- [X] T001 Verify the working branch is `016-preconfigured-iframes-and-video-end` and that `specs/016-preconfigured-iframes-and-video-end/` contains the design artifacts
- [X] T002 [P] Read `spec.md`, `plan.md`, `research.md`, `data-model.md`, and the three `contracts/*.md` files in `specs/016-preconfigured-iframes-and-video-end/` to internalise the design

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema migration, new entity model, foundational Pydantic schemas, and the base IframeService. MUST complete before any user story work.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Create Alembic migration `backend/alembic/versions/0008_preconfigured_iframes_and_video_end.py` that in one transaction: (a) `DELETE FROM top_content_items WHERE content_type='embedded_web'`; (b) `DROP TABLE IF EXISTS approved_embedded_domains CASCADE`; (c) `CREATE TABLE iframes (id UUID PK, organization_id UUID FK, url VARCHAR(1024), created_at/updated_at timestamptz, created_by_user_id/updated_by_user_id UUID FK, UNIQUE (organization_id, url))`; (d) drop FK on `display_control_states.selected_content_id`, drop the column, add `selected_iframe_id VARCHAR(36) REFERENCES iframes(id) ON DELETE SET NULL`; (e) add `kiosk_display_configurations.video_end_delay_seconds INTEGER NOT NULL DEFAULT 2 CHECK (video_end_delay_seconds BETWEEN 0 AND 30)`
- [X] T004 Create SQLAlchemy model `Iframe` in `backend/app/repositories/models/iframe.py` with `id`, `organization_id`, `url`, `created_at`, `updated_at`, `created_by_user_id`, `updated_by_user_id`, the `__tablename__ = "iframes"`, the unique constraint `uq_iframes_organization_id_url`, and the index on `organization_id`
- [X] T005 Update `backend/app/repositories/models/__init__.py` to export `Iframe`; remove `ApprovedEmbeddedDomain` from the exports
- [X] T006 Update `backend/app/repositories/models/display_control_state.py`: rename the column `selected_content_id` → `selected_iframe_id` with `ForeignKey("iframes.id", ondelete="SET NULL")` and nullable=True
- [X] T007 Update `backend/app/repositories/models/kiosk_configuration.py` to add the `video_end_delay_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=2, server_default="2")` column with the CHECK constraint reflected in `__table_args__`
- [X] T008 Add `IframeSchema`, `IframeRequest`, `IframeListResponse` to `backend/app/api/schemas.py`; the schema MUST expose `id`, `organizationId`, `url`, `createdAt`, `updatedAt` (no `isActive`, no `title`, no `displayOrder`)
- [X] T009 In `backend/app/api/schemas.py`: update `ContentItemSchema.contentType` and `ContentItemRequest.contentType` to the union `'photo' | 'video'` (drop `'embedded_web'`); add `videoEndDelaySeconds: int` (with Field alias `videoEndDelaySeconds`, ge=0, le=30) to `KioskConfigurationSchema` and `KioskConfigurationRequest`
- [X] T010 In `backend/app/api/schemas.py`: update `RemoteControlIframeOptionsSchema`, `RemoteControlAdminStateSchema.selectedIframe`, and `DisplayStateSchema.selectedIframe` so each is `IframeSchema | None`; rename `RemoteControlAdminStateSchema.selectedContentId` to `selectedIframeId`
- [X] T011 Add `to_iframe_schema(iframe: Iframe) -> IframeSchema` to `backend/app/api/mappers.py`
- [X] T012 Create `IframeService` in `backend/app/services/iframe_service.py` with `list(organization_id)`, `get(organization_id, id)`, `create(organization_id, request, current_user)` (validates URL scheme + uniqueness), `update(organization_id, id, request, current_user)`, `delete(organization_id, id, current_user)` (cleans up active `DisplayControlState` + records `DisplayEventType.remote_control_iframe_deleted`)
- [X] T013 Create `backend/app/api/iframes.py` with router `iframes_router` mounted at `/api/iframes`; endpoints `GET /`, `POST /`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`; depend on `require_roles(CONTENT_MANAGEMENT_ROLES)`; map errors to `ApplicationError` codes per `contracts/admin-iframe-contract.md`
- [X] T014 In `backend/app/api/v1/router.py`: register `iframes_router`; remove the `approved_domains_router` import and registration
- [ ] T015 Add `DisplayEventType.remote_control_iframe_deleted = "remote_control_iframe_deleted"` to `backend/app/domain/events.py` and export it
- [ ] T016 [P] Backend unit test scaffolding for `IframeService` in `backend/tests/services/test_iframe_service.py` covering create / update / delete / duplicate-url / delete-while-active (cases should fail at this point and be made green by T012)
- [ ] T017 [P] Backend migration test for `0008_preconfigured_iframes_and_video_end.py` in `backend/tests/migrations/test_0008_migration.py` covering: upgrade on a DB seeded with `embedded_web` rows purges them and applies the new schema; downgrade restores `approved_embedded_domains` empty and drops `iframes`; a second upgrade succeeds; the `display_control_states.selected_iframe_id` FK with `ON DELETE SET NULL` is enforced

**Checkpoint**: Foundation ready — schema migrated, `Iframe` model and service exist, Pydantic schemas in place, base API mounted, migration upgrade/downgrade tested. User story implementation can now begin.

---

## Phase 3: User Story 1 — Pre-configure iframes from admin (Priority: P1) 🎯 MVP

**Goal**: An administrator can create, edit, and delete iframes from a new admin section at `/admin/iframes`. The list reflects the new entity with no `isActive` toggle, no title, no display order.

**Independent Test**: Sign in as `content_manager`. Navigate to `/admin/iframes`. Create an iframe `https://example.com/stream-a`. Verify it appears in the list. Edit it. Delete it. Verify the list and the API agree.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T018 [P] [US1] Backend integration test for the `/api/iframes` endpoints in `backend/tests/api/test_iframes_endpoints.py` covering: auth (401 unauth, 403 non-content-manager, 200 content_manager, 200 administrator); create 201 / 400 invalid URL / 409 duplicate; update 200 / 400 / 404 / 409; delete 204 / 404; org isolation (an iframe created in another org is not visible)
- [ ] T019 [P] [US1] Backend integration test for the `embedded_web` rejection in `backend/tests/api/test_content_endpoints.py` and `backend/tests/api/test_public_content_endpoints.py` covering: `POST /api/content` with `contentType='embedded_web'` → 400; `POST /api/public/content/upload` never accepts `embedded_web` (regression check)
- [ ] T020 [P] [US1] Frontend spec for `IframeListComponent` in `frontend/src/app/features/iframes/iframe-list.component.spec.ts` covering: empty state, list of one iframe, edit click, delete click, no drag handles, no active toggle
- [ ] T021 [P] [US1] Frontend spec for `IframeFormComponent` in `frontend/src/app/features/iframes/iframe-form.component.spec.ts` covering: empty submit → required error, invalid URL → invalid_url error, duplicate URL → iframe_url_already_exists error, valid submit → success

### Implementation for User Story 1

- [ ] T022 [US1] In `backend/app/services/content_service.py`: change `validate_content` and `validate_uploaded_content` to accept only `{"photo","video"}`; raise `ApplicationError("invalid_content_type", category="validation")` with HTTP 400 for any other value (FR-011)
- [X] T023 [US1] Remove `POST /api/content/iframe` route handler and its helper from `backend/app/api/content.py`
- [X] T024 [P] [US1] Create `IframeItem` interface and `IframeApiService` in `frontend/src/app/core/api/iframe.api.ts` with `list`, `create`, `get`, `update`, `delete`
- [X] T025 [US1] Update `frontend/src/app/core/api/content.api.ts`: change `ContentItem.contentType` to `'photo' | 'video'`; remove `createIframe` and any `IframeContentItem` types
- [X] T026 [P] [US1] Create `IframeFacade` in `frontend/src/app/features/iframes/iframe.facade.ts` with signals for `iframes`, `loading`, `saving`, `error`; methods `refresh`, `create`, `update`, `delete`
- [X] T027 [P] [US1] Create `IframeListComponent` (+ `.html`, + `.css`) in `frontend/src/app/features/iframes/iframe-list.component.ts`: table with `url` (truncated to ~60 chars), `actions` (edit, delete with confirm dialog); no drag-and-drop; no `isActive` column
- [ ] T028 [P] [US1] Create `IframeFormComponent` (+ `.html`, + `.css`) in `frontend/src/app/features/iframes/iframe-form.component.ts`: single `url` field with `Validators.required` and a custom async validator that pings `iframe_url_already_exists` from the backend; "Save" / "Cancel" buttons
- [ ] T029 [US1] Add routes `/admin/iframes`, `/admin/iframes/new`, `/admin/iframes/:id` in `frontend/src/app/app.routes.ts`, lazily loaded, gated by `requireContentManagement` guard
- [X] T030 [US1] In `frontend/src/app/features/admin-shell/admin-navigation.service.ts`: add an "Iframes" sidenav entry with `icon`, `label`, `route: '/admin/iframes'`; update the "Add content" quick action copy to "Upload a photo or video." (no iframe mention)

**Checkpoint**: User Story 1 fully functional. `content_manager` can manage iframes from `/admin/iframes`; the Content section still shows the legacy `embedded_web` items in the list (cleaned up by the migration; if any exist before the migration they are deleted). Independent test for US1 passes.

---

## Phase 4: User Story 2 — Display only Photo and Video in Content admin (Priority: P1)

**Goal**: The Content admin section shows only Photo and Video types. The "Embedded web (iframe)" option is gone from the form; the type filter no longer offers iframe; existing legacy rows are purged.

**Independent Test**: Sign in as `content_manager`. Open the Content list. Confirm no "Iframe" filter, no iframe rows. Open the new Content form. Confirm the Type dropdown contains only Photo and Video. Submit a content type "embedded_web" via the API and confirm 400.

### Tests for User Story 2 ⚠️

- [ ] T031 [P] [US2] Frontend spec for `ContentFormComponent` in `frontend/src/app/features/content/content-form.component.spec.ts` covering: type dropdown contains only "Photo" and "Video"; no `sourceReference` field; submit dispatches `save` (not `saveIframe`)

### Implementation for User Story 2

- [X] T032 [US2] In `frontend/src/app/features/content/content-form.component.ts`: remove the `embedded_web` option from the Type mat-select; remove the `sourceReference` branch in the template and the conditional `Validators.required`; remove the `saveIframe` codepath from `onSubmit`
- [X] T033 [US2] In `frontend/src/app/features/content/content-list.component.ts`: remove the `'Iframe'` case from `typeLabel`; remove the `'Iframe'` case from `mediaLabel`; keep the type filter limited to Photo/Video
- [X] T034 [US2] In `frontend/src/app/features/content/content.facade.ts`: remove the `saveIframe` method and any reference to it

**Checkpoint**: User Story 2 fully functional. The Content section shows Photo and Video only. The API rejects `embedded_web` (covered by T019). Independent test for US2 passes.

---

## Phase 5: User Story 3 — Switch the kiosk top zone between Content rotation and a fixed iframe (Priority: P1)

**Goal**: The remote control panel offers the operator a strict two-mode choice. Selecting an iframe pins it; selecting Rotation returns to Content. The kiosk reflects changes on its next poll.

**Independent Test**: With the kiosk open on `/display` and the remote control on `/admin/remote-control`, pin an iframe. Verify the kiosk top zone switches within one polling interval. Pin a different iframe. Verify the kiosk switches. Return to Rotation. Verify the kiosk resumes Content rotation.

### Tests for User Story 3 ⚠️

- [ ] T035 [P] [US3] Backend unit test for `DisplayControlService` iframe validation in `backend/tests/application/display_control/test_service_iframe.py` covering: `update_state(contentMode='iframe', selectedIframeId=<valid>)` succeeds; `update_state(contentMode='iframe', selectedIframeId=null)` raises; `update_state(contentMode='iframe', selectedIframeId=<unknown>)` raises; `update_state(contentMode='loop')` clears `selectedIframeId`
- [ ] T036 [P] [US3] Backend integration test for the remote control endpoints in `backend/tests/api/test_remote_control_endpoints.py` covering the new shape: `selectedIframeId` instead of `selectedContentId`; `selectedIframe` returns the new `IframeSchema`; deleting an iframe via `DELETE /api/iframes/{id}` clears the active `DisplayControlState` row and records `remote_control_iframe_deleted`
- [ ] T037 [P] [US3] Backend integration test for FR-024 in `backend/tests/api/test_remote_control_endpoints.py` asserting: PUT `/api/display/remote-control/state` with `contentMode='iframe'`, `selectedIframeId=<valid>` returns HTTP 403 when the caller is `content_manager` (who can manage iframes but not the remote control); the same call succeeds for `event_operator` and `administrator`
- [X] T038 [P] [US3] Frontend spec for `RemoteControlComponent` empty-state CTA in `frontend/src/app/features/remote-control/remote-control.component.spec.ts` asserting: when `iframeOptions().length === 0`, the empty-state CTA `routerLink` is `'/admin/iframes/new'` (not `/admin/content/new`)
- [X] T039 [P] [US3] Frontend spec for `RemoteControlComponent` refresh behaviour in `frontend/src/app/features/remote-control/remote-control.component.spec.ts` asserting: when the component is constructed with a server state `contentMode='iframe'` and a pre-selected iframe, the radio buttons and "Currently showing" badge reflect that state without requiring user interaction (US3 acceptance scenario 4)

### Implementation for User Story 3

- [X] T040 [US3] In `backend/app/application/display_control/service.py`: replace `_eligible_iframe` / `_is_iframe_eligible` with a query against the new `Iframe` table; remove the `embedded_web` content-type check; `list_iframe_options` queries `Iframe` directly; `selected_iframe` hydrates from the new entity
- [X] T041 [US3] In `backend/app/services/display_service.py`: change `DisplayState.selected_iframe` to the new `IframeSchema` shape; in `get_display_state`, after loading the `DisplayControlState`, if `content_mode == 'iframe'` and the referenced iframe no longer exists (deleted or in another org), normalise the state to `loop` + `selected_iframe_id=NULL` and log a `remote_control_iframe_deleted` event (defence in depth)
- [X] T042 [US3] In `backend/app/api/display.py`: update `display_state_route`, `remote_control_state_route`, and `iframe_options_route` to use the new `IframeSchema` shape and the new `selected_iframe_id` field
- [X] T043 [US3] In `frontend/src/app/features/remote-control/remote-control.models.ts`: update `RemoteControlState.selectedContentId` → `selectedIframeId`; update `RemoteControlIframeOption` to use the new `IframeItem`
- [X] T044 [US3] In `frontend/src/app/features/remote-control/remote-control.api.ts`: update method signatures to use `selectedIframeId`
- [X] T045 [US3] In `frontend/src/app/features/remote-control/remote-control.facade.ts`: update `setIframeMode(iframeId: string)` (renamed from `setIframeMode(contentId)`); type updates throughout
- [X] T046 [US3] In `frontend/src/app/features/remote-control/remote-control.component.ts`: update the iframe list rendering to consume `IframeItem`; the empty-state CTA MUST link to `/admin/iframes/new` instead of `/admin/content/new`
- [X] T047 [US3] In `frontend/src/app/display/display-screen.component.ts`: extend the top-zone template so that when `state.remoteControl.contentMode === 'iframe' && state.selectedIframe`, an `<iframe>` element is rendered with `[src]="safeUrl(state.selectedIframe.url)"`; the photo/video branches are mutually exclusive with this one
- [ ] T048 [US3] In `frontend/src/app/core/api/display.api.ts`: change `DisplayState.selectedIframe` type to `IframeItem | null`; add an explicit unit test (in a new `display.api.spec.ts`) asserting that `equalByDisplayFingerprint` does NOT consider `contentMode` changes significant (so toggling iframe mode does not falsely invalidate the kiosk state) — the test is required because the implementation (T049 in Phase 8) extends the same function for `videoEndDelaySeconds` and we must not regress the existing semantics

**Checkpoint**: User Story 3 fully functional. Remote control switches the kiosk between Content rotation and a fixed iframe; the API rejects dangling iframe selections and enforces the FR-024 role split; the admin cleanup records an audit event. Independent tests for US3 pass.

---

## Phase 6: User Story 4 — Videos play to end before advancing (Priority: P1)

**Goal**: When the rotation picks a video, the kiosk auto-plays it (muted, no loop), waits for the video's natural `ended` event, then waits `videoEndDelaySeconds` before advancing to the next Content item.

**Independent Test**: Add a 30-second video to Content. Open the kiosk. Verify the video plays in full, the kiosk waits the configured delay, then advances.

### Tests for User Story 4 ⚠️

- [ ] T049 [P] [US4] Frontend spec for `DisplayScreenComponent` video branch in `frontend/src/app/display/display-screen.component.spec.ts` covering: when `currentContent.contentType === 'video'`, no `setTimeout` is scheduled; `(ended)` schedules `setTimeout(advanceNow, configuration.videoEndDelaySeconds * 1000)`; the `<video>` element has no `loop` attribute; `autoplay` and `muted` are present

### Implementation for User Story 4

- [X] T050 [US4] In `frontend/src/app/display/display-screen.component.ts`: change the `<video>` element to remove the `loop` attribute, add `(ended)="onVideoEnded(currentContent)"`; add `onVideoEnded(item: DisplayContentItem)` that schedules `setTimeout(() => this.advanceNow(), (this.currentConfig()?.videoEndDelaySeconds ?? 2) * 1000)`; in `scheduleTransition`, branch on `contentType`: photo uses `effectiveDurationSeconds` timer, video does not schedule a timer (the `(ended)` handler is the only advance trigger); suppress the pre-transition poll when `contentType === 'video'`

**Checkpoint**: User Story 4 fully functional. Videos play to end; kiosk waits the configured delay; photos still use the timer. Independent test for US4 passes.

---

## Phase 7: User Story 5 — Resume Content rotation at the same index after iframe (Priority: P2)

**Goal**: When the operator returns from iframe mode to Rotation, the kiosk resumes on the same Content item that was on screen at the moment of the switch, with a fresh `effectiveDurationSeconds` timer.

**Independent Test**: Add three photos with 10-second durations. Let the kiosk show photo #2. Switch to iframe for 30 seconds. Switch back. Verify the kiosk resumes on photo #2 and plays it for 10 full seconds before advancing.

### Tests for User Story 5 ⚠️

- [ ] T051 [P] [US5] Frontend regression spec for `DisplayRotationService` in `frontend/src/app/display/display-rotation.service.spec.ts` covering: after `applyPollState` is called with `topContent` unchanged and `contentMode='iframe'`, `currentItemId` is preserved; after `applyPollState` is called with `contentMode='loop'`, the cursor is restored and `pickNext` advances from the same item

### Implementation for User Story 5

- [X] T052 [US5] In `frontend/src/app/display/display-screen.component.ts`: in `applyState`, ensure that toggling `contentMode` does NOT clear `currentItemId` / `baseAnchorId` from the rotation service. The existing `DisplayRotationService.applyPollState` is keyed on `topContent` identity only, so this is a no-op; the test in T051 is the regression guard.

**Checkpoint**: User Story 5 fully functional. Cursor is preserved across iframe toggles; the anchor item's timer restarts from 0 on return. Independent test for US5 passes.

---

## Phase 8: User Story 6 — Configure the video end delay from display configuration (Priority: P2)

**Goal**: The `KioskDisplayConfiguration` form exposes a "Video end delay (s)" numeric input. The value is hot-applied to the running kiosk. Out-of-range values are rejected with HTTP 400.

**Independent Test**: In `/admin/display-config`, change the value to 10. Play a video on the kiosk. After the video's natural end, the kiosk waits 10 seconds before advancing.

### Tests for User Story 6 ⚠️

- [ ] T053 [P] [US6] Backend unit test for `KioskConfigurationRequest` validation in `backend/tests/api/test_configuration_endpoints.py` covering: `videoEndDelaySeconds=0` accepted; `=30` accepted; `=31` rejected with 400; `=-1` rejected with 400
- [ ] T054 [P] [US6] Frontend spec for `DisplayConfigComponent` in `frontend/src/app/features/display-config/display-config.component.spec.ts` covering: form field renders with default `2`; min=`0`, max=`30`; submitting `31` shows a validation error; submitting a valid value calls the API and updates the form
- [ ] T055 [P] [US6] Frontend spec for `equalByDisplayFingerprint` in `frontend/src/app/core/api/display.api.spec.ts` covering: changing `configuration.videoEndDelaySeconds` triggers a re-emit of the polled state (FR-020); changing an unrelated configuration field does NOT trigger a re-emit (regression guard)

### Implementation for User Story 6

- [X] T056 [US6] In `backend/app/api/configuration.py`: ensure `KioskConfigurationRequest` validates `videoEndDelaySeconds` with `ge=0, le=30` (Pydantic v2 `Field(..., ge=0, le=30)`)
- [X] T057 [US6] In `frontend/src/app/core/api/admin.api.ts`: add `videoEndDelaySeconds: number` to the `KioskConfiguration` interface
- [X] T058 [US6] In `frontend/src/app/core/api/display.api.ts`: extend `equalByDisplayFingerprint` to include `configuration.videoEndDelaySeconds` so the kiosk picks up changes on the next poll
- [X] T059 [US6] In `frontend/src/app/features/display-config/display-config.component.ts`: add a numeric `mat-form-field` for "Video end delay (s)" with `min=0`, `max=30`, default `2`, reactive form binding to `videoEndDelaySeconds`

**Checkpoint**: User Story 6 fully functional. Operators can configure the delay from `/admin/display-config`; the kiosk picks up changes on its next poll. Independent test for US6 passes.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Remove the obsolete iframe domain-approval system end-to-end; run final validation; verify the spec's success criteria.

- [X] T060 Delete `backend/app/repositories/models/approved_domain.py` and remove any `ApprovedEmbeddedDomain` references from imports
- [X] T061 Delete `backend/app/api/approved_domains.py`
- [X] T062 Delete `backend/app/domain/embedded_domains.py`
- [X] T063 In `backend/app/services/admin_service.py`: remove all methods that operate on approved domains (create/list/update/delete and the "active iframe content blocks domain delete" check)
- [X] T064 In `backend/app/services/readiness_service.py`: remove the "unapproved embedded domains" check
- [X] T065 In `backend/app/services/bootstrap_service.py`: remove any seed data or imports related to approved domains
- [X] T066 Delete the directory `frontend/src/app/features/domains/` and verify no other frontend file imports from it
- [X] T067 In `frontend/src/app/features/admin-shell/admin-navigation.service.ts`: remove the "Iframe domains" sidenav entry
- [X] T068 In `frontend/src/app/app.routes.ts`: remove the `/admin/domains` route and any `/admin/domains/new` sub-route
- [X] T069 In `frontend/src/app/features/hall/hall.component.ts`: drop the "iframe domains" mention from the admin tile description
- [X] T070 [P] Run automated verification: search the codebase for `ApprovedEmbeddedDomain`, `approved_embedded_domains`, `/api/approved-domains`, `/admin/domains`. The search MUST return zero hits (SC-006). Use `rg` or `grep -r` from the repo root.
- [X] T071 Run `pytest backend/tests -k "iframe or display_control or content or readiness or display_events"` and ensure all tests pass (this includes T016, T017, T018, T019, T035, T036, T037, T053)
- [X] T072 Run `npm --prefix frontend run test` and ensure all Karma specs pass (this includes the new iframe, remote-control, content-form, display-screen, display-config, display-rotation, and display-api specs from T020, T021, T031, T038, T039, T048, T049, T051, T054, T055)
- [ ] T073 [P] Run a smoke walkthrough following `specs/016-preconfigured-iframes-and-video-end/quickstart.md` and record the result in the PR description

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion. **BLOCKS** all user stories.
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion.
- **Polish (Phase 9)**: Depends on all user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational (T003-T017). Independent of other stories.
- **US2 (P1)**: Depends on Foundational. Independent of other stories (only consumes T022 from US1).
- **US3 (P1)**: Depends on Foundational. Independent of other stories (does not require the admin UI; only the API surface).
- **US4 (P1)**: Depends on Foundational. Independent of other stories (purely frontend; the migration and config changes are part of Foundational).
- **US5 (P2)**: Depends on US3 (consumes the same `DisplayScreenComponent` rendering branch). Independent test.
- **US6 (P2)**: Depends on Foundational. Independent of other stories (config knob only).

### Within Each User Story

- Tests MUST be written and fail before implementation where automated testing is feasible.
- Backend: schemas → services → endpoints → integration tests.
- Frontend: types → API client → facade → component → spec.

### Parallel Opportunities

- All Setup tasks marked `[P]` can run in parallel.
- All Foundational tasks marked `[P]` can run in parallel (within Phase 2).
- Once Foundational phase completes, user stories US1, US2, US4, US6 can run in parallel (US3 depends on US1's foundation for the new API but can start once the schemas are in place; US5 depends on US3's display branch).
- Within each user story, all `[P]`-marked tests can be authored in parallel.
- Polish tasks T060-T069 (deletions) can run in parallel after all user stories are complete.

---

## Parallel Examples

### Setup phase

```bash
# In parallel:
Task: "Verify the working branch is 016-preconfigured-iframes-and-video-end ..."
Task: "Read spec.md, plan.md, research.md ..."
```

### Foundational phase

```bash
# In parallel (different files, no dependencies):
Task: "Create Alembic migration 0008_preconfigured_iframes_and_video_end.py"
Task: "Create SQLAlchemy model Iframe"
Task: "Update DisplayControlState model"
Task: "Update KioskDisplayConfiguration model"
Task: "Add IframeSchema to backend/app/api/schemas.py"
Task: "Backend unit test scaffolding for IframeService"
Task: "Backend migration test for 0008"
```

### US1 phase

```bash
# In parallel (different files):
Task: "Backend integration test for /api/iframes"
Task: "Backend integration test for embedded_web rejection"
Task: "Frontend spec for IframeListComponent"
Task: "Frontend spec for IframeFormComponent"

# Models in parallel:
Task: "Create IframeItem interface and IframeApiService in core/api/iframe.api.ts"
Task: "Create IframeFacade in features/iframes/iframe.facade.ts"
Task: "Create IframeListComponent"
Task: "Create IframeFormComponent"
```

### US3 phase

```bash
# All test tasks in parallel (different files):
Task: "Backend unit test for DisplayControlService iframe validation"
Task: "Backend integration test for remote control new shape"
Task: "Backend integration test for FR-024 auth"
Task: "Frontend spec for RemoteControlComponent empty-state CTA"
Task: "Frontend spec for RemoteControlComponent refresh behaviour"
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 3, 4 — all P1)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories).
3. Complete Phase 3: US1 (Iframe admin CRUD).
4. Complete Phase 4: US2 (Drop iframe from Content admin).
5. Complete Phase 5: US3 (Remote control with iframe selection).
6. Complete Phase 6: US4 (Video play to end).
7. **STOP and VALIDATE**: smoke walkthrough per `quickstart.md` Steps 1-11.
8. Deploy / demo if ready.

### Incremental Delivery

1. Setup + Foundational → schema migrated, models and base API exist.
2. Add US1 → admin can manage iframes. Deploy/demo (MVP!).
3. Add US2 → Content admin is photo+video only. Deploy/demo.
4. Add US3 → remote control can pin iframes. Deploy/demo.
5. Add US4 → videos play to end. Deploy/demo.
6. Add US5 → cursor preserved across toggles. Deploy/demo.
7. Add US6 → `videoEndDelaySeconds` configurable from display config. Deploy/demo.
8. Run Polish (Phase 9) → approval system removed, final verification.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together.
2. Once Foundational is done:
   - Developer A: US1 (Iframe admin CRUD).
   - Developer B: US2 (Drop iframe from Content admin).
   - Developer C: US4 + US6 (video play to end + config knob — both frontend-only).
3. After US1 ships, Developer D can pick up US3 (remote control).
4. After US3 ships, US5 (cursor preservation) lands.
5. Polish phase: any developer, deletions are quick.

---

## Notes

- `[P]` tasks = different files, no dependencies.
- `[Story]` label maps task to a specific user story for traceability.
- Each user story MUST be independently completable and testable.
- Verify tests fail before implementing (where applicable).
- Commit after each task or logical group.
- Stop at any checkpoint to validate story independently.
- Stop and explain before changing direction if implementation conflicts with the approved spec or plan.
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence.
- The migration (T003) is the highest-risk task. Test it against a fresh DB and against a DB with legacy `embedded_web` rows before merging. The dedicated migration test (T017) is the contract for "the migration is safe in both directions."
- Automated verification (T070) is mandatory for SC-006.
- The fingerprint equality tests (T048 in Phase 5 and T055 in Phase 8) protect the same function from regressions on both axes: `contentMode` toggling must not invalidate the polled state, and `videoEndDelaySeconds` changes MUST invalidate it.
