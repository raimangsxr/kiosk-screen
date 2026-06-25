# Tasks: Display Screen Runtime

**Input**: Design documents from
`specs/changes/014-display-screen-runtime/`.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Verify working branch and the four artefacts.

## Phase 2: Foundational

- [X] T002 [P] `DisplayRotationService` with `pickNext` /
      `pickPrevious` at
      `frontend/src/app/display/display-rotation.service.ts`.
- [X] T003 [P] `KioskRotationController` with the single
      `effect()`-driven timer at
      `frontend/src/app/display/kiosk-rotation.controller.ts`.

## Phase 3: User Story 1 — Top region rendering

- [X] T004 `DisplayApiService.watchState(...)` at
      `frontend/src/app/core/api/display.api.ts` polling every
      `remote_control_polling_seconds` and deduping by
      fingerprint.
- [X] T005 [P] `DisplayScreenComponent` top-region template
      branches for `loop | iframe | fixed` at
      `frontend/src/app/display/display-screen.component.ts`.

### Tests for User Story 1

- [X] T006 [P] [US1] Karma spec: 3-item queue advances
      0 → 1 → 2 → 0 every 10 s in
      `frontend/src/app/display/display-screen.component.spec.ts`.
- [X] T007 [P] [US1] Karma spec: `iframe` mode renders the
      iframe URL in a sandboxed `<iframe>`.
- [X] T008 [P] [US1] Karma spec: `fixed` mode pins to the
      selected content.
- [X] T009 [P] [US1] Karma spec: empty queue POSTs
      `content_rotation_empty` (debounced) at
      `frontend/src/app/display/kiosk-rotation.controller.spec.ts`.

## Phase 4: User Story 2 — Ad band rendering

- [X] T010 [P] `DisplayScreenComponent` ad-band template with
      `inline_ad_count` and `default_ad_duration_seconds` at
      `frontend/src/app/display/display-screen.component.ts`.
- [X] T011 [P] `adsVisible` toggle (from the remote control)
      hides the ad band at the same file.

### Tests for User Story 2

- [X] T012 [P] [US2] Karma spec: ad index advances 0 → 1 → 2 → 0
      every 10 s in `loop` mode.
- [X] T013 [P] [US2] Karma spec: ad index keeps advancing in
      `iframe` and `fixed` modes.
- [X] T014 [P] [US2] Karma spec: `adsVisible=false` removes
      the ad band from the DOM.
- [X] T015 [P] [US2] Karma spec: pause freezes the ad timer.

## Phase 5: User Story 3 — Branding overlay

- [X] T016 [P] `EventBrandingService` polling loop at
      `frontend/src/app/core/event-branding.service.ts` with
      stale-while-error.
- [X] T017 [P] `DisplayScreenComponent` overlay template with
      the iframe-hide guard at
      `frontend/src/app/display/display-screen.component.ts`.

### Tests for User Story 3

- [X] T018 [P] [US3] Karma spec: overlay is in the DOM in
      `loop` and `fixed`.
- [X] T019 [P] [US3] Karma spec: overlay is NOT in the DOM in
      `iframe`.
- [X] T020 [P] [US3] Karma spec: stale-while-error keeps the
      last good value on a failed poll.

## Phase 6: User Story 4 — Fullscreen

- [X] T021 [P] `DisplayScreenComponent` fullscreen handler
      with `requestFullscreen` and `fullscreenchange` listener
      at
      `frontend/src/app/display/display-screen.component.ts`.
- [X] T022 [P] `DisplayControlService` (or the existing
      `display-control-sync.service.ts`) PUTs
      `fullscreen_requested=false` on user-initiated exit.

### Tests for User Story 4

- [X] T023 [P] [US4] Karma spec: `fullscreen_requested=true`
      triggers `requestFullscreen`.
- [X] T024 [P] [US4] Karma spec: `fullscreenchange` event PUTs
      `fullscreen_requested=false`.

## Phase 7: User Story 5 — Cross-tab sync

- [X] T025 [P] `DisplayControlSyncService` with
      `BroadcastChannel` + `localStorage` fallback at
      `frontend/src/app/core/display-control-sync.service.ts`.

### Tests for User Story 5

- [X] T026 [P] [US5] Karma spec: cross-tab sync fires the
      effect on the second tab.

## Dependencies & Execution Order

- Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7.

## Implementation Strategy

Single-contributor path:

1. Phase 1 + 2: 30 min (controller + service).
2. Phase 3: 1.5 h (top region + tests).
3. Phase 4: 1 h (ad band + tests).
4. Phase 5: 1 h (overlay + tests).
5. Phase 6: 1 h (fullscreen + tests).
6. Phase 7: 30 min (cross-tab sync + tests).
