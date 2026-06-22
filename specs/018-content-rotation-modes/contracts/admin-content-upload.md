# Contract: Admin `POST /api/content/upload` (delta for 018)

**Branch**: `018-content-rotation-modes` | **Date**: 2026-06-22

This contract documents the **delta** on `POST /api/content/upload` introduced by spec 018. The endpoint already exists; this change adds two optional form fields (`isFixed`, `recurringEveryXIterations`) and changes the content-type determination rules. All existing fields and behaviours are preserved.

## 1. URL and auth (unchanged)

- **Method**: `POST`
- **Path**: `/api/content/upload`
- **Content-Type**: `multipart/form-data` (required; JSON bodies are rejected with HTTP 415)
- **Authentication**: Session cookie required (`withCredentials: true`)
- **Authorisation**: Roles `administrator`, `content_manager`, `advertising_manager`. Other authenticated roles ⇒ HTTP 403. Unauthenticated ⇒ HTTP 401.

## 2. Request fields (multipart) — delta only

| Part name | Type | Required (new) | Notes |
|---|---|---|---|
| `contentType` | text-as-string | optional (was required) | Existing values: `"photo"`, `"video"`. Now optional; if absent, autodetected from filename extension. If present and contradicts the extension, the extension wins (TD-003) and an audit event `content_type_autodetected` is emitted. |
| `file` | file | required (unchanged) | See §3. Allowed extensions / content types per `validate_media_upload` + the new `detect_media_type_from_extension` helper. |
| `isFixed` | text-as-boolean | optional | Exactly `"true"` (case-insensitive) to mark the new Content as fixed. **Admin-only.** See §5. |
| `recurringEveryXIterations` | text-as-integer | optional | Positive integer ≥ 1; cadence for recurring display. **Admin-only.** See §5. |
| `displayOrder`, `durationSeconds`, ... | unchanged | unchanged | Pre-existing fields. |

All previously-existing fields (`displayOrder`, `durationSeconds`, `advertiser`, etc.) remain unchanged.

## 3. Content-type autodetection

If `contentType` is missing OR contradicts the filename extension, the backend infers `contentType` from the filename extension:

| Extension(s) | Detected `contentType` | Detected `media_type` |
|---|---|---|
| `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` | `"photo"` | `"image"` |
| `.mp4`, `.webm`, `.ogg`, `.mov` | `"video"` | `"video"` |
| anything else, or no extension | — | HTTP 415 (see §4) |

The autodetection runs BEFORE `validate_media_upload` (existing MIME and size checks). MIME validation is not relaxed (TQ-004): a file with extension `.jpg` but `Content-Type: video/mp4` header is rejected at MIME validation time with HTTP 400 `"Unsupported image type."`.

## 4. Unsupported extension

When `contentType` is absent AND the filename extension is not in the table above, the API returns:

```http
HTTP/1.1 415 Unsupported Media Type
Content-Type: application/json

{
  "code": "unsupported_extension",
  "message": "Tipo de archivo no reconocido. Extensiones válidas: jpg, jpeg, png, gif, webp, mp4, webm, ogg, mov.",
  "details": { "filename": "...", "extension": ".xyz" }
}
```

## 5. `isFixed` + `recurringEveryXIterations` validation (admin-only)

- Both fields are **only accepted** on `POST /api/content/upload` (admin). The public API (`POST /api/public/content/upload`) ignores them — see `public-content-upload.md`.
- `isFixed=true` and `recurringEveryXIterations` non-null are **mutually exclusive**. If both are set:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "code": "mutually_exclusive_flags",
  "message": "Un Content no puede ser fijo y recurrente a la vez.",
  "details": { "isFixed": true, "recurringEveryXIterations": 3 }
}
```

- `recurringEveryXIterations` outside `>= 1` ⇒ HTTP 400 with `code: "invalid_recurring_cadence"` and message `"La cadencia debe ser un entero >= 1."`.
- `isFixed=true` is accepted for any Content (photo or video). The backend stores the value; the remote-control UI uses it to populate the Fixed-mode dropdown.
- `isFixed=false` (or absent) ⇒ `is_fixed` is persisted as `false`.

## 6. Successful write — delta only

The response (`ContentItemSchema`) includes the new fields:

```json
{
  "id": 42,
  "name": "Sponsor logo",
  "mediaUrl": "/api/media/abc-123",
  "mediaType": "image",
  "contentType": "photo",
  "displayOrder": 5,
  "durationSeconds": null,
  "advertiser": null,
  "isFixed": false,
  "recurringEveryXIterations": null,
  "createdAt": "2026-06-22T10:00:00Z",
  "updatedAt": "2026-06-22T10:00:00Z"
}
```

If `contentType` was autodetected (extension won over explicit field), the response is identical to the inferred value; the `content_type_autodetected` audit event captures the override.

## 7. Audit events emitted

- `content_type_autodetected` — when the extension overrode (or substituted for) the explicit `contentType`. Payload: `{ organizationId, userId, filename, extension, detectedContentType, requestedContentType }`.

No other audit events are emitted from this endpoint.

## 8. Backwards compatibility

- Existing clients that continue to send `contentType=photo|video` and omit `isFixed` / `recurringEveryXIterations` see no behaviour change.
- Clients that send `contentType=photo` + filename `image.mp4` now get `contentType=video` (was `photo` before; this is a **deliberate behaviour change** matching the user's "autodetect by extension" requirement).