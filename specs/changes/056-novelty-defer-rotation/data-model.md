# Data Model: CHG-056 Novelty Defer Rotation

**Date**: 2026-08-07

## Persistent (PostgreSQL)

### `kiosk_display_configurations` — new column

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `novelty_max_defer_transitions` | `INTEGER NOT NULL` | `CHECK (value BETWEEN 1 AND 10)` | `3` |

Exposed on `GET/PUT /api/display/configuration` as `noveltyMaxDeferTransitions`.

---

## Server ephemeral (Redis orchestrator state)

### NoveltyDeferState (per orchestrator session)

| Field | Type | Notes |
|-------|------|-------|
| `noveltyDeferCounts` | `dict[str, int]` | Key = `contentId`; increments on each defer at boundary |
| `noveltyReadyKiosks` | `dict[str, list[str]]` | Key = `contentId`; values = kioskIds that posted `novelty_preload_ready` |
| `rescheduledRegularContentId` | `str \| null` | Single slot; emitted before next novelty/regular pick |

**Lifecycle**:

- `noveltyDeferCounts[id]` created at 0 when novelty enters eligible queue (or first defer).
- Increment on defer; cleared on emit or discard.
- `noveltyReadyKiosks[id]` cleared on emit/discard; kiosk removed from all lists on disconnect.
- `rescheduledRegularContentId` set when novelty emits; cleared after rescheduled emit.

### Connected kiosk set (derived, not stored)

Source: `DisplaySseHub` registrations for `(organizationId, operatorSessionId)`.

Readiness rule: `noveltyReadyKiosks[contentId]` ⊇ `{kioskId for each connected kiosk}`.

---

## SSE / API payloads

### KioskEventRequest — new type

| Field | Type | Required |
|-------|------|----------|
| `type` | `"novelty_preload_ready"` | yes |
| `kioskId` | UUID | yes |
| `contentId` | UUID | yes |

Response: `204 No Content` (idempotent).

### Snapshot `pendingNovelties` entry extension

| Field | Type | Notes |
|-------|------|-------|
| `contentId` | string | Existing |
| `mediaUrl` | string | Existing |
| `contentType` | string | Existing |
| `mediaVersion` | string | Existing |
| `isNovelty` | boolean | Always `true` |
| `deferCount` | number | **New** |
| `maxDefer` | number | **New** — from configuration |
| `downloadReady` | boolean | **New** — server aggregated readiness |

### RotationPlanSnapshot (internal/logging)

| Field | Type | Notes |
|-------|------|-------|
| `rescheduledRegular` | `ContentRef \| null` | **New** optional |
| `noveltyDeferCounts` | `dict[str, int]` | **New** optional in log payload |

---

## Client in-memory

### NoveltyQueueEntry extension

| Field | Type | Notes |
|-------|------|-------|
| `deferCount` | `number \| undefined` | From snapshot; optional in tracker |
| `maxDefer` | `number \| undefined` | From snapshot |

`downloadStatus` still driven locally by cache for icon check; server `downloadReady` used only for reconnect reconcile.

### DisplayContentGateService

| Rule | Behavior |
|------|----------|
| `reason === 'novelty'` | Commit immediately; no timeout |
| Other loop content | Unchanged CHG-050 gate |

### Kiosk ready reporter (new thin helper or in tracker)

Posts `novelty_preload_ready` when cache transitions to `ready` for each pending novelty `contentId` (dedupe per session).

---

## State machine — head novelty at rotation boundary

```text
PENDING_DOWNLOAD
  ├─(defer, count++)→ DEFERRED (regular emitted)
  ├─(all kiosks ready)→ READY_TO_EMIT
  └─(count >= max)→ DISCARDED (consume, no show)

READY_TO_EMIT
  └─(next boundary)→ EMITTED (+ rescheduled regular queued)

DEFERRED
  └─(still not ready at boundary)→ PENDING_DOWNLOAD or DISCARDED
```

---

## Admin content (`TopContentItem`)

No schema change. `is_novelty` cleared by existing `consume_novelty()` on:

- Successful novelty `show_content` emit (today)
- Max-defer discard (**new path**)
