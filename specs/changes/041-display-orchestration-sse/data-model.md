# Data Model: CHG-041 Display Orchestration

## New persistent entities

### `kiosk_connections` (PostgreSQL, optional audit trail)

Lightweight registry for ops visibility. Hot path uses Redis; this table is
optional for Phase 2+.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | `kioskId` returned from register |
| `organization_id` | UUID FK | |
| `operator_session_id` | UUID FK | |
| `client_instance_id` | VARCHAR(64) | Browser-stable id |
| `label` | VARCHAR(80) NULL | Operator-friendly name |
| `connected_at` | TIMESTAMPTZ | |
| `disconnected_at` | TIMESTAMPTZ NULL | |
| `last_heartbeat_at` | TIMESTAMPTZ NULL | |

### Redis keys

| Key pattern | TTL | Contents |
|---|---|---|
| `orchestrator:{orgId}:{sessionId}` | Session + 1h | State machine JSON (see orchestrator doc) |
| `sse:buffer:{orgId}:{sessionId}` | 10 min | List of last N SSE envelopes |
| `sse:kiosk:{kioskId}` | 24h | `{ replicaId, connectionId, clientInstanceId }` |
| `pubsub:org:{orgId}:display` | n/a | Fan-out channel |

## Deprecated fields

| Entity | Field | Replacement |
|---|---|---|
| `kiosk_display_configurations` | `remote_control_polling_seconds` | SSE reconnect + heartbeat policy (Phase 4 removal) |

## Unchanged entities (read by orchestrator)

- `kiosk_display_configurations`
- `top_content_items`
- `client_ad_items`
- `display_control_states`
- `operator_sessions`
- `iframes`

## Sequence ownership

`orchestrator:{orgId}:{sessionId}.sequence` increments on every SSE event
emitted for that session. Copied to SSE `id:` field.

## Command ID format

```
cmd-{YYYYMMDD}-{sequence:06d}
```

Example: `cmd-20260708-000042`

Unique per session; used for idempotent kiosk events and audit correlation.
