# Backend Contract: Remote Control Display

This contract documents expected backend behavior for implementation planning. Exact route names may be adjusted during implementation, but OpenAPI and tests must preserve the behavior described here.

## Change Tracking

- `remoteControlPollingSeconds` is added to the display configuration contract as the configurable polling interval for remote control and hot display configuration updates.
- The field defaults to `3` seconds and is constrained to `1..60` seconds.
- Existing configuration clients that do not send the field receive the default value during update validation.

## Authorization

- Administrator users can read and update remote control state.
- Non-administrator users cannot read or update administrator remote control state.
- Running display reads effective display state according to existing display access behavior.
- No unauthenticated remote control access is allowed.

## Display Configuration Contract

### Field

`remoteControlPollingSeconds`

- Type: integer
- Required in configuration responses
- Required or defaulted in configuration updates
- Default: `3`
- Minimum: `1`
- Maximum: `60`
- User-facing validation errors must be safe and understandable.

## Remote Control State Response

```json
{
  "contentMode": "loop",
  "selectedContentId": null,
  "selectedIframe": null,
  "adsVisible": true,
  "updatedAt": "2026-06-18T12:00:00Z",
  "updatedByUserId": "user-id",
  "displaySessionActive": true
}
```

### Field Rules

- `contentMode`: `loop` or `iframe`.
- `selectedContentId`: null in loop mode; required in iframe mode.
- `selectedIframe`: null unless iframe mode has a valid selected iframe.
- `adsVisible`: true means regular content and ads layout; false means content full height.
- `displaySessionActive`: false means there is no currently controllable running display session.

## Remote Control Update Request

```json
{
  "contentMode": "iframe",
  "selectedContentId": "content-id",
  "adsVisible": false
}
```

### Validation

- `contentMode=loop` does not require `selectedContentId`.
- `contentMode=iframe` requires an existing eligible iframe content record.
- Invalid iframe selections are rejected without changing current state.
- Valid close-together updates use latest-valid-change-wins semantics.

## Iframe Options Response

```json
{
  "items": [
    {
      "id": "content-id",
      "title": "Agenda",
      "sourceReference": "https://example.com/agenda",
      "isActive": true
    }
  ]
}
```

### Eligibility

Options include only existing iframe content records that are valid for display.

## Effective Display State Response

The running display polling response must provide one coherent snapshot:

```json
{
  "configuration": {
    "remoteControlPollingSeconds": 3
  },
  "topContent": [],
  "ads": [],
  "remoteControl": {
    "contentMode": "loop",
    "selectedContentId": null,
    "adsVisible": true,
    "updatedAt": "2026-06-18T12:00:00Z"
  },
  "selectedIframe": null,
  "fallbackActive": false,
  "stateVersion": "opaque-version"
}
```

### Behavior

- The payload includes enough configuration for hot application.
- The payload includes the current remote control state.
- The payload includes selected iframe details when iframe mode is active.
- The display can compare `stateVersion` or timestamps to avoid unnecessary recalculation.

## Error Contract

Errors must use the project safe error envelope and must not expose secrets, internal paths, raw SQL, or stack traces.

Required cases:

- Non-administrator access denied.
- No active display session where remote control requires one.
- Invalid polling interval.
- Selected iframe missing, inactive, unavailable, wrong type, wrong organization, or not approved.
- Display state cannot be calculated because configuration is not ready.

## Observability Contract

Backend implementation must log or record operational information for:

- denied remote control access
- invalid iframe selection
- invalid polling interval
- display fallback activation
- hot configuration application failure detected by backend-side state calculation
