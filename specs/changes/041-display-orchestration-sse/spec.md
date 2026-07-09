---
id: CHG-041
type: change
status: consolidated
modifies:
  - DISPLAY.RUNTIME
  - DISPLAY.CONTROL
  - DISPLAY.CONFIG_SESSION
  - CONTENT.ROTATION
  - DISPLAY.EVENTS.AUDIT
  - EVENT.BRANDING
  - OPS.PLATFORM
depends_on: []
extends:
  - CHG-027
  - CHG-030
  - CHG-039
supersedes: []
superseded_by: []
consolidated_into:
  - DISPLAY.RUNTIME
  - DISPLAY.CONTROL
  - DISPLAY.CONFIG_SESSION
  - CONTENT.ROTATION
  - DISPLAY.EVENTS.AUDIT
  - EVENT.BRANDING
  - OPS.PLATFORM
requires_contract_update: true
read_by_default: true
---

# Feature Specification: Synchronized multi-kiosk display control

**Feature Branch**: `041-display-orchestration-sse`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Replace kiosk polling with server-authoritative
display orchestration. When an administrator configures the kiosk or uses remote
control, all connected displays receive updates immediately and show the same
content. Displays become viewers that render what the server instructs and
report playback facts (e.g. video finished). Push delivery uses server-sent
events; playback feedback uses standard HTTP requests."

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `DISPLAY.RUNTIME`, `DISPLAY.CONTROL`,
  `DISPLAY.CONFIG_SESSION`, `CONTENT.ROTATION`, `DISPLAY.EVENTS.AUDIT`,
  `EVENT.BRANDING`, `OPS.PLATFORM`
- Context pack: `context-pack.md`
- Design artifacts (protocol and state machine — not normative for stakeholders):
  - `contracts/sse-protocol.md`
  - `contracts/orchestrator-state-machine.md`
  - `docs/adr/0009-display-orchestration-sse.md`
- Contract update required before implementation: yes

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Instant configuration propagation (Priority: P1)

An event operator saves kiosk configuration (screen layout ratios, sponsor strip
size, default durations, animations). Every open display in the venue reflects
layout changes within one second without manual page reload.

**Why this priority**: Operators currently wait up to a full polling interval
(1–60 s) before changes appear. During live events this delay is visible and
confusing.

**Independent Test**: Open two displays in the venue; change the top-to-sponsor
height ratio in admin; verify both displays update the layout within 1 second.

**Acceptance Scenarios**:

1. **Given** two connected displays for the same event, **When** the operator
   saves a new region ratio, **Then** both displays update their layout within
   1 second.
2. **Given** a display is mid-slide, **When** the operator changes only the
   number of visible sponsor logos, **Then** the sponsor strip updates at the
   next sponsor rotation boundary, not mid-animation.
3. **Given** a display temporarily loses its live connection, **When** the
   operator saves configuration, **Then** the display applies the change on
   reconnect or via the existing fallback sync path within one polling cycle.

---

### User Story 2 — Synchronized rotation across hall displays (Priority: P1)

Three hall screens run loop mode during a gala. All screens show the same photo
or video at the same time and advance together when the programmed duration
elapses or a video finishes on any screen.

**Why this priority**: The product is moving from a single-kiosk PoC to
multi-screen venues where divergent content undermines the event experience.

**Independent Test**: Connect three displays; run a two-item loop (photo 10 s,
video); verify all three show the same item after each advance for at least five
cycles.

**Acceptance Scenarios**:

1. **Given** three connected displays in loop mode, **When** the server advances
   to the next item, **Then** all three displays show the same content item.
2. **Given** a video slide, **When** any display reports that the video ended,
   **Then** all displays advance to the next item together.
3. **Given** a photo slide with a 10-second duration, **When** 10 seconds elapse,
   **Then** all displays advance even if no video-end signal occurs.
4. **Given** top content advances, **When** sponsor ads are rotating on their
   own schedule, **Then** the sponsor rotation timer is not reset.

