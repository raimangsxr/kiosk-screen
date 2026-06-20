# Implementation Plan: Pre-configured Iframes and Video Plays To End

**Branch**: `016-preconfigured-iframes-and-video-end` | **Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/016-preconfigured-iframes-and-video-end/spec.md` and clarifying session 2026-06-20.

## Summary

Split iframes out of `TopContentItem` into a first-class `Iframe` entity with a flat admin CRUD, drop the entire iframe domain-approval system (`ApprovedEmbeddedDomain` and its dependents), and change the kiosk's top-zone rotation so that videos play to their natural end with a configurable post-end delay (`videoEndDelaySeconds`, default 2, range 0–30) before advancing. The remote control becomes a strict two-mode switch (`loop` or a single pinned iframe) with the client-side rotation cursor preserved across toggles. One new persisted entity (`Iframe`), three existing entities modified (`DisplayControlState`, `KioskDisplayConfiguration`, `TopContentItem`), one entity removed (`ApprovedEmbeddedDomain`), one new admin section (`/admin/iframes`), one new field on the kiosk display configuration form, and a one-time data purge of `embedded_web` rows. No new Python or Node dependencies.

## Technical Context

**Language/Version**: Python 3.12 (backend, existing toolchain), TypeScript with the Angular-supported version pinned in `frontend/package.json` (frontend, existing toolchain).

**Primary Dependencies**:
- Backend: FastAPI (existing), SQLAlchemy 2.x (existing), Alembic (existing), Pydantic v2 (existing), `urllib.parse` from the standard library for URL validation. **No new Python packages.**
- Frontend: Angular standalone components (existing), RxJS (existing), Angular Material (existing). **No new npm packages.**

**Storage**:
- PostgreSQL remains the source of truth (existing). One new table `iframes`; one column rename on `display_control_states`; one new column on `kiosk_display_configurations`; one table drop (`approved_embedded_domains`). All changes go through a single Alembic migration `0008_preconfigured_iframes_and_video_end.py`. The migration also performs a one-time purge of `top_content_items` rows with `content_type='embedded_web'`.
- Disk-backed media storage (existing) is unaffected: iframes are pure URLs, no file storage.

**Testing**:
- Backend: pytest for unit and integration tests. New test categories for this feature: backend unit tests for `IframeService` (create, update, delete, validation, cleanup-on-delete); backend integration tests for `GET/POST/PUT/DELETE /api/iframes` (auth, validation, org isolation, duplicate URL, delete-while-active); backend integration tests for the remote-control endpoints with the new `selectedIframeId` field; backend migration test for the new migration (upgrade/downgrade/upgrade on a seeded DB, including the purge of `embedded_web` rows); backend tests confirming the `embedded_web` content type is rejected at every entry point.
- Frontend: Angular Karma + Jasmine. New test categories: `IframeListComponent` and `IframeFormComponent` specs; `RemoteControlComponent` updates for the new iframe shape and the empty-state CTA; `ContentFormComponent` spec for the dropped `embedded_web` option; `DisplayConfigComponent` spec for the new `videoEndDelaySeconds` field; `DisplayScreenComponent` spec for the photo-vs-video-vs-iframe render branches and the `ended` handler; `DisplayRotationService` regression spec proving that the cursor survives a `loop → iframe → loop` toggle.

**Target Platform**:
- Backend: Linux server, runs under uvicorn (existing), deployable via the existing Docker image.
- Frontend: browser-based web application, desktop and tablet viewports (existing constraint).

**Project Type**: Web application with separate frontend and backend packages in one repository (existing).

**Performance Goals**:
- Admin list / create / edit / delete iframe: ≤ 200 ms p95 (single SQL write or read on a small table).
- Kiosk state poll (existing `GET /api/display/state`): no new latency; the response shape change is additive (`selectedIframe` replaces `selectedIframe` of the old shape with the same JSON size class).
- Mode toggle freshness: bounded by `configuration.remoteControlPollingSeconds` (1–60s, default 3), per spec 006. SC-002 inherits this bound.
- 200 iframes in the admin list still render in under 500 ms (no pagination needed at this scale; the admin list is a flat table).

**Constraints**:
- The kiosk's client-side rotation cursor is preserved in `DisplayRotationService` and survives an `iframe` toggle but not a kiosk page reload (Q1 in the clarifications). Documented in the spec's Assumptions.
- No watchdog timer for videos that never fire `ended` (Q6 in the clarifications). Documented.
- The existing polling-based live-update is the only allowed notification mechanism; no SSE, no WebSocket. SC-002 inherits this.
- The public content API (`/api/public/content/upload`) remains photo+video only; no change to its surface (Q9).
- All existing error envelope shapes are reused; no new error categories.
- The `last valid change wins` semantics from spec 006 are preserved for the remote control.

**Scale/Scope**:
- 1 new table (`iframes`), 1 new admin section (`/admin/iframes`), 1 new API endpoint group (`/api/iframes`), 1 new field on the kiosk configuration, 1 new field on the display state DTO, 1 new branch in the kiosk render template, 1 new branch in the remote-control panel, 1 new audit event type (`remote_control_iframe_deleted`), 1 new Alembic migration.
- 1 entity removed (`ApprovedEmbeddedDomain`); 1 admin section removed (`/admin/domains`); 1 API endpoint group removed (`/api/approved-domains`); 1 readiness check removed; 1 content type removed from the Content form.
- No new third-party dependencies.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Spec traceability**: PASS. The plan references `spec.md` (24 FRs, 7 SCs, 6 user stories, 9 clarifications) and is traceable to every FR.
- **Requirement clarity**: PASS. The 2026-06-20 clarification session resolved all 9 high-impact ambiguities; no `[NEEDS CLARIFICATION]` markers remain.
- **Plan alignment**: PASS. The technical approach implements the spec without speculative features. The existing specs (006, 009, 010, 015) are respected; the only deltas are the schema, the iframe entity, the kiosk render branch, and the removed approval system.
- **Simplicity**: PASS. No new dependencies, no new abstractions beyond what the spec requires. Reuses `ContentService` validation patterns, `DisplayControlService` state machine, `DisplayRotationService` novelty-queue machinery, and the existing `ApplicationError` envelope.
- **Contracts**: PASS. Three contract documents under `specs/016-preconfigured-iframes-and-video-end/contracts/` cover the admin API, the remote-control API, and the kiosk render contract.
- **Testing**: PASS. Backend unit + integration + migration tests; frontend facade + component + service + rotation tests. Manual smoke validation recorded in `quickstart.md`.
- **Security, observability, accessibility**: PASS. Least-privilege role preserved (`content_manager` / `administrator` for iframes; `event_operator` / `administrator` for remote control). The removal of the iframe domain allow-list is an explicit product decision captured in spec Q3 and Assumptions; the security/content-trust trade-off is owned by the event operator. The `remote_control_iframe_deleted` `DisplayEvent` provides observability for the new flow. The admin form uses standard Angular Material controls and the existing dialog-trap pattern; no new accessibility surface.
- **No speculative scope**: PASS. Iframe scheduling, iframe ordering, iframe re-approval, watchdog timer for stuck videos, iframe sandbox/allow attributes, and per-video override of `videoEndDelaySeconds` are explicitly out of scope (TQ-005, spec Assumptions).
- **Conflict handling**: PASS. The plan stops on conflict with any in-flight feature work; the spec is in its own branch (`016-preconfigured-iframes-and-video-end`) and ships independently.

## Phase 0: Research

Research is captured in [research.md](./research.md). Key decisions:

- One Alembic migration covering schema, data purge, and column rename (atomic, no temporary nullable columns).
- `Iframe.url` stored as plain text with custom `^https?://` validation; no normalization.
- `DisplayControlState.selected_iframe_id` uses `ON DELETE SET NULL` plus service-level cleanup with audit event.
- Video `ended` event handled on the frontend with `setTimeout(advanceNow, videoEndDelaySeconds * 1000)`; no backend coordination, no watchdog.
- Rotation cursor preservation is implemented in the existing `DisplayRotationService`; no new service.
- `approved_embedded_domains` table and all its dependents are removed in a single sweep.
- `TopContentItem.content_type` validation lives in `ContentService`; the DB column stays as `String(32)`.
- `videoEndDelaySeconds` is a column on `kiosk_display_configurations` with CHECK 0..30 and default 2.

