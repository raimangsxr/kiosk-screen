# Kiosk Live Update Contract

**Date**: 2026-06-18
**Spec**: [spec.md](../spec.md)
**Status**: Authoritative for the implementation phase.

This contract defines the client-side behavior of the kiosk's display loop when a new item arrives while kiosk mode is open. It describes the state machine and timing without prescribing internal implementation (the implementation lives in `frontend/src/app/display/`).

## State

The kiosk component holds the following state for the duration of one kiosk session (from `openDisplay()` to Escape):

| Field | Type | Description |
|---|---|---|
| `fullState` | `DisplayState` | The latest snapshot from `GET /api/display/state`. |
| `currentItemId` | `string \| null` | The id of the item currently being shown. |
| `baseIndex` | `number` | Pointer into `fullState.topContent` for the next base item to show when the novelty queue is empty. |
| `noveltyQueue` | `ContentItem[]` | FIFO of items not yet shown since they were detected. |
| `seenIds` | `Set<string>` | Set of content ids known from the last successful poll. Used to detect additions and removals. |
| `transitionTimer` | `ReturnType<typeof setTimeout> \| null` | Timer scheduled to fire the next transition. |
| `preTransitionPollTimer` | `ReturnType<typeof setTimeout> \| null` | Timer scheduled 1s before `transitionTimer` to fire a final poll. |

All state is reset when `openDisplay()` is called.

## Lifecycle

### Open

When `openDisplay()` succeeds, the kiosk:

1. Stores the returned `DisplayState` as `fullState`.
2. Initializes `currentItemId = fullState.topContent[0]?.id ?? null`.
3. Initializes `baseIndex = 1` (next item to show after the current one if the queue stays empty).
4. Initializes `noveltyQueue = []` and `seenIds = new Set(fullState.topContent.map(i => i.id))`.
5. Schedules the first transition via `scheduleTransition(durationOf(currentItem))`.
6. Starts the periodic poll subscription.

### Periodic Poll

The poll subscription is a 5-second `interval(5000)` that fires `api.getState()` and processes the result via `onPoll()`. The poll is a `switchMap` to the HTTP call; the latest state is replayed to all subscribers.

```ts
poll$ = timer(0, 5000).pipe(
  switchMap(() => api.getState()),
  distinctUntilChanged(equalByIdAndOrder),
  shareReplay({ bufferSize: 1, refCount: true })
);
```

`equalByIdAndOrder` compares the latest and previous states on `(topContent.map(i => i.id), topContent.map(i => i.displayOrder), ads.map(i => i.id), ads.map(i => i.displayOrder))` only. Changes to `lastUsedAt`, `updatedAt`, or other non-rendering fields are ignored.

### `onPoll(newState)`

Called on every successful poll that differs from the previous state.

1. Compute `newIds = new Set(newState.topContent.map(i => i.id))`.
2. Compute `removedIds = [...seenIds].filter(id => !newIds.has(id))`.
3. Update `seenIds = newIds`.
4. Update `fullState = newState`.
5. For each new id (in the order they appear in `newState.topContent`):
   - Look up the item in `newState.topContent`.
   - Push it to `noveltyQueue`.
6. For each removed id:
   - If it's in `noveltyQueue`, remove it.
   - If `currentItemId === removedId`, set `currentItemId = null` so the next transition picks a new item.
7. If `noveltyQueue.length > 0` and a transition is currently scheduled, do NOT cancel it: the current item finishes naturally, then the next transition will dequeue from the novelty queue.
8. If `currentItemId` was set to null (item removed), schedule an immediate transition with the duration of the next item (no wait).

### `scheduleTransition(durationMs)`

1. Clear any existing `transitionTimer` and `preTransitionPollTimer`.
2. Schedule `transitionTimer = setTimeout(() => advance(), durationMs)`.
3. If `durationMs > 1000`, schedule `preTransitionPollTimer = setTimeout(() => api.getState().subscribe(s => onPoll(s)), durationMs - 1000)`. Otherwise (very short transitions), skip the pre-transition poll.

The 1-second offset ensures the pre-transition poll has time to complete before the actual transition fires.

### `advance()`

The transition callback. Picks the next item to show.

```
function advance():
  if noveltyQueue.length > 0:
    next = noveltyQueue.shift()
  else:
    if currentItemId is null or currentItemId not in fullState.topContent:
      next = fullState.topContent[0]
      baseIndex = 1
    else:
      currentIndex = fullState.topContent.findIndex(i => i.id == currentItemId)
      nextIndex = (currentIndex + 1) % fullState.topContent.length
      next = fullState.topContent[nextIndex]
      baseIndex = (nextIndex + 1) % fullState.topContent.length
  currentItemId = next.id
  scheduleTransition(durationOf(next))
```

`durationOf(item)` uses `item.effectiveDurationSeconds` (set by the server) and falls back to the kiosk configuration's `defaultTopDurationSeconds` if the effective value is missing.

### Close (Escape)

When the user navigates away:

1. Clear both timers.
2. Unsubscribe from the poll subscription.
3. Reset all state to initial values.

No state is preserved across sessions.

## Timing Guarantees

- **Periodic poll**: every 5 seconds (configurable via the kiosk configuration, but 5s is the default and the spec value).
- **Pre-transition poll**: 1 second before each scheduled transition. Skipped for transitions under 1 second.
- **Latency ceiling**: from the moment a successful upload returns 201 to the moment the new item is first rendered on the running kiosk, the latency is bounded by `5s (poll) + max(1s pre-transition, 0)` ≈ 6 seconds in the worst case. The spec's SC-001 requires ≤6s p95.

## Edge Case Behavior

| Scenario | Behavior |
|---|---|
| First poll before the user has seen any item | If the open returned `topContent = []`, the kiosk shows the "Content unavailable" fallback. Polling continues. |
| Polling fails (network error, 5xx) | The kiosk keeps the previous `fullState` and `currentItemId`. The current item continues. The next `interval` tick retries. No user-visible error. |
| Item deleted while in `noveltyQueue` | The next poll removes it. The transition passes over it. |
| Item expires (`availableUntil` in the past) while in `noveltyQueue` | Same as deleted: removed on the next poll. |
| Base rotation reordered while novelty is draining | `fullState` is updated. `currentItemId` is preserved. `baseIndex` is recomputed by id on the next `advance()` that hits the base. |
| Currently shown item deleted | The next poll detects it. `currentItemId = null`. The next transition uses the next eligible item, with the duration of that item (no extra wait). |
| Poll returns the same state | `distinctUntilChanged` short-circuits. `onPoll` is not called. The current item continues uninterrupted. |
| Burst of 200 uploads while kiosk is mid-display | Each poll enqueues the items detected as new. The queue is drained one by one in arrival order. No cap. |
| Multiple kiosks open on the same org | Each kiosk has independent state. Each polls and enqueues on its own. |

## Open Questions Deferred to Planning

None. The contract is complete and unambiguous. The implementation in `tasks.md` will decompose this into testable units.
