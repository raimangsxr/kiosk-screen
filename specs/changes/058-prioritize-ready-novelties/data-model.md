# Data Model: Priorizar novedades descargadas

No new persistent entity or field is introduced.

## Existing orchestrator state invariants

| Field | Role in CHG-058 | Invariant |
|---|---|---|
| `regularCursorId` | Last emitted regular content | Does not change while a novelty emits |
| `rescheduledRegularContentId` | Next regular content preserved after the first novelty | Remains unchanged while consecutive ready novelties emit; clears when that regular emits or becomes ineligible |
| `noveltyReadyKiosks` | Readiness acknowledgements per novelty | FIFO head is ready only under the existing all-connected-kiosks rule |
| `noveltyDeferCounts` | Defer count per novelty | Increments only when the FIFO head is not ready; pruned on emit/discard |
| `noveltyBurstActive` | Whether the last emitted item was a novelty | Informational state maintained by `emit_top_content`; not a second source of ordering truth |

## State transitions

1. Ready FIFO head + no preserved regular: calculate and store the next regular, emit novelty, preserve cursor.
2. Ready FIFO head + preserved regular: emit novelty, retain the same preserved regular and cursor.
3. FIFO head not ready: apply existing defer/discard transition, then allow the preserved/next regular to emit.
4. No pending novelty: emit preserved regular first, clear its slot, and continue normal rotation.
