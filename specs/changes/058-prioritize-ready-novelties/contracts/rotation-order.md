# Internal Contract: Ready novelty ordering

This change does not alter a public API. It refines the internal decision contract shared by execution and planning.

## Decision precedence in loop mode

1. Reject advance when paused or outside loop mode.
2. Evaluate the FIFO novelty head:
   - ready: emit it and retain the regular cursor/preserved slot;
   - not ready below maximum: increment defer count and continue;
   - not ready at maximum: consume/discard it and continue.
3. Emit `rescheduledRegularContentId` when present.
4. Apply existing recurring-due, next-regular, and recurring-filler decisions.

`compute_rotation_plan_snapshot()` MUST use the same non-mutating precedence for its `next` item.
