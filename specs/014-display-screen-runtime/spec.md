# Feature Specification: Display Screen Runtime

**Feature Branch**: `014-display-screen-runtime`
**Spec Directory**: `specs/014-display-screen-runtime/`
**Created**: 2026-06-23
**Status**: Approved
**Input**: the kiosk display screen Angular component
(`display-screen.component.ts`), the signal-based
`KioskRotationController` (single effect-driven timer), the
`DisplayRotationService` (novelty-queue state machine), the
polling loop, the cross-tab BroadcastChannel sync, the fullscreen
request handling, and the kiosk-initiated `content_rotation_empty`
POST.

## User Scenarios & Testing

### User Story 1 — Kiosk renders the top region (Priority: P1)

The kiosk browser opens `/display` (after `/display/open`). The
display Angular component polls `GET /display/state` every
`remote_control_polling_seconds` and renders the top region
according to the `contentMode`:

- `loop`: rotates through the `topContent` queue, applying
  `effectiveDurationSeconds` per item and the
  `effectiveRotationAnimation`.
- `iframe`: pins to `selectedIframe`; the iframe URL is rendered
  in a sandboxed `<iframe>`.
- `fixed`: pins to `selectedFixedContent`; the content's
  `<img>` or `<video [loop]>` is rendered; if the video fires
  `ended`, the kiosk restarts the video in a loop.

**Why this priority**: this is the kiosk's primary view.

**Independent Test**: with a 3-item queue and `default_top_duration_seconds=10`,
the kiosk advances 0 → 1 → 2 → 0 every 10 s.

**Acceptance Scenarios**:

1. **Given** `contentMode='loop'` and 3 items, **When** 30 s
   elapse, **Then** the kiosk has advanced 0 → 1 → 2 → 0 with
   each hold ≥ 9 s and ≤ 11 s.
2. **Given** a video item with `ended`, **When** the video
   finishes, **Then** the kiosk waits `video_end_delay_seconds`
   and advances.
3. **Given** `contentMode='iframe'`, **When** the kiosk polls,
   **Then** the iframe URL is rendered in a sandboxed
   `<iframe>`.
4. **Given** `contentMode='fixed'`, **When** the kiosk polls,
   **Then** the fixed content's `<img>` or `<video [loop]>` is
   rendered; the rotation cursor is preserved (per spec 007).
5. **Given** `contentMode='loop'` and the queue becomes empty,
   **When** the kiosk detects the transition, **Then** a
   `content_rotation_empty` POST is sent (debounced to 60 s).

### User Story 2 — Kiosk renders the ad band (Priority: P1)

The kiosk renders the bottom 1/5 of the screen as an ad band.
The ad band rotates independently of the content mode — even in
`iframe` and `fixed`, the ads keep rotating. The
`inline_ad_count` knob controls how many ads show concurrently
(default 1).

**Why this priority**: the ad band is the sponsor surface.

**Independent Test**: with 3 ads and
`default_ad_duration_seconds=10`, the ad index advances 0 → 1 → 2
→ 0 every 10 s, regardless of the content mode.

**Acceptance Scenarios**:

1. **Given** 3 ads and `default_ad_duration_seconds=10`, **When**
   30 s elapse, **Then** the ad index advances 0 → 1 → 2 → 0.
2. **Given** `contentMode='iframe'`, **When** 30 s elapse,
   **Then** the ad band keeps rotating.
3. **Given** `contentMode='fixed'`, **When** 30 s elapse,
   **Then** the ad band keeps rotating.
4. **Given** `adsVisible=false` (from the remote control),
   **When** the kiosk polls, **Then** the ad band is NOT in the
   DOM.
5. **Given** a paused state, **When** 30 s elapse, **Then** the
   content timer is frozen but the ad band timer keeps rotating
   on its configured cadence (per spec 007 FR-008 and its
   addendum — the ad band is the sponsor revenue surface and is
   orthogonal to the content pause flag).

### User Story 3 — Branding overlay (Priority: P1)

The kiosk polls `GET /event-branding` independently of the
display state poll and renders the overlay when
`contentMode != 'iframe'`. Stale-while-error: if the poll
fails, the kiosk keeps the last good value.

**Why this priority**: the overlay is the on-screen identity
during a live event.

**Independent Test**: with `eventName="Acme Summit 2026"`, the
overlay is in the DOM; switching to `iframe` mode hides it.

**Acceptance Scenarios**:

1. **Given** `eventName="Acme"`, **When** the kiosk renders,
   **Then** the overlay is in the DOM with the name.
2. **Given** `contentMode='iframe'`, **When** the kiosk renders,
   **Then** the overlay is NOT in the DOM.
3. **Given** the `/event-branding` poll fails, **When** the
   kiosk continues, **Then** the overlay keeps the last good
   value.

### User Story 4 — Fullscreen request (Priority: P2)

