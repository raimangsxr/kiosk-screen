# Contract: Audit event `event_configuration_changed`

**Branch**: `017-event-branding` | **Date**: 2026-06-20

This contract applies to the audit event emitted on a successful `PUT /api/event-configuration` (FR-025, FR-026, Q9). It is consumed by the existing admin events listing endpoint without modification there.

## 1. Event type

- `eventType`: `"event_configuration_changed"`
- `severity`: `"info"`
- `organizationId`: the affected organisation (from the session)
- `createdByUserId`: the acting user's id

## 2. Payload (`event_metadata`)

```json
{
  "eventConfigurationId": "uuid",
  "changedFields": ["eventName", "organizerLogoMediaId"],
  "previousLogoMediaId": "uuid-or-null",
  "newLogoMediaId": "uuid-or-null",
  "userId": "uuid"
}
```

Field semantics:

| Field | Type | Always present | Notes |
|---|---|---|---|
| `eventConfigurationId` | string (UUID) | yes | id of the affected row. |
| `changedFields` | array of strings | yes | Subset of `["eventName", "organizerName", "organizerLogoMediaId", "eventDurationMinutes"]`. Excludes fields that did not change. |
| `previousLogoMediaId` | string \| null | only if the logo changed (uploaded, replaced, or removed) | The id of the previous logo, or `null` if there was no previous logo. |
| `newLogoMediaId` | string \| null | only if the logo changed | The id of the new logo, or `null` if the logo was removed. |
| `userId` | string (UUID) | yes | The acting user id. |

## 3. What MUST NOT be in the payload

- The logo binary (FR-026). The payload carries only metadata.
- Personally identifying information beyond the `userId`.
- Internal field values (no full snapshot of the event configuration row).

## 4. When the event is emitted

- On every successful `PUT /api/event-configuration` (Q9, FR-025).
- On every successful inline-replace of the logo (the `file` path).
- On every successful `removeLogo=true` PUT.

It is **NOT** emitted on:
- Validation failures (HTTP 4xx).
- Storage failures (HTTP 5xx).
- Reads (`GET /api/event-configuration`, `GET /api/event-branding`).
- Migration backfill rows created at deploy time.

## 5. Visibility

- The event is returned by the existing admin events listing endpoint (the same one that returns `configuration_changed`, `remote_control_iframe_deleted`, etc.).
- No code change is required on the listing endpoint (FR-025).
- The event is visible to administrators only (same as existing events).

## 6. Test contract

- An integration test MUST: (a) PUT the event configuration with a valid file; (b) within 1 second, GET the events listing; (c) assert that the response contains exactly one event with `eventType="event_configuration_changed"`, the correct `changedFields`, and a `newLogoMediaId` matching the uploaded media; (d) assert that the payload does NOT contain any binary data (only metadata strings and UUIDs). This is SC-008.
