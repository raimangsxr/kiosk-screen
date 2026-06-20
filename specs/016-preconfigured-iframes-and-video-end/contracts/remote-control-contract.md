# Contract: Remote Control with Iframe Selection

**Date**: 2026-06-20
**Spec**: [spec.md](../spec.md)

This contract supersedes the iframe-related parts of `specs/006-remote-control-display/contracts/backend-contract.md` for this feature. The other remote-control semantics (loop mode, ads visible, polling interval, last-valid-change-wins) remain as documented in spec 006.

## `RemoteControlState`

The remote control state returned by the admin endpoints now references an `Iframe` (not a `TopContentItem`).

```jsonc
{
  "contentMode": "loop" | "iframe",
  "selectedIframeId": "uuid | null",
  "adsVisible": true,
  "updatedAt": "2026-06-20T10:00:00Z",
  "displaySessionActive": true
}
```

`selectedContentId` is removed; `selectedIframeId` is added. The `contentMode='iframe'` invariant requires `selectedIframeId` to be non-null and to reference a row in `iframes` (filtered by the caller's organization).

## Endpoints

### `GET /api/display/remote-control/state`

Returns the current remote control state for the caller's organization.

- **Auth**: `event_operator` or `administrator` (per spec 006).
- **Response 200**: `RemoteControlAdminStateSchema` extended with `selectedIframe: Iframe | null` (the hydrated iframe row, for UI convenience).
- **Response 200 when no display session is active**: `displaySessionActive: false`; `contentMode` and `selectedIframeId` are `null` or absent.

### `PUT /api/display/remote-control/state`

Updates the remote control state.

- **Auth**: `event_operator` or `administrator` (FR-024).
- **Request body**:
  ```jsonc
  {
    "contentMode": "loop" | "iframe",
    "selectedIframeId": "uuid | null",   // required when contentMode='iframe'
    "adsVisible": true | false
  }
  ```
- **Response 200**: updated `RemoteControlAdminStateSchema`.
- **Response 400**: `{ "code": "invalid_remote_control_state", "message": "..." }` (e.g., `contentMode='iframe'` with `selectedIframeId=null`, or vice versa).
- **Response 404**: `{ "code": "iframe_not_found", ... }` (the `selectedIframeId` does not exist in the caller's organization).
- **Response 409**: `{ "code": "no_active_display_session", ... }` (the kiosk is not open).

### `GET /api/display/remote-control/iframe-options`

Lists the iframes available to pin in the current caller's organization.

- **Auth**: `event_operator` or `administrator`.
- **Response 200**: `{ "items": [Iframe, ...] }` (same shape as the admin list, but consumed by the remote control panel).
- **Empty**: `{ "items": [] }`; the UI shows the empty-state CTA linking to `/admin/iframes/new` (FR-016).

## Invariants

- `contentMode='iframe'` ↔ `selectedIframeId IS NOT NULL`.
- `contentMode='loop'` ↔ `selectedIframeId IS NULL`.
- `last valid change wins` is preserved from spec 006.
- The kiosk polls `GET /api/display/state` (not this admin endpoint); the public DTO carries the iframe selection in a different shape (see [kiosk-render-contract.md](./kiosk-render-contract.md)).
