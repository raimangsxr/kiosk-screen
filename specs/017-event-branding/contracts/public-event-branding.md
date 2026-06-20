# Contract: Public `GET /api/event-branding`

**Branch**: `017-event-branding` | **Date**: 2026-06-20

This contract applies to the unauthenticated kiosk endpoint that powers the branding overlay (FR-005, FR-006, FR-015, Q10, Q13).

## 1. URL and auth

- **Method**: `GET`
- **Path**: `/api/event-branding`
- **Content-Type**: `application/json` (response)
- **Authentication**: None. The endpoint is reachable without a session.
- **Authorisation**: None. Anyone with network access to the kiosk backend can read this payload.

> **Note**: Although unauthenticated, the endpoint is intended for kiosk clients on the same trusted network as the backend. It exposes only branding metadata (no PII, no configuration knobs).

## 2. Response shape

```json
{
  "eventName": "Spring Summit 2026",
  "organizerName": "ACME Events",
  "organizerLogoUrl": "/api/media/uuid"
}
```

Field semantics:

| Field | Type | Semantics |
|---|---|---|
| `eventName` | string | The configured event name. Empty string `""` when not configured (per Q5). |
| `organizerName` | string | The configured organizer name. Empty string `""` when not configured. |
| `organizerLogoUrl` | string \| null | Public URL to the organizer logo. `null` when no logo is configured. |

The response is always HTTP 200 with this shape, even when the organisation has no event configuration row yet (FR-006). The server MUST create the missing row with safe defaults on first read and return the empty payload.

## 3. HTTP semantics

- **HTTP 200**: always, with the payload above.
- **HTTP 5xx**: server error (DB unreachable, etc.). The kiosk falls back to its cached branding (per FR-015a / Q13 stale-while-error).
- No other status codes are expected for this endpoint.

## 4. Caching

- The kiosk does not cache the response in HTTP terms (no `Cache-Control` header is required for client-side caching).
- The kiosk keeps its own in-memory cache that is replaced atomically on each successful response (FR-015). On error, the cache is preserved (Q13).

## 5. Behaviour when logo file is missing on disk

- The server returns `organizerLogoUrl` as set (not null), even if the underlying media file is missing on disk. The kiosk handles the broken `<img>` gracefully by hiding the image and rendering only the text fields (per Edge Case "Logo file referenced by event configuration is deleted out-of-band").
- The server does NOT pre-validate the file existence; it returns the URL it has on record.

## 6. Forbidden fields

The following MUST NOT be returned by this endpoint, even if they exist on the underlying row:

- `id`, `organizationId`, `eventDurationMinutes`, `createdAt`, `updatedAt`, `createdByUserId`, `updatedByUserId`.

These belong to the admin endpoint (`/api/event-configuration`).

## 7. Pydantic schema (FastAPI)

```python
class EventBrandingSchema(CamelModel):
    event_name: str = Field(alias="eventName", default="")
    organizer_name: str = Field(alias="organizerName", default="")
    organizer_logo_url: str | None = Field(alias="organizerLogoUrl", default=None)
```

Response model: `response_model=EventBrandingSchema`.
