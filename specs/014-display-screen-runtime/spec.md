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
   ad band timer is frozen.

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