## Phase 1: Design

Design outputs:

- [data-model.md](./data-model.md)
- [contracts/admin-iframe-contract.md](./contracts/admin-iframe-contract.md)
- [contracts/remote-control-contract.md](./contracts/remote-control-contract.md)
- [contracts/kiosk-render-contract.md](./contracts/kiosk-render-contract.md)
- [quickstart.md](./quickstart.md)

## Proposed Architecture

### Backend

The backend is reorganized minimally. The new code follows the existing module boundaries (capability-oriented folders under `app/api/v1/`, `app/services/`, `app/repositories/models/`).

#### New files

- `backend/app/repositories/models/iframe.py` — SQLAlchemy model `Iframe` (id, organization_id, url, audit fields).
- `backend/app/services/iframe_service.py` — `IframeService` with `list`, `get`, `create`, `update`, `delete`. The `delete` method scans the active `DisplayControlState` row(s) for the caller's organization, sets `content_mode='loop'`, `selected_iframe_id=NULL`, and records a `DisplayEvent` of type `remote_control_iframe_deleted`.
- `backend/app/api/iframes.py` — FastAPI router mounted at `/api/iframes` with the five endpoints from the admin contract.
- `backend/app/api/mappers.py` (extension) — `to_iframe_schema(iframe: Iframe) -> IframeSchema`.
- `backend/app/domain/events.py` (extension) — new `DisplayEventType.remote_control_iframe_deleted`.
- `backend/alembic/versions/0008_preconfigured_iframes_and_video_end.py` — single migration.

