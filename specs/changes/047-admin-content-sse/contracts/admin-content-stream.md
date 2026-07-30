# Admin Content Inventory SSE (CHG-047)

**Version**: `1`  
**Transport**: `GET /api/admin/content/stream`  
**Content-Type**: `text/event-stream`  
**Precedent**: `docs/adr/0009-display-orchestration-sse.md`, CHG-041 display stream

## Connection lifecycle

### 1. Open stream (content list page)

```http
GET /api/admin/content/stream
Accept: text/event-stream
Cookie: <session>
```

**Rules**:

- Requires authenticated operator with `CONTENT_MANAGEMENT_ROLES`.
- Scoped to operator's `organizationId`.
- Client opens connection only while `/admin/content` list is mounted; closes on navigate away.
- `EventSource` MUST use `{ withCredentials: true }`.

**Response**: `200 text/event-stream` with periodic comment pings (≤30 s) to keep connection alive.

### 2. Reconnect

Browser `EventSource` auto-reconnects on transient errors. Client SHOULD call `GET /api/content` once on reconnect open to reconcile missed changes (no `Last-Event-ID` replay required in v1).

### 3. Auth failure

`401` / `403` on stream: client closes `EventSource` and routes to existing login flow (same as other admin APIs).

---

## Events

### `content_inventory_changed`

Emitted when top content inventory may have changed for the organization.

**SSE framing**:

```text
event: content_inventory_changed
data: {"v":1,"type":"content_inventory_changed","at":"2026-07-30T10:15:00.123Z","reason":"mutation"}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `v` | int | yes | Protocol version (`1`) |
| `type` | string | yes | Always `content_inventory_changed` |
| `at` | string | yes | ISO-8601 UTC timestamp |
| `reason` | string | no | `mutation` \| `novelty_consumed` |

**Client behavior**:

1. Coalesce events within ~1 s debounce window.
2. Unless drag-and-drop reorder is active, call `GET /api/content` via `refresh({ silent: true })` to reconcile.
3. If drag active, defer reconcile until row dropped.
4. Do not show toast/banner/skeleton on success.
5. Skip silent refresh while `saving()` is active.

---

## Server publish triggers

| Source | `reason` |
|--------|----------|
| Admin content CRUD, reorder, upload | `mutation` |
| Public API content upload | `mutation` |
| Orchestrator novelty consume (`is_novelty → false`) | `novelty_consumed` |

**Note**: Ads mutations today call `notify_content_mutated`; publishing admin inventory changed is harmless (clients refresh same list). Optional future optimization: narrow hook to content-only paths.

---

## Multi-replica fan-out

Publishers emit to Redis `pubsub:org:{organizationId}:admin-content`. Each replica forwards to local subscribers for that org.

---

## Non-goals (v1)

- Per-item deltas in SSE payload
- `Last-Event-ID` replay buffer
- Stream open on non-content admin routes
- Ads list notifications
