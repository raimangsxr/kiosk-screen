# Contract Delta: Recurring Cadence (Kiosk Runtime)

**Date**: 2026-07-08  
**Target active contract**: `CONTENT.ROTATION`  
**Change**: CHG-039

This document is the pre-implementation delta to merge into
`specs/contracts/content-rotation/contract.md` before coding.

## Replaces (legacy CHG-007 shared counter)

- Single global cadence counter for all recurring items.
- Smallest `recurringEveryXIterations` across items drives all recurring displays.
- Tie-break by `displayOrder` without per-item independence.
- Trigger `counter > N` on regular advances only when `regularQueue.length > 0`.
- Recurring-only queue uses undifferentiated `pickNext` over full queue (cadence ignored).

## New behavior

### Per-item counters

- Each active recurring top content item has an in-memory integer counter
  keyed by `contentId`.
- Counters increment by 1 on every on-screen content transition in loop mode,
  including transitions that show a due recurring item or filler recurring item.
- Counters do **not** increment during pause or novelty burst slides.

### Due rule

- After increment, item is due when `counter >= recurringEveryXIterations`.
- If multiple items are due, show one per transition in ascending `displayOrder`.
- Showing a due item resets only that item's counter to 0.
- Due display does not advance the regular queue cursor.

### Regular and filler queues

- Recurring items are excluded from the regular queue.
- When no item is due and regular content exists, advance the regular queue.
- When no item is due and no regular content exists, rotate recurring items
  by `displayOrder` as filler (filler transitions still increment counters).

### Operator actions

- `jump_to` a recurring item: show item; reset only its counter.
- Polled change to an item's `recurringEveryXIterations`: reset only that counter.
- Removal of last recurring item: clear all recurring counters.
- Mode transitions (loop ↔ iframe ↔ fixed): preserve counter map.

### Operator-facing cadence hint

- `recurringEveryXIterations` means screen transitions between appearances
  (approximate wall time = N × average slide duration).

## Unchanged public interfaces

- `DisplayState.topContent[].recurringEveryXIterations` — same shape.
- Remote control commands — same endpoints; `jump_to` semantics extended as above.
- Admin create/update content — same validation (fixed XOR recurring).

## Quality gate

- Automated tests in `recurring-cadence.service.spec.ts` and
  `kiosk-rotation.controller.spec.ts` cover all acceptance scenarios in
  CHG-039 spec.