The operator clicks the "Fullscreen" button on the remote
control; the backend records
`remote_control_fullscreen_changed` and sets
`display_control_states.fullscreen_requested=true`. The kiosk
polls the state and, when `fullscreen_requested=true`, requests
fullscreen on the host element. The host element listens for
`fullscreenchange` and clears the request when the user exits
fullscreen manually.

**Why this priority**: live-event polish.

**Independent Test**: with `fullscreen_requested=true`, the kiosk
goes fullscreen; the user pressing Escape clears
`fullscreen_requested=false` and the kiosk exits fullscreen.

**Acceptance Scenarios**:

1. **Given** `fullscreen_requested=true`, **When** the kiosk
   polls, **Then** the host element calls `requestFullscreen()`.
2. **Given** the user presses Escape, **When** the host element
   fires `fullscreenchange`, **Then** the kiosk calls PUT
   `/display/remote-control/state` with
   `fullscreen_requested=false`.
3. **Given** the kiosk is already fullscreen, **When** the
   backend flips `fullscreen_requested=false`, **Then** the
   kiosk calls `document.exitFullscreen()`.

### User Story 5 — Cross-tab sync (Priority: P3)

When two kiosk tabs are open in the same browser (or the same
origin in the same machine), a state change in one MUST be
reflected in the other within one polling cadence. The
`display-control-sync.service.ts` uses a `BroadcastChannel` and
a `localStorage` fallback to publish "display state changed"
and "remote control changed" events.

**Why this priority**: convenience; no spec depends on it.

**Independent Test**: open two tabs; change the mode in tab A;
tab B reflects the change within one polling cadence without an
extra PUT.

**Acceptance Scenarios**:

1. **Given** two tabs A and B, **When** A changes the content
   mode, **Then** B's `KioskRotationController` reflects the
   new mode on its next effect tick.
2. **Given** the BroadcastChannel is not supported (older
   browser), **When** A changes the mode, **Then** the
   `localStorage` fallback fires the same effect.

## Requirements

### Functional Requirements

- **FR-001**: The kiosk Angular component MUST poll
  `GET /display/state` every
  `remote_control_polling_seconds` (read from the polled
  response) and dedupe by fingerprint.
- **FR-002**: The kiosk MUST render the top region according to
  the `contentMode` from the polled state (per US1).
- **FR-003**: The kiosk MUST render the ad band independently of
  the content mode, respecting `adsVisible` and
  `default_ad_duration_seconds` (per US2).
- **FR-004**: The kiosk MUST poll `GET /event-branding`
  independently of the display state poll and render the
  overlay; the overlay MUST be hidden in `iframe` mode (per
  US3).
- **FR-005**: The `KioskRotationController` MUST own the
  single effect-driven timer for the content cursor, the
  cadence counter, the pause state, the fixed-mode cursor
  preservation, and the empty-queue debounce.
- **FR-006**: The `DisplayRotationService` MUST implement
  `pickNext` and `pickPrevious` as pure helpers consumed by the
  controller.
- **FR-007**: When `fullscreen_requested` flips to `true`, the
  kiosk MUST call `requestFullscreen()` on the host element; on
  `fullscreenchange` it MUST call PUT to set it back to
  `false`.
- **FR-008**: The cross-tab sync service MUST use
  `BroadcastChannel` first and `localStorage` as a fallback;
  every published event MUST include the source tab's id.
- **FR-009**: The kiosk MUST POST to
  `POST /api/display/rotation-event` on the empty-queue
  transition; the POST is debounced client-side to once per
  60 s.
- **FR-010**: The kiosk MUST consume the navigation command from
  the polled state and apply it via
  `KioskRotationController.applyNavigationCommand(...)`.
- **FR-011**: The kiosk MUST respect the
  `video_end_delay_seconds` knob from the polled state and wait
  the right number of seconds before advancing on
  `<video> ended`.
- **FR-012**: The kiosk MUST rotate ads on a single fixed cadence
  of `default_ad_duration_seconds` from the polled
  configuration. Per-ad `effectiveDurationSeconds` is
  intentionally NOT honored — the kiosk configuration is the
  single source of truth for the ad rotation cadence.
- **FR-013**: The CSS animation duration for the ad transition
  MUST be `effective_animation_duration_milliseconds` from the
  polled ad item, falling back to
  `default_ad_animation_duration_milliseconds` from the polled
  configuration (default 300 ms). The kiosk MUST NOT derive the
  animation duration from `default_ad_duration_seconds`.
- **FR-014**: When `contentMode='fixed'`, the kiosk MUST resolve
  `selectedFixedContentId` against `state.topContent` and render
  that single item in place of the loop cursor. On `video ended`
  in fixed mode, the kiosk MUST restart the video
  (`currentTime=0; play()`); the fixed target MUST remain
  pinned until the operator switches mode.
