# Tasks: Content Rotation Modes

**Input**: Design documents from `/specs/018-content-rotation-modes/`
- `plan.md` (required) — implementation plan, structure, dependencies
- `spec.md` (required) — user stories US1–US6 with priorities
- `research.md` — 10 technical decisions (TD-001..TD-010)
- `data-model.md` — migration `0012_content_rotation_modes.py` and SQLAlchemy model deltas
- `contracts/admin-content-upload.md` — admin upload delta (isFixed, recurringEveryXIterations, autodetect)
- `contracts/public-content-upload.md` — public upload delta (autodetect, ignore isFixed/recurring)
- `contracts/display-control-state.md` — display state + PUT remote-control delta
- `contracts/display-control-navigation.md` — navigation command delta (pause/resume)
- `contracts/audit-display-control.md` — 5 new audit events + new endpoint `POST /api/display/rotation-event`
- `quickstart.md` — 18-step end-to-end smoke

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Mandatory for changed behaviour. Unit tests for business logic (rotation cadence, autodetect, exclusivity); integration/contract tests for external boundaries (admin upload, public upload, display-control, audit, migration idempotency); Karma tests for the new kiosk controller, the modified kiosk display component, the modified remote-control component, and the modified content form.

**Organization**: Tasks are grouped by user story. Backend changes that serve multiple stories (migration, model extensions, schemas, mappers, content service autodetect, display-control pause/resume/fixed validation, audit event emission, new endpoint `POST /api/display/rotation-event`) are placed in the Foundational phase because they are blocking prerequisites for US3, US4, US5, US6.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, …)
- Include exact file paths in descriptions

## Path Conventions

Web app layout per `plan.md`:
- Backend: `backend/app/...`, `backend/alembic/versions/...`, `backend/tests/...`
- Frontend: `frontend/src/app/...`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the workspace and confirm baseline builds.

- [ ] T001 [P] Verify baseline backend tests pass: `pytest backend/tests -q` from repo root returns green (no regressions vs `main`).
- [ ] T002 [P] Verify baseline frontend build and tests pass: `npm --prefix frontend run build` and `npm --prefix frontend run test` return green.
- [ ] T003 [P] Create empty test stubs at `backend/tests/unit/test_content_service_extension_autodetect.py`, `backend/tests/unit/test_content_service_exclusivity.py`, `backend/tests/unit/test_display_control_service_pause_resume.py`, `backend/tests/integration/test_content_upload_admin_018.py`, `backend/tests/integration/test_content_upload_public_018.py`, `backend/tests/integration/test_display_control_pause_resume.py`, `backend/tests/integration/test_display_control_fixed_mode.py`, `backend/tests/integration/test_migration_0012_content_rotation_modes.py`. Each is an empty test class with `pytest.mark.skip("Pending implementation")`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, models, services, helpers, and the new lightweight endpoint MUST be complete before any user story work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Implement Alembic migration `backend/alembic/versions/0012_content_rotation_modes.py` per `data-model.md` §1. Every step guarded by `_table_exists` / `_column_exists` / `_constraint_exists` checks (pattern from `0011_event_branding.py`). The migration adds:
  - `top_content_items.recurring_every_x_iterations INTEGER NULL` with check constraint `ck_top_content_recurring_positive` (`IS NULL OR >= 1`).
  - `top_content_items.is_fixed BOOLEAN NOT NULL DEFAULT FALSE` with check constraint `ck_top_content_not_fixed_and_recurring` (`NOT (is_fixed AND recurring_every_x_iterations IS NOT NULL)`).
  - `top_content_items` partial index `ix_top_content_items_is_fixed` (`WHERE is_fixed = true`).
  - `display_control_states.selected_fixed_content_id INTEGER NULL` with FK to `top_content_items.id` ON DELETE SET NULL.
  - Widens existing `ck_display_control_content_mode` CHECK from `('loop','iframe')` to `('loop','iframe','fixed')`.
  - New CHECK `ck_display_control_fixed_has_target` (`selected_fixed_content_id IS NOT NULL OR content_mode != 'fixed'`).
  Idempotent: rerunning `alembic upgrade head` MUST NOT raise and MUST NOT duplicate columns/constraints.
