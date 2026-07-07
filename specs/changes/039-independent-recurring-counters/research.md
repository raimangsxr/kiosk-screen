# Research: Independent Recurring Content Counters

**Date**: 2026-07-08  
**Spec**: [spec.md](./spec.md)

## Decision: Per-item counter map in controller

- **Decision**: Replace `cadenceCounter: signal<number>` with
  `recurringCounters: signal<ReadonlyMap<string, number>>` on
  `KioskRotationController`. Pure transition math stays in
  `RecurringCadenceService`.
- **Rationale**: Spec requires independent schedules, hot reset per item,
  and preservation across mode transitions. A map keyed by `contentId`
  supports add/remove/reset without coupling items.
- **Alternatives considered**:
  - Persist counters server-side: rejected — out of scope, adds API/migration.
  - Array parallel to queue: rejected — fragile on reorder/delete; map by id is stable.

## Decision: Increment on every content transition

- **Decision**: On each `_advanceContentRegular` tick in loop mode (not
  paused, not in novelty burst path), increment every active recurring
  item's counter by 1 **before** due/filler/regular resolution. Applies
  when showing due recurring, filler recurring, or regular content.
- **Rationale**: Operators estimate `N × slide duration` regardless of
  how many recurring items exist; filler and recurring displays must
  count toward other items' cadence.
- **Alternatives considered**:
  - Increment only on regular advances (legacy CHG-007): rejected — breaks
    SC-001 with multiple recurring items and contradicts user design sessions.
  - Wall-clock timers per item: rejected — spec non-goal.

## Decision: Due threshold `counter >= N`

- **Decision**: After increment, item is due when `counter >= recurringEveryXIterations`.
- **Rationale**: Matches operator mental model “every 6 transitions”
  (fires on the 6th transition when counter reaches 6). Differs from
  legacy `counter > N` shared counter.
- **Alternatives considered**:
  - Keep `> N` for backward compatibility: rejected — spec explicitly
    defines ≥ and acceptance scenarios use ticks 6, 12, … for N=6.

## Decision: Due resolution order

- **Decision**: Collect all due items, sort by `displayOrder` ascending,
  show exactly one per transition; reset only the shown item's counter.
  Repeat on subsequent transitions until no due items remain, then
  advance regular or filler.
- **Rationale**: Spec US1 acceptance 2 and edge cases for simultaneous due.
- **Alternatives considered**:
  - Show all due in one transition: rejected — violates one-item-per-tick UX.
  - Smallest N wins globally: rejected — legacy behavior being replaced.

## Decision: Filler queue for recurring-only events

- **Decision**: When `regularQueue` is empty and no item is due after
  increment, `pickNext(fillerQueue, fillerCursorId)` where `fillerQueue`
  is active recurring items sorted by `displayOrder`. Maintain separate
  `_fillerCursorId` (or reuse current id against filler queue).
- **Rationale**: Spec FR-007 / US3; replaces legacy `pickNext(full queue)` which ignored cadence when only recurring items existed.
- **Alternatives considered**:
  - Empty screen until due: rejected — spec requires filler rotation.
  - Include inactive recurring in filler: rejected — inactive excluded.

## Decision: Hot cadence change detection

- **Decision**: In `bindInputs` queue effect, track
  `Map<contentId, recurringEveryXIterations | null>` from previous poll.
  When value changes for an id (including null → N or N → null), reset
  that id's counter. When last recurring removed, clear entire map (FR-011).
- **Rationale**: `topContentItemMaterialFingerprint` already includes
  cadence; dedicated cadence map avoids full timer re-arm on immaterial changes.
- **Alternatives considered**:
  - Full page reload only: rejected — spec FR-010 requires live poll handling.
  - Reset all counters on any queue change: rejected — too disruptive.

## Decision: `jump_to` recurring target

- **Decision**: After showing target, set that id's counter to 0 only
  (extends current global reset to per-item).
- **Rationale**: Spec FR-009; item was just spotlighted.
- **Alternatives considered**:
  - Reset all counters: rejected — spec FR-009 scoped reset.

## Decision: Novelty burst interaction

- **Decision**: No change to novelty path — counters do not increment
  while `_advanceContentAsync` handles novelty slides; after burst,
  next `_advanceContentRegular` resumes incrementing.
- **Rationale**: Extends CHG-027; spec US4 acceptance 4.
- **Alternatives considered**:
  - Increment during novelty: rejected — breaks burst isolation.

## Decision: Backend scope

- **Decision**: Frontend-only change. No Alembic, no API, no admin validation changes.
- **Rationale**: Spec assumptions; field `recurringEveryXIterations` unchanged.
- **Alternatives considered**:
  - Server-persisted counters: rejected — non-goal.

## Decision: Admin UI

- **Decision**: Verify existing hint text in `content-form.component.ts`;
  adjust copy only if it still implies shared/global cadence.
- **Rationale**: Spec FR-012 minimal scope.
- **Alternatives considered**:
  - Per-item schedule preview UI: rejected — non-goal.

## Out of scope (confirmed)

- Ad-band rotation changes
- Wall-clock scheduling
- Backend domain `rotation.py` (display list only; kiosk owns cadence)

## Assumptions

- Inactive recurring items are already excluded from polled `topContent` or filtered by `isActive`.
- Page reload resetting all counters is acceptable (existing cursor behavior).
- No ADR required — behavior delta captured in `CONTENT.ROTATION` contract update.
