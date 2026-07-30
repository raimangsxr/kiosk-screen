# Data Model: Admin Content List Live Updates (CHG-047)

**Date**: 2026-07-30

## Persistent entities (unchanged)

No schema migrations. Authoritative inventory remains `content_items` (and related media) in PostgreSQL.

| Entity | Key fields used by list | Notes |
|--------|-------------------------|-------|
| `ContentItem` | `id`, `title`, `contentType`, `displayOrder`, `isActive`, `isNovelty`, rotation fields | `isNovelty` cleared by orchestrator on consume (CHG-027) |

## Ephemeral runtime entities (new)

### AdminContentStreamSubscriber

In-memory per backend replica.

| Field | Type | Description |
|-------|------|-------------|
| `connectionId` | UUID string | Unique SSE connection |
| `organizationId` | string | Tenant scope |
| `userId` | string | Operator identity (audit/debug) |
| `events` | `queue.Queue` | Outbound SSE envelopes |

**Uniqueness**: Many subscribers per `organizationId` (multiple tabs/operators).

### AdminContentStreamEvent (SSE envelope)

| Field | Type | Description |
|-------|------|-------------|
| `v` | `1` | Protocol version |
| `type` | `"content_inventory_changed"` | Only event type in v1 |
| `at` | ISO-8601 UTC | Server timestamp |
| `reason` | string? | Optional: `mutation`, `novelty_consumed`, `reconnect_hint` |

**Intentionally omitted**: item ids, counts, or full list — client reconciles via `GET /api/content`.

### Redis fan-out message

| Field | Type | Description |
|-------|------|-------------|
| `organizationId` | string | Routing key |
| `replicaId` | string | Origin replica (ignore self-echo) |
| `envelope` | `AdminContentStreamEvent` | Payload |

Channel: `pubsub:org:{organizationId}:admin-content`

## State transitions (client)

```text
[idle] --navigate to /admin/content--> [connecting]
[connecting] --EventSource open--> [connected]
[connected] --content_inventory_changed--> [debouncing 1s] --timer--> [refreshing] --GET ok--> [connected]
[connected] --drag active--> [connected, refresh deferred]
[connected] --error--> [reconnecting]
[reconnecting] --open--> [connected]
[reconnecting] --30s elapsed--> [stale_visible]
[any] --navigate away--> [disconnected]
```

## Validation rules

- Stream open only for authenticated users with `CONTENT_MANAGEMENT_ROLES`.
- `organizationId` on connection MUST match session org (no cross-tenant subscribe).
- Publish MUST NOT include PII or media URLs in SSE payload.
- Debounce window: 1000 ms ± implementation jitter; single refresh per window.
- While `cdkDrag` drag is active, queued refresh runs once on `cdkDragEnded`.

## Frontend view state (unchanged + additive)

Existing `ContentListComponent` signals (`pageIndex`, `pageSize`, `noveltyFilterOnly`, `selection`) preserved across `facade.refresh()`.

| New signal | Purpose |
|------------|---------|
| `streamStale` | `true` when disconnected &gt;30 s |
| `dragActive` | Suppresses remote refresh until drop |

### Silent refresh contract

`ContentFacade.refresh({ silent?: boolean })`:

- `silent: false` (default): sets `loadingState` — used for initial load and **Actualizar**.
- `silent: true`: updates `itemsState` without toggling `loading` — used for SSE and reconnect reconcile (FR-016).
- No-op while `saving()` is true.
