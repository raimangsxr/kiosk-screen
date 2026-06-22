# Implementation Plan: Content Rotation Modes

**Branch**: `018-content-rotation-modes` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/018-content-rotation-modes/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Fix three kiosk rotation bugs (ad index not advancing, ad interval not honouring `defaultAdDurationSeconds`, ad-region invisible in Chrome) and extend the content model and the kiosk/remote-control to support four new behaviours:

1. **Branding overlay** is hidden while the kiosk is in `iframe` mode (inverts `017 US2 AS-5 / T031`).
2. **Pause / Resume** in the remote control "Rotation navigation" card; affects both Content and Ads.
3. **Recurring content** (`recurringEveryXIterations` integer ≥ 1) shown every X advances of the regular queue; mutually exclusive with `isFixed`.
4. **Fixed content** (`isFixed=true`) plus a new remote-control mode `fixed` that pins a single item; on exit, the loop continues from the index that was active before entering `fixed`.
5. **Auto-detect** image vs. video in the upload endpoints by file extension; admin endpoint also accepts the new `isFixed` / `recurringEveryXIterations` flags (public endpoint ignores them).

Delivered via one Alembic migration `0012_content_rotation_modes.py` (idempotent pattern from `0011`), one refactor of the kiosk timer subsystem to a single `effect()`-driven controller, two new commands in `display_control_states`, one new mode, and updates to admin upload, public upload, content service, content list/form, remote-control UI, and tests. No new dependencies; no breaking changes to public contracts outside the two new optional request fields on the admin upload.

## Technical Context

**Language/Version**:
- Backend: Python 3.11+ (project standard), FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2.
- Frontend: Angular 20.3, TypeScript 5.8, RxJS 7.8, Material 20, Karma 6 + Jasmine.

**Primary Dependencies** (no new ones):
- Backend: existing `MediaStorageService`, `ConfigurationRepository`, `DisplayEventRepository`, `DisplayControlService`, `ContentService`, `validate_media_upload`, `require_roles` / `CONFIGURATION_MANAGEMENT_ROLES`.
- Frontend: existing `display-rotation.service.ts`, `display-control-sync.service.ts`, `event-branding.service.ts`, `RemoteControlFacade`, `DisplayApiService`, `WatchState`, `FileInputComponent`.

**Storage**: PostgreSQL (existing). Two tables extended: `top_content_items` (new columns) and `display_control_states` (new column + CHECK constraint widened).

**Testing**:
- Backend: pytest (existing).
- Frontend: Karma + Jasmine (existing).

**Target Platform**: Linux server (backend) + Chromium-based kiosk browsers (≥ Chrome 110, ≥ Firefox 110) + Angular SPA admin.

**Project Type**: Web application with `backend/` (FastAPI) + `frontend/` (Angular) — Option 2 in the template.

**Performance Goals**:
- Kiosk rotation cadence honours `effectiveDurationSeconds` / `defaultAdDurationSeconds` within ±1 s tolerance.
- Auto-detection adds ≤ 1 ms per upload (extension string match, no I/O).
- Pause / Resume affects local timers only; no backend round-trip beyond the existing display-state poll (≤ `remoteControlPollingSeconds`, default 3 s).
- Fixed-mode selection triggers one extra poll cycle via `DisplayControlSyncService` (existing pattern).

**Constraints**:
- Content type autodetection uses only the filename extension (string match); it does NOT relax existing MIME / size validation in `validate_media_upload`.
- Public API never accepts `isFixed` or `recurringEveryXIterations`; admin-only.
- `fixed` and `recurring` are mutually exclusive at the model and at both admin upload endpoints; violation → HTTP 400.
- All migrations must be idempotent (existing pattern from `0010`, `0011`).
- Ad-region rendering must be pixel-identical on Chrome ≥ 110 and Firefox ≥ 110.

