# Tasks: Kiosk Runtime Refactor

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Branch**: `021-kiosk-runtime-refactor`

> Each phase must end with `npm --prefix frontend run test` green before moving to the next.
> CHG-021 cannot reach `consolidated` status until CHG-019 is consolidated, but the implementation phase can start now.

## Phase 1 — CursorService (lowest risk)

- [ ] T1.1: Create `frontend/src/app/display/cursor.service.ts` with:
  - `currentContentId = signal<string | null>(null)` (replaces the controller's signal).
  - `regularCursorId` private state + getter.
  - `loopCursorBeforeFixed` private state + getter.
  - `setCursor(id, isRegular)` method.
  - `enterFixed(contentId)` method (preserves loop cursor on first pin).
  - `exitFixed()` method (restores loop cursor).
- [ ] T1.2: Create `frontend/src/app/display/cursor.service.spec.ts` covering all transitions:
  - Initial state (`currentContentId()` null).
  - `setCursor` with regular flag.
  - `setCursor` with `isRegular=false` (does not overwrite `_regularCursorId`).
  - `enterFixed` from null cursor and from existing cursor.
  - `exitFixed` restores the pinned cursor.
  - Re-entering fixed mode after exit (no stale `_loopCursorBeforeFixed`).

## Phase 2 — RecurringCadenceService (medium risk)

- [ ] T2.1: Create `frontend/src/app/display/recurring-cadence.service.ts` with:
  - `cadenceCounter = signal<number>(0)`.
  - `setQueue(items: readonly DisplayContentItem[])` to recompute the smallest cadence.
  - `pickRecurringItem(queue)` returning the next recurring item (smallest cadence, smallest displayOrder on tie) or `null`.
  - `regularQueue(items)` returning the queue without recurring items, sorted by `displayOrder`.
  - `increment()` and `reset()` for the counter.
- [ ] T2.2: Create `.spec.ts` covering:
  - Empty queue → `pickRecurringItem` returns `null`.
  - Queue with one recurring item at cadence N → returns it on counter > N (per spec 007 US2).
  - Multiple recurring items → smallest cadence wins.
  - Tie on cadence → smallest displayOrder wins.
  - `regularQueue` excludes recurring items and sorts by `displayOrder`.

## Phase 3 — RotationSchedulerService (medium risk)

- [ ] T3.1: Create `frontend/src/app/display/rotation-scheduler.service.ts` with:
  - `armContent(durationMs, onFire)` — clamps to ≥100ms, calls `clearContent()` first.
  - `armAd(durationMs, onFire)` — clamps to ≥100ms.
  - `clearContent()`, `clearAd()`, `clearAll()`.
  - Internal `setTimeout` references for cleanup on `ngOnDestroy`-equivalent.
- [ ] T3.2: Create `.spec.ts` using Jasmine fake timers covering:
  - `armContent` fires `onFire` after `durationMs`.
  - `armContent` followed by `clearContent` does not fire.
  - `armAd` fires after `durationMs`.
  - Duration < 100ms is clamped to 100ms.

## Phase 4 — Wire `KioskRotationController` to the new services (high risk, gates the rest)

- [ ] T4.1: Modify `kiosk-rotation.controller.ts` to inject `CursorService`, `RecurringCadenceService`, `RotationSchedulerService`. Public signals (`contentMode`, `currentContentId`, `adIndex`, `adAnimationRun`, `cadenceCounter`, `isPaused`, `fixedContentId`) stay exposed through the controller for back-compat (delegated to the services internally).
- [ ] T4.2: Delegate `_advanceContent`, `_rewindContent`, `enterFixedMode`, `exitFixedMode`, `setCursor` to the new services.
- [ ] T4.3: Run `frontend/src/app/display/kiosk-rotation.controller.spec.ts` → must stay green.
- [ ] T4.4: Verify `wc -l frontend/src/app/display/kiosk-rotation.controller.ts` ≤ 200 LOC. If not, look for missed extractions (private methods that could move into `CursorService` / `RecurringCadenceService`).

## Phase 5 — DisplayPollingService (medium risk)

- [ ] T5.1: Create `frontend/src/app/display/display-polling.service.ts` with:
  - `state = signal<DisplayState | null>(null)`.
  - `loading = signal<boolean>(false)`.
  - `error = signal<ApplicationErrorContract | null>(null)`.
  - `consecutiveFailures = signal<number>(0)`.
  - `start()` — opens display + starts polling.
  - `stop()` — cancels polling and timers.
  - `pollNow()` — fetches state immediately and applies it.
  - `scheduleNext(afterMs)` — internal: uses backoff curve on failure.
  - Internal: `effect()` tracks `state()` and re-applies when it changes (current pattern).
- [ ] T5.2: Backoff constants: `minBackoffMs = 1000`, `maxBackoffMs = 30000`, `jitterRatio = 0.2`.
- [ ] T5.3: Create `.spec.ts` with fake timers covering:
  - 401 → `clearSession()` invoked + state cleared.
  - 503 → next poll waits ≥ 1s.
  - Two consecutive 503 → next poll waits ≥ 2s.
  - 5xx then 200 → next poll reverts to configured interval.
  - 10 consecutive failures → wait capped at ≤ 30s + jitter.

## Phase 6 — DisplayNavigationService (medium risk)

- [ ] T6.1: Create `frontend/src/app/display/display-navigation.service.ts` with:
  - `applyNavigationCommand(command, targetId?)`.
  - `handleFixedModeTransition(prevMode, newMode, fixedId)`.
  - `syncCurrentContentForModeChange(prevMode, newMode, fixedId, state)`.
  - `computeContentDurationSeconds(item, fallback)`.
  - Each method returns a boolean / void matching the controller's existing private API; the controller composes them.
- [ ] T6.2: Create `.spec.ts` covering:
  - `pause` only fires in loop mode.
  - `resume` only fires in loop mode.
  - `jump_to` with unknown id is a silent no-op (per spec 014 US7).
  - `enterFixed` from loop preserves the cursor memory.

## Phase 7 — Child components (low risk)

- [ ] T7.1: Create `frontend/src/app/display/branding-overlay.component.ts` as a standalone component.
  - Inputs: `branding` (the `EventBranding`), `visible` (boolean).
  - Renders the same DOM as the current inline overlay.
  - Spec asserts: visible=true renders logo + name, visible=false renders nothing, broken logo hides.
- [ ] T7.2: Create `frontend/src/app/display/fullscreen-prompt.component.ts`.
  - Inputs: `visible` (boolean).
  - Outputs: `enter` (void).
  - Spec asserts: button click emits `enter`, hidden when `visible=false`.
- [ ] T7.3: Verify the spec files cover both the success and the hidden cases.

## Phase 8 — Orchestrator refactor (high risk, gates CHG-021)

- [ ] T8.1: Refactor `display-screen.component.ts` to use `DisplayPollingService`, `DisplayNavigationService`, `<kiosk-branding-overlay>`, `<kiosk-fullscreen-prompt>`. Drop the polling / navigation private methods. Keep `currentContent` and `visibleAds` getters (still bound in the template).
- [ ] T8.2: Run `frontend/src/app/display/display-screen.component.spec.ts` → must stay green.
- [ ] T8.3: Run the full frontend test suite → 100% green.
- [ ] T8.4: Verify `wc -l frontend/src/app/display/display-screen.component.ts` ≤ 300 LOC.
- [ ] T8.5: Build with `npm --prefix frontend run build` → green.

## Phase 9 — ADR + manifest update (low risk)

- [ ] T9.1: Create `docs/adr/0004-kiosk-service-split.md` with the rationale (see plan.md).
- [ ] T9.2: Update `specs/manifest.yml` if the owned paths under `DISPLAY.RUNTIME` need to reflect the new files. (Decision pending — if the orchestrator and the new services are all owned by `DISPLAY.RUNTIME`, no manifest change is needed; verify.)
- [ ] T9.3: Update `specs/contracts/display-runtime/contract.md` to keep the "Owned code paths" section accurate. Same decision logic as 9.2.

## Phase 10 — CHG-021 closure (after CHG-019 consolidates)

- [ ] T10.1: Wait for CHG-019 to reach `consolidated` status.
- [ ] T10.2: Run `npm --prefix frontend run test` once more to confirm green state.
- [ ] T10.3: Update CHG-021 spec to `status: consolidated` once the orchestrator and the spec/manifest are aligned.
- [ ] T10.4: Commit the changes with a single feature commit per phase (or one squash at the end, per project convention).

## Cross-cutting

- **C1**: Run `npm --prefix frontend run test` after every phase. Do not advance if any spec fails.
- **C2**: Do not change `DISPLAY.RUNTIME` public interfaces; the contract's `requires_contract_update: false` is intentional.
- **C3**: Do not introduce new third-party dependencies.
- **C4**: Each new file gets its own `*.spec.ts` alongside the implementation.