# Contract deltas: CHG-056 Novelty Defer Rotation

**Date**: 2026-08-07  
**Apply to active contracts before implementation**

## CONTENT.ROTATION

### Remove / replace

- Novelty intercept at loop boundary **always consumes and emits immediately** on next advance.
- First `media_error` advancing rotation when caused by novelty gate timeout (novelty path removed from client gate).

### Add

- **Defer-first novelty emission**: At loop boundary, if head novelty is not ready for all connected kiosks, orchestrator emits next regular/recurring item and increments per-novelty `deferCount` (max from configuration).
- **Ready aggregation**: Kiosk `novelty_preload_ready` events; novelty eligible when every **currently connected** kiosk has reported for that `contentId`.
- **Rescheduled regular slot**: When novelty emits, displaced regular item stored in `rescheduledRegularContentId` and shown on the following boundary before normal cursor advance.
- **Discard**: When `deferCount >= noveltyMaxDeferTransitions` without readiness, `consume_novelty` without `show_content`.
- **Snapshot**: `pendingNovelties[]` includes `deferCount`, `maxDefer`, `downloadReady`.
- **Logging**: `rotation_plan` / `rotation_replan` include defer counts and rescheduled regular when present.

### Unchanged

- FIFO novelty order; preload on queue change; `pendingNovelties` on snapshot; recurring cadence rules; pause/fixed/iframe inactivity.

---

## DISPLAY.RUNTIME

### Remove / replace

- Display content gate applies to novelty `show_content` (hold until local ready).

### Add

- **Gate bypass** for `show_content` with `reason: "novelty"` — commit immediately.
- Kiosk posts `novelty_preload_ready` after local cache ready for each pending novelty.
- On reconnect, tracker rebuilds defer metadata from snapshot `pendingNovelties` enriched fields.
- Indicator: check still reflects local cache ready; icon removed on novelty commit **or** server-side discard (id absent from pending set).

### Unchanged

- Regular content gate (latest wins, 30 s timeout, `media_error`).
- Novelty indicator layout (5 + N, error overlay).
- Preload warm for novelties; inactivity in pause/fixed/iframe.

---

## DISPLAY.CONFIG_SESSION

### Add

- Field `noveltyMaxDeferTransitions` (int, default 3, range 1–10) on configuration GET/PUT.
- Admin form control on `/admin/configuration` with validation.
- Propagation via `config_updated` SSE (same as other configuration fields).

---

## CONTENT.ADS.ADMIN

### Add

- Document that max-defer discard clears `isNovelty` via orchestrator consume (same admin list/SSE refresh as post-emit consume).

### Unchanged

- «Nov.» chip, Solo novedades filter, emission styling rules.

---

## Terminology (cross-layer)

| Layer | Name | Notes |
|-------|------|-------|
| PostgreSQL | `novelty_max_defer_transitions` | snake_case column |
| REST API | `noveltyMaxDeferTransitions` | camelCase configuration field |
| Snapshot SSE | `maxDefer`, `deferCount` | per pending novelty entry |
| Orchestrator Redis | `noveltyDeferCounts`, `noveltyReadyKiosks` | keyed by `contentId` |

## Manifest

Add `CHG-056` to `related_changes` for:

- `CONTENT.ROTATION`
- `DISPLAY.RUNTIME`
- `DISPLAY.CONFIG_SESSION`
- `CONTENT.ADS.ADMIN`

Set change status `in-progress` when implementation starts.