#### Modified files

- `backend/app/repositories/models/__init__.py` — export `Iframe`; remove `ApprovedEmbeddedDomain` export.
- `backend/app/repositories/models/display_control_state.py` — rename `selected_content_id` to `selected_iframe_id`; FK to `iframes.id` with `ON DELETE SET NULL`.
- `backend/app/repositories/models/kiosk_configuration.py` — add `video_end_delay_seconds: int = 2` with `CHECK (0 <= video_end_delay_seconds <= 30)`.
- `backend/app/services/content_service.py` — `validate_content` and `validate_uploaded_content` accept only `{photo, video}`. Reject `embedded_web` with HTTP 400.
- `backend/app/services/display_service.py` — `DisplayState.selected_iframe` returns the new `Iframe` shape; `get_display_state` also performs the dangling-iframe cleanup (defense in depth, in case the service-level cleanup in `IframeService.delete` is bypassed).
- `backend/app/application/display_control/service.py` — `update_state` validates `selectedIframeId` against the new `Iframe` table; the `iframe` content type is removed from the validation chain. `list_iframe_options` queries `Iframe`. `selected_iframe` hydrates from the new entity.
- `backend/app/services/admin_service.py` — remove the `ApprovedEmbeddedDomain` CRUD methods.
- `backend/app/services/readiness_service.py` — remove the "unapproved embedded domains" check.
- `backend/app/api/schemas.py` — new `IframeSchema`, `IframeRequest`, `IframeListResponse`. Update `ContentItemSchema.contentType` to `'photo' | 'video'`. Update `RemoteControlIframeOptionsSchema` and `RemoteControlAdminStateSchema.selectedIframe` to use `IframeSchema`. Update `DisplayStateSchema.selectedIframe` to use `IframeSchema`. Add `videoEndDelaySeconds` to `KioskConfigurationSchema` and `KioskConfigurationRequest`.
- `backend/app/api/content.py` — remove `POST /api/content/iframe` (and the helper function in the router).
- `backend/app/api/display.py` — `iframe-options` route and `display_state_route` updated for the new `Iframe` shape; `display_state_route` performs the dangling-iframe cleanup.
- `backend/app/api/configuration.py` — accept and emit `videoEndDelaySeconds`.
- `backend/app/api/v1/router.py` — register the new `iframes` router; remove the `approved-domains` router.
- `backend/app/main.py` — no change beyond what the routers do.

#### Removed files

- `backend/app/repositories/models/approved_domain.py`
- `backend/app/api/approved_domains.py`
- `backend/app/domain/embedded_domains.py`

#### Authorization

The new `iframes` router uses `require_roles(CONTENT_MANAGEMENT_ROLES)` (i.e., `content_manager` or `administrator`), reusing the existing `Role` enum and the `auth.dependencies.require_roles` helper. The remote-control routes are unchanged from spec 006.

### Frontend

The frontend mirrors the backend shape changes.

#### New files

