# Implementation Plan: Kiosk Runtime Refactor

**Branch**: `021-kiosk-runtime-refactor` | **Date**: 2026-06-25 | **Spec**: [spec.md](./spec.md)

## Context Grounding

- Manifest read: `specs/manifest.yml`
- Active contracts read: `specs/contracts/display-runtime/contract.md`
- Change specs read: `specs/changes/021-kiosk-runtime-refactor/spec.md`, `specs/changes/021-kiosk-runtime-refactor/context-pack.md`, `specs/changes/019-display-responsive-runtime/spec.md` (in-progress sibling)
- ADRs read: `docs/adr/0001-token-aware-sdd-governance.md`, `docs/adr/0002-display-runtime-region-ratios.md`
- Code entrypoints verified: `frontend/src/app/display/display-screen.component.ts` (728 LOC), `frontend/src/app/display/kiosk-rotation.controller.ts` (536 LOC)
- Archived/consolidated specs read by default: none

## Summary

Decompose the kiosk runtime into focused services and child components. Each new file has a single responsibility, its own spec, and the existing display-screen and kiosk-rotation specs continue to pass unchanged. The public surface of `DISPLAY.RUNTIME` is preserved.

## Technical Context

- **Language/Version**: TypeScript 5.8 (frontend only).
- **Primary Dependencies**: Angular 20, RxJS, Material 3. No new third-party deps.
- **Storage**: N/A (state lives in the backend; refactor is structural).
- **Testing**: Karma + Jasmine. New specs alongside each new file.
- **Target Platform**: Chromium desktop and kiosk (Chrome/Edge 108+).
- **Project Type**: web (frontend Angular SPA).
- **Performance Goals**: ≤ 5% CPU when idle (inherited from spec 014 SC-001); ≤ 1ms extra latency from the extra service hop.
- **Constraints**: refactor only — no behavior change, no new dependencies, no contract update.
- **Scale/Scope**: seven new files (3 services, 2 child components, 1 ADR) plus modifications to two existing files.

## Architecture (target state)

```
display/
  display-screen.component.ts         ← orchestrator (≤ 300 LOC)
  display-screen.component.spec.ts    ← unchanged behavior
  display-screen.component.css        ← unchanged
  display-api.service.ts              ← unchanged (HTTP layer)
  display-rotation.service.ts         ← unchanged (queue algorithm)
  kiosk-rotation.controller.ts        ← orchestrator (≤ 200 LOC)
  kiosk-rotation.controller.spec.ts   ← unchanged behavior
  display-polling.service.ts          ← NEW: polling + backoff
  display-navigation.service.ts       ← NEW: navigation commands, mode transitions
  rotation-scheduler.service.ts       ← NEW: pure timer arming
  cursor.service.ts                   ← NEW: cursor memory (regular + fixed)
  recurring-cadence.service.ts        ← NEW: recurring content cadence rules
  branding-overlay.component.ts        ← NEW: <kiosk-branding-overlay>
  fullscreen-prompt.component.ts      ← NEW: <kiosk-fullscreen-prompt>
  *.spec.ts                           ← one per new file
```

## Decomposition strategy

### `DisplayScreenComponent` (728 → ≤ 300 LOC)

Extract four concerns:

1. **Polling** → `DisplayPollingService`. Owns `openDisplay()`, `watchState()`, and the new backoff behavior. Exposes `state` as a signal.
2. **Navigation** → `DisplayNavigationService`. Owns `applyNavigationCommand`, `handleFixedModeTransition`, `syncCurrentContentForModeChange`. Takes the polled state and the controller as inputs.
3. **Branding overlay template** → `<kiosk-branding-overlay>`. Takes `branding` and `showOverlay` inputs; renders the existing markup.
4. **Fullscreen prompt template** → `<kiosk-fullscreen-prompt>`. Takes `visible` input and emits `(enter)`.

The orchestrator keeps: lifecycle hooks, polling subscriptions, the polling → state application glue, the `currentContent` mirror for the template, and the navigation/state glue. No template-side rendering stays inline except the top-region rendering and the ads-region (these need the controller signals directly).

### `KioskRotationController` (536 → ≤ 200 LOC)

Extract three concerns:

1. **Timer arming** → `RotationSchedulerService`. Pure: takes "fire content" and "fire ad" callbacks; arms `setTimeout` with the right duration. No state.
2. **Cursor memory** → `CursorService`. Owns `_regularCursorId`, `_loopCursorBeforeFixed`, `currentContentId` (the public signal stays here for back-compat). Methods: `setCursor`, `enterFixed`, `exitFixed`.
3. **Recurring cadence** → `RecurringCadenceService`. Owns `cadenceCounter` and the recurring-pick logic.

The controller orchestrator keeps: `contentMode` signal, the `effect()` that wires polled inputs into the internal signals, `applyNavigationCommand`, `pause`, `resume`, `onVideoEnded`, and the public `visibleAds` / `currentContent` / `currentAd` / `isQueueEmpty` computeds.

### Backoff strategy (DisplayPollingService)

```
on error:
  if status in [401, 403]: clear session, navigate to /login (existing behavior)
  else: backoff = min(30s, 1s * 2^consecutiveFailures) + jitter(-20%, +20%)
  on success: consecutiveFailures = 0, scheduleNext = configuredInterval
```

Implemented with a single `setTimeout` driven by `effect()` that tracks `stateVersion` so it re-arms when the polled fingerprint changes.

