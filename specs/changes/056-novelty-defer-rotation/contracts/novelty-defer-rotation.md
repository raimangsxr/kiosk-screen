# Interface contract: Novelty defer rotation (CHG-056)

**Date**: 2026-08-07  
**Status**: Draft (pre-implementation)

## Kiosk → server events

### `POST /api/display/kiosk/events`

#### `novelty_preload_ready` (new)

**When**: Local `DisplayMediaCacheService` reports ready for a pending novelty URL.

**Body**:

```json
{
  "type": "novelty_preload_ready",
  "kioskId": "uuid",
  "contentId": "uuid"
}
```

**Server behavior**:

- Idempotent per `(contentId, kioskId)` per session.
- Updates `noveltyReadyKiosks[contentId]`.
- If all connected kiosks now ready, may update snapshot/replan log; does **not** emit `show_content` until next rotation boundary.
- On kiosk disconnect, remove kioskId from all ready sets.

**Errors**: Same as existing kiosk events (`404 kiosk_not_found`, `409 orchestrator_not_active`).

---

## Server → kiosk SSE

### `show_content` (novelty)

- `reason` MUST be `"novelty"` when defer logic emits a ready novelty.
- Kiosk MUST commit without display gate wait.

### `snapshot.pendingNovelties[]` (extended)

Each item:

| Field | Type | Required |
|-------|------|----------|
| `contentId` | string | yes |
| `mediaUrl` | string | yes |
| `contentType` | `"image"` \| `"video"` | yes |
| `mediaVersion` | string | yes |
| `isNovelty` | boolean | yes (`true`) |
| `deferCount` | number | yes |
| `maxDefer` | number | yes |
| `downloadReady` | boolean | yes |

### `preload` (unchanged wrapper)

Novelty items still include `isNovelty: true`. Defer counts come from snapshot on reconnect; preload events may omit defer fields (tracker merges from last snapshot).

---

## Configuration API

### `GET/PUT /api/display/configuration`

**New field**: `noveltyMaxDeferTransitions: number` (1–10, default 3).

Spanish admin label (suggested): **Máximo de aplazamientos de novedad**.

Help text: número de transiciones de rotación que una novedad puede esperar sin descargarse antes de descartarse.

---

## Orchestrator advance outcomes (loop mode)

At each top timer boundary:

| Condition | Action |
|-----------|--------|
| `rescheduledRegularContentId` set | Emit that regular item; clear slot |
| Head novelty ready | Emit novelty; set rescheduled regular; consume |
| Head novelty not ready, `defer < max` | Increment defer; emit regular/recurring per existing rules |
| Head novelty not ready, `defer >= max` | Consume novelty (discard); emit regular/recurring |

---

## Multi-kiosk sync rules

1. All connected kiosks receive identical `show_content` / defer decisions.
2. Readiness = ∀ connected kiosk ∈ `noveltyReadyKiosks[contentId]`.
3. Disconnected kiosks excluded from connected set immediately.
4. Reconnecting kiosk: receives snapshot; posts ready for cached novelties; does not force replay of missed novelties that were already consumed/discarded.