- `frontend/src/app/core/api/iframe.api.ts` — `IframeItem` and `IframeApiService` with `list`, `create`, `get`, `update`, `delete`.
- `frontend/src/app/features/iframes/iframe-list.component.ts` — table with `url` (truncated) and `actions` (edit, delete). No drag-and-drop. No active/inactive toggle.
- `frontend/src/app/features/iframes/iframe-list.component.html`
- `frontend/src/app/features/iframes/iframe-list.component.css`
- `frontend/src/app/features/iframes/iframe-form.component.ts` — single-field form (`url`) with the same Material reactive-forms pattern as `content-form.component.ts`.
- `frontend/src/app/features/iframes/iframe-form.component.html`
- `frontend/src/app/features/iframes/iframe-form.component.css`
- `frontend/src/app/features/iframes/iframe.facade.ts` — facade following the same pattern as `content.facade.ts` (state signals + refresh + save + delete).
- `frontend/src/app/features/iframes/iframe-list.component.spec.ts`
- `frontend/src/app/features/iframes/iframe-form.component.spec.ts`

#### Modified files

- `frontend/src/app/core/api/content.api.ts` — `ContentItem.contentType` is `'photo' | 'video'` only. Remove `createIframe` and `IframeContentItem` references.
- `frontend/src/app/core/api/display.api.ts` — `DisplayContentItem.contentType` is `'photo' | 'video'` only. `DisplayState.selectedIframe` is typed as the new `IframeItem`. The `equalByDisplayFingerprint` function is extended to include `configuration.videoEndDelaySeconds` so changes are detected on the next poll.
- `frontend/src/app/core/api/admin.api.ts` — `KioskConfiguration.videoEndDelaySeconds: number` is added.
- `frontend/src/app/display/display-screen.component.ts` — template has three render branches: photo (timer-based), video (`(ended)` + delay), iframe (fixed). The `(ended)` handler is added. The `loop` attribute is removed from the `<video>` element. `applyState` is left untouched regarding the rotation cursor (the existing novelty-queue state machine preserves it). The pre-transition poll is preserved for photos and suppressed for videos.
- `frontend/src/app/display/display-screen.component.spec.ts` — new specs for the three branches and the `ended` handler.
- `frontend/src/app/display/display-rotation.service.spec.ts` — new spec proving the cursor survives a `loop → iframe → loop` toggle.
- `frontend/src/app/features/content/content-form.component.ts` — remove `Embedded web (iframe)` from the `Type` mat-select. Remove the `sourceReference` branch and its `Validators.required`. Remove the `saveIframe` codepath.
- `frontend/src/app/features/content/content-form.component.spec.ts` — new spec for the truncated Type dropdown.
- `frontend/src/app/features/content/content-list.component.ts` — remove `Iframe` from `typeLabel` and the media column.
- `frontend/src/app/features/content/content.facade.ts` — remove `saveIframe`.
- `frontend/src/app/features/display-config/display-config.component.ts` — add the new "Video end delay (s)" input with `min=0, max=30`, default 2.
- `frontend/src/app/features/remote-control/remote-control.component.ts` — the iframe list consumes the new `IframeItem` shape. The empty-state CTA points to `/admin/iframes/new`.
- `frontend/src/app/features/remote-control/remote-control.facade.ts`, `remote-control.api.ts`, `remote-control.models.ts` — types updated.
- `frontend/src/app/features/admin-shell/admin-navigation.service.ts` — new `Iframes` sidenav entry; remove `Iframe domains`; the "Add content" copy drops the iframe mention.
- `frontend/src/app/app.routes.ts` — new routes `/admin/iframes`, `/admin/iframes/new`, `/admin/iframes/:id`. Remove `/admin/domains`.

#### Removed files

- `frontend/src/app/features/domains/` (entire directory).
- The "Iframe domains" entry from `admin-navigation.service.ts`.

### Data flow

The end-to-end flow for switching to an iframe:

1. Operator on `/admin/remote-control` selects an iframe.
2. `RemoteControlFacade.setIframeMode(iframeId)` calls `PUT /api/display/remote-control/state` with `contentMode='iframe'`, `selectedIframeId=<id>`.
3. `DisplayControlService.update_state` writes the new state to `display_control_states` and records a `DisplayEvent`.
4. Kiosk's next poll (≤ 3s) on `GET /api/display/state` returns the new `remoteControl.contentMode='iframe'`, `selectedIframe` populated.
5. `DisplayScreenComponent.applyState` enters the iframe branch and mounts the `<iframe>` element.
6. The rotation cursor is left untouched; if the operator switches back to "Rotation", the same `topContent` item is shown with a fresh timer.