- **FR-015**: When `contentMode` transitions back from `fixed`
  to `loop`, the kiosk MUST restore the cursor that was active
  immediately before entering fixed (per spec 007 US1
  acceptance 4).
- **FR-016**: The display-screen component MUST drive the
  `KioskRotationController` via
  `KioskRotationController.attach(KioskControllerInputs)` and
  read all rotation state through the controller's public
  signals. Direct access to controller private fields via type
  casts is forbidden.

### Key Entities

- `DisplayState` (consumed): the polled state.
- `EventBranding` (consumed): the polled branding.
- `KioskRotationController` (hosted): signal-based single
  timer.
- `DisplayRotationService` (hosted): pure novelty-queue state
  machine.
- `DisplayControlSyncService` (hosted): cross-tab pub/sub.

## Success Criteria

- **SC-001**: The kiosk consumes less than 5 % CPU on a modern
  laptop when idle (no timers firing).
- **SC-002**: The polling loop never blocks the UI thread for
  more than 50 ms.
- **SC-003**: A mode change in the remote control is reflected
  in the kiosk within one polling cadence.
- **SC-004**: Two kiosk tabs in the same browser stay in sync
  within 200 ms.

## Assumptions

- The kiosk browser is Chromium (or Firefox as a smoke target);
  the BroadcastChannel polyfill covers older browsers.
- The kiosk runs on a single machine; multi-machine sync is out
  of scope.
- The host element is the `<app-root>` Angular component's
  nativeElement.

## Supersedes

None.

## Superseded by

None yet.

## Addendum (kiosk rotation bug fixes)

This addendum was added in response to a triage of three live
bugs found in the kiosk display:

1. **Ad rotation did not honour the configured ad cadence.**
   The previous implementation derived the ad timer duration
   from the per-ad `effectiveDurationSeconds` of whatever ad
   happened to be current when the timer was first armed, then
   re-used that frozen value on every subsequent tick. This
   added a per-ad override that the spec never required and
   that drifted away from the admin-configured
   `default_ad_duration_seconds`. Fix: FR-012 makes the
   configured value the single source of truth.

2. **Production Chrome rendered a white ad block.** The ad
   `<img>` carried an inline `[style.animation-duration.ms]`
   that fell back to `defaultAdDurationSeconds * 1000` (10 s)
   when `effectiveAnimationDurationMilliseconds` was missing.
   Combined with `ease-in` and `animation-fill-mode: both`,
   the opacity stayed near 0 for ~5 s and only flashed to 1
   at the end of each 10 s cycle. Chrome's stricter CSS
   interpolation rendered the figure essentially blank. Fix:
   FR-013 forces the animation duration to
   `default_ad_animation_duration_milliseconds` (300 ms) as
   the spec for spec 002 already prescribes.

3. **Fixed mode never pinned the content.** The component
   never consulted `selectedFixedContentId` when applying a
   poll, and the controller's `enterFixedMode` /
   `exitFixedMode` were never invoked. The kiosk therefore
   kept rendering the previous loop cursor. Fix: FR-014 and
   FR-015 wire the controller's fixed-mode entry / exit and
   the cursor preservation contract.

## Addendum 2 — Recurring content & jump-to navigation command

This addendum covers three behaviours the original spec did not
implement and that the live kiosk needed:

1. **Recurring content rotation.** Spec 007 US2 / SC-002 / FR-008a
   say that a content with `recurringEveryXIterations=N` must
   appear every N advances of the regular rotation queue. The
   original controller never consulted `recurring_every_x_iterations`
   when picking the next item; the rotation was strictly
   `next → next → next` over `topContent`. This addendum wires
   the cadence counter through `KioskRotationController` and
   through `DisplayRotationService.pickNext(...)` so the
   recurring item is shown in place of every Nth advance and the
   cadence counter resets to 0 after the recurring item is
   displayed (per FR-008a).

2. **Jump-to navigation command.** Spec 005 addendum extends the
   `navigationCommand` enum with `jump_to` and the polled
   `RemoteControlStateSchema` with `jump_to_content_id`. This
   addendum makes `KioskRotationController.applyNavigationCommand(...)`
   consume `jump_to`: the controller resets `currentContentId`
   to the target id, resets the cadence counter to 0, and
   re-arms the content timer with the target's
   `effectiveDurationSeconds`. The kiosk must be in `loop` mode
   for `jump_to` to take effect; the backend already rejects
   `jump_to` outside `loop` (per spec 005 FR-013), so the
   kiosk only needs to handle the in-loop case.

3. **Coordinated admin action.** The "Show on screen now"
   button on the admin Content list (spec 009 addendum FR-015)
   posts the `jump_to` command; this is the kiosk-side
   counterpart. The button is gated by
   `REMOTE_CONTROL_ROLES` on the frontend.

