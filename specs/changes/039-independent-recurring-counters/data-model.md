# Data Model: Independent Recurring Content Counters

**Date**: 2026-07-08  
**Spec**: [spec.md](./spec.md)

No database migrations. This document describes kiosk runtime state and
logical entities for CHG-039.

## Persistent data (unchanged)

| Entity | Field | Type | Notes |
|--------|-------|------|-------|
| `TopContentItem` | `recurringEveryXIterations` | `int \| null` | N ≥ 1 when set; admin/API unchanged |
| `DisplayContentItem` (poll DTO) | `recurringEveryXIterations` | `number \| null` | Exposed in `DisplayState.topContent` |

## Ephemeral kiosk state (new / changed)

### Recurring counter map

| Property | Type | Owner | Lifecycle |
|----------|------|-------|-----------|
| `recurringCounters` | `Map<contentId, number>` | `KioskRotationController` | In-memory per kiosk tab; lost on full reload |

**Invariants**:

- Keys exist only for active recurring items currently in `contentQueue`.
- Values are non-negative integers.
- Default for new recurring id: `0`.
- Removed recurring id: key deleted.
- Last recurring removed: map cleared.

### Cursors (existing, clarified)

| Property | Type | Purpose |
|----------|------|---------|
| `_regularCursorId` | `string \| null` | Position in regular (non-recurring) queue |
| `_fillerCursorId` | `string \| null` | Position in recurring-only filler queue |

Filler cursor used only when `regularQueue.length === 0` and no due item on current tick.

## State transitions per content tick

```
[loop mode, not paused, not novelty burst]

1. INCREMENT
   ∀ active recurring item r: counters[r.id] += 1

2. DUE_CHECK
   due = { r | counters[r.id] >= r.recurringEveryXIterations }
          .sort(displayOrder asc)

3a. if due.nonEmpty:
      show due[0]
      counters[due[0].id] = 0
      (regular cursor unchanged)

3b. else if regularQueue.nonEmpty:
      show pickNext(regularQueue, regularCursor)
      advance regularCursor

3c. else:
      show pickNext(fillerQueue, fillerCursor)
      advance fillerCursor
```

## Reset events

| Event | Effect on counters |
|-------|-------------------|
| Due item displayed | That id → `0` |
| `jump_to` recurring target | Target id → `0` |
| Polled cadence N changed for id | That id → `0` |
| Item removed from queue | Key removed |
| Last recurring removed | Map cleared |
| Full page reload | Map cleared (initial) |
| Pause | No increment (frozen) |
| Novelty burst slide | No increment |
| Mode loop → iframe/fixed | Preserved |
| Return to loop | Preserved |

## Queue partitions

| Queue | Membership filter | Sort |
|-------|-------------------|------|
| Regular | `!recurringEveryXIterations && isNovelty !== true` | `displayOrder` |
| Filler | `recurringEveryXIterations >= 1 && isActive` | `displayOrder` |
| Due candidates | Filler members with `counter >= N` | `displayOrder` |

Novelty items remain excluded from regular queue per CHG-027 (unchanged).

## Fingerprint / poll sync

`topContentItemMaterialFingerprint` already includes `recurringEveryXIterations`.
Controller maintains `lastRecurringCadenceById: Map<id, number | null>` to
detect FR-010 hot changes without resetting unrelated counters.

## Relationships

```
DisplayState.topContent (poll)
        ↓
KioskRotationController.contentQueue
        ↓
RecurringCadenceService (pure)
  - regularQueue()
  - fillerQueue()
  - incrementCounters()
  - dueItems()
  - applyReset()
        ↓
DisplayRotationService.pickNext()
```

## Example trace (A: N=6, B: N=30, regular R₁–R₃)

| Tick | After +1 | Due | Screen | Notes |
|------|----------|-----|--------|-------|
| 1 | A=1,B=1 | — | R₁ | regular |
| 6 | A=6,B=6 | A | A | A reset→0 |
| 7 | A=1,B=7 | — | R₂ | regular resumes |
| 30 | A=6,B=30 | A,B | A | both due; show A first |
| 31 | A=1,B=31 | B | B | B still due (31≥30) |
| 32 | A=2,B=0 | — | R₃ | regular resumes |

*(Exact regular sequence depends on cursor position; tests pin expected ids.)*
