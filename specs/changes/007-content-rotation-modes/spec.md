---
id: CHG-007
type: change
status: consolidated
modifies:
  - CONTENT.ROTATION
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into:
  - CONTENT.ROTATION
requires_contract_update: false
read_by_default: false
---
# Feature Specification: Content Rotation Modes

**Feature Branch**: `007-content-rotation-modes`
**Spec Directory**: `specs/changes/007-content-rotation-modes/`
**Created**: 2026-06-23
**Status**: Approved
**Input**: the third content mode (`fixed`), the
`is_fixed` / `recurring_every_x_iterations` flags on
`top_content_items`, the rotation cursor preserved on mode
transitions, the pause / resume kiosk behaviour, the empty-queue
debounce, and the kiosk-initiated `content_rotation_empty` audit
event.

## User Scenarios & Testing

### User Story 1 — Mark a content as fixed and pin it (Priority: P1)

A `content_manager` opens a top content item and checks "Fijo"
(`is_fixed=true`). From the remote control, the operator picks
`fixed` mode and selects the fixed content. The kiosk pins the
content indefinitely; if it is a video that ends, the kiosk
restarts the video in a loop. When the operator returns to `loop`,
the rotation cursor resumes at the index that was active before
the fixed mode was entered.

**Why this priority**: enables event operators to spotlight a
sponsor or announcement without losing the rest of the rotation.

**Independent Test**: create content `X` with
`is_fixed=true`; PUT `contentMode='fixed', selectedFixedContentId=X`;
the kiosk polls and shows `X` only; on a video end, the kiosk
restarts the video.

**Acceptance Scenarios**:

1. **Given** a content with `is_fixed=true`, **When** PUT
   `/display/remote-control/state` is called with
   `contentMode='fixed', selectedFixedContentId=<X>`, **Then** the
   response is 200 and a `display_control_fixed_changed` event is
   recorded.
2. **Given** a content with `is_fixed=false`, **When** PUT
   `contentMode='fixed', selectedFixedContentId=<X>` is called,
   **Then** the response is 400 with "El Content seleccionado no
   está marcado como fijo." and the kiosk is not pinned.
3. **Given** `contentMode='fixed'`, **When** the video fires
   `ended`, **Then** the kiosk restarts the video in a loop
   (`currentTime=0; play()`); the rotation cursor is unchanged.
4. **Given** the kiosk was in `loop` at index 2 of 4 items, **When**
   the operator enters `fixed` and then returns to `loop`, **Then**
   the kiosk resumes at index 2 (not index 0).

### User Story 2 — Mark a content as recurring (Priority: P2)

A `content_manager` creates a content with
`recurringEveryXIterations=N` (N ≥ 1). On the kiosk, that content
appears every N iterations of the regular rotation queue. The
recurring content is shown in place of the next regular advance
(its `effectiveDurationSeconds` decides how long it stays on
screen) and the cadence counter resets to 0 after the recurring
item has been displayed. The cadence counter is preserved on
mode transitions and on pause/resume; the counter is lost only
on a full kiosk page reload.

**Why this priority**: surfaces event sponsors or recurring
reminders without disrupting the main rotation.

**Independent Test**: 1 recurring at cadence 3 + 4 regular; the
kiosk shows the recurring item at positions 4, 8, 12, 16 of a 16
advance run. The cadence counter is `0, 1, 2, (recurring), 0,
1, 2, (recurring), 0, 1, 2, (recurring), 0, 1, 2, (recurring)`
across the 16 advances.

**Acceptance Scenarios**:

1. **Given** a content with `recurringEveryXIterations=3` and 4
   regular items, **When** the kiosk advances 12 times, **Then**
   the recurring item appears 4 times (at advances 4, 8, 12).
2. **Given** the kiosk in `loop` at cadence counter 2, **When** the
   operator enters `iframe` and returns to `loop`, **Then** the
   cadence counter is 2 (not 0).
3. **Given** a payload with both `is_fixed=true` and
   `recurringEveryXIterations=3`, **When** POST `/content` is
   called, **Then** the response is 400 (CHECK
   `ck_top_content_not_fixed_and_recurring`).
4. **Given** `recurringEveryXIterations=0`, **When** POST
   `/content` is called, **Then** the response is 400 (CHECK
   `recurring_every_x_iterations >= 1`).
5. **Given** the kiosk in `loop` with cadence counter 0, **When**
   the controller advances the cursor three times, **Then** the
   next advance (the 4th) shows the recurring content instead of
   the next regular item and the cadence counter is reset to 0.