---

### User Story 3 — Remote control affects every screen (Priority: P1)

An operator uses remote control (next, previous, pause, resume, jump to item).
Every connected display responds consistently.

**Why this priority**: Remote control is an operator tool during live events;
partial response across screens would require per-screen intervention.

**Independent Test**: Pause from remote control with three displays connected;
verify all freeze top content; resume; verify all continue from the same item.

**Acceptance Scenarios**:

1. **Given** pause is active, **When** the operator resumes, **Then** all
   displays resume rotation together.
2. **Given** loop mode, **When** the operator jumps to a recurring sponsor
   item, **Then** all displays show that item and only that item's recurrence
   schedule resets.
3. **Given** fixed mode where the pinned item was removed, **When** the server
   detects the invalid target, **Then** all displays fall back to loop mode
   automatically.

---

### User Story 4 — Public upload novelty on every screen (Priority: P2)

A guest or partner uploads a photo via the public API during the event. On the
next natural content transition in loop mode, every display shows the novelty
before resuming the regular program.

**Why this priority**: Public uploads are a live-event feature; all attendees
must see contributed content, not just one screen.

**Independent Test**: Upload via public API while three displays run loop mode;
verify all show the novelty on the next boundary in display order.

**Acceptance Scenarios**:

1. **Given** loop mode and displays not paused, **When** a public upload
   completes, **Then** all displays show the novelty on the next content
   boundary in display order.
2. **Given** two novelty uploads, **When** the burst plays, **Then** both appear
   in display order and the regular program resumes where it left off.
3. **Given** fixed or iframe mode, **When** a novelty is uploaded, **Then** it
   is queued and shown only after loop mode resumes.

---

### User Story 5 — Displays recover from brief disconnections (Priority: P2)

A display loses network briefly during an event. It reconnects automatically,
shows the current server frame, and continues without operator intervention.

**Why this priority**: Venue Wi-Fi is unreliable; operators cannot babysit
every screen.

**Independent Test**: Disconnect one display's network for 30 seconds; reconnect;
verify it shows the same item as the other displays within 5 seconds.

**Acceptance Scenarios**:

1. **Given** a dropped live connection, **When** the display reconnects,
   **Then** it receives the current program state and resumes within 5 seconds.
2. **Given** a display reports video-ended twice for the same slide,
   **When** the server processes the duplicate, **Then** only one advance
   occurs.
3. **Given** a new display session is opened by an operator, **When** older
   display connections still exist, **Then** they are notified the session ended
   and stop showing live content.

---

### Edge Cases

- One display loads media slowly while others are ready — the program advances
  on schedule; the slow display catches up on the current slide without blocking
  the venue.
- Operator changes playlist while a slide is visible — playlist changes apply at
  the next content boundary; layout changes (ratios, borders) apply immediately.
- All top content becomes unavailable (deleted or outside availability window) —
  displays show the documented fallback state and operators receive an audit
  signal.
- Display token expires during a long-running event — the display prompts for
  re-authentication without corrupting other screens.
- Two browser tabs on the same physical screen — only one active connection per
  display identity; a new tab replaces the previous connection.
- Server restart mid-event — displays reconnect and resume from the server's
  current frame; recurrence counters are restored from persisted orchestrator
  state.
- Public novelty uploaded during pause — novelty is queued, not shown until
  loop mode resumes and is not paused.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST maintain a single authoritative display program
  (current top item, sponsor strip, mode, pause state) per active event session.
- **FR-002**: The system MUST push program updates to all registered displays
  for the organization as soon as the operator saves configuration or uses
  remote control.
- **FR-003**: The system MUST ensure all connected displays show the same top
  content item after each program advance.
- **FR-004**: The system MUST run top-content and sponsor-strip rotation on
  independent schedules; advancing top content MUST NOT reset sponsor timing.
- **FR-005**: Displays MUST render server instructions and MUST report playback
  facts the server cannot observe (e.g. video finished, media load failure).
