---
id: CHG-021
type: change
status: in-progress
modifies:
  - DISPLAY.RUNTIME
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
requires_contract_update: false
read_by_default: true
depends_on:
  - CHG-019
---
# Feature Specification: Kiosk Runtime Refactor

**Feature Branch**: `021-kiosk-runtime-refactor`
**Created**: 2026-06-25

**Status**: In Progress (gated by CHG-019 consolidation)

**Input**: User description: "Decompose `DisplayScreenComponent` and `KioskRotationController` into focused services and child components so each file has a single responsibility and the polling / navigation / branding concerns can evolve independently."

## Constraints

- **Refactor only**: no observable behavior change. All existing `display-screen.component.spec.ts` and `kiosk-rotation.controller.spec.ts` cases must pass unchanged.
- **Contract preserved**: `DISPLAY.RUNTIME` keeps its current behavior. `requires_contract_update: false` because the public interfaces and quality gates of the contract do not change.
- **CHG-019 dependency**: CHG-021 cannot reach its `consolidated` state until CHG-019 is consolidated (the kiosk display component is owned by both). Implementation is safe to start now because CHG-019's CSS-ratio work and CHG-021's service-split work do not collide on the same lines.
- **No new dependencies**: stays inside Angular 20, RxJS, Material 3.

## Why

The current `DisplayScreenComponent` (728 LOC) mixes polling, state application, navigation commands, video end handling, fullscreen, orientation, and branding overlay rendering. `KioskRotationController` (536 LOC) mixes cursor memory, recurring cadence logic, empty-queue debounce, and timer scheduling. Both are dense enough that adding CHG-019's CSS changes (and the upcoming CHG-022+ features) will make them harder to navigate and review. Splitting them now lets each future change touch one focused file.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — DisplayScreenComponent becomes a thin orchestrator (Priority: P1)

A developer reading `display-screen.component.ts` should immediately see the lifecycle, the template, and the wiring of smaller pieces — not 700 lines of mixed concerns.

**Acceptance scenarios**:

1.1. **Given** the new component, **when** a reviewer opens the file, **then** the implementation body is ≤ 300 LOC and only contains: lifecycle hooks, public signals consumed by the template, and delegation to injected services / child components.
1.2. **Given** the polled `DisplayState`, **when** it arrives via `openDisplay()` or a poll, **then** the rotation timers, navigation commands, and branding overlay all behave identically to the current implementation (verified by the existing spec suite passing unchanged).
1.3. **Given** the keyboard `Escape` listener, **when** the operator presses it, **then** the navigation to `/hall` still happens (no behavior regression).

### User Story 2 — KioskRotationController is decomposed into three focused services (Priority: P1)

The rotation logic is split so timer scheduling, cursor memory, and recurring-content cadence can evolve independently.

**Acceptance scenarios**:

2.1. **Given** the new `RotationSchedulerService`, **when** the controller arms timers, **then** the timer behavior (content + ad cadence, fixed-mode non-arming, video-end delay) is identical to today's `_armAllTimers`.
2.2. **Given** the new `CursorService`, **when** the loop cursor moves through regular or recurring items, **then** the regular-cursor memory (`_regularCursorId`), fixed-mode pinned cursor (`_loopCursorBeforeFixed`), and `setCursor` / `enterFixedMode` / `exitFixedMode` semantics are preserved.
2.3. **Given** the new `RecurringCadenceService`, **when** the cadence counter advances and crosses the smallest recurring item's cadence, **then** the recurring item is shown next and the counter resets to 0 — same behavior as today's `_advanceContent` path.
2.4. **Given** the new `KioskRotationController`, **when** it orchestrates the three services, **then** its body is ≤ 200 LOC and its public signals (`contentMode`, `currentContentId`, `isPaused`, etc.) still expose the values the template binds to.

### User Story 3 — Polling separates transient from fatal errors with backoff (Priority: P2)

