# Contract: Display Control State (`GET /api/display/state` and `PUT /api/display/remote-control`)

**Branch**: `018-content-rotation-modes` | **Date**: 2026-06-22

This contract documents the **delta** on display-control state for spec 018. Two endpoints are affected: `GET /api/display/state` (read; extended payload) and `PUT /api/display/remote-control` (write; new mode + new target field).

## 1. `GET /api/display/state` — extended payload

The `remoteControl` block is extended with one new field and the `contentMode` enum gains a new value. A new top-level block `fixedEligibleContentIds` is added.

### `remoteControl` (extended)

```jsonc
{
  // ... existing fields unchanged ...
  "contentMode": "loop" | "iframe" | "fixed",   // new value: "fixed"
  "selectedIframeId": 7,                       // unchanged; null unless contentMode==='iframe'
  "selectedFixedContentId": 42,                // NEW; null unless contentMode==='fixed'
  "adsVisible": true,                          // unchanged
  "fullscreenRequested": false,                // unchanged
  "navigationCommand": "next",                 // unchanged
  "navigationCommandId": "uuid-..."            // unchanged
}
```

### `fixedEligibleContentIds` (new block)

A top-level array of Contents that have `is_fixed=true`. Used by the remote-control UI to populate the "Fixed mode" dropdown. The array is sorted by `displayOrder` ascending.

```json
[
  {
    "id": 42,
    "name": "Patrocinador principal",
    "mediaUrl": "/api/media/abc-123",
    "thumbnailUrl": "/api/media/abc-123",
    "contentType": "photo",
    "durationSeconds": null
  },
  {
    "id": 17,
    "name": "Siguiente charla",
    "mediaUrl": "/api/media/def-456",
    "thumbnailUrl": null,
    "contentType": "video",
    "durationSeconds": 30
  }
]
```

When the array is empty, the remote-control UI disables the "Fixed" mode option (FR-022).

## 2. `PUT /api/display/remote-control` — write; new mode and target

### Request body (extended)

```jsonc
{
  "contentMode": "loop" | "iframe" | "fixed",    // extended
  "selectedIframeId": 7 | null,                  // unchanged
  "selectedFixedContentId": 42 | null,           // NEW
  "adsVisible": true,                            // unchanged
  "fullscreenRequested": false                   // unchanged
}
```

Only one of `selectedIframeId` and `selectedFixedContentId` may be non-null at a time. If both are non-null, the API returns HTTP 400 with `code: "ambiguous_target"` and message `"Solo puede haber un destino seleccionado (iframe o fixed)."`.

### Validation rules (delta)

| Case | Response |
|---|---|
| `contentMode='fixed'` and `selectedFixedContentId=null` | HTTP 400, `code: "fixed_requires_target"`, message `"Selecciona un Content fijo."`. |
| `contentMode='fixed'` and `selectedFixedContentId` points to a Content with `is_fixed=false` | HTTP 400, `code: "target_not_fixed"`, message `"El Content seleccionado no está marcado como fijo."`. |
| `contentMode='fixed'` and `selectedFixedContentId` does not exist | HTTP 404. |
| `contentMode='loop'` or `'iframe'` and `selectedFixedContentId` is non-null | HTTP 400, `code: "fixed_target_in_non_fixed_mode"`, message `"selectedFixedContentId solo es válido en modo 'fixed'."`. |
| `contentMode` not in `{'loop','iframe','fixed'}` | HTTP 400, `code: "invalid_content_mode"`. |

### Persistence invariants

After a successful PUT, the database enforces:
- `content_mode IN ('loop','iframe','fixed')` (CHECK widened)
- `selected_fixed_content_id IS NOT NULL => content_mode='fixed'` (new CHECK)
- The target Content has `is_fixed=true` (validated at PUT time, not re-checked at read time, but enforced via FK + business logic)

### Audit events emitted

- `display_control_fixed_changed` — when transitioning INTO `fixed` mode OR when changing `selectedFixedContentId` while already in `fixed`. Payload: `{ organizationId, userId, previousContentMode, newContentMode, previousSelectedFixedContentId, newSelectedFixedContentId }`.
- No event for `loop` ↔ `iframe` transitions (already covered by the existing audit pattern).

## 3. Auto-fallback when fixed target is deleted

If the operator deletes the Content currently selected as `selectedFixedContentId`, the FK `ON DELETE SET NULL` cascades; the row in `display_control_states` becomes `selected_fixed_content_id=NULL` AND `content_mode='fixed'`. The application layer detects this on the next read and:

1. Emits an audit event `display_control_fixed_changed` with `newContentMode='loop'` and `newSelectedFixedContentId=null`.
2. Updates the row to `content_mode='loop'`, `selected_fixed_content_id=NULL`.
3. The kiosk's next poll sees the new state and renders `loop` mode.

This implements FR-024 (kiosk returns to `loop` automatically when fixed target disappears, preserving the loop index).

## 4. Backwards compatibility

- `contentMode='loop'` and `contentMode='iframe'` clients see no change.
- Clients that ignore the new `selectedFixedContentId` field in the response simply never set it; no error.
- Clients that ignore the new `fixedEligibleContentIds` block see an additional top-level array in the response; their existing JSON parsers tolerate unknown fields (standard behaviour).