The end-to-end flow for a video ending:

1. Kiosk is showing a video Content item.
2. The browser fires the `ended` event on the `<video>` element.
3. `(ended)="onVideoEnded(currentItem)"` schedules `setTimeout(advanceNow, configuration.videoEndDelaySeconds * 1000)`.
4. After the delay, `advanceNow` calls `DisplayRotationService.pickNext()` and the next Content item is shown.

## Project Structure

### Documentation (this feature)

```text
specs/016-preconfigured-iframes-and-video-end/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── admin-iframe-contract.md
│   ├── remote-control-contract.md
│   └── kiosk-render-contract.md
├── spec.md              # /speckit-specify output
├── checklists/
│   └── requirements.md  # /speckit-checklist output
└── tasks.md             # /speckit-tasks output (Phase 2)
```

### Source Code (repository root)

The repository structure is unchanged (web application with separate `backend/` and `frontend/` packages). The changes touch the existing files in the following locations:

```text
backend/
├── app/
│   ├── api/
│   │   ├── content.py        (modified)
│   │   ├── configuration.py  (modified)
│   │   ├── display.py        (modified)
│   │   ├── iframes.py        (NEW)
│   │   ├── mappers.py        (extended)
│   │   ├── schemas.py        (modified)
│   │   └── v1/router.py      (modified)
│   ├── application/display_control/service.py  (modified)
│   ├── domain/events.py      (extended)
│   ├── repositories/models/
│   │   ├── __init__.py       (modified)
│   │   ├── display_control_state.py  (modified)
│   │   ├── iframe.py         (NEW)
│   │   └── kiosk_configuration.py  (modified)
│   ├── services/
│   │   ├── admin_service.py  (modified — drops ApprovedEmbeddedDomain methods)
│   │   ├── content_service.py  (modified)
│   │   ├── display_service.py  (modified)
│   │   ├── iframe_service.py  (NEW)
│   │   └── readiness_service.py  (modified — drops the check)
│   └── main.py               (unchanged; routers do the work)
└── alembic/versions/0008_preconfigured_iframes_and_video_end.py  (NEW)

frontend/
├── src/app/
│   ├── app.routes.ts         (modified)
│   ├── core/api/
│   │   ├── admin.api.ts      (modified)
│   │   ├── content.api.ts    (modified)
│   │   ├── display.api.ts    (modified)
│   │   └── iframe.api.ts     (NEW)
│   ├── display/
│   │   ├── display-rotation.service.spec.ts  (modified)
│   │   ├── display-screen.component.ts       (modified)
│   │   └── display-screen.component.spec.ts  (modified)
│   ├── features/
│   │   ├── admin-shell/admin-navigation.service.ts  (modified)
│   │   ├── content/
│   │   │   ├── content-form.component.ts          (modified)
│   │   │   ├── content-form.component.spec.ts     (modified)
│   │   │   ├── content-list.component.ts          (modified)
│   │   │   └── content.facade.ts                  (modified)
│   │   ├── display-config/display-config.component.ts  (modified)
│   │   ├── iframes/    (NEW directory)
│   │   │   ├── iframe-list.component.ts
│   │   │   ├── iframe-list.component.html
│   │   │   ├── iframe-list.component.css
│   │   │   ├── iframe-list.component.spec.ts
│   │   │   ├── iframe-form.component.ts
│   │   │   ├── iframe-form.component.html
│   │   │   ├── iframe-form.component.css
│   │   │   ├── iframe-form.component.spec.ts
│   │   │   └── iframe.facade.ts
│   │   └── remote-control/
│   │       ├── remote-control.component.ts        (modified)
│   │       ├── remote-control.facade.ts           (modified)
│   │       ├── remote-control.api.ts              (modified)
│   │       └── remote-control.models.ts           (modified)
│   └── ... (unchanged)
```

**Structure Decision**: Reuse the existing two-package layout (`backend/`, `frontend/`). No new packages are introduced; no new top-level directories are introduced.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| (none) | — | — |

No constitution violations. The plan is the simplest design that satisfies the spec, reuses existing patterns, introduces no new dependencies, and removes code (the approval system) rather than adding it.