- [ ] T005 Modify `backend/app/repositories/models/content.py`: extend `TopContentItem` with `recurring_every_x_iterations: Mapped[int | None]` and `is_fixed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")`. Add the two CheckConstraint entries per `data-model.md` §SQLAlchemy models.
- [ ] T006 Modify `backend/app/repositories/models/display_control_state.py`: extend `DisplayControlState` with `selected_fixed_content_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("top_content_items.id", ondelete="SET NULL"), nullable=True)`. Widen the existing `content_mode` CHECK to include `'fixed'` and add the new `selected_fixed_content_id` CHECK.
- [ ] T007 [P] Export updated models: ensure `TopContentItem` and `DisplayControlState` are exported from `backend/app/repositories/models/__init__.py` (already exported; verify no changes are needed).
- [ ] T008 [P] Modify `backend/app/domain/media.py`: add module-level constants `IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}` and `VIDEO_EXTENSIONS = {".mp4", ".webm", ".ogg", ".mov"}`. Add helper `detect_media_type_from_extension(filename: str) -> Literal["photo", "video"]` that raises `UnsupportedExtensionError` (new exception class in the same file) on unknown extensions or missing filename.
- [ ] T009 [P] Modify `backend/app/api/schemas.py`: add fields `is_fixed: bool` and `recurring_every_x_iterations: int | None` to `ContentItemSchema` (line ~121) and to `ContentItemRequest` (line ~169). Make `ContentItemRequest.content_type` optional (`content_type: str | None = None`).
- [ ] T010 [P] Modify `backend/app/api/mappers.py`: extend `to_content_item_schema` to carry `is_fixed` and `recurring_every_x_iterations`.
- [ ] T011 Modify `backend/app/services/content_service.py`: in `create_uploaded` (the admin path), when `payload.content_type is None` OR the detected type from `detect_media_type_from_extension(upload.filename)` contradicts `payload.content_type`, use the detected type. Emit the `content_type_autodetected` audit event when the extension overrode the explicit value (via the existing `create_event` helper). Validate exclusivity: if both `is_fixed` (from payload) is `True` AND `recurring_every_x_iterations` (from payload) is not None, raise `ValueError("Un Content no puede ser fijo y recurrente a la vez.")` mapped to HTTP 400. Validate `recurring_every_x_iterations >= 1` when present.
- [ ] T012 Modify `backend/app/services/content_service.py`: in `append_via_public_api`, replace MIME-based detection with extension-based detection using `detect_media_type_from_extension`. Silently ignore `is_fixed` and `recurring_every_x_iterations` from the request body (always persist `is_fixed=False`, `recurring_every_x_iterations=None`). Update `UnsupportedMediaTypeError` to be raised from the new `UnsupportedExtensionError` (re-export via `__init__.py` aliases for backwards compat).
- [ ] T013 Modify `backend/app/services/display_control_service.py`:
  - `issue_navigation_command`: accept `command ∈ {'next','previous','pause','resume'}`. Reject with `ValueError` mapped to HTTP 409 when `command ∈ {pause, resume, next, previous}` and `state.content_mode != 'loop'`. Emit audit events `display_control_paused` / `display_control_resumed` for pause/resume.
  - `update_state`: validate `content_mode ∈ {'loop','iframe','fixed'}`. When `content_mode='fixed'`, validate `selected_fixed_content_id` is non-null and points to a `TopContentItem` with `is_fixed=True`; reject otherwise with HTTP 400 / 404. Validate that `selected_fixed_content_id` is null when mode is not `fixed`. Emit `display_control_fixed_changed` on transitions into 'fixed' or when target changes.
  - Auto-fallback hook: when the existing target's `is_fixed` becomes `False` (or the row is deleted via FK cascade), the next read detects it, sets `content_mode='loop'` and `selected_fixed_content_id=None`, emits `display_control_fixed_changed`.
- [ ] T014 Modify `backend/app/services/display_service.py` (`open_display`): include `fixed_eligible_content_ids` in the returned display state (a serialised list of `{id, name, mediaUrl, thumbnailUrl, contentType, durationSeconds}` for all `TopContentItem` rows with `is_fixed=True`, sorted by `displayOrder`).
- [ ] T015 [P] Add new endpoint `backend/app/api/display_rotation_events.py` with `POST /api/display/rotation-event`. Body: `{"eventType": "content_rotation_empty", "payload": {...}}`. Auth: existing operator-session token. Validates `eventType ∈ {"content_rotation_empty"}` and delegates to `audit_service.create_event`. Register the router in `backend/app/api/router.py` with `prefix="/display/rotation-event"`.
- [ ] T016 [P] Modify `backend/app/services/audit_service.py` (or whichever module holds `create_event`): add a helper or constant for the 5 new event types: `display_control_paused`, `display_control_resumed`, `display_control_fixed_changed`, `content_rotation_empty`, `content_type_autodetected`. Document the payload shape per `contracts/audit-display-control.md`.
- [ ] T017 Migration idempotency test in `backend/tests/integration/test_migration_0012_content_rotation_modes.py`: create a fresh SQLite-in-memory schema; run `alembic upgrade head`; rerun; assert no exception. Inspect resulting schema: `top_content_items` has `recurring_every_x_iterations` (nullable INTEGER), `is_fixed` (BOOLEAN NOT NULL DEFAULT false), both checks; `display_control_states` has `selected_fixed_content_id`, content_mode CHECK includes 'fixed', `ck_display_control_fixed_has_target` exists.
- [ ] T018 [P] Data-preservation invariant test (same file as T017): seed a `TopContentItem` row with default values; run upgrade; assert the row still exists and the new columns take their defaults. Seed a `display_control_states` row with `content_mode='loop'`; assert it persists untouched.
- [ ] T019 [P] Service-level unit tests in `backend/tests/unit/test_content_service_extension_autodetect.py`: `detect_media_type_from_extension('.jpg') == 'photo'`; same for `.jpeg/.png/.gif/.webp/.mp4/.webm/.ogg/.mov`; unknown extensions raise `UnsupportedExtensionError`; missing filename raises `UnsupportedExtensionError`. (Covers TD-003 + FR-027.)
- [ ] T020 [P] Service-level unit tests in `backend/tests/unit/test_content_service_exclusivity.py`: `create_uploaded` raises when both `is_fixed=True` and `recurring_every_x_iterations=3`; `create_uploaded` raises when `recurring_every_x_iterations <= 0`; `create_uploaded` accepts `is_fixed=True` alone; `create_uploaded` accepts `recurring_every_x_iterations=1` alone; `create_uploaded` with `content_type='photo'` and filename `.mp4` persists as `video` and emits `content_type_autodetected`. (Covers FR-014, FR-016, FR-028.)
- [ ] T021 [P] Service-level unit tests in `backend/tests/unit/test_display_control_service_pause_resume.py`: `issue_navigation_command('pause')` persists with fresh `navigationCommandId` and emits `display_control_paused`; same for `resume`; pause/resume rejected with HTTP 409 mapping when `content_mode != 'loop'`; `next`/`previous` still rejected outside `loop`; `update_state` with `content_mode='fixed'` and valid target succeeds and emits `display_control_fixed_changed`; `update_state` with `content_mode='fixed'` and target whose `is_fixed=False` raises ValueError → HTTP 400.
- [ ] T022 [P] Update existing backend tests/fixtures that reference removed/changed fields: search via `grep -rn "configured_event_duration_minutes" backend/` and `grep -rn "content_type=" backend/tests/`. Replace any hard-coded `content_type="photo"` upload fixtures with the new optional pattern only where the tests exercise the upload path. Use `pytest backend/tests -q` to verify no regressions.