**Scale/Scope**:
- One new migration; two models extended; one service refactored (`display-rotation.service.ts`); one frontend component heavily refactored (`display-screen.component.ts`); one new remote-control mode; five new audit events; no new high-volume path.
- One kiosk polling cycle unchanged in shape (still: 1× `display/state` + 1× `event-branding`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Spec traceability**: Plan references the approved specification, user stories (US1–US6), requirements (FR-001..FR-029 incl. FR-008a, FR-008b, FR-012a), and measurable success criteria (SC-001..SC-007) in `spec.md`. ✓
- **Requirement clarity**: All 7 clarifications resolved during `/speckit-clarify` and integrated into `spec.md`. No `NEEDS CLARIFICATION` markers remain. ✓
- **Plan alignment**: Technical approach stays within spec scope; new endpoints limited to two admin field extensions on existing uploads; no new top-level endpoint. ✓
- **Simplicity**: No new dependencies. New abstractions are: a single `KioskRotationController` (effect-based, replaces the two `setTimeout` subsystems in `display-screen.component.ts`); the new optional request fields reuse `ContentItemRequest`. Existing services are extended, not forked. ✓
- **Contracts**: Public/integration/data boundaries documented in `contracts/admin-content-upload.md`, `contracts/public-content-upload.md`, `contracts/display-control-navigation.md`, `contracts/display-control-state.md`, `contracts/audit-display-control.md`. The 017 contract `public-event-branding.md` is unchanged. ✓
- **Testing**: Each FR maps to a test per the mapping table in §"Test strategy"; coverage targets per SC-007: ≥ 80% line coverage for `backend/app/services/content_service.py` and ≥ 70% line coverage for `frontend/src/app/display/display-screen.component.ts`. ✓
- **Security, observability, accessibility**: Public API ignores `isFixed` / `recurring` (least privilege, Q6 answer); auto-detect does not relax MIME validation (TQ-004); five new audit events for pause / resume / fixed change / empty queue / type-autodetected (TQ-005); branding overlay already carries `aria-label` and `pointer-events: none`; ad-region keeps existing `aria-label="Patrocinadores del evento"`. ✓
- **No speculative scope**: Out-of-scope items listed in spec §Out of Scope (multi-kiosk sync, video ads, push notifications, multi-recurring ordering) are not in this plan. ✓
- **Conflict handling**: `017 US2 AS-5` and `017 T031` are explicitly superseded; the implementation MUST update the corresponding spec/test text in `017` at merge time. If implementation reality conflicts with this plan, work stops and the conflict is documented (per constitution §III).

## Project Structure

### Documentation (this feature)

```text
specs/018-content-rotation-modes/
├── plan.md                          # This file
├── research.md                      # Phase 0 output
├── data-model.md                    # Phase 1 output
├── quickstart.md                    # Phase 1 output
├── contracts/
│   ├── admin-content-upload.md      # NEW (delta on existing POST /api/content/upload)
│   ├── public-content-upload.md     # NEW (delta on existing POST /api/public/content/upload)
│   ├── display-control-state.md     # NEW (extended contentMode + selectedFixedContentId)
│   ├── display-control-navigation.md # NEW (pause / resume added)
│   └── audit-display-control.md     # NEW (5 new audit events)
└── tasks.md                         # Phase 2 output (next step)
```

### Source Code (repository root)

Web application layout (Option 2):

```text
backend/
├── app/
│   ├── api/
│   │   ├── content.py                       # MODIFIED: accept isFixed, recurringEveryXIterations
│   │   ├── v1/public_content/routes.py     # MODIFIED: ignore isFixed / recurring; autodetect by extension
│   │   ├── display.py                      # MODIFIED: serialize selectedFixedContentId; include fixed-mode eligibility
│   │   ├── display_control.py              # MODIFIED: accept 'pause' / 'resume'; validate contentMode='fixed' target
│   │   ├── schemas.py                      # MODIFIED: ContentItemSchema (+isFixed, recurringEveryXIterations),
│   │   │                                       PublicContentUploadRequest (+contentType autodetect by extension)
│   │   ├── mappers.py                      # MODIFIED: to_content_item_schema carries new fields
│   │   └── router.py                       # unchanged (no new top-level routes)
│   ├── repositories/
│   │   └── models/
│   │       ├── content.py                  # MODIFIED: TopContentItem (+recurringEveryXIterations, +isFixed)
│   │       └── display_control_state.py    # MODIFIED: DisplayControlState (+selectedFixedContentId, CHECK widened to 'fixed')
│   ├── services/
│   │   ├── content_service.py              # MODIFIED: detect_media_type_from_extension; exclusivity validation; public-upload ignores fixed/recurring
│   │   ├── display_control_service.py      # MODIFIED: issue_navigation_command accepts pause/resume; update_state validates 'fixed'
│   │   ├── media_storage_service.py        # MODIFIED: detect_media_type_from_extension helper (no schema change)
│   │   ├── display_service.py              # MODIFIED: open_display includes fixed eligibility in initial state
│   │   └── audit_service.py                # MODIFIED: 5 new audit events
│   ├── domain/
│   │   └── media.py                        # MODIFIED: IMAGE_EXTENSIONS / VIDEO_EXTENSIONS constants + detect helper
│   └── shared/                             # unchanged
├── alembic/versions/0012_content_rotation_modes.py  # NEW: idempotent migration
└── tests/
    ├── unit/test_content_service_extension_autodetect.py  # NEW
    ├── unit/test_content_service_exclusivity.py           # NEW
    ├── unit/test_display_control_service_pause_resume.py  # NEW
    ├── integration/test_content_upload_admin_018.py       # NEW (extends existing)
    ├── integration/test_content_upload_public_018.py      # NEW (extends existing)
    ├── integration/test_display_control_pause_resume.py   # NEW
    ├── integration/test_display_control_fixed_mode.py     # NEW
    └── integration/test_migration_0012_content_rotation_modes.py  # NEW (idempotency)

frontend/
└── src/app/
    ├── core/
    │   ├── api/
    │   │   ├── display.api.ts              # MODIFIED: RemoteControlContentMode += 'fixed'; NavigationCommand += 'pause' | 'resume'; DisplayState.selectedFixedContentId?
    │   │   ├── content.api.ts              # MODIFIED: ContentItem += isFixed?, recurringEveryXIterations?; admin upload accepts them
    │   │   └── public-content.api.ts       # MODIFIED: upload() never sends isFixed / recurring
    │   ├── kiosk-rotation.controller.ts    # NEW: effect()-based single source of truth for Content + Ads timers + pause + cadence
    │   ├── display-rotation.service.ts     # MODIFIED: keeps only queue picking + cadence counter + state snapshot; timers move out
    │   └── event-branding.service.ts       # unchanged
    ├── display/
    │   ├── display-screen.component.ts     # MODIFIED: consumes KioskRotationController; overlay `*ngIf` excludes iframe; fixed mode template; pause/resume wiring; video.loop = isFixed
    │   ├── display-screen.component.css    # MODIFIED: drop `max-width: auto`; ensure ad-region works in Chrome
    │   └── display-screen.component.spec.ts # MODIFIED: add iframe-overlay hidden, fixed-mode render, pause/resume, recurring cadence, chrome ad visibility, ad-index advancement
    ├── features/
    │   ├── remote-control/
    │   │   ├── remote-control.component.ts # MODIFIED: add Pause/Resume buttons; add Fixed mode radio + dropdown of fixed content
    │   │   ├── remote-control.facade.ts    # MODIFIED: navigate('pause' | 'resume'); update(contentMode='fixed', selectedFixedContentId)
    │   │   ├── remote-control.models.ts    # MODIFIED: extend RemoteControlContentMode + RemoteControlNavigationCommand unions
    │   │   ├── remote-control.api.ts       # MODIFIED: send new commands / new mode
    │   │   └── remote-control.component.spec.ts # MODIFIED: render Fixed mode option; disable when no fixed content; buttons disabled in non-loop mode
    │   ├── content/
    │   │   ├── content-form.component.ts   # MODIFIED: add isFixed checkbox + recurringEveryXIterations number input; disable recurring when isFixed
    │   │   ├── content-list.component.ts   # MODIFIED: show "Fijo" / "Recurrente cada N" badges
    │   │   └── content.service.ts          # MODIFIED: surface isFixed / recurringEveryXIterations in facade state
    │   └── admin-shell/
    │       └── admin-navigation.service.ts # unchanged (no new nav entries)
    └── app.routes.ts                       # unchanged
```

**Structure Decision**: Option 2 (web app). Backend changes touch ORM, services, API routers, mappers, schemas, and one new migration. Frontend introduces a new `core/kiosk-rotation.controller.ts` and heavily refactors `display-screen.component.ts` and `display-rotation.service.ts` to a single effect-driven controller. Remote-control and content form/list get small additions.

## Implementation phases (informational — see tasks.md for the executable breakdown)

1. **Backend migration**: `0012_content_rotation_modes.py` adds `top_content_items.recurringEveryXIterations`, `top_content_items.isFixed`, `display_control_states.selected_fixed_content_id`; widens the `content_mode` CHECK to include `'fixed'`. Idempotent.
2. **Backend models**: extend `TopContentItem`, `DisplayControlState`; update `__init__.py`.
3. **Backend services**:
   - `domain/media.py`: `IMAGE_EXTENSIONS`, `VIDEO_EXTENSIONS`, `detect_media_type_from_extension`.
   - `content_service.py`: public path autodetects by extension; admin path validates exclusivity (HTTP 400 if both); public path **always** persists `isFixed=false`, `recurringEveryXIterations=null`.
   - `display_control_service.py`: navigation accepts `pause` / `resume`; `update_state` validates that `contentMode='fixed'` requires a `selected_fixed_content_id` whose target has `isFixed=true`; audit events.
4. **Backend API**:
   - `api/content.py`: form fields `isFixed` and `recurringEveryXIterations` (admin-only).
   - `api/v1/public_content/routes.py`: ignore `isFixed` / `recurring`; autodetect by extension; existing `contentType` behaviour unchanged.
   - `api/display_control.py`: validate `contentMode` ∈ `{'loop','iframe','fixed'}`; navigation command ∈ `{'next','previous','pause','resume'}`.
   - `api/display.py`: serialise `selectedFixedContentId` and `fixedEligibleContentIds` in `GET /api/display/state`.
5. **Frontend controller**:
   - New `core/kiosk-rotation.controller.ts` owns: content timer, ad timer, ad index, current item index, cadence counter, pause flag, fixed-content reference, mode-driven loop logic.
   - `display-rotation.service.ts` keeps only the queue-picking and the rotation cursor; delegates timers.
   - `display-screen.component.ts` becomes a thin consumer: `effect()` reads controller signals; template stays declarative.
6. **Frontend kiosk UI**:
   - Branding overlay `*ngIf` becomes `hasBranding() && !iframeUrl()`.
   - `<video [loop]="isFixedMode() && currentIsVideo()" (ended)="onVideoEnded(content)" ...>` — fixed videos loop; non-fixed videos advance.
   - Ad-region: drop `max-width: auto`; ensure inline-block fallback; ensure `[style.animation-duration.ms]` resolves to a non-null ms value (`?? animationDurationDefault`) for Chrome.
7. **Frontend remote-control**:
   - Pause / Resume buttons under the existing "Rotation navigation" card; disabled when `mode() !== 'loop'`.
   - Fixed mode radio under "Content mode"; dropdown populated from `displayState().fixedEligibleContentIds`; disabled when the list is empty.
   - When `mode='fixed'` and a fixed item is selected, send `selectedFixedContentId` in the PUT payload.
8. **Frontend content form / list**:
   - `content-form.component.ts`: add `isFixed` checkbox; when true, hide `recurringEveryXIterations` input and vice-versa. Show a hint "Recurrente y Fijo son mutuamente excluyentes".
   - `content-list.component.ts`: badges "Fijo" / "Recurrente cada N".
9. **Tests**:
   - Backend: 8 test files / additions (see Project Structure tree).
   - Frontend: 4 spec files updated / extended.
10. **Validation**:
    - `pytest backend/tests -q`.
    - `npm --prefix frontend run test`.
    - `npm --prefix frontend run build`.
    - `alembic upgrade head` (rerun twice to assert idempotency).
    - Manual smoke per `quickstart.md`.

## Dependencies (introduced or upgraded)

None. All new code reuses existing patterns and libraries.

## Public / integration / data / UI boundaries (summary)

- **Admin endpoint `POST /api/content/upload`** — extended to accept optional `isFixed` (boolean) and `recurringEveryXIterations` (integer ≥ 1); mutually exclusive → HTTP 400; autodetect by extension when `contentType` is omitted or contradicts extension. See `contracts/admin-content-upload.md`.
- **Admin endpoint `GET /api/content/...`** — serialised schemas include the new fields.
- **Public endpoint `POST /api/public/content/upload`** — `isFixed` / `recurringEveryXIterations` are silently ignored (always persisted as `false`/`null`); autodetect by extension when `contentType` is omitted. See `contracts/public-content-upload.md`.
- **Display state `GET /api/display/state`** — new field `selectedFixedContentId` in `remoteControl`; new field `fixedEligibleContentIds: TopContentItem[]` for the remote control. See `contracts/display-control-state.md`.
- **Navigation `POST /api/display/remote-control/navigation`** — accepts `'pause'` and `'resume'` in addition to `'next'` / `'previous'`. See `contracts/display-control-navigation.md`.
- **Mode update `PUT /api/display/remote-control`** — accepts `contentMode='fixed'` + `selectedFixedContentId`. Validation: target must exist and have `isFixed=true`.
- **Database change** — see `data-model.md`.
- **Audit events** — `display_control_paused`, `display_control_resumed`, `display_control_fixed_changed`, `content_rotation_empty`, `content_type_autodetected`. See `contracts/audit-display-control.md`.
- **Kiosk UI** — overlay hidden in iframe mode; new template branch for `contentMode='fixed'`; pause indicator; `aria-label="Fixed content"` on the fixed region. See `display-screen.component.ts`.
- **017 contract `public-event-branding.md`** — unchanged (branding continues to be served; only the kiosk-side rendering rule changes, captured in spec §US2).

## Security

- Public API ignores `isFixed` / `recurring` (Q6 answer). The persisted values for public uploads are always `false` / `null`; this prevents an external integration from forcing a kiosk into fixed mode or hijacking the queue via recurring content.
- Auto-detect by extension **does not** relax MIME / size validation in `validate_media_upload` (TQ-004). An attacker uploading `evil.exe` with name `evil.jpg` is rejected at the MIME layer.
- Navigation commands (`pause` / `resume` / `next` / `previous`) inherit the same role gate as the existing `next` / `previous` (admin / `content_manager` / `advertising_manager`).
- `contentMode='fixed'` PUT requires the target to have `isFixed=true`; otherwise HTTP 400 with a clear message. No privilege escalation through a guessed ID.
- `removeFixed` (i.e. back to `loop`) does not require the previous item to still exist; the kiosk preserves the loop index even if the item was deleted (per FR-024).
- Audit events carry `userId` only; no PII beyond what the user record already exposes.

## Observability

- 5 new audit events: `display_control_paused`, `display_control_resumed`, `display_control_fixed_changed`, `content_rotation_empty`, `content_type_autodetected`. Each is visible in the existing admin events listing (no new UI).
- Frontend logs (browser console) the rotation cursor on every advance in dev builds; this is already the case via the existing `console.debug` calls in `display-rotation.service.ts` and will be extended to the new controller.
- Existing Pydantic error responses for validation failures; no new error schema needed.
- Empty-queue condition emits `content_rotation_empty` once per empty detection (debounced 60 s).

## Accessibility

- Branding overlay already carries `aria-label="Organizer and event branding"` and `pointer-events: none` (017 FR-018); no change.
- New fixed-content region carries `aria-label="Fixed content"` and `role="img"` (when image) or `aria-label="Fixed video"` (when video).
- Ad-region already carries `aria-label="Patrocinadores del evento"` (017); unchanged.
- Pause / Resume buttons have `aria-label="Pause rotation"` / `"Resume rotation"`; disabled state communicated via `aria-disabled`.
- Fixed-mode dropdown uses native `<mat-select>` semantics (keyboard accessible by default).

## Out-of-scope confirmations

Per spec §Out of Scope:

- Multi-kiosk sync.
- Video ads.
- Real-time push notifications to the admin / remote control (still polling).
- Multi-recurring ordering (round-robin only).
- `isFixed` for Ads.
- Simultaneous `isFixed` + `recurring` on the same item (mutually exclusive, FR-016).
- Auto-cleanup of old Contents.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| None | n/a | n/a |

No constitution violations. The plan introduces no new dependencies, no new top-level endpoints, and replaces the existing two ad-hoc `setTimeout` subsystems in `display-screen.component.ts` with a single `effect()`-driven controller (`KioskRotationController`). The migration follows the same idempotent pattern as `0010` and `0011`. The 017 overlay-rendering rule change is documented as a deliberate spec supersede at the top of `spec.md` and is not a silent contradiction.