# Contract: Audit Events for Display Control and Content Rotation

**Branch**: `018-content-rotation-modes` | **Date**: 2026-06-22

This contract documents the **5 new audit events** introduced by spec 018. They follow the existing `audit_event` table schema (no schema change). Each event is emitted through the existing `audit_service.create_event(...)` helper and is visible in the admin events listing at `/admin/events`.

## 1. Event: `display_control_paused`

| Field | Value |
|---|---|
| `eventType` | `display_control_paused` |
| Trigger | Successful `POST /api/display/remote-control/navigation` with `command='pause'` |
| `organizationId` | From session |
| `userId` | From session |
| `payload` | `{ "contentMode": "loop" }` |

## 2. Event: `display_control_resumed`

| Field | Value |
|---|---|
| `eventType` | `display_control_resumed` |
| Trigger | Successful `POST /api/display/remote-control/navigation` with `command='resume'` |
| `organizationId` | From session |
| `userId` | From session |
| `payload` | `{ "contentMode": "loop" }` |

## 3. Event: `display_control_fixed_changed`

| Field | Value |
|---|---|
| `eventType` | `display_control_fixed_changed` |
| Trigger | Successful `PUT /api/display/remote-control` where (a) `contentMode` transitions TO `'fixed'` OR (b) `selectedFixedContentId` changes while `contentMode='fixed'` |
| `organizationId` | From session |
| `userId` | From session |
| `payload` | `{ "previousContentMode": "loop" \| "iframe" \| "fixed", "newContentMode": "fixed", "previousSelectedFixedContentId": int \| null, "newSelectedFixedContentId": int \| null }` |

Also emitted by the auto-fallback path (§3 of `display-control-state.md`) when the fixed target is deleted; in that case `userId` is `null` (system-initiated) and `previousContentMode='fixed'`, `newContentMode='loop'`.

## 4. Event: `content_rotation_empty`

| Field | Value |
|---|---|
| `eventType` | `content_rotation_empty` |
| Trigger | Kiosk detects that its content queue is empty (no Contents, all paused, or only recursives with `everyXIterations=0` after filter); debounced 60 s |
| `organizationId` | From kiosk config |
| `userId` | `null` (kiosk-initiated) |
| `payload` | `{ "reason": "no_contents" \| "only_recurring_filtered" \| "all_paused" }` |

This event is emitted from the FRONTEND (kiosk). The browser console logs it as `console.warn('content_rotation_empty', payload)` and sends a POST to a new lightweight endpoint `POST /api/display/rotation-event` (registered in this spec) which writes to `audit_event`.

## 5. Event: `content_type_autodetected`

| Field | Value |
|---|---|
| `eventType` | `content_type_autodetected` |
| Trigger | Upload (admin OR public) where `contentType` was missing OR the extension overrode the explicit value |
| `organizationId` | From session / API key |
| `userId` | From session (null for public API) |
| `payload` | `{ "filename": "image.mp4", "extension": ".mp4", "detectedContentType": "video", "requestedContentType": "photo" \| null, "source": "admin" \| "public" }` |

## 6. Audit endpoint for kiosk-initiated events (NEW)

`POST /api/display/rotation-event` (NEW; registered in this spec):

```jsonc
{
  "eventType": "content_rotation_empty",
  "payload": {
    "reason": "no_contents"
  }
}
```

- **Authentication**: kiosk session token OR a new lightweight kiosk-only token (decision deferred to plan; for now reuses the existing operator session token if present).
- **Authorisation**: kiosk-only; rejects if called from a browser session without the kiosk role.
- **Validation**: `eventType` must be in `{content_rotation_empty}` (extensible list); payload schema is event-specific.

This is the **only new endpoint** in spec 018.

## 7. Backwards compatibility

- Existing `audit_event` readers ignore unknown `eventType` values.
- The admin events listing already shows all event types; the new ones appear automatically.