- **FR-006**: The system MUST support loop, fixed, and iframe modes with the
  same semantics as the current product, centralized in the server program.
- **FR-007**: The system MUST preserve recurring-content cadence rules: per-item
  counters, due detection, filler rotation, and jump-to reset behavior.
- **FR-008**: The system MUST queue and play public-upload novelty items on the
  next content boundary in loop mode and resume the regular program afterward.
- **FR-009**: The system MUST apply layout configuration changes immediately and
  playlist changes at the next content or sponsor boundary as appropriate.
- **FR-010**: The system MUST allow displays to reconnect after connection loss
  and resume the current server frame without operator action.
- **FR-011**: The system MUST treat duplicate playback reports for the same
  slide as idempotent.
- **FR-012**: The system MUST notify displays when their session is superseded
  or ended and stop live rendering.
- **FR-013**: The system MUST retain a degraded fallback sync path until the
  migration is complete so displays remain usable if the live connection fails
  persistently.

### Traceability & Quality Requirements

- **TQ-001**: Affected active contracts MUST be updated before implementation.
- **TQ-002**: Automated tests MUST cover all P1 acceptance scenarios; P2
  scenarios MUST have automated or documented manual validation.
- **TQ-003**: The manifest entry MUST reflect CHG-041 status and owned paths.
- **TQ-004**: New audit event types MUST be added to `DISPLAY.EVENTS.AUDIT`
  before emission.

### Key Entities

- **Display program**: The server's authoritative view of what should be on
  screen — mode, pause, current top item, sponsor slice, timers.
- **Display registration**: A registered viewer identity for a physical or
  logical screen at an event (label, client instance id).
- **Program command**: An immutable instruction to show specific content or
  change mode, identified for idempotency and audit.
- **Playback report**: A display-originated fact about media playback (ended,
  ready, error) tied to a program command.
- **Operator session**: The active event session that scopes which displays
  receive the program (existing concept, extended for live connections).

## Success Criteria *(mandatory)*

- **SC-001**: Operators see configuration changes on all connected displays
  within 1 second of saving in admin during a live event test.
- **SC-002**: In a three-display hall test, 100% of program advances show the
  same top content item on all displays.
- **SC-003**: Remote-control pause and resume affect all connected displays
  within 1 second.
- **SC-004**: A display that reconnects after a 30-second outage shows the
  current venue program within 5 seconds.
- **SC-005**: Public novelty uploads appear on all loop-mode displays on the
  next content boundary in 95% of tested runs.
- **SC-006**: Sponsor strip rotation continues at its configured cadence when
  top content advances at least 20 times in a 10-minute soak test.

## Assumptions

- Displays authenticate with the same operator-session model as today (event
  operator or administrator opens the display).
- Sub-second synchrony across screens is sufficient; frame-perfect wall-clock
  alignment (video-wall grade) is out of scope.
- Venues deploy one logical program per organization per active session; per-screen
  different content is out of scope.
- Server-sent events are acceptable for venue networks and reverse proxies;
  WebSockets are not required.
- A shared message bus is available in multi-instance production deployments so
  all displays receive updates regardless of which server instance they connect
  to.
- Existing content eligibility rules (availability windows, active flags,
  novelty and recurring flags) remain unchanged; only where the logic runs
  moves to the server.

## Relationships

- Modifies: `DISPLAY.RUNTIME`, `DISPLAY.CONTROL`, `DISPLAY.CONFIG_SESSION`,
  `CONTENT.ROTATION`, `DISPLAY.EVENTS.AUDIT`, `EVENT.BRANDING`, `OPS.PLATFORM`
- Depends on: `docs/adr/0009-display-orchestration-sse.md`
- Extends: CHG-027 (novelty), CHG-039 (recurring counters), CHG-030 (connection
  resilience UX)

## Out of scope

- Different content per display in the same event
- Frame-perfect synchronized video start across screens
- WebSocket transport
- Admin dashboard for live connection map (optional future work)
- Per-display targeting of remote-control commands
