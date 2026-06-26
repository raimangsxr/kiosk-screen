# ADR-0004: Kiosk Runtime Service Split

- **Status**: accepted.
- **Date**: 2026-06-25.
- **Deciders**: kiosk runtime maintainers.
- **Related specs**: `specs/changes/021-kiosk-runtime-refactor/spec.md`, `specs/contracts/display-runtime/contract.md`.

## Context

Before CHG-021 the kiosk runtime lived in two files:

- `frontend/src/app/display/display-screen.component.ts` — 728 LOC. Mixed polling, state application, navigation commands, video end, fullscreen, orientation, and branding overlay rendering.
- `frontend/src/app/display/kiosk-rotation.controller.ts` — 536 LOC. Mixed cursor memory, recurring cadence logic, empty-queue debounce, and timer scheduling.

CHG-019 (display responsive runtime, CSS-only) piled more work onto both files. Upcoming features (live preview, multi-kiosko, analytics) would make them harder to navigate and review. We needed a structural refactor that:

1. Keeps every observable behavior intact — the existing spec suite must pass without modification of its assertions.
2. Reduces cognitive load per file (each new file has a single responsibility).
3. Stays inside `DISPLAY.RUNTIME` (`requires_contract_update: false`).

## Decision

Split the runtime into focused services and child components.

**New files** (each ≤ 200 LOC + a focused spec):

- `cursor.service.ts` — pure helpers for cursor transitions (`applySetCursor`, `applyEnterFixed`, `applyExitFixed`). The kiosk controller still owns the cursor state; the service is the math.
- `recurring-cadence.service.ts` — pure helpers for recurring cadence rules (`regularQueue`, `smallestRecurringCadence`, `pickRecurringItem`, `shouldFireRecurring`, `shouldResetOnEmptyRecurring`).
- `rotation-scheduler.service.ts` — owns the `setTimeout` handles for content + ad rotation. The only stateful service; every other new service is stateless.
- `display-polling.service.ts` — wraps `DisplayApiService` with backoff. `start(intervalMs)`, `pollNow()`, `stop()`. Exponential backoff 1→30 s with ±20 % jitter on transient failures; 401/403 clears the session and routes to `/login`.
- `kiosk-branding-overlay.component.ts` — `<app-kiosk-branding-overlay>`. Standalone child component. Inputs: `branding`, `hiddenLogoUrl`, `visible`. Output: `logoBroken`.
- `kiosk-fullscreen-prompt.component.ts` — `<app-kiosk-fullscreen-prompt>`. Inputs: `visible`. Output: `enter`.

**Modified files**:

- `kiosk-rotation.controller.ts` — still owns reactive state (signals + computed) and public surface; delegates logic to the three services. Public API preserved so `display-screen.component.ts` keeps compiling unchanged.
- `display-screen.component.ts` — wires the new providers, uses `<app-kiosk-branding-overlay>` and `<app-kiosk-fullscreen-prompt>` instead of inline markup.

**Skipped for now**:
- `<display-navigation-service>` — the navigation command pipeline is small (50 LOC) and tightly coupled to component state. Extracting it would force a controller façade for marginal LOC gain. Tracked as a future tightening.

## Boundary map

```
DISPLAY.RUNTIME
  display-screen.component.ts         orchestrator
    ├─ DisplayPollingService          polling + backoff
    ├─ DisplayControlSyncService      unchanged
    ├─ EventBrandingService           unchanged
    ├─ KioskRotationController        orchestrator
    │    ├─ CursorService             pure helpers (cursor math)
    │    ├─ RecurringCadenceService   pure helpers (cadence rules)
    │    └─ RotationSchedulerService  stateful (setTimeout handles)
    ├─ <app-kiosk-branding-overlay>   standalone child component
    └─ <app-kiosk-fullscreen-prompt> standalone child component
```

## Consequences

Positive:
- Each new service has its own spec file. Future changes can target one focused unit without touching the rest.
- The kiosk controller's signal surface stays stable, so the component (and CHG-019's CSS work) is unaffected.
- The polling service's backoff curve has a public `nextBackoffMs(n)` method that is pure and fully spec-covered.
- The two child components are reusable — future kiosk modes (dual display, embed preview) can compose them.

Negative / risks:
- The kiosk controller's public surface is preserved, but its body is still large because of the public signal surface (signals + computeds + lifecycle + the `bindInputs` `effect()`). The ambitious ≤ 200 LOC target was not met (final: ~480 LOC). Further reduction would require changing the component's template surface, which is out of scope for a refactor.
- More files mean more import lines in the component. The extra structure is justified by the per-file scope shrinking.
- `RotationSchedulerService` is the only stateful helper. If a future contributor treats it as stateless (e.g. instantiating multiple instances per kiosk), the timer state could be lost. The test suite covers the contract: each call to `arm*` replaces the previous timer.

## Alternatives considered

1. **Keep the controller monolithic, extract only the polling service.** Rejected: the cursor / cadence / timer boundaries are real, splitting them gives the next CHG (kiosk preview) a clear home for its code.
2. **Move cursor state into `CursorService` (stateful).** Rejected: the controller already exposes `currentContentId` as a signal the template binds to; making the cursor service stateful would force a second signal that the component would have to read through. Keeping state in the controller and passing it as arguments to pure helpers preserves reactivity without extra plumbing.
3. **Use a runtime translation loader for `kiosk-branding-overlay` and similar i18n strings.** Out of scope: those strings are already covered by the `@angular/localize` `i18n` attributes from CHG-020.

## References

- `specs/changes/021-kiosk-runtime-refactor/spec.md`
- `specs/changes/021-kiosk-runtime-refactor/plan.md`
- `specs/changes/021-kiosk-runtime-refactor/tasks.md`
- `frontend/src/app/display/cursor.service.ts`
- `frontend/src/app/display/recurring-cadence.service.ts`
- `frontend/src/app/display/rotation-scheduler.service.ts`
- `frontend/src/app/display/display-polling.service.ts`
- `frontend/src/app/display/kiosk-branding-overlay.component.ts`
- `frontend/src/app/display/kiosk-fullscreen-prompt.component.ts`