6. **Given** the kiosk in `loop` with the recurring content
   currently displayed, **When** the operator clicks "Next",
   **Then** the controller advances to the next regular item (in
   display order) and the cadence counter starts at 1.
7. **Given** the recurring content is a video, **When** it is
   displayed, **Then** the kiosk waits for `<video> ended` (or
   `effectiveDurationSeconds` for photos) before advancing, and
   the cadence counter is reset only after the recurring content
   has actually been shown.
8. **Given** the kiosk in `loop` at cadence counter 2, **When**
   the operator issues `jump_to` (spec 005 addendum), **Then** the
   cadence counter is reset to 0 and the cursor lands on the
   target content; the next advance is the first of the new
   cadence cycle.

### User Story 3 — Pause and resume the rotation (Priority: P1)

The operator clicks "Pause" on the remote control. The kiosk
freezes **only the content rotation timer** (the top region);
the ad-band timer keeps rotating independently, as it already
does in `iframe` and `fixed` modes (per spec 014 US2). On
"Resume", the content timer re-arms at its next scheduled tick.
Pause is only valid in `contentMode='loop'`; issuing it in
`iframe` or `fixed` returns 400.

**Why this priority**: lets the operator freeze the on-screen
content for an on-stage announcement or a sponsor pitch without
also freezing the sponsor ad band — the ad band is the sponsor
revenue surface and must keep its cadence regardless of the
content mode or pause state.

**Independent Test**: in `loop` mode with 3 ads at 10 s cadence,
send `pause`; the content stays on the current item for 30 s
while the ad index keeps advancing 0 → 1 → 2 → 0; send `resume`;
the kiosk advances the content from where it was.

**Acceptance Scenarios**:

1. **Given** `contentMode='loop'`, **When** POST with
   `command='pause'` is called, **Then** the response is 200 and
   a `display_control_paused` event is recorded.
2. **Given** the kiosk paused, **When** 30 s elapse with no resume,
   **Then** the kiosk remains on the current content item while
   the ad band keeps rotating.
3. **Given** `contentMode='loop'` and a paused state, **When**
   `command='resume'` is called, **Then** the response is 200 and
   a `display_control_resumed` event is recorded; the content
   timer re-arms and the next advance fires at the original
   cadence.
4. **Given** `contentMode='iframe'`, **When** `command='pause'` is
   called, **Then** the response is 400 (already enforced by
   spec 005).
5. **Given** a paused state, **When** the operator changes
   `contentMode` (e.g. enters `iframe`), **Then** the local pause
   flag is discarded on the next state poll (the kiosk resumes
   its content timer when the operator returns to `loop`).

### User Story 4 — Empty queue debounce and audit (Priority: P2)

When the kiosk's content queue transitions from non-empty to
empty, the kiosk POSTs to
`/api/public/.../rotation-event` (sic — this is the spec for
`POST /api/display/rotation-event`) with
`{eventType: "content_rotation_empty", payload: {reason: "queue_empty"}}`.
The backend records a `content_rotation_empty` warning event.
The kiosk debounces subsequent emissions to once per 60 s to
avoid spam during rapid mode toggles.

**Why this priority**: observability for content starvation.

**Independent Test**: empty the content queue; the kiosk POSTs
once; immediately re-add a content and remove it again; the
second POST is suppressed by the 60 s debounce.

**Acceptance Scenarios**:

1. **Given** a non-empty queue that becomes empty, **When** the
   kiosk detects the transition, **Then** it POSTs to
   `/api/display/rotation-event` and the backend records one
   `content_rotation_empty` warning event.
2. **Given** two non-empty → empty transitions within 60 s,
   **When** the kiosk detects the second, **Then** the second
   POST is suppressed locally (no second audit event).
3. **Given** an unsupported `eventType` (anything other than
   `content_rotation_empty`), **When** POST is called, **Then**
   the response is 400.

## Requirements

### Functional Requirements

- **FR-001**: The `top_content_items` table MUST carry
  `is_fixed` (default false, NOT NULL) and
  `recurring_every_x_iterations` (nullable, integer ≥ 1); CHECK
  `ck_top_content_not_fixed_and_recurring` MUST reject the
  combination.
- **FR-002**: The `display_control_states` table MUST carry
  `selected_fixed_content_id` (nullable FK top_content_items,
  ON DELETE SET NULL) and the CHECK constraint
  `ck_display_control_fixed_has_target` enforcing
  `selected_fixed_content_id IS NOT NULL ⇒ contentMode = 'fixed'`.
- **FR-003**: The `contentMode` enum MUST be widened to
  `loop | iframe | fixed`; the `navigationCommand` enum MUST
  accept `pause` and `resume` in addition to `next` and
  `previous`.
