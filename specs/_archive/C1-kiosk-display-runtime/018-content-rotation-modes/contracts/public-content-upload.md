# Contract: Public `POST /api/public/content/upload` (delta for 018)

**Branch**: `018-content-rotation-modes` | **Date**: 2026-06-22

This contract documents the **delta** on `POST /api/public/content/upload` introduced by spec 018. The endpoint already exists and already autodetects content type from the upload's MIME header; this change replaces MIME-based autodetection with extension-based autodetection (more reliable) and explicitly forbids the public channel from creating `isFixed` or `recurringEveryXIterations` rows.

## 1. URL and auth (unchanged)

- **Method**: `POST`
- **Path**: `/api/public/content/upload`
- **Content-Type**: `multipart/form-data`
- **Authentication**: Public API key (Bearer token in `Authorization` header)
- **Authorisation**: API key must be active and have the `content:upload` scope (existing rules).

## 2. Request fields (multipart) — delta only

| Part name | Type | Required (new) | Notes |
|---|---|---|---|
| `file` | file | required | Allowed extensions: see §3. |
| `contentType` | text-as-string | optional | Pre-existing field. If present, the extension wins over it (see §3); the value is ignored when it contradicts. |

The fields `isFixed` and `recurringEveryXIterations` are **NOT accepted** on the public API. If a client sends them, the backend silently ignores them and persists `is_fixed=false`, `recurring_every_x_iterations=NULL` (TD-004). No error is returned and no audit event is emitted.

All other pre-existing fields (`displayOrder`, `durationSeconds`, `advertiser`, ...) remain unchanged.

## 3. Content-type autodetection by extension

The public API **no longer uses** the upload's `Content-Type` part header to decide `contentType`; it uses the filename extension instead (TD-003). The MIME header is still used by `validate_media_upload` for size and consistency checks, but the discriminator is the extension.

| Extension(s) | Detected `contentType` | Detected `media_type` |
|---|---|---|
| `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` | `"photo"` | `"image"` |
| `.mp4`, `.webm`, `.ogg`, `.mov` | `"video"` | `"video"` |
| anything else, or no extension | — | HTTP 415 (see §4) |

If the client sends both `contentType` (any value) and a filename with a different extension, the extension wins (same rule as the admin endpoint).

## 4. Unsupported extension

Same response as the admin endpoint (see `admin-content-upload.md` §4).

## 5. Successful write

The persisted row has `is_fixed=false` and `recurring_every_x_iterations=NULL` regardless of what the client sent. The response includes these fields as `false` and `null`.

## 6. Audit events emitted

- `content_type_autodetected` — when the extension overrode the explicit `contentType` (same payload as admin).

## 7. Backwards compatibility

- Existing public-API clients that send a `Content-Type` header matching the file content (e.g. `image/jpeg` for a `.jpg`) see no behaviour change; the new rule is equivalent.
- Existing public-API clients that sent a mismatched MIME (e.g. `application/octet-stream` for a `.jpg`) now get `contentType=photo` where they previously may have gotten HTTP 415; this is an improvement, not a regression.
- Public-API clients that accidentally included `isFixed=true` or `recurringEveryXIterations=3` in the form (previously silently ignored by the API since these fields were not declared) continue to see no effect.