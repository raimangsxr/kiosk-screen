# API Key Management Contract

**Date**: 2026-06-18
**Spec**: [spec.md](../spec.md)
**Status**: Authoritative for the implementation phase.

This contract defines the admin-facing HTTP surface for managing API keys. All endpoints are restricted to the `administrator` role.

## Endpoints

### `GET /api/admin/api-keys`

List all API keys for the caller's organization. Returns the list ordered by creation time descending (newest first). The raw key value is NEVER returned in this response.

**Authentication**: Session cookie (existing admin auth). Role: `administrator`.

**Success response**: `200 OK`

```json
[
  {
    "id": "<uuid>",
    "label": "Mobile app integration",
    "keyPrefix": "ksk_live_AbCdEfGh",
    "isActive": true,
    "createdAt": "2026-06-18T14:00:00.000Z",
    "lastRotatedAt": "2026-06-18T15:30:00.000Z",
    "lastUsedAt": "2026-06-18T16:42:11.000Z",
    "revokedAt": null,
    "createdByUserId": "<admin_uuid>"
  },
  {
    "id": "<uuid>",
    "label": "Old partner key",
    "keyPrefix": "ksk_live_IjKlMnOp",
    "isActive": false,
    "createdAt": "2026-06-10T09:00:00.000Z",
    "lastRotatedAt": null,
    "lastUsedAt": "2026-06-17T11:00:00.000Z",
    "revokedAt": "2026-06-18T13:00:00.000Z",
    "createdByUserId": "<admin_uuid>"
  }
]
```

### `POST /api/admin/api-keys`

Create a new API key. The raw key value is returned in the response **exactly once**. The caller MUST capture it before closing the dialog; the server cannot recover it later.

**Authentication**: Session cookie. Role: `administrator`.

**Request body** (`application/json`):

```json
{
  "label": "Mobile app integration"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `label` | `string` | Yes | Non-empty. Max 120 chars. Not unique. |

**Success response**: `201 Created`

```json
{
  "id": "<uuid>",
  "label": "Mobile app integration",
  "keyPrefix": "ksk_live_AbCdEfGh",
  "rawKey": "ksk_live_AbCdEfGh_aBcDeFgHiJkLmNoPqRsTuVwX",
  "isActive": true,
  "createdAt": "2026-06-18T14:00:00.000Z",
  "lastRotatedAt": null,
  "lastUsedAt": null,
  "revokedAt": null,
  "createdByUserId": "<admin_uuid>"
}
```

The `rawKey` field is present ONLY in this response. It is never returned by list, rotate, or any other endpoint. The server stores `sha256(rawKey)` and the prefix; the rest is unrecoverable.

**Side effect**: A `DisplayEvent` is appended with `eventType=api_key_changed`, `severity=info`, `entityType=api_key`, `entityId=<new_key_id>`, `eventMetadata={"action": "create", "key_label": "<label>"}`.

### `POST /api/admin/api-keys/{id}/rotate`

Rotate an existing key in place. The `id` and `label` are preserved; a new `keyHash` and `keyPrefix` are generated; `lastRotatedAt` is updated. The previous raw key value is invalidated immediately.

**Authentication**: Session cookie. Role: `administrator`.

**Path params**:
- `id`: the API key id (UUID).

**Success response**: `200 OK`

```json
{
  "id": "<uuid>",
  "label": "Mobile app integration",
  "keyPrefix": "ksk_live_NewPrEf",
  "rawKey": "ksk_live_NewPrEf_xYzAbCdEfGhIjKlMnOpQrStUv",
  "isActive": true,
  "createdAt": "2026-06-18T14:00:00.000Z",
  "lastRotatedAt": "2026-06-18T16:00:00.000Z",
  "lastUsedAt": "2026-06-18T15:42:11.000Z",
  "revokedAt": null,
  "createdByUserId": "<admin_uuid>"
}
```

`rawKey` is again returned only in this response.

**Error cases**:
- `404 not_found`: the key id does not exist (in the caller's organization).
- `409 conflict`: the key is revoked (`isActive=false`). Rotation of a revoked key is rejected; the admin must create a new key.

**Side effect**: A `DisplayEvent` is appended with `eventType=api_key_changed`, `severity=info`, `entityType=api_key`, `entityId=<key_id>`, `eventMetadata={"action": "rotate", "key_label": "<label>"}`.

### `DELETE /api/admin/api-keys/{id}`

Revoke an existing key. The key's `isActive` is set to `false` and `revokedAt` is set to the current time. The row is preserved (audit); the key is no longer usable.

**Authentication**: Session cookie. Role: `administrator`.

**Path params**:
- `id`: the API key id (UUID).

**Success response**: `204 No Content` (empty body).

**Error cases**:
- `404 not_found`: the key id does not exist (in the caller's organization).
- `409 conflict`: the key is already revoked. Idempotent: if the key is already revoked, return 204 (no error). (See notes below.)

**Side effect**: A `DisplayEvent` is appended with `eventType=api_key_changed`, `severity=warning`, `entityType=api_key`, `entityId=<key_id>`, `eventMetadata={"action": "revoke", "key_label": "<label>"}`.

> **Idempotency decision**: revoking an already-revoked key returns 204 (success, no-op). The rationale: admin UI flows often double-click or retry on flaky networks, and a "this key is already revoked" 409 would be confusing. The audit event is recorded only on actual transitions (`isActive: true → false`), not on no-op calls.

## Error Envelope

All errors use the same JSON envelope as the public content contract:

```json
{
  "code": "<stable_error_code>",
  "message": "<safe_user_message>",
  "category": "<category>",
  "details": { ... }
}
```

| HTTP | `code` | `category` | Trigger |
|---|---|---|---|
| 400 | `label_required` | `validation` | The `label` is missing or empty. |
| 400 | `label_too_long` | `validation` | The `label` is longer than 120 chars. |
| 401 | `not_authenticated` | `permission` | No session cookie. |
| 403 | `insufficient_role` | `permission` | The user is not an administrator. |
| 404 | `api_key_not_found` | `not_found` | The key id does not exist in the caller's organization. |
| 409 | `api_key_revoked` | `conflict` | Attempt to rotate a revoked key. |
| 500 | `unexpected` | `unexpected` | Unhandled server error. |

## Authentication on the Admin Endpoints

The existing admin cookie-based auth (`SESSION_COOKIE_NAME = "kiosk_session"`) is used. The existing `require_roles(ADMIN_ROLES)` dependency is applied. No changes to the auth path.

## Audit Trail

Every admin action (create, rotate, revoke) records a `DisplayEvent` with:
- `event_type = "api_key_changed"`
- `entity_type = "api_key"`
- `entity_id = <key_id>`
- `created_by_user_id = <admin_user_id>`
- `event_metadata = {"action": "create"|"rotate"|"revoke", "key_label": "<label>"}`
- `severity = "info"` for create and rotate, `"warning"` for revoke.

These events are visible in the existing admin events/operations log (if one exists) and are queryable by `entityId` to reconstruct the full history of a key.

## Compatibility Notes

- The existing admin role and session infrastructure is unchanged. The new endpoints slot in alongside `POST /api/users`, `POST /api/clients`, etc.
- The new endpoints are registered in `backend/app/api/v1/api_keys/routes.py` and wired into `backend/app/api/v1/router.py`.
- The OpenAPI surface is updated to include all four endpoints with the documented request/response shapes.
