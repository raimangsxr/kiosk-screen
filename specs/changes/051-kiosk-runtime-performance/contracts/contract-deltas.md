# Contract Deltas: CHG-051 Kiosk Runtime Performance

**Date**: 2026-08-06

Pre-implementation deltas to merge into active contracts before coding.

---

## DISPLAY.RUNTIME

### Adds

- **Bounded media retention**: `DisplayMediaCacheService` retains at most one
  visible top-content blob plus one preload blob; sponsor strip retains only
  URLs in the current visible window. Eviction calls `URL.revokeObjectURL`.
- **Video blur-fill (ADR-0007 amendment)**: Top-region **video** uses a single
  `<video>` element. The blurred backdrop is a CSS `background-image` sourced
  from a captured poster/frame (not a second `<video>`). Photo blur-fill may
  retain dual `<img>` layers.
- **SSE heartbeats**: Display stream keep-alives are SSE **comments** (`: ping`),
  not application JSON events. They MUST NOT update viewer state, advance
  sequence, or appear in client `lastEvent` / application event handling.
- **Reconnect auth**: On `EventSource` error, session verification (`GET
  /api/auth/me` via `AuthService.refresh`) is debounced (minimum 5 s between
  attempts) and single-flight (no overlapping calls).
- **Change detection**: `DisplayScreenComponent` uses `OnPush`; avoids full
  `detectChanges()` on every content tick.
- **`show_ads` dedupe**: Client ignores consecutive identical `show_ads`
  fingerprints (command id, start index, visible ad ids, border styling) for
  state updates and media warm — **server payload unchanged**.
- **Polling handoff**: When SSE reconnects after fallback polling, polling stops
  within one confirmation cycle; both channels MUST NOT run indefinitely.

### Preserves

- Server orchestration authority (CHG-041).
- SSE application event types and payloads (`show_content`, `show_ads`, etc.).
- Polling fallback after 60 s SSE outage.
- `POST /api/display/kiosk/events` for `video_ended` / `media_error`.
- Service worker bypass for SSE (`ngsw-bypass=true`).

### Owned paths (add)

- `frontend/src/app/display/display-media-cache.service.ts`
- `frontend/src/app/display/display-media-cache.service.spec.ts`

---

## DISPLAY.RUNTIME (backend surface)

### Adds

- Display SSE subscriber queue per connection: **FIFO max 64 events**,
  **drop-oldest** on overflow. Events discarded are not retransmitted.
- Display stream idle keep-alive: SSE comment ping (not `hub.publish` ping
  envelope).

### Preserves

- Redis replay buffer limits (100 events, 600 s TTL).
- Admin content stream ping style (already comment-based).

---

## CONTENT.ADS.ADMIN

### Adds

- Inventory SSE reconciliation: when multiple `content_inventory_changed` signals
  arrive within the debounce window, at most **one** `GET /content` silent
  refresh runs at a time; a newer signal **cancels** an in-flight refresh
  (switchMap semantics).

### Preserves

- SSE event types and payloads.
- Drag-deferred reconciliation (CHG-047).
- `now_playing_changed` behavior (CHG-048).

---

## Non-goals (explicit)

- Changing `show_ads` or `show_content` SSE JSON schema.
- Bounded server queue on admin content stream.
- Replacing server-side orchestration or reintroducing client rotation timers.
- Zoneless Angular migration.
