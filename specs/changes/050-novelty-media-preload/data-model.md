# Data Model: CHG-050 Novelty Media Preload

**Date**: 2026-08-04

## Server-side (ephemeral — no new DB tables)

### PreloadItem (SSE `preload` payload element)

| Field | Type | Notes |
|-------|------|-------|
| `contentId` | string (UUID) | Top content id |
| `mediaUrl` | string | Public media reference URL |
| `contentType` | `"image"` \| `"video"` | Drives icon + ready probe |
| `mediaVersion` | string | Cache bust key (existing: content id) |
| `isNovelty` | boolean | **New** — `true` for novelty queue items |

### PreloadPayload (unchanged wrapper)

| Field | Type | Notes |
|-------|------|-------|
| `items` | PreloadItem[] | Novelties + optional next regular |
| `leadTimeSeconds` | number | Informational; server may keep 5 |

### SnapshotPayload extension

| Field | Type | Notes |
|-------|------|-------|
| `pendingNovelties` | PreloadItem[] | **New** — `isNovelty: true` only; ordered by `displayOrder` |

Source: `compute_rotation_plan_snapshot().novelties` → map to eligible `TopContentItem` rows.

### Orchestrator kiosk event dedupe (existing Redis state)

`processedKioskEvents` list — extend usage so `media_error` for same `commandId` is ignored after first advance (mirror `video_ended`).

---

## Client-side (in-memory)

### MediaCacheEntry (DisplayMediaCacheService)

| State | Meaning |
|-------|---------|
| `idle` | Not requested |
| `downloading` | `ensure()` in flight |
| `ready` | Blob URL + presentation probe passed |
| `failed` | Fetch or probe failed |

### PendingShowCommand (DisplayContentGateService)

| Field | Type | Notes |
|-------|------|-------|
| `payload` | `ShowContentPayload` | Latest `show_content` only |
| `requestedAt` | number | For 30 s timeout |
| `status` | `waiting` \| `committing` | |

**Transition**: `show_content` received → replace pending → wait ready → commit to viewer → clear pending.

### NoveltyQueueEntry (NoveltyQueueTrackerService)

| Field | Type | Notes |
|-------|------|-------|
| `contentId` | string | Unique in tracker |
| `contentType` | `image` \| `video` | Icon selection |
| `downloadStatus` | `pending` \| `ready` \| `error` | Maps to icon/check/error |
| `displayOrder` | number | Sort key |

**Lifecycle**:

1. Add on preload item (`isNovelty`) or snapshot `pendingNovelties`
2. `pending` → `ready` when cache ready
3. `pending` → `error` on cache failure
4. Remove on gate commit for that `contentId`, or when id absent from server pending set after replan/skip

### NoveltyQueueView (computed for template)

| Field | Type | Notes |
|-------|------|-------|
| `visibleIcons` | NoveltyQueueEntry[] | First 5 by `displayOrder` |
| `overflowCount` | number | `max(0, total - 5)` for "+N" |

---

## Validation rules

- Preload MUST NOT include ineligible or inactive content ids.
- Tracker MUST NOT show duplicate `contentId`.
- Indicator hidden when `visibleIcons.length === 0` and `overflowCount === 0`.
- Gate MUST NOT commit without `ready` unless bypass not allowed (no bypass in v1).

---

## Relationships

```text
notify_content_mutated / advance_loop_top
  → emit preload (novelties + next regular)
  → kiosk DisplayMediaCacheService (warm FIFO×3)
  → NoveltyQueueTracker (novelty subset)
  → DisplayContentGate (on show_content)
  → DisplayViewerController (committed content)
  → NoveltyQueueTracker remove on commit
```
