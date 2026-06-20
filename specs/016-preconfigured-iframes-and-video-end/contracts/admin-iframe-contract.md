# Contract: Iframe Admin API

**Date**: 2026-06-20
**Spec**: [spec.md](../spec.md)

This contract describes the admin REST API for the new `Iframe` entity. It is the source of truth for the backend route handlers and the frontend `IframeApiService`.

## Resource Shape

```jsonc
{
  "id": "9c3e...",
  "organizationId": "1c0a...",
  "url": "https://example.com/stream-a",
  "createdAt": "2026-06-20T10:00:00Z",
  "updatedAt": "2026-06-20T10:00:00Z"
}
```

`createdByUserId` and `updatedByUserId` are not exposed in the public DTO; they are used internally for audit only.

## Endpoints

### `GET /api/iframes`

List iframes for the caller's organization.

- **Auth**: `content_manager` or `administrator`.
- **Response 200**: `{ "items": [Iframe, ...] }`. Ordered by `createdAt` ascending (no manual ordering).
- **Empty**: `{ "items": [] }`.

### `POST /api/iframes`

Create an iframe.

- **Auth**: `content_manager` or `administrator`.
- **Request body**: `{ "url": "https://..." }`. `url` required, ≤ 1024 characters, must match `^https?://[^\s]+$` with a non-empty host.
- **Response 201**: full `Iframe` resource.
- **Response 400**: `{ "code": "invalid_url", "message": "URL is not a valid http(s) URL" }` (FR-004).
- **Response 409**: `{ "code": "iframe_url_already_exists", "message": "An iframe with this URL already exists" }` (FR-003).

### `GET /api/iframes/{id}`

Fetch one iframe.

- **Auth**: `content_manager` or `administrator`.
- **Response 200**: full `Iframe` resource.
- **Response 404**: `{ "code": "iframe_not_found", ... }` (caller's organization does not own this iframe, or it does not exist).

### `PUT /api/iframes/{id}`

Update an iframe's URL.

- **Auth**: `content_manager` or `administrator`.
- **Request body**: `{ "url": "https://..." }`. Same validation as create.
- **Response 200**: full `Iframe` resource.
- **Response 400**: same as create.
- **Response 404**: same as fetch.
- **Response 409**: same as create (if the new URL collides with another iframe in the same organization).

### `DELETE /api/iframes/{id}`

Delete an iframe.

- **Auth**: `content_manager` or `administrator`.
- **Response 204** on success.
- **Response 404**: same as fetch.
- **Side effect**: if the active `DisplayControlState` has `selected_iframe_id = {id}`, the service sets that row to `content_mode='loop'`, `selected_iframe_id=NULL` and records a `DisplayEvent` of type `remote_control_iframe_deleted` with `event_metadata` containing the iframe's `id`, the kiosk's `displaySessionId`, and the deleting administrator's `userId` (FR-007, SC-007).

## Authorisation Errors

- `401` when the request is unauthenticated (no session cookie or invalid session).
- `403` when the authenticated user is not `content_manager` and not `administrator` (FR-023).

## Error Envelope

All error responses use the existing `ApplicationError` envelope:

```jsonc
{
  "code": "string_snake_case",
  "message": "Human-readable description safe to display.",
  "category": "validation|authorization|not_found|conflict|...",
  "details": { /* optional, machine-readable */ }
}
```

## Validation

- `url` MUST be a non-empty string after trimming whitespace.
- `url` MUST match `^https?://[^\s]+$` and `urllib.parse.urlparse(url).netloc` MUST be non-empty.
- `url` MUST be ≤ 1024 characters.
- Cross-field validation: no per-org duplicate (enforced by the unique index and surfaced as 409).

## Versioning

The route prefix `/api/iframes` is added in this feature. No previous `/api/iframes` route exists; no versioning is required for the route itself. The public DTO is versioned implicitly by the response shape change in `GET /api/display/state` (see [kiosk-render-contract.md](./kiosk-render-contract.md)).
