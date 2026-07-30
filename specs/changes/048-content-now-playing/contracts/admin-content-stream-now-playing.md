# Admin Content Stream — `now_playing_changed` (CHG-048)

**Extends**: [047 admin-content-stream.md](../../047-admin-content-sse/contracts/admin-content-stream.md)  
**Transport**: `GET /api/admin/content/stream` (unchanged URL)

## Auth change (CHG-048)

Stream requires **authenticated user** (`get_current_user`), same as `GET /api/content` list.  
`event_operator` and other read roles MAY subscribe; write operations remain role-gated elsewhere.

`403` only when user lacks org membership / session invalid (same as other authenticated APIs).

---

## Event: `now_playing_changed`

Emitted when the authoritative top-content item on displays changes, or when top content stops being shown.

**SSE framing**:

```text
event: now_playing_changed
data: {"v":1,"type":"now_playing_changed","at":"2026-07-30T10:15:00.123Z","contentId":"…","title":"Agenda"}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `v` | int | yes | Protocol version (`1`) |
| `type` | string | yes | Always `now_playing_changed` |
| `at` | string | yes | ISO-8601 UTC |
| `contentId` | string \| null | yes | Top content on air; `null` clears highlight |
| `title` | string | no | Admin title when `contentId` set (for off-page hint) |

**Client behavior**:

1. Update local `nowPlayingContentId` / title from payload (no full list fetch).
2. Apply `content-list__row--on-air` to matching row/card.
3. When `contentId` is `null`, remove all on-air styles and off-page hint.
4. Do not debounce with inventory refresh (immediate UI update).
5. On **initial connect and reconnect**, the server MUST send one `now_playing_changed` replay with the current orchestrator state (`contentId` + `title`, or `contentId: null` when no top content on air). The client applies it like any other `now_playing_changed` event; no separate snapshot endpoint is required.

---

## Server publish triggers

| Source | `contentId` |
|--------|-------------|
| `emit_top_content` (rotation, novelty, remote, bootstrap) | emitted item id |
| `mode_changed` away from top loop content (ads, etc.) | `null` |
| Admin stream subscribe (connect/reconnect) | replay current `contentId` or `null` |
| Orchestrator stop / no active session | replay `contentId: null` on connect; no event while disconnected |

**Note**: `content_inventory_changed` remains for inventory mutations; rotation-only advances do **not** require inventory refresh.

---

## Non-goals

- Per-kiosk now playing (session is org-scoped, all kiosks synchronized)
- Historical now-playing replay buffer
