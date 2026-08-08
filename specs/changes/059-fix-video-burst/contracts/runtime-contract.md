# Runtime Contract Delta

## Unchanged public interfaces

- `show_content`, `preload`, and `snapshot` SSE payloads are unchanged.
- `POST /api/display/kiosk/events` retains the existing `media_error` payload.
- Server-owned rotation timers and command deduplication remain unchanged.

## Client invariants

1. No more than three media fetch/probe operations may be active across all callers.
2. Requests for the same URL share queued or active work.
3. At most two top-content Blob URLs are retained: visible plus one preload.
4. Successful non-retained preparations revoke their Blob URL but may retain logical readiness.
5. A `show_content` command is not committed without a valid presentation URL when it references media.
6. A failed URL becomes eligible for a later retry after cooldown.
7. Each video command owns a fresh media element and may report at most one visible playback error.
8. A stale element cannot report an error against a newer command.

## Compatibility

No backend or external client changes are required.
