# Contract Delta: Display Preload SSE (CHG-050)

Merge into `specs/contracts/content-rotation/contract.md` before implementation.

## `preload` event

**When emitted**

- On novelty queue change while orchestrator active in loop (not paused): public upload, admin mutation affecting `isNovelty` queue, orchestrator bootstrap/reconnect backfill.
- After each top-content emit in loop: include next **regular** planned item (when next slot is not consumed by pending novelty).

**Payload** (`PreloadPayload`)

```json
{
  "items": [
    {
      "contentId": "uuid",
      "mediaUrl": "https://…",
      "contentType": "image|video",
      "mediaVersion": "uuid",
      "isNovelty": true
    }
  ],
  "leadTimeSeconds": 5
}
```

- `isNovelty` is **required** on each item.
- Novelty items: all pending novelties in `displayOrder`.
- Regular item: at most one — next planned regular when applicable.

**Not emitted** when `contentMode` is fixed/iframe or loop is paused (CHG-027 unchanged).

## `snapshot` event extension

Add field:

```json
{
  "pendingNovelties": [ /* same PreloadItem shape, isNovelty: true */ ]
}
```

Populated from `compute_rotation_plan_snapshot().novelties` on SSE connect / replay fallback.

## `media_error` kiosk event → orchestrator

- First `media_error` per `commandId` advances top rotation (`advance_top`, reason `media_error`) and emits next `show_content` to all kiosks.
- Subsequent `media_error` for same `commandId` ignored (dedupe via `processedKioskEvents`).
- Audit event `media_error` retained.

## Non-goals

- Server waits for kiosk “ready” ack before emit.
- Preload for sponsor ads.
