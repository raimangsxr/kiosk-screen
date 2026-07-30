# Data Model: CHG-048 Content Now Playing & Rotation Logging

**Date**: 2026-07-30

## Runtime entities (no new DB tables)

### NowPlayingState

Authoritative per active orchestrator session (Redis orchestrator key).

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `contentId` | UUID \| null | `currentTopContentId` in orchestrator state | null when top zone not showing loop content |
| `title` | string \| null | Resolved from `TopContentItem` when id set | For off-page admin hint |
| `emittedAt` | ISO-8601 | Server clock at publish | SSE payload `at` |

**Transitions**:
- `null → id` on first `emit_top_content` after bootstrap
- `id → id'` on rotation advance, novelty consume, remote jump
- `id → null` on mode change away from top content display
- **Replay** on admin stream connect: current state sent as `now_playing_changed` without advancing orchestrator

---

### RotationPlanSnapshot

Derived read-only view at a point in time (not persisted).

| Field | Type | Description |
|-------|------|-------------|
| `showing` | `ContentRef \| null` | Currently on air (`id`, `title`) |
| `next` | `ContentRef \| null` | Next item orchestrator would emit if advanced now |
| `novelties` | `ContentRef[]` | Pending novelty queue ordered by `display_order` |
| `reason` | string | Orchestrator reason code (e.g. `rotation_advance`, `public_upload_replan`) |

**ContentRef**:

```json
{ "id": "uuid", "title": "string" }
```

---

### RotationLogEntry

Structured log record (stdout / aggregator).

| Field | Type | Required |
|-------|------|----------|
| `event` | `"rotation_plan"` \| `"rotation_replan"` | yes |
| `organizationId` | UUID string | yes |
| `operatorSessionId` | UUID string | yes |
| `showing` | ContentRef \| null | yes |
| `next` | ContentRef \| null | yes |
| `novelties` | array of id strings | yes (may be empty) |
| `reason` | string | yes |

**Level**: INFO (production).

---

## SSE envelope extension (admin content stream v1)

### `now_playing_changed`

```json
{
  "v": 1,
  "type": "now_playing_changed",
  "at": "2026-07-30T10:15:00.123Z",
  "contentId": "uuid-or-null",
  "title": "optional when contentId set"
}
```

Published via existing Redis channel `pubsub:org:{orgId}:admin-content`.

---

## Frontend local state

### ContentListComponent

| Signal | Type | Updated by |
|--------|------|------------|
| `nowPlayingContentId` | `string \| null` | `AdminContentStreamService` on `now_playing_changed` |
| `nowPlayingTitle` | `string \| null` | same event payload |

Derived:
- `isNowPlaying(item)` → `item.id === nowPlayingContentId()`
- `showOffPageHint()` → id set and not in `visibleItems()`

---

## Validation rules

- At most one row/card has `content-list__row--on-air` at a time.
- `nowPlayingContentId` must match orchestrator `currentTopContentId` after event processing.
- Log `novelties` ids must match `novelty_queue(eligible)` order at snapshot time.
- When `contentId` is null in SSE, all on-air styles and hints cleared.