Network blips during an event must not crash the kiosk or restart timers. The new `DisplayPollingService` distinguishes 401/403 from network/5xx and applies exponential backoff to the latter.

**Acceptance scenarios**:

3.1. **Given** a `GET /api/display/state` returns 401, **when** the poll fires, **then** the session is cleared and the operator is redirected to `/login` (today: works).
3.2. **Given** a poll returns 503, **when** it happens consecutively, **then** the next poll waits `1s, 2s, 4s, 8s, 16s, 30s` (capped) with ±20% jitter, instead of resetting to the configured interval.
3.3. **Given** a successful poll after a transient failure, **when** it returns 200, **then** the next poll reverts to the configured `remoteControlPollingSeconds`.
3.4. **Given** the kiosk is offline, **when** the operator's laptop drops WiFi, **then** the polling does not hammer the backend; the cached state continues to render and a subtle "reconnecting…" hint is visible in dev console logs.

### User Story 4 — Branding overlay and fullscreen prompt become reusable child components (Priority: P3)

The kiosk component template extracts `<kiosk-branding-overlay>` and `<kiosk-fullscreen-prompt>` so they can be reused in future kiosk modes (e.g. dual-display, embed preview).

**Acceptance scenarios**:

4.1. **Given** branding is configured, **when** the kiosk renders, **then** `<kiosk-branding-overlay>` shows organizer logo + event name in the same positions as today, hidden in iframe mode.
4.2. **Given** the fullscreen request is rejected by the browser, **when** it fails, **then** `<kiosk-fullscreen-prompt>` shows the "Enter fullscreen" button.
4.3. **Given** the browser blocks the remote-control fullscreen toggle, **when** the operator clicks the prompt, **then** fullscreen is re-requested and the prompt hides on success.

## Functional Requirements

- **FR-1**: `DisplayScreenComponent` body shrinks from 728 LOC to ≤ 300 LOC by delegating to `DisplayPollingService`, `DisplayNavigationService`, `<kiosk-branding-overlay>`, `<kiosk-fullscreen-prompt>`.
- **FR-2**: `KioskRotationController` body shrinks from 536 LOC to ≤ 200 LOC by delegating to `RotationSchedulerService`, `CursorService`, `RecurringCadenceService`.
- **FR-3**: `DisplayPollingService` exposes `open()`, `start()`, `stop()`, `pollNow()` and emits the polled `DisplayState` to subscribers. It applies exponential backoff on transient errors (5xx, network) with a 1→30s curve and ±20% jitter.
- **FR-4**: A new ADR (`docs/adr/0004-kiosk-service-split.md`) documents the rationale and the new boundaries.
- **FR-5**: Every new file has a focused spec (`*.spec.ts`) covering its public surface.
- **FR-6**: The existing `display-screen.component.spec.ts` continues to pass without modification of its assertions (the public component behavior is preserved).
- **FR-7**: The existing `kiosk-rotation.controller.spec.ts` keeps passing — if individual sub-services need test coverage that used to live in the controller's spec, the test cases move to the new spec file alongside the code they cover.

## Success Criteria

- **SC-1**: `DisplayScreenComponent` ≤ 300 LOC and `KioskRotationController` ≤ 200 LOC, measured by `wc -l`.
- **SC-2**: All existing Karma specs in `frontend/src/app/display/` pass unchanged.
- **SC-3**: New specs cover `DisplayPollingService`, `DisplayNavigationService`, `RotationSchedulerService`, `CursorService`, `RecurringCadenceService`, `<kiosk-branding-overlay>`, `<kiosk-fullscreen-prompt>`.
- **SC-4**: No new runtime dependency on a third-party library.

## Non-goals

- No new public contracts (the rotation behavior is unchanged).
- No new features in this refactor — only structural reorganization.
- No migration of the spec suite to Playwright (covered separately under CHG-021+ follow-up work).
- No changes to `display-rotation.service.ts` (the queue algorithm) or `display-api.service.ts` (HTTP layer).