- **FR-004**: PUT `/display/remote-control/state` with
  `contentMode='fixed'` MUST validate that the target has
  `is_fixed=true`; otherwise 400.
- **FR-005**: The kiosk Angular controller MUST pin a fixed
  content indefinitely; if the content is a video, on `ended`
  the kiosk MUST restart the video in a loop
  (`currentTime=0; play()`).
- **FR-006**: The kiosk controller MUST remember the rotation
  cursor (current index) and the cadence counter on entry to
  `iframe` or `fixed`; on return to `loop`, the cursor MUST
  resume at the same index and the cadence counter at the same
  value.
- **FR-007**: A payload with both `is_fixed=true` and
  `recurring_every_x_iterations != null` MUST be rejected with
  400 (the admin form surfaces a "mutual exclusion" hint per
  spec 009).
- **FR-008**: The kiosk controller MUST pause **only the content
  timer** on `pause`; the ad-band timer MUST keep rotating on its
  own cadence (the ad band is the sponsor revenue surface and is
  orthogonal to the content pause flag). `resume` MUST re-arm
  the content timer at the next scheduled tick.
- **FR-008a**: The kiosk controller MUST honor
  `recurring_every_x_iterations` for every active top content
  item. After every N advances of the regular rotation queue
  (where N is the smallest positive `recurring_every_x_iterations`
  across the active recurring items, or the only one if there is
  just one), the controller MUST show the recurring content in
  place of the next regular advance, reset the cadence counter
  to 0, and continue the regular loop from there. The recurring
  content's `effectiveDurationSeconds` decides how long it stays
  on screen. If multiple recurring items exist, exactly one is
  chosen per cadence cycle (the one with the smallest
  `recurring_every_x_iterations`); a recurring item with the same
  cadence is rotated in display order.
- **FR-009**: The kiosk controller MUST debounce empty-queue
  reports to once per 60 s.
- **FR-010**: The system MUST expose
  `POST /api/display/rotation-event` accepting
  `{eventType: "content_rotation_empty", payload: object}`; the
  handler MUST record a `content_rotation_empty` warning event
  in `display_events`.

### Key Entities

- **TopContentItem** (excerpt of new columns):
  `is_fixed` Boolean NOT NULL default false;
  `recurring_every_x_iterations` Integer NULL.
- **DisplayControlState** (excerpt of new column):
  `selected_fixed_content_id` String(36) NULL FK
  `top_content_items.id` ON DELETE SET NULL.

## Success Criteria

- **SC-001**: An operator can pin a fixed content, leave it for an
  hour, and return to `loop` with the cursor preserved.
- **SC-002**: A recurring content at cadence N appears exactly
  every N advances in a 4N-advance window.
- **SC-003**: Pausing for 5 minutes and resuming keeps both
  timers consistent and records exactly one
  `display_control_paused` and one `display_control_resumed`
  event.
- **SC-004**: The empty-queue POST fires at most once per 60 s
  even under rapid mode toggles.

## Assumptions

- The pause flag is local to the kiosk controller; the backend
  does not persist it.
- The empty-queue debounce is a client-side policy; the server
  accepts every valid POST.

## Supersedes

None.

## Superseded by

None yet.

## Addendum — Pause scope correction & recurring implementation

This addendum tightens two behaviours the original spec left
ambiguous and that the live kiosk did not honour:

1. **Pause scope**: spec 007 US3 / FR-008 originally said that
   `pause` freezes both the content timer **and** the ad-band
   timer. That coupling was wrong — the ad band is the sponsor
   revenue surface and must keep its cadence regardless of the
   content pause flag. The corrected wording (per US3 / FR-008
   above) restricts `pause` to the content timer only; the ad
   timer keeps rotating on its own cadence as it already does in
   `iframe` and `fixed` modes (spec 014 US2). FR-008 was
   re-stated accordingly.

2. **Recurring implementation**: spec 007 US2 described the
   recurring behaviour at the data level
   (`recurring_every_x_iterations`, mutual exclusion with
   `is_fixed`) and at the kiosk acceptance level (SC-002: "A
   recurring content at cadence N appears exactly every N
   advances in a 4N-advance window") but the original controller
   never consulted `recurring_every_x_iterations` when picking
   the next item. This addendum adds FR-008a which makes the
   kiosk controller honour the cadence counter and surface the
   recurring content in place of the next regular advance. The
   `DisplayRotationService` `pickNext(...)` helper is the
   integration point (spec 014 addendum 2 names the public
   surface).
