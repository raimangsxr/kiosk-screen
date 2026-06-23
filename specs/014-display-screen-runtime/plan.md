# Implementation Plan: Display Screen Runtime

**Branch**: `014-display-screen-runtime` | **Date**: 2026-06-23
**Spec**: [spec.md](./spec.md)
**Migration**: none (frontend only).

## Summary

Build the kiosk display Angular component, the
`KioskRotationController`, the `DisplayRotationService`, the
cross-tab sync, the fullscreen handling, and the empty-queue
POST integration. Wire the overlay rendering and the navigation
command application. Run the full Karma spec matrix.

## Technical Context

- **Language/Version**: TypeScript 5.8 (frontend only).
- **Primary Dependencies**: Angular 17, RxJS, Material 3.
- **Storage**: N/A (state lives in the backend).
- **Testing**: Karma + Jasmine.

## Architecture

### Frontend

- `frontend/src/app/display/display-screen.component.ts` (577
  lines) — the kiosk UI; subscribes to `DisplayApiService.watchState`,
  `EventBrandingService`, `DisplayControlSyncService`, and
  `KioskRotationController`.
- `frontend/src/app/display/display-rotation.service.ts` —
  `initialize`, `applyPollState`, `pickNext`, `pickPrevious`.
- `frontend/src/app/display/kiosk-rotation.controller.ts` —
  signal-based single-timer controller.
- `frontend/src/app/core/display-control-sync.service.ts` —
  `BroadcastChannel` + `localStorage` pub/sub.
- `frontend/src/app/core/event-branding.service.ts` — branding
  signal store.
- `frontend/src/app/core/api/display.api.ts` — `openDisplay`,
  `getState`, `watchState`.

## Constitution Check

- **Spec traceability**: every FR maps to a frontend file in
  `app/display/` or `app/core/`.
- **Requirement clarity**: 11 FRs, 4 SCs.
- **Plan alignment**: the controller and the cross-tab sync
  are the cross-spec surfaces; they are pure Angular code with
  no backend changes.
- **Simplicity**: no new dependencies; everything is in
  Angular and the browser.
- **Contracts**: `DisplayState`, `EventBranding`, and the
  `KioskControllerInputs` interface are the only contracts.
- **Testing**: Karma specs for the controller, the rotation
  service, the screen component, and the cross-tab sync.
- **Security**: the kiosk runs in the operator's browser; the
  poll is over a session cookie.
- **No speculative scope**: out-of-scope list explicit.
- **Conflict handling**: this spec consumes the
  `content_rotation_empty` event (spec 007 US4); the POST is
  debounced client-side.

## Project Structure

```
specs/014-display-screen-runtime/
├── plan.md
├── spec.md
├── tasks.md
└── checklist.md
```

## Out of Scope

- Multi-machine sync.
- WebSocket / SSE push of state changes.
- Native kiosk-mode browser launch.
- Hardware control (turn off display, etc.).
