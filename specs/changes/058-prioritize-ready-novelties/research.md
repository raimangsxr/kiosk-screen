# Research: Priorizar novedades descargadas

## Decision 1: Reuse the preserved regular slot

**Decision**: Keep `rescheduledRegularContentId`, but evaluate a ready FIFO novelty before consuming that slot on every loop boundary.

**Rationale**: The stored id already represents the next regular content displaced by the first novelty. Leaving it untouched across later novelty emits preserves the cursor and produces `1,6,7,8,2` with a minimal state transition change.

**Alternatives considered**:

- Remove `rescheduledRegularContentId`: broader state and compatibility cleanup with no user-facing benefit.
- Add a new novelty burst queue: duplicates the authoritative `isNovelty` FIFO queue and creates synchronization risk.

## Decision 2: Keep FIFO blocking semantics

**Decision**: Only the queue head can emit. A ready later novelty does not overtake a not-ready head.

**Rationale**: This preserves CHG-056 ordering, defer counters, and predictability while satisfying the requested ready burst when consecutive heads are downloaded.

**Alternatives considered**:

- Select any ready novelty: violates the active FIFO contract and would require defining overtaking behavior.

## Decision 3: Planner mirrors execution ordering

**Decision**: `_pick_planned_next()` checks the ready novelty head before `rescheduledRegularContentId`.

**Rationale**: `rotation_plan` and `rotation_replan` must predict the same item that `advance_loop_top()` will emit without mutating state.

**Alternatives considered**:

- Change execution only: would leave misleading operational logs and violate FR-009.

## Decision 4: No public or persistent model change

**Decision**: Do not change frontend, API payloads, database schema, or ADRs.

**Rationale**: Existing readiness events and Redis fields carry all required information. This is a local ordering policy refinement, not a durable architectural decision.

**Alternatives considered**: New flags or API fields add compatibility cost without enabling additional behavior.