**Checkpoint**: Foundation ready — `pytest backend/tests -q` green (excluding tests in pending stubs that are explicitly `skip`), `alembic upgrade head` idempotent.

---

## Phase 3: User Story 1 — Fix Ad / Content rotation (Priority: P1) 🎯 MVP

**Goal**: The kiosk's ad and content rotation respects `displayOrder`, `defaultAdDurationSeconds`, and `effectiveDurationSeconds`; the ad-region is visible in both Chrome and Firefox.

**Independent Test**: With 3 ads and `defaultAdDurationSeconds=10`, open `/display` in Chrome and Firefox. After 30 s, all 3 ads have appeared in order with each held for 10 s ±1 s. Repeat with a video in the main content rotation: after `ended`, the next item appears and stays for its `effectiveDurationSeconds`.

### Tests for User Story 1

- [ ] T023 [P] [US1] Karma spec in `frontend/src/app/display/display-screen.component.spec.ts`: with 3 ads and `defaultAdDurationSeconds=10`, advance time by 10 s three times; assert the visible ad index moves through 0 → 1 → 2 → 0 (round-robin) and each hold is ≥ 9 s and ≤ 11 s. (Covers SC-001, FR-001, FR-002.)
- [ ] T024 [P] [US1] Karma spec for Chrome vs Firefox ad visibility: render the kiosk component in headless Chrome; assert `.ad-region` exists, has non-zero bounding-box, and contains the configured `<img>` elements. The same assertions must hold when the component is rendered with FirefoxUserAgent (use Karma's user-agent override or a fixture). (Covers SC-001 / Chrome path, FR-004.)
- [ ] T025 [P] [US1] Karma spec in `frontend/src/app/display/display-screen.component.spec.ts`: with a video in the rotation that fires `ended`, advance by `videoEndDelaySeconds`; assert the next item is rendered and stays for its `effectiveDurationSeconds` (not `videoEndDelaySeconds`). (Covers FR-003.)

### Implementation for User Story 1

- [ ] T026 [US1] Create `frontend/src/app/core/kiosk-rotation.controller.ts`. Class is a `@Injectable({ providedIn: 'root' })` service. Inputs are observables/signals for `mode`, `currentContentQueue`, `currentAdList`, `defaultAdDurationSeconds`, `defaultTopDurationSeconds`, `videoEndDelaySeconds`, `effectiveDurationOf(contentId)`. Internal signals: `currentContentId`, `adIndex`, `cadenceCounter`, `isPaused`, `fixedContentId`. One `effect()` arms a single `setTimeout` that advances whichever cursor is due. The controller does NOT call into `DisplayRotationService`; instead it exposes pure functions for the queue picker. (Implements TD-001, TD-008.)
- [ ] T027 [US1] Modify `frontend/src/app/core/display-rotation.service.ts`: remove `scheduleTransition` / `scheduleNextAd` / `applyState` timer logic. Keep only: `pickNextContent(queue, currentIndex, isPaused)`, `pickNextAd(list, currentIndex)`, the novelty queue, the rotation cursor. The service becomes a stateless helper consumed by `KioskRotationController`.
- [ ] T028 [US1] Modify `frontend/src/app/display/display-screen.component.ts`: replace the inline `scheduleTransition` / `scheduleNextAd` / `onVideoEnded` / `applyNavigationCommand` timer logic with calls into `KioskRotationController`. The component subscribes to controller signals via `toSignal(...)` and binds them in the template. The `applyNavigationCommand` becomes a thin wrapper that calls `controller.applyNavigationCommand(command)`.
- [ ] T029 [US1] Modify `frontend/src/app/display/display-screen.component.css`: in the `.ad-region > figure` rule, replace `max-width: auto` (no-op, line 34) with an explicit `max-width: 100%` (or remove the line entirely if `max-width` was unintended). Verify the rule is now syntactically valid CSS.
- [ ] T030 [US1] Modify `frontend/src/app/display/display-screen.component.ts`: ensure `animationDurationMs(ad)` returns a finite positive number even when both `effectiveAnimationDurationMilliseconds` and the item-level duration are missing. Provide a fallback default (e.g., `defaultAdDurationSeconds * 1000`). (Fixes the Chrome `animation-duration: null` issue identified in research.)
- [ ] T031 [US1] Modify `frontend/src/app/display/display-screen.component.css`: ensure `.ad-region` uses an explicit `display: grid` (or `flex`) on the parent so that `minmax(120px, 1fr)` resolves to a non-zero width in Chrome when the figure children have not yet loaded. Add `min-width: 120px` on `.ad-region > figure` as a Chrome-safe baseline. (Covers FR-004.)
- [ ] T031a [P] [US1] Karma spec in `frontend/src/app/display/display-screen.component.spec.ts`: when the content queue is empty (no Contents returned by the display state), the template renders a `<div class="empty-queue">Sin contenido</div>` element with `aria-label="No content available"`. The ad-region continues to render if `adsVisible=true`. (Covers FR-017 placeholder side.)
- [ ] T031b [US1] Modify `frontend/src/app/core/kiosk-rotation.controller.ts`: add an internal signal `isQueueEmpty` derived from `currentContentQueue.length === 0`. When the queue transitions from non-empty to empty, the controller schedules a debounced (60 s) `POST /api/display/rotation-event` with `{"eventType": "content_rotation_empty", "payload": {"reason": "no_contents"}}`. Subsequent empty transitions within the debounce window are NOT sent. (Covers FR-017 audit-event side.)
- [ ] T031c [US1] Modify `frontend/src/app/display/display-screen.component.ts`: in the main content region template, wrap the image/video/fixed branches in `@if (controller.currentContentQueue().length > 0) { ... } @else { <div class="empty-queue" aria-label="No content available">Sin contenido</div> }`. The placeholder has `pointer-events: none` and `z-index: 1` (below the overlay). (Covers FR-017 rendering side; complements T031a / T031b.)

**Checkpoint**: US1 fully functional. Ad rotation visible in Chrome, advances per `displayOrder`, respects `defaultAdDurationSeconds`; video ended → next item has its effective duration.

---

## Phase 4: User Story 2 — Branding overlay hidden in iframe mode (Priority: P1)

**Goal**: The `branding-overlay` is hidden when the kiosk is in `iframe` mode; visible when in `loop` or `fixed` modes; returns when switching back.

**Independent Test**: With branding configured, open `/display`. Overlay visible. Switch kiosk to iframe mode from the control remote. Overlay disappears from the DOM. Switch back. Overlay reappears.

### Tests for User Story 2

- [ ] T032 [P] [US2] Karma spec in `frontend/src/app/display/display-screen.component.spec.ts`: with branding configured and `contentMode='loop'`, assert `document.querySelector('.branding-overlay')` returns a non-null element. With `contentMode='iframe'`, assert the same query returns `null` (element not in DOM, not just `display:none`). With `contentMode='fixed'`, assert the overlay is present. (Covers FR-006, FR-007.)
- [ ] T033 [P] [US2] Karma spec for the iframe → loop transition: start in iframe mode with branding; flip `contentMode` to `loop` via the controller; assert the overlay reappears without re-rendering the rest of the screen. (Covers FR-007 implicitly.)
- [ ] T033a [P] [US2] Karma spec for FR-008 index preservation: start in `loop` mode with the cursor at content index N (use a 4-item queue; set cursor at index 2 via the controller). Switch `mode='iframe'` (simulate `applyState`). Switch back to `mode='loop'`. Assert the cursor is still at index 2 (NOT reset to 0, NOT advanced). Repeat the symmetric case from `loop → fixed → loop` (already covered by T053, but document here for traceability). (Covers FR-008 explicitly; resolves analysis finding F3.)

### Implementation for User Story 2

- [ ] T034 [US2] Modify `frontend/src/app/display/display-screen.component.ts`: change the overlay `*ngIf` from `hasBranding()` to `hasBranding() && !iframeUrl()`. No CSS change. (Implements TD-009 + FR-006, FR-007.)
- [ ] T035 [P] [US2] Modify `specs/017-event-branding/spec.md`: at the top of US2, mark the Acceptance Scenario 5 ("overlay is still rendered in iframe mode") as **OBSOLETE** and point to spec 018 FR-006. Cross-link from 017 spec to 018 spec.
- [ ] T036 [P] [US2] Modify `specs/017-event-branding/tasks.md`: mark T031 (`[X] T031 [P] [US2] Iframe-mode test ...`) as **OBSOLETE** with the reason "superseded by 018 FR-006". Add a pointer at the top of the file.

**Checkpoint**: US2 fully functional. Overlay hides on iframe mode, returns on loop / fixed.

---

## Phase 5: User Story 3 — Pause / Resume from remote control (Priority: P1)

**Goal**: The remote control exposes "Pause" and "Resume" buttons in the Rotation navigation card; the kiosk cancels/resumes all timers accordingly. Pause state is local; resets on mode change.

**Independent Test**: From the control remote, click "Pause". The current item stays on the kiosk for ≥ 5 minutes without advancing. Click "Resume". Rotation continues within ≤ 1 s + `effectiveDurationSeconds`. Switch to iframe mode while paused → return to loop → kiosk is not paused.

### Tests for User Story 3

- [ ] T037 [P] [US3] Integration test in `backend/tests/integration/test_display_control_pause_resume.py`: `POST /api/display/remote-control/navigation` with `command='pause'` and `content_mode='loop'` returns 200 and emits `display_control_paused`; with `content_mode='iframe'` returns 409; with `content_mode='fixed'` returns 409. Same matrix for `command='resume'`. (Covers FR-010, FR-012.)
- [ ] T038 [P] [US3] Karma spec in `frontend/src/app/features/remote-control/remote-control.component.spec.ts`: when `mode()==='loop'`, Pause and Resume buttons are enabled; when `mode()==='iframe'` or `'fixed'`, both buttons are disabled (`aria-disabled='true'`); clicking the disabled Pause button does NOT call the navigation facade. (Covers FR-009, FR-012, FR-023.)

### Implementation for User Story 3

- [ ] T039 [P] [US3] Modify `frontend/src/app/core/api/display.api.ts`: extend `RemoteControlNavigationCommand` union from `'next' | 'previous'` to `'next' | 'previous' | 'pause' | 'resume'`.
- [ ] T040 [US3] Modify `frontend/src/app/features/remote-control/remote-control.facade.ts`: `navigate(command)` already accepts `RemoteControlNavigationCommand`; no signature change, but add an in-memory `pauseCounter` (or use the existing `navigationCommandId` freshness check) so a paused kiosk cannot be re-paused by a stale command.
- [ ] T041 [US3] Modify `frontend/src/app/features/remote-control/remote-control.component.ts`: in the "Rotation navigation" card (template lines 195–228), add two `mat-button` elements labelled "Pause" (`aria-label="Pause rotation"`) and "Resume" (`aria-label="Resume rotation"`). Both call `facade.navigate('pause' | 'resume')`. Disable them when `mode() !== 'loop'`. Style with `mat-stroked-button` for consistency with existing buttons.
- [ ] T042 [US3] Modify `frontend/src/app/core/kiosk-rotation.controller.ts`: add `applyNavigationCommand(command)` that handles `pause` (cancel all timers, call `video.pause()` if a video is playing), `resume` (re-arm timers from the current cursor), `next` / `previous` (advance/rewind the cursor by one, preserve pause state). On any mode change away from `loop`, reset `isPaused = false` (FR-012a). (Implements TD-002.)
- [ ] T043 [P] [US3] Modify `frontend/src/app/display/display-screen.component.ts`: the `<video>` element gets a `(pause)` / `(play)` listener that updates `KioskRotationController.isPaused` when the operator interacts with native video controls. (Defensive; the main path is remote control.)

**Checkpoint**: US3 fully functional. Pause / Resume round-trip works; kiosk stops/starts cleanly.

---

## Phase 6: User Story 4 — Recurring content with cadence (Priority: P1)

**Goal**: Contents marked with `recurringEveryXIterations=N` appear every N advances of the regular queue; the cadence counter pauses outside `loop` and resumes at the same value.

**Independent Test**: With one Content marked `everyXIterations=3` and 4 regular Contents, watch `/display`. After every 3rd advance, the recurring Content appears. Between appearances, the regular queue follows its order.

### Tests for User Story 4

- [ ] T044 [P] [US4] Contract test in `backend/tests/integration/test_content_upload_admin_018.py`: `POST /api/content/upload` with `recurringEveryXIterations=3` and `isFixed=false` persists the row; the returned `ContentItemSchema` shows `recurringEveryXIterations: 3`, `isFixed: false`. (Covers FR-013, FR-014.)
- [ ] T045 [P] [US4] Contract test for exclusivity (same file as T044): upload with `isFixed=true` AND `recurringEveryXIterations=3` returns HTTP 400 with `code: mutually_exclusive_flags`. (Covers FR-016.)
- [ ] T046 [P] [US4] Karma spec in `frontend/src/app/core/kiosk-rotation.controller.spec.ts`: with one recurring item at cadence 3 and a 4-item regular queue, advance the controller 15 times; assert the recurring item appeared exactly 5 times, at advances 4, 8, 12, 16 (the 5th appearance requires the 16th advance, so use `tick()` 16 times total). Pause after advance 5; assert the cadence counter is unchanged; resume; advance 3 more times (to advance 8); assert the recurring item appears at advance 8 (counter resumed). (Covers FR-015 + Q3 answer.)
- [ ] T047 [P] [US4] Karma spec for two recurring items (same file as T046): with recurring-A at cadence 2 and recurring-B at cadence 4, advance 16 times; assert A appears at positions matching `every 2 regular advances` and B at `every 4`, with proper round-robin between A and B if both are due. (Covers FR-015 "alternating".)

### Implementation for User Story 4

- [ ] T048 [US4] Modify `frontend/src/app/core/kiosk-rotation.controller.ts`: add internal signal `cadenceCounter` (integer). The `effect()` increments `cadenceCounter` on every content advance when `mode='loop' AND isPaused=false`. When `mode` enters `'iframe'` or `'fixed'`, the counter is frozen (no increment). When `mode` returns to `'loop'`, the counter resumes from the same value. The queue picker uses `cadenceCounter % min(everyXIterations)` across active recurring items to decide which one to insert. (Implements TD-010 + FR-015.)
- [ ] T049 [US4] Modify `frontend/src/app/core/display-rotation.service.ts`: add `pickRecurringInsertion(regularQueue, recurringItems, cadenceCounter) -> { regularNext, recurringNext }` pure helper. Round-robin between recurring items when more than one is "due" at the same time. No timer logic — pure function.

**Checkpoint**: US4 fully functional. Recurring content appears at the right cadence.

---

## Phase 7: User Story 5 — Fixed content and new "fixed" mode (Priority: P1)

**Goal**: A Content marked `is_fixed=true` can be pinned via a new "Fixed" mode in the remote control; the kiosk shows it indefinitely (loop if video). Returning to loop continues from the previous index.

**Independent Test**: Mark a Content as fixed; in the remote control, switch to "Fixed" and select it. The kiosk switches to that item. Switch back to "Rotation" — the rotation continues from where it was before entering fixed.

### Tests for User Story 5

- [ ] T050 [P] [US5] Integration test in `backend/tests/integration/test_display_control_fixed_mode.py`: `PUT /api/display/remote-control` with `contentMode='fixed'` + a `selectedFixedContentId` whose target has `is_fixed=true` returns 200 and emits `display_control_fixed_changed`. With target `is_fixed=false`, returns 400 `code: target_not_fixed`. Without `selectedFixedContentId`, returns 400 `code: fixed_requires_target`. (Covers FR-019, FR-020, FR-022.)
- [ ] T051 [P] [US5] Integration test for the auto-fallback path (same file as T050): seed an organisation with one fixed item; set the display control state to `contentMode='fixed'` pointing at it; delete the item; call `GET /api/display/state`; assert the state now shows `contentMode='loop'` and `selectedFixedContentId=null`, and that a `display_control_fixed_changed` audit event was emitted with `previousContentMode='fixed'`, `newContentMode='loop'`. (Covers FR-024.)
- [ ] T052 [P] [US5] Karma spec in `frontend/src/app/features/remote-control/remote-control.component.spec.ts`: when `displayState.fixedEligibleContentIds` is empty, the "Fixed" radio is disabled with a tooltip "No hay content fijo disponible". When the list has entries, the radio is enabled and the dropdown is populated with the items' names. (Covers FR-022.)
- [ ] T053 [P] [US5] Karma spec in `frontend/src/app/core/kiosk-rotation.controller.spec.ts`: enter `mode='fixed'` with a video fixed content; assert `isPaused=false`, no timers armed, `<video>` element has `loop=true`. After 5 s (simulated), the controller does NOT advance; the video remains on screen. Switch back to `loop`; assert the controller remembers the previous content index (which was active when `fixed` was entered) and resumes from it. (Covers FR-008, FR-020, FR-021.)
- [ ] T054 [P] [US5] Karma spec in `frontend/src/app/display/display-screen.component.spec.ts`: the template branch for `mode='fixed'` renders the fixed content's `<img>` or `<video>` (with `loop=true`), the ad-region continues rotating, and the branding overlay (when configured) is visible. (Covers FR-007, FR-008b.)

### Implementation for User Story 5

- [ ] T055 [P] [US5] Modify `frontend/src/app/core/api/display.api.ts`: extend `RemoteControlContentMode` union from `'loop' | 'iframe'` to `'loop' | 'iframe' | 'fixed'`. Extend the display state types with `selectedFixedContentId?: number` and `fixedEligibleContentIds?: FixedEligibleContentItem[]`.
- [ ] T056 [US5] Modify `frontend/src/app/features/remote-control/remote-control.facade.ts`: extend `update(...)` to accept `contentMode='fixed'` and `selectedFixedContentId`. The facade's `update` method already proxies the PUT body; only the validation / serialisation needs the new fields. Update `RemoteControlUpdateRequest` if it exists as a separate type.
- [ ] T057 [US5] Modify `frontend/src/app/features/remote-control/remote-control.component.ts`: in the "Content mode" card (template lines 116–193), add a third `mat-radio-button` labelled "Fixed". When selected, reveal a `mat-select` populated with `displayState().fixedEligibleContentIds ?? []`. Disable the radio when the list is empty. Wire selection to `facade.update({ contentMode: 'fixed', selectedFixedContentId })`.
- [ ] T058 [US5] Modify `frontend/src/app/core/kiosk-rotation.controller.ts`: add `enterFixedMode(contentId)` and `exitFixedMode()` methods. `enterFixedMode` records `previousContentIndex` (= the index of the content that was active at the moment of entry), sets the current cursor to the fixed content, and disables timers (loop mode never advances; fixed mode shows one item indefinitely). `exitFixedMode` restores `previousContentIndex` so `loop` resumes from there. (Implements FR-008, FR-021.)
- [ ] T059 [P] [US5] Modify `frontend/src/app/display/display-screen.component.ts`: add a template branch `@if (controller.mode() === 'fixed' && controller.fixedContentId() !== null)` that renders the fixed content's `<img>` or `<video [loop]="true" ...>`. Inside the branch, do NOT render the regular queue. The ad-region renders outside this branch (FR-008b).
- [ ] T060 [P] [US5] Modify `frontend/src/app/features/remote-control/remote-control.component.ts`: in the "Rotation navigation" card, the Pause / Resume / Previous / Next buttons are all disabled when `mode() === 'fixed'` (in addition to the iframe disable from US3). Add `aria-disabled="true"` and a tooltip "No disponible en modo fijo". (Covers FR-023.)

**Checkpoint**: US5 fully functional. Fixed mode pins a content; loop resumes correctly on exit.

---

## Phase 8: User Story 6 — Auto-detect content type by extension (Priority: P1)

**Goal**: The admin and public upload endpoints accept uploads without an explicit `contentType` form field; the backend detects image vs video by the file extension. Admin endpoint also accepts `isFixed` and `recurringEveryXIterations`.

**Independent Test**: `POST /api/content/upload` with a `.mp4` and no `contentType` persists the item as `contentType=video`. Same with `.jpg` → `contentType=photo`. A `.xyz` returns HTTP 415.

### Tests for User Story 6

- [ ] T061 [P] [US6] Contract test in `backend/tests/integration/test_content_upload_admin_018.py`: upload `.jpg` with `contentType` omitted → persisted as `photo`. Upload `.mp4` with `contentType` omitted → persisted as `video`. Upload `.mp4` with explicit `contentType='photo'` → persisted as `video` (extension wins) and audit event `content_type_autodetected` is emitted. Upload `.xyz` → HTTP 415 with `code: unsupported_extension`. (Covers FR-025, FR-027, FR-028, FR-029.)
- [ ] T062 [P] [US6] Contract test for the public API in `backend/tests/integration/test_content_upload_public_018.py`: upload `.jpg` with `Authorization: Bearer <api-key>` and no `contentType` → persisted as `photo`. Upload `.mp4` similarly → persisted as `video`. Upload `.xyz` → HTTP 415. Upload `.mp4` with `isFixed=true` and `recurringEveryXIterations=3` → persisted as `is_fixed=false, recurring_every_x_iterations=null` (silently ignored). (Covers FR-026, FR-029, TD-004.)
- [ ] T063 [P] [US6] Karma spec in `frontend/src/app/features/content/content-form.component.spec.ts`: the `contentType` form field is now optional; if the user picks a `.jpg` file in the file input, the autodetected type `photo` is shown as a read-only chip; if the user picks a `.mp4`, the chip shows `video`. Submitting with no `contentType` selected sends the autodetected value (or omits the field per backend contract).

### Implementation for User Story 6

- [ ] T064 [US6] Modify `frontend/src/app/features/content/content-form.component.ts`: make the `contentType` `mat-select` optional. Add a `cdk.fileInput` change listener that reads `file.name`'s extension, calls a small `detectClientMediaType(file.name)` helper (mirrors `detect_media_type_from_extension`), and shows the result as a read-only chip ("Tipo detectado: video") next to the file input. The submit payload sends `contentType` only if the user explicitly chose one (otherwise the backend autodetects).
- [ ] T065 [US6] Modify `frontend/src/app/features/content/content-form.component.ts`: add the `isFixed` checkbox (covers US5 admin UI) and `recurringEveryXIterations` number input (covers US4 admin UI). When `isFixed` is checked, hide the cadence input and vice-versa; show a hint "Recurrente y Fijo son mutuamente excluyentes". The submit payload includes both as form fields when set. **(Cross-cutting — touches US4 and US5 territory; placed under US6 because the form is a single component and the spec needs both flags surfaced together.)**
- [ ] T066 [P] [US6] Modify `frontend/src/app/features/content/content-list.component.ts`: each row shows two optional badges: "Fijo" (when `item.isFixed`) and "Recurrente cada N" (when `item.recurringEveryXIterations`). Style as `mat-chip-setbox` with the existing chip styles.

**Checkpoint**: US6 fully functional. Autodetect works on both endpoints; admin UI shows detected type; flags surfaced on the list.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, documentation, validation, and quality gates.

- [ ] T067 [P] Run the `quickstart.md` recipe end-to-end on a local stack. Capture a manual smoke transcript in `specs/018-content-rotation-modes/quickstart-validation.md` (or as a comment in the PR) confirming each of the 18 steps passes. Document any deviations and resolve them with a follow-up task.
- [ ] T068 [P] Update `backend/README.md` and `frontend/README.md` (or the top-level `README.md`) with one paragraph each pointing to the new spec: "Content rotation modes (pause/resume, recurring, fixed, autodetect by extension) — see `specs/018-content-rotation-modes/`."
- [ ] T069 [P] Run `pytest backend/tests -q`. All tests must be green (the 5 new test files in Phase 2 + the 4 new test files in US5 + extensions of existing files).
- [ ] T069a [P] Run coverage and verify SC-007 thresholds: `pytest backend/tests --cov=app.services.content_service --cov-report=term-missing` and `npm --prefix frontend run test:ci` (which produces `frontend/coverage/kiosk-screen/`). Assert `content_service.py` line coverage ≥ 80% and `display-screen.component.ts` line coverage ≥ 70%. If below threshold, open a follow-up task (do not relax the threshold).
- [ ] T070 [P] Run `npm --prefix frontend run test`. All Karma specs must be green (US1, US2, US3, US4, US5, US6 specs).
- [ ] T071 [P] Run `npm --prefix frontend run build`. Confirm no type errors or bundle regressions.
- [ ] T072 [P] Run `alembic upgrade head` twice in a row; assert no exceptions and no duplicate columns/constraints (re-uses T017 fixture).
- [ ] T073 [P] Run a final constitution check: re-read `.specify/memory/constitution.md` §Core Principles and §Development Workflow; confirm the spec, plan, tasks, and implementation are aligned. Document the result in the PR description.
- [ ] T074 [P] Accessibility review: visually inspect the kiosk at desktop and mobile breakpoints; confirm the overlay does not block the "Enter fullscreen" button in any mode; confirm the screen-reader announcement via `aria-label` for the fixed-content region and the Pause/Resume buttons; confirm the remote-control dropdown is keyboard-accessible.
- [ ] T075 [P] Security review: confirm the public API never persists `is_fixed=true` regardless of input; confirm the autodetect does NOT relax MIME validation; confirm `contentMode='fixed'` PUT requires `is_fixed=true` server-side; confirm `POST /api/display/rotation-event` rejects unauthenticated calls.
- [ ] T076 [P] Observability review: confirm each of the 5 new audit events is visible in the admin events listing; confirm a failed `contentMode='fixed'` PUT does NOT emit an event; confirm the kiosk's `content_rotation_empty` debounce fires only once per 60 s.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Stories (Phase 3–Phase 8)**: All depend on Foundational phase completion.
  - User stories can then proceed in parallel (if staffed).
  - Or sequentially in priority order: P1 (US1 → US2 → US3 → US4 → US5 → US6) one after the other.
- **Polish (Phase 9)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — Frontend-only (rotation bugs); no backend dependencies.
- **US2 (P1)**: Can start after Foundational — Frontend-only; also touches `specs/017-event-branding/spec.md` and `tasks.md` (T035, T036).
- **US3 (P1)**: Can start after Foundational — Backend nav command already accepted in Phase 2 (T013); frontend controller / facade / remote-control UI.
- **US4 (P1)**: Can start after Foundational — Recurring fields already on the model (Phase 2); frontend cadence logic.
- **US5 (P1)**: Can start after Foundational — `selectedFixedContentId` already on the model (Phase 2); backend validation already in Phase 2 (T013); frontend dropdown + fixed-mode template.
- **US6 (P1)**: Can start after Foundational — Autodetect helper already in Phase 2 (T008, T011, T012); frontend form chip + list badges.

### Within Each User Story

- Tests MUST be written and fail before implementation where automated testing is feasible.
- Backend service changes (when in scope) before frontend UI.
- Frontend controller / facade before component.
- Story complete before moving to next priority.

### Parallel Opportunities

- Phase 1: T001, T002, T003 in parallel (different test files / different validation commands).
- Phase 2: T007, T008, T009, T010, T015, T016, T017, T018, T019, T020, T021, T022 in parallel after T004-T006 are stable. Note that T011, T012, T013 each touch `content_service.py` / `display_control_service.py` and should be sequenced (T011 → T012; T013 independent of T011/T012 but on the same `display_control_service.py`).
- Within US1: T029, T030, T031 can run in parallel (CSS / TS) after T026–T028 are stable.
- Within US2: T032, T033 in parallel; T035, T036 in parallel (different spec files).
- Within US3: T037, T038, T039, T043 in parallel; T040, T041, T042 in sequence.
- Within US4: T044, T045, T046, T047 in parallel; T048, T049 in sequence.
- Within US5: T050, T051, T052, T053, T054 in parallel; T055–T060 in sequence.
- Within US6: T061, T062, T063 in parallel; T064, T065, T066 in sequence.
- Across stories: US1 and US6 both modify `display-screen.component.ts` / `content-form.component.ts`; coordinate via small PRs or sequential within the same file.

---

## Parallel Example: User Story 1

```bash
# Launch US1 tests together:
Task: "Karma spec for ad index round-robin in frontend/src/app/display/display-screen.component.spec.ts"
Task: "Karma spec for Chrome vs Firefox ad visibility in frontend/src/app/display/display-screen.component.spec.ts"
Task: "Karma spec for video ended → next item effective duration in frontend/src/app/display/display-screen.component.spec.ts"

# Launch US1 CSS + animation fallback in parallel after the controller exists:
Task: "Fix max-width:auto in display-screen.component.css"
Task: "Ensure animationDurationMs has fallback in display-screen.component.ts"
Task: "Add min-width:120px on .ad-region > figure in display-screen.component.css"
```

---

## Parallel Example: User Story 6

```bash
# Launch US6 contract tests together:
Task: "Contract test for admin upload autodetect in backend/tests/integration/test_content_upload_admin_018.py"
Task: "Contract test for public upload autodetect in backend/tests/integration/test_content_upload_public_018.py"
Task: "Karma spec for content form autodetect chip in frontend/src/app/features/content/content-form.component.spec.ts"

# Launch US6 implementation in sequence:
# T064 (form component) → T065 (add flags) → T066 (list badges)
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phase 1: Setup (T001–T003).
2. Complete Phase 2: Foundational (T004–T022). The migration is the riskiest step.
3. Complete Phase 3: User Story 1 (T023–T031).
4. **STOP and VALIDATE**: Run `pytest backend/tests -q`, `npm --prefix frontend run test`, manually verify ad rotation in Chrome and Firefox. The kiosk's primary functionality (rotation) is restored.
5. Deploy / demo if ready. US1 alone is meaningful: the kiosk's bugs are fixed.

### Incremental Delivery

1. Setup + Foundational → Foundation ready.
2. Add US1 → Test independently → Demo (MVP: rotation bugs fixed).
3. Add US2 → Test independently → Demo (overlay hide on iframe).
4. Add US3 → Test independently → Demo (pause / resume).
5. Add US4 → Test independently → Demo (recurring content).
6. Add US5 → Test independently → Demo (fixed content + new mode).
7. Add US6 → Test independently → Demo (autodetect by extension).
8. Polish: T067–T076.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001–T022).
2. Once Foundational is done:
   - Developer A: US1 (T023–T031) — frontend kiosk component.
   - Developer B: US6 (T061–T066) — frontend content form / list (different files from A).
   - Developer C: US5 (T050–T060) — frontend remote-control + kiosk controller (different files from A and B).
3. US2 (T032–T036) is small; can be picked up by anyone once US1 lands.
4. US3 (T037–T043) and US4 (T044–T049) follow once US1 lands (they touch the kiosk controller).
5. Polish (T067–T076) is the last gate.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability (TQ-001).
- Each user story MUST be independently completable and testable.
- Verify tests fail before implementing where automated testing is feasible (US1–US6 all follow this).
- Commit after each task or logical group. The constitution §III says to STOP when implementation conflicts with the approved spec, plan, or requirements.
- Stop and explain before changing direction if implementation conflicts with the approved spec or plan.
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence.
- The `017 US2 AS-5` and `017 T031` are explicitly superseded by US2 of this spec; the PR description MUST call this out (see T035, T036).