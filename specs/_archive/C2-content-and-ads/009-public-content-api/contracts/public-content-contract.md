# Public Content Upload Contract

**Date**: 2026-06-18
**Spec**: [spec.md](../spec.md)
**Status**: Authoritative for the implementation phase.

This contract defines the public-facing HTTP surface of the feature. Authentication, validation, and error envelopes are normative.

## Endpoint

### `POST /api/public/content/upload`

Upload a new photo or video to the organization's top content rotation. The new item is appended to the end of the rotation (server-computed `displayOrder = max+1`) and prioritized as a novelty in any open kiosk.

**Authentication**: `Authorization: Bearer <api_key>` (required).

**Request body** (`multipart/form-data`):

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | `UploadFile` | Yes | The image or video file. Must be a non-empty payload. |
| `title` | `string` (form field) | Yes | Display title. Non-empty. Max 255 chars (matches the existing `TopContentItem.title` column). |

No other fields are accepted. Server-assigned fields (id, displayOrder, isActive, createdAt, etc.) appear in the response.

**Success response**: `201 Created`

```json
{
  "id": "<uuid>",
  "title": "Conference keynote photo",
  "contentType": "photo",
  "sourceReference": "/api/media/<media_uuid>",
  "mediaFile": {
    "id": "<media_uuid>",
    "mediaUrl": "/api/media/<media_uuid>",
    "originalFilename": "keynote.jpg",
    "mediaType": "image",
    "contentType": "image/jpeg",
    "fileSizeBytes": 184512
  },
  "isActive": true,
  "displayOrder": 17,
  "durationSeconds": null,
  "rotationAnimation": null,
  "animationDurationMilliseconds": null,
  "availableFrom": null,
  "availableUntil": null,
  "createdByUserId": null,
  "updatedByUserId": null,
  "createdAt": "2026-06-18T14:32:11.000Z",
  "updatedAt": "2026-06-18T14:32:11.000Z"
}
```

