# Research: Remote Control Display

## Decision: Store Remote Control As Session-Scoped Operational State

**Decision**: Remote control state belongs to the active display session and is initialized to loop mode with ads visible whenever a new display session opens.

**Rationale**: The spec requires a fresh display to start in loop mode with ads visible while still allowing a running display to be controlled remotely. Tying state to the display session satisfies both requirements and avoids remembering stale operational choices.

**Alternatives considered**:

- Permanent configuration field: rejected because it would remember previous iframe/ads choices across display restarts.
- Backend process memory: rejected because it can break with multiple workers, restarts, or deployment changes.
- General command/event queue: rejected as unnecessary for one kiosk and one control device.

## Decision: Persist Polling Interval In Display Configuration

**Decision**: Add `remoteControlPollingSeconds` to display configuration with default 3 and allowed bounds 1-60 seconds.

**Rationale**: The polling interval is a display setting and must be configurable from the existing configuration panel. Persisting it with configuration keeps operational settings in one place and supports hot application.

**Alternatives considered**:

- Hardcoded interval: rejected because the user explicitly requires configuration.
- Environment variable: rejected because administrators must change it from the configuration panel.
- Separate remote-control settings screen: rejected because it fragments display configuration.

## Decision: Use One Effective Display Polling Payload

**Decision**: The running display should poll an effective display state that includes content/ad data, display configuration, and remote control state.

**Rationale**: Hot-applying configuration and remote control independently can produce inconsistent state. One effective payload lets the display recalculate layout, rotation, selected iframe, ads visibility, and polling interval from a coherent snapshot.

**Alternatives considered**:

- Poll remote control and configuration separately: rejected due race and consistency risk.
- WebSockets/server-sent events: rejected as more operational complexity than needed for one kiosk.
- Manual refresh: rejected by spec because the kiosk lacks practical local input.

## Decision: Restrict Iframe Mode To Existing Eligible Iframe Content

**Decision**: Iframe mode can reference only existing active eligible `embedded_web` content records.

**Rationale**: Existing content administration and approved-domain rules already define safe iframe sources. Reusing them avoids arbitrary URL entry and preserves security boundaries.

**Alternatives considered**:

- Free URL input in remote control: rejected as out of scope and higher security risk.
- Separate iframe registry: rejected as duplicate content management.

## Decision: Last Valid Change Wins

**Decision**: When valid remote control updates occur close together, the latest valid update becomes the current control state.

**Rationale**: The feature scope has one administrator control device, so optimistic latest-state semantics are simpler and predictable.

**Alternatives considered**:

- Locking changes while one is in progress: rejected as unnecessary friction.
- Conflict prompts: rejected as unnecessary with one control device.

## Decision: Keep Display Fullscreen And Admin Control Material-Based

**Decision**: The display remains custom fullscreen UI; the administrator remote control uses the existing Angular Material administration patterns.

**Rationale**: The current refactor separates kiosk display presentation from admin UI. Remote control is an administrator workflow, while display remains a non-admin fullscreen runtime surface.

**Alternatives considered**:

- Put display controls inside the fullscreen display: rejected because the kiosk should not require local interaction.
- Build a separate design system for remote control: rejected as unnecessary.
