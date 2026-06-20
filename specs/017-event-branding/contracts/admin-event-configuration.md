# Contract: Admin `PUT /api/event-configuration`

**Branch**: `017-event-branding` | **Date**: 2026-06-20

This contract applies to `PUT /api/event-configuration` (FR-004, FR-007–FR-010a, Q8, Q9, Q11). The endpoint is multipart only; it does NOT accept JSON. The request body carries the configuration text fields, an optional logo file, and an optional `removeLogo` flag.

## 1. URL and auth

- **Method**: `PUT`
- **Path**: `/api/event-configuration`
- **Content-Type**: `multipart/form-data` (required; JSON bodies are rejected with HTTP 415)
- **Authentication**: Session cookie required (`withCredentials: true` on the Angular client)
- **Authorisation**: Roles `administrator`, `content_manager`, `advertising_manager` (FR-023). Other authenticated roles ⇒ HTTP 403. Unauthenticated ⇒ HTTP 401.

## 2. Request fields (multipart)

| Part name | Type | Required | Notes |
|---|---|---|---|
| `eventName` | text (UTF-8) | optional | Trimmed; empty string allowed. Max 255 chars after trim. |
| `organizerName` | text (UTF-8) | optional | Trimmed; empty string allowed. Max 255 chars after trim. |
| `eventDurationMinutes` | text-as-integer | optional (required on first PUT) | 1 ≤ value ≤ 1440. |
| `file` | file | optional | See §3. Must NOT co-exist with `removeLogo`. |
| `removeLogo` | text-as-boolean | optional | Exactly `"true"` (case-insensitive) to clear the logo. Must NOT co-exist with `file`. |
| `_method` / `_csrf` | n/a | n/a | Reuse the existing CSRF/session mechanism; no new field is added. |

## 3. Logo file validation (when `file` is present)

- **Allowed content types** (`Content-Type` part header): `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`.
- **Max size**: 1 MB (aligned with `image_upload_max_bytes`).
- **Empty file (0 bytes)**: rejected with HTTP 400 and message `"Logo file is empty."`.
- **Mismatched extension**: rejected with HTTP 400 and message `"Unsupported file type. Allowed: PNG, JPG, WebP, SVG."`.
- **Oversize**: rejected with HTTP 400 and message `"Logo file too large (max 1 MB)."`.
- **Validation failures return HTTP 400 BEFORE any DB or disk write**.

## 4. Ambiguous intent guard

- **If both `file` and `removeLogo=true` are present** (any value of `removeLogo` other than absent), the server returns HTTP 400 with `Contradictory fields: 'file' and 'removeLogo' must not both be set.` (FR-010a, Q11). No partial state is written.

## 5. Successful write

On a successful PUT with valid fields and (optionally) a valid file:

1. Begin DB transaction.
2. If `file` present and valid:
   a. Validate content type and size (see §3).
   b. Stream file to `media_storage_service.save_upload(organization_id, user_id, file, media_type='logo')`.
   c. If the new media row creation fails for any reason, ROLLBACK the transaction and return HTTP 500 (or 4xx depending on the failure).
3. If `removeLogo=true` and no `file`:
   a. Capture the previous `organizer_logo_media_id` for the audit event.
   b. Set the event configuration's `organizer_logo_media_id = NULL`.
   c. After commit, decrement reference count on the old media; delete if unreferenced.
4. Update `eventName`, `organizerName`, `eventDurationMinutes` (with validation; reject HTTP 400 if any fails).
5. Update audit fields (`updated_at`, `updated_by_user_id`).
6. Commit.
7. Emit `event_configuration_changed` audit event with `changedFields`, `previousLogoMediaId`, `newLogoMediaId`, `userId` (Q9, FR-025/FR-026).
8. Return HTTP 200 with the new `EventConfigurationSchema` (see §6).

## 6. Success response shape

```json
{
  "id": "uuid",
  "organizationId": "uuid",
  "eventName": "Spring Summit 2026",
  "organizerName": "ACME Events",
  "organizerLogoMediaFile": {
    "id": "uuid",
    "mediaType": "logo",
    "contentType": "image/png",
    "fileSizeBytes": 12345,
    "originalFilename": "logo.png",
    "mediaUrl": "/api/media/uuid"
  } | null,
  "eventDurationMinutes": 180,
  "createdAt": "2026-06-20T10:00:00Z",
  "updatedAt": "2026-06-20T10:05:00Z"
}
```

Errors:
- HTTP 400: validation failures (file size, content type, ambiguous intent, duration out of range, length > 255).
- HTTP 401: missing session.
- HTTP 403: role not in FR-023 set.
- HTTP 404: organisation not found (should not happen in practice; we have exactly one event configuration per organisation).
- HTTP 415: non-multipart body.
- HTTP 500: storage failure.

## 7. GET contract (admin)

- **Method**: `GET /api/event-configuration`
- **Auth**: same as PUT.
- **Authorisation**: same role set.
- **Response 200**: same `EventConfigurationSchema`.
- **Response 404**: organisation has no row yet (should not happen post-migration; if it does, the server MUST auto-create a row with defaults and return 200 — see FR-006 analog).

## 8. Backward compatibility

- The new multipart `PUT /api/event-configuration` does not define the legacy `configuredEventDurationMinutes` field.
- The old `PUT /api/display/configuration` endpoint accepts legacy clients that still send `configuredEventDurationMinutes`, but ignores the field (FR-024). A legacy GET on the old `display/configuration` endpoint does NOT expose `configuredEventDurationMinutes` anymore (column dropped).
