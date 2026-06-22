# Data Model: Remote Control Display

## Kiosk Display Configuration

Represents the persisted operational configuration for the kiosk display.

### Added Field

- `remoteControlPollingSeconds`: integer, required, default `3`, allowed range `1..60`.

### Existing Relevant Fields

- `defaultTopDurationSeconds`
- `defaultAdDurationSeconds`
- `defaultTopRotationAnimation`
- `defaultAdRotationAnimation`
- `defaultTopAnimationDurationMilliseconds`
- `defaultAdAnimationDurationMilliseconds`
- `inlineAdCount`
- `configuredEventDurationMinutes`
- `isEnabled`

### Validation Rules

- Polling interval must be between 1 and 60 seconds.
- Existing positive-duration and positive-count rules continue to apply.
- Changes to display configuration are hot-applied to running display sessions.

## Display Session

Represents a running kiosk display session.

### Fields

- `id`: stable identifier for the session.
- `organizationId`: owning organization.
- `userId`: user who opened the display.
- `displayConfigurationId`: configuration used by the display.
- `validUntil`: existing session expiration boundary.
- `createdAt`: session start time.

### Relationships

- Has one current remote control state.
- Uses one display configuration.

### Lifecycle

1. Display opens.
2. Session is created.
3. Remote control state is initialized to loop mode and ads visible.
4. Display polls effective state until session ends, display closes, or session expires.
5. A later display open creates a new default remote control state.

## Remote Control State

Represents the current temporary control choice for the active display session.

### Fields

- `id`: stable identifier for the control state.
- `displaySessionId`: owning display session.
- `organizationId`: owning organization.
- `contentMode`: enum, one of `loop` or `iframe`.
- `selectedContentId`: optional reference to an iframe content record; required when `contentMode` is `iframe`.
- `adsVisible`: boolean, default `true`.
- `updatedAt`: last successful update time.
- `updatedByUserId`: administrator who last changed the state.

### Validation Rules

- `contentMode=loop` ignores or clears `selectedContentId`.
- `contentMode=iframe` requires `selectedContentId`.
- Selected content must exist, belong to the same organization, be active, be eligible, and have type `embedded_web`.
- Only administrators can read or update remote control through the administrator control surface.
- Last valid update wins for close-together valid changes.

### State Transitions

```text
Display open
  -> loop + ads visible

loop + ads visible
  -> loop + ads hidden
  -> iframe(selected) + ads visible

loop + ads hidden
  -> loop + ads visible
  -> iframe(selected) + ads hidden

iframe(selected) + ads visible
  -> iframe(other selected) + ads visible
  -> iframe(selected) + ads hidden
  -> loop + ads visible

iframe(selected) + ads hidden
  -> iframe(other selected) + ads hidden
  -> iframe(selected) + ads visible
  -> loop + ads hidden
```

Invalid iframe selections do not transition the current state.

## Iframe Content Option

Represents an existing content record eligible for remote iframe selection.

### Fields

- `id`
- `title`
- `sourceReference`
- `approvedDomainId`
- `isActive`
- `availableFrom`
- `availableUntil`

### Eligibility

- Content type is `embedded_web`.
- Content is active.
- Content is currently available according to availability windows.
- Existing approved-domain rules are satisfied.

## Effective Display State

Read model consumed by the running display.

### Fields

- `configuration`: effective display configuration including `remoteControlPollingSeconds`.
- `topContent`: eligible loop content.
- `ads`: eligible ads according to current configuration.
- `remoteControl`: current session-scoped remote control state.
- `selectedIframe`: selected iframe content when remote control is in iframe mode.
- `fallbackActive`: whether the display must show fallback because effective content or ads are unavailable.
- `stateVersion` or `updatedAt`: comparable marker for detecting changes.

### Rules

- In loop mode, display uses `topContent`.
- In iframe mode, display uses `selectedIframe`.
- When `adsVisible=false`, display hides ads and content occupies full height.
- If selected iframe becomes invalid, effective state falls back safely and remains recoverable by later valid remote update.
