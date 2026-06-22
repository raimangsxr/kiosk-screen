# Contract: Display Control Navigation (`POST /api/display/remote-control/navigation`)

**Branch**: `018-content-rotation-modes` | **Date**: 2026-06-22

This contract documents the **delta** on display-control navigation for spec 018. The endpoint already accepts `next` and `previous`; this change adds `pause` and `resume` and tightens the mode-validation rules.

## 1. URL and auth (unchanged)

- **Method**: `POST`
- **Path**: `/api/display/remote-control/navigation`
- **Content-Type**: `application/json`
- **Authentication**: Session cookie required.
- **Authorisation**: Roles `administrator`, `content_manager`, `advertising_manager`, `event_operator`. (Same as existing `next` / `previous`.) Unauthenticated ⇒ HTTP 401. Other roles ⇒ HTTP 403.

## 2. Request body (extended)

```jsonc
{
  "command": "next" | "previous" | "pause" | "resume"  // extended
}
```

## 3. Validation rules (delta)

| Case | Response |
|---|---|
| `command` not in the allowed set | HTTP 400, `code: "invalid_navigation_command"`. |
| `command` ∈ `{next, previous, pause, resume}` AND `content_mode='loop'` | 200 OK (see §4). |
| `command='pause'` or `'resume'` AND `content_mode != 'loop'` | HTTP 409, `code: "pause_only_in_loop"`, message `"Pause/Resume solo es válido en modo rotación."`. |
| `command='next'` or `'previous'` AND `content_mode != 'loop'` | HTTP 409, `code: "navigation_only_in_loop"`, message `"Next/Previous solo es válido en modo rotación."`. (This rule pre-existed; it is now generalised to all four commands.) |

## 4. Successful write

Same shape as existing `next` / `previous` responses. The endpoint:
1. Validates the command against the current `content_mode` (see §3).
2. Assigns a fresh `navigationCommandId` (UUID4) to the row.
3. Sets `navigation_command` to the requested value.
4. Emits an audit event (see §5).
5. Returns `200 OK` with the updated `DisplayControlState`.

The kiosk polls `GET /api/display/state` and applies the command on `navigationCommandId` change (existing pattern).

## 5. Audit events emitted

| Trigger | Event | Payload |
|---|---|---|
| `command='pause'` | `display_control_paused` | `{ organizationId, userId, contentMode }` |
| `command='resume'` | `display_control_resumed` | `{ organizationId, userId, contentMode }` |
| `command='next'` | (existing) | unchanged |
| `command='previous'` | (existing) | unchanged |

## 6. Pause state lifecycle (client-only, documented for completeness)

Pause is NOT persisted in the database (TD-002). The backend only forwards the command. The kiosk applies it locally:
- On `pause`: cancel all timers (Content + Ads); if a `<video>` is playing, call `video.pause()`.
- On `resume`: re-arm timers from the current cursor; if the current item is a fixed video, `loop=true` keeps it playing; otherwise the timer fires after `effectiveDurationSeconds`.
- On mode change away from `loop` (to `iframe` or `fixed`): the kiosk discards the Pause state locally. Returning to `loop` starts in the unpaused state (FR-012a / Q4 answer).

## 7. Backwards compatibility

- Clients that only send `next` / `previous` see no change.
- The new validation rule (HTTP 409 for navigation in non-loop modes) is a **tightening** of an existing rule; previous responses were also 409 but with a generic message; the new message is more descriptive.