## Constitution Check

*GATE: must pass before tasks.md generation.*

- **Spec traceability**: this plan references spec.md, the four user stories, FR-1..FR-7, and SC-1..SC-4.
- **Requirement clarity**: zero open ambiguities after the `/speckit.specify` clarification round.
- **Plan alignment**: the technical approach stays inside the scope of spec 021 (structural refactor only).
- **Simplicity**: no new dependencies, no new abstractions beyond "service that owns X"; each new file has one clear responsibility.
- **Contracts**: `requires_contract_update: false` — public interfaces of `DISPLAY.RUNTIME` preserved.
- **Testing**: every new file gets its own spec. The existing display-screen and kiosk-rotation specs must pass unchanged.
- **Security, observability, accessibility**: unchanged — the refactor preserves all side effects.
- **No speculative scope**: no new features; pure structural reorganization.
- **Conflict handling**: spec 014 is not amended; spec 021 adds decomposition without superseding anything. CHG-019 (CSS) and CHG-021 (services) touch different files.
- **Capability boundary (Principle VII)**: no new capability declared; refactor stays inside the existing capability.
- **Supersession (Principle VI)**: none.
- **Size budget (Principle VIII)**: spec.md ≤ 250 lines (current: ~155), plan.md ≤ 300 lines (current: ~110), tasks.md ≤ 400 lines (TBD).
- **Conflict log clean**: no prior conflicts to resolve.

## File-by-file plan

### Phase 1 — CursorService (lowest risk, no controller changes)

- Create `frontend/src/app/display/cursor.service.ts` and `cursor.service.spec.ts`.
- Pure logic: regular cursor memory, fixed-mode pinned cursor, public `currentContentId` signal.
- **No** changes to controller yet — separate file, exercised by its own spec.

### Phase 2 — RecurringCadenceService (medium risk)

- Create `frontend/src/app/display/recurring-cadence.service.ts` and `.spec.ts`.
- Owns `cadenceCounter` signal + `pickRecurringItem()` + `regularQueue()` helpers.
- **No** controller changes yet.

### Phase 3 — RotationSchedulerService (medium risk, depends on callbacks)

- Create `frontend/src/app/display/rotation-scheduler.service.ts` and `.spec.ts`.
- Pure: `armContentTimer(durationMs, onFire)`, `armAdTimer(durationMs, onFire)`, `clearAll()`.
- All `setTimeout` logic moves here. Existing controller tests still cover the integration.

### Phase 4 — Wire controller to new services (high risk, must keep green)

- Modify `kiosk-rotation.controller.ts` to inject `CursorService`, `RecurringCadenceService`, `RotationSchedulerService`. Delegate their respective methods. Keep public signals and computed identical.
- Run existing controller spec → must stay green.

### Phase 5 — DisplayPollingService (medium risk)

- Create `frontend/src/app/display/display-polling.service.ts` and `.spec.ts`.
- Encapsulates `openDisplay` + `watchState` + backoff.
- Exposes `state` signal + `start()` / `stop()` / `pollNow()`.

### Phase 6 — DisplayNavigationService (medium risk)

- Create `frontend/src/app/display/display-navigation.service.ts` and `.spec.ts`.
- Owns navigation commands, fixed-mode transitions, sync-current-content-for-mode-change.

### Phase 7 — Child components (low risk)

- Create `<kiosk-branding-overlay>` and `<kiosk-fullscreen-prompt>` as standalone components.
- Each gets its own spec asserting behavior matches the current implementation.

### Phase 8 — Orchestrator refactor (high risk, gates the spec)

- Trim `DisplayScreenComponent` to ≤ 300 LOC, delegating to the new services + child components.
- Run full test suite → must stay green.

### Phase 9 — ADR + manifest update (low risk)

- Create `docs/adr/0004-kiosk-service-split.md` documenting the new boundaries and the rationale.
- Update `specs/manifest.yml` to reflect the new owned paths under `DISPLAY.RUNTIME` if needed.

## ADR (new)

`docs/adr/0004-kiosk-service-split.md`:
- **Status**: accepted.
- **Context**: `DisplayScreenComponent` 728 LOC, `KioskRotationController` 536 LOC, both with mixed responsibilities. CHG-019 (CSS work) and upcoming feature work would pile more on top.
- **Decision**: extract polling, navigation, branding overlay, fullscreen prompt from the component; extract cursor, recurring cadence, and timer arming from the controller.
- **Consequences**: each new service has a focused spec; component becomes an orchestrator; behavior preserved by the existing specs. The `KioskRotationController`'s `runInInjectionContext` / `effect()` pattern moves to the orchestrator, not the controller.

## Risks

- **R1 (high)**: existing `kiosk-rotation.controller.spec.ts` and `display-screen.component.spec.ts` fail during the refactor. **Mitigation**: run them after every phase; do not start phase 8 until phases 1-7 are green.
- **R2 (medium)**: the controller's `runInInjectionContext` pattern leaks effects if not preserved. **Mitigation**: keep the same `effect()` wiring in the orchestrator until phase 8.
- **R3 (low)**: backoff behavior diverges from current "reset on every poll" by accident. **Mitigation**: cover with explicit specs for 401/5xx paths.

## Out of scope

- No new public contracts.
- No new features in this refactor.
- No migration of the spec suite to Playwright (covered separately).
- No changes to `display-rotation.service.ts` (queue algorithm) or `display-api.service.ts` (HTTP layer).