### New User Story 6 — Honour recurring content (Priority: P2)

The kiosk honours every active top content item's
`recurringEveryXIterations` flag. The `KioskRotationController`
keeps an integer cadence counter; on every advance of the
regular rotation queue the counter is incremented, and when it
reaches the smallest `recurringEveryXIterations` across active
recurring items, the next advance is replaced by the recurring
item instead of the next regular item, the counter is reset to
0, and the regular loop continues from the following regular
item.

**Why this priority**: surfaces event sponsors or recurring
reminders (e.g. an event programme image) without disrupting
the main rotation.

**Acceptance Scenarios**:

1. **Given** a recurring item with `recurringEveryXIterations=3`
   and 4 regular items, **When** the kiosk advances 12 times,
   **Then** the recurring item appears 4 times (at advances 4, 8,
   12) and the cadence counter reads `0, 1, 2, 0, 1, 2, 0, 1, 2,
   0, 1, 2` across the 12 advances.
2. **Given** the kiosk in `loop` with cadence counter 2, **When**
   the operator enters `iframe` and returns to `loop`, **Then**
   the cadence counter is 2 (not 0) — the counter survives mode
   transitions exactly like the rotation cursor does (per spec
   007 US2 acceptance 2).
3. **Given** a recurring item that is a video, **When** it is
   displayed in place of the Nth advance, **Then** the kiosk
   waits for `<video> ended` (or `effectiveDurationSeconds` for
   photos) and resets the cadence counter only after the
   recurring item has actually been shown.
4. **Given** two active recurring items with cadences 3 and 5,
   **When** the kiosk advances, **Then** the item with cadence 3
   is shown at every 3rd advance; the item with cadence 5 is
   only shown at advances that are multiples of 5 but not 3
   (the controller picks the smallest matching cadence per
   advance).

### New User Story 7 — Consume jump-to navigation command (Priority: P2)

The operator clicks "Show on screen now" on a content row in the
admin Content list. The frontend posts
`POST /display/remote-control/navigation` with
`{command: 'jump_to', targetContentId: <UUID>}`; the kiosk
polls the new `navigationCommand` and `jump_to_content_id`
fields, resets the rotation cursor to the target id, resets the
cadence counter to 0, and re-arms the content timer.

**Why this priority**: gives the operator one-click spotlighting
of a content item from the admin Content list.

**Acceptance Scenarios**:

1. **Given** the kiosk in `loop` with 5 active items and the
   cursor on item 2, **When** the operator issues `jump_to` for
   item 4, **Then** the next poll carries
   `navigationCommand='jump_to', jumpToContentId=<item 4>` and
   the controller advances to item 4 on the next effect tick,
   resets the cadence counter to 0, and continues the loop from
   there.
2. **Given** the kiosk already showing item 4, **When** the
   operator issues `jump_to` for item 4, **Then** the controller
   treats it as a no-op cursor reset (still resets cadence),
   so the same item remains on screen for its full
   `effectiveDurationSeconds` and the next advance is item 5.
3. **Given** the kiosk in `loop` with item `X` missing from the
   polled `topContent` (e.g. it was deleted between the operator
   click and the next poll), **When** the controller applies the
   `jump_to`, **Then** the controller silently ignores the
   command (does not crash) and the kiosk keeps the previous
   cursor; the backend audit event still records the attempt.

### New Functional Requirements

- **FR-017**: The `KioskRotationController` MUST consult
  `recurring_every_x_iterations` for every active top content
  item; after every N advances of the regular rotation queue
  (where N is the smallest positive recurring cadence across
  the active recurring items, or the only one if there is just
  one), the controller MUST show the recurring content in place
  of the next regular advance and reset the cadence counter to
  0. Implementation lives in
  `DisplayRotationService.pickNext(...)` so the controller stays
  a thin effect-driven wrapper.
- **FR-018**: The `KioskRotationController.applyNavigationCommand(...)`
  MUST accept `'jump_to'` and, when in `loop`, reset
  `currentContentId` to `jumpToContentId`, reset the cadence
  counter to 0, and re-arm the content timer with the target's
  `effectiveDurationSeconds`. If the target id is not in
  `topContent`, the controller MUST silently ignore the command.
- **FR-019**: The polled `RemoteControlStateSchema` MUST surface
  `jumpToContentId` (UUID, nullable); the
  `display-screen.component.ts` MUST read it via
  `DisplayApiService.watchState(...)` and forward it to the
  controller.
- **FR-020**: The Content list at `/admin/content` MUST expose a
  "Show on screen now" button per row that posts
  `POST /display/remote-control/navigation` with
  `{command: 'jump_to', targetContentId: <id>}`. The button MUST
  be disabled while `facade.saving()` is true and MUST show a
  snackbar with success / error feedback (consistent with the
  existing reorder / delete UX).