The response is the same `ContentItemSchema` shape used by the existing admin `POST /api/content/upload`, with `displayOrder` reflecting the assigned value (the spec's US1 acceptance scenario 8 requires this).

**Headers**:
- `X-Request-Id`: present on every response, matching the existing `RequestIdMiddleware` behavior.
- `Location`: not used (this is not a sub-resource of a parent).
- `Access-Control-Allow-*`: only present when CORS is enabled via `PUBLIC_API_CORS_ORIGINS`.

### CORS Preflight: `OPTIONS /api/public/content/upload`

When the deployer configures `PUBLIC_API_CORS_ORIGINS` (non-empty), the server responds to preflight with:
- `Access-Control-Allow-Origin: <configured origin>` (echoed, not `*`)
- `Access-Control-Allow-Methods: POST`
- `Access-Control-Allow-Headers: Authorization, Content-Type`
- `Access-Control-Max-Age: 600` (10 minutes)
- Credentials mode is NOT enabled (`Access-Control-Allow-Credentials` is absent).

When the allowlist is empty (default), the OPTIONS request returns the standard CORS headers absent: the browser will reject the cross-origin request. Server-to-server clients (curl, scripts) are unaffected.

## Error Envelope

All errors use the same JSON envelope defined by the existing `ApplicationError` handler:

```json
{
  "code": "<stable_error_code>",
  "message": "<safe_user_message>",
  "category": "<category>",
  "details": { ... optional non-sensitive context ... }
}
```

The `category` is one of `validation`, `permission`, `upload`, `storage`, `not_found`, `unexpected`. `code` is the stable identifier documented below. `message` never includes internal paths, secrets, raw session data, or stack traces.

### Error Codes and Status Mapping

| HTTP | `code` | `category` | Trigger | `message` (default) |
|---|---|---|---|---|
| 400 | `file_required` | `validation` | The `file` field is missing from the form. | "A file is required." |
| 400 | `file_empty` | `validation` | The `file` field is present but the payload has zero bytes. | "The uploaded file is empty." |
| 400 | `title_required` | `validation` | The `title` field is missing or empty. | "A title is required." |
| 400 | `title_too_long` | `validation` | The `title` is longer than 255 characters. | "The title must be 255 characters or fewer." |
| 401 | `missing_api_key` | `permission` | The `Authorization` header is absent. | "Authentication is required." |
| 401 | `invalid_authorization_scheme` | `permission` | The `Authorization` header does not start with `Bearer `. | "Authentication is required." |
| 401 | `invalid_api_key` | `permission` | The bearer token is well-formed but does not match any key (or matches a deleted key). | "Authentication is required." |
| 403 | `inactive_api_key` | `permission` | The key exists but `isActive=false` (revoked). | "This API key is no longer active." |
| 413 | `media_too_large` | `upload` | The file exceeds the configured limit for its declared type. | "The file is too large." |
| 415 | `unsupported_media_type` | `upload` | The declared MIME type is not in the supported image or video set. | "This file type is not supported." |
| 500 | `unexpected` | `unexpected` | Unhandled server error. The internal exception is logged but not returned. | "Something went wrong. Please try again." |

The 401 vs 403 distinction matches existing authn/authz conventions: 401 means "we don't know who you are" (invalid or missing), 403 means "we know who you are but you're not allowed" (revoked). The 401 messages are intentionally identical to avoid leaking which keys exist (FR-004).

## Validation Rules

- `file.content_type` MUST be one of the supported image or video MIME types (defined in `app.domain.media.ALLOWED_IMAGE_TYPES` and `ALLOWED_VIDEO_TYPES`). Otherwise: 415.
- `file.size` (after streaming) MUST be within the configured limit for its type. Otherwise: 413.
- `file.size` MUST be greater than 0. Otherwise: 400 `file_empty`.
- `title` MUST be a non-empty string of length ≤ 255. Otherwise: 400 `title_required` or `title_too_long`.
- The MIME type determines whether the item is stored as `photo` or `video`:
  - `image/*` → `contentType="photo"`, `mediaType="image"`.
  - `video/*` → `contentType="video"`, `mediaType="video"`.
- The server computes `displayOrder` as `(SELECT MAX(display_order) FROM top_content_items WHERE organization_id = …) + 1`, inside a transaction that holds a per-organization advisory lock. Concurrent uploads to the same org produce consecutive values with no gaps.

## Storage

- Files are written to `<MEDIA_STORAGE_PATH>/<organization_id>/<media_id>-<uuid>.<ext>`.
- `media_id` is a fresh UUID generated for each upload. Two uploads of the same file produce two distinct `MediaFileReference` rows; no deduplication.
- On any error after the file is partially written, the file is unlinked before the error is returned.

## Side Effects

- A `DisplayEvent` is appended with `eventType=content_changed`, `entityType=top_content`, `entityId=<new_content_id>`, `eventMetadata={"source": "public_api", "api_key_id": "<key_id>"}`.
- The `lastUsedAt` of the API key is updated to the current time, but ONLY on a 201 response. Failed uploads (400, 401, 403, 413, 415, 500) do NOT update `lastUsedAt`.

## Idempotency

The endpoint is NOT idempotent. A retry of a successful upload creates a new `TopContentItem` with a new `displayOrder`. Clients that need at-most-once delivery should track the `id` of the response and avoid re-uploading the same content. The spec explicitly does not require idempotency keys (see Out of Scope).

## Compatibility Notes

- The shape of the success response matches the existing `ContentItemSchema` used by the admin `POST /api/content/upload`. Frontends and partners that already parse that shape will work without changes.
- The existing admin endpoint is unchanged. The two endpoints coexist; admins can still upload with explicit `displayOrder` via the admin route, and external integrations use the public route.

## Field Naming

The JSON field names in this contract are `camelCase` (`displayOrder`, `mediaFile`, `createdByUserId`, etc.). The underlying database columns are `snake_case` (`display_order`, `media_file_id`, `created_by_user_id`); the conversion happens at the Pydantic schema layer. Consumers of this contract (frontends, external integrations) MUST use the `camelCase` form as documented here. The full naming-convention rule, including the conversion point and the cross-layer canonical form, is described in `data-model.md` § Naming Conventions.

## Worked Examples

### Successful image upload (curl)

```sh
curl -X POST https://kiosk.example.com/api/public/content/upload \
  -H "Authorization: Bearer ksk_live_AbCdEfGh_aBcDeFgHiJkLmNoPqRsTuVwX" \
  -F "file=@keynote.jpg" \
  -F "title=Conference keynote"
```

Returns 201 with the new content record.

### Auth failure (revoked key)

```sh
curl -X POST https://kiosk.example.com/api/public/content/upload \
  -H "Authorization: Bearer ksk_live_AbCdEfGh_aBcDeFgHiJkLmNoPqRsTuVwX" \
  -F "file=@keynote.jpg" \
  -F "title=Conference keynote"
```

Returns 403:

```json
{
  "code": "inactive_api_key",
  "message": "This API key is no longer active.",
  "category": "permission",
  "details": {}
}
```

### File too large

Returns 413:

```json
{
  "code": "media_too_large",
  "message": "The file is too large.",
  "category": "upload",
  "details": {}
}
```
