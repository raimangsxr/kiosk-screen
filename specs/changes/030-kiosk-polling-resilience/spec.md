---
id: CHG-030
type: change
status: implemented
modifies:
  - DISPLAY.RUNTIME
depends_on:
  - CHG-029
extends:
  - CHG-021
supersedes: []
superseded_by: []
consolidated_into: []
requires_contract_update: true
read_by_default: true
---

# Feature Specification: Kiosk Polling Resilience

**Feature Branch**: `030-kiosk-polling-resilience`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "Fase 2 del plan maestro: integrar DisplayPollingService en el kiosk, sobrevivir a fallos de red con backoff exponencial, manejar openDisplay fallido con reintento, y mostrar estado de reconexión al operador durante un evento."

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `DISPLAY.RUNTIME`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Kiosk keeps updating after transient network failures (Priority: P1)

During a live event the venue WiFi can drop for seconds or minutes.
The kiosk must continue showing the last known content and automatically
resume polling when connectivity returns — without requiring a manual
browser reload and without freezing on stale state forever.

**Why this priority**: A single failed poll today can stop all future
updates; this is the highest operational risk on event day.

**Independent Test**: Simulate intermittent server or network errors
during an active kiosk session; verify polling resumes and new remote
control commands appear within bounded time after recovery.

**Acceptance Scenarios**:

1. **Given** the kiosk is running and polling normally,
   **When** several consecutive poll attempts fail with transient
   errors (server unavailable or network timeout),
   **Then** the kiosk continues rendering the last successful state
   and automatically retries with increasing wait intervals capped at
   30 seconds, with jitter to avoid synchronized retries from multiple
   kiosks.
2. **Given** transient failures occurred,
   **When** a poll succeeds again,
   **Then** the next poll returns to the configured interval from
   display configuration (default 5 seconds unless overridden).
3. **Given** transient failures are ongoing,
   **When** the operator views the kiosk,
   **Then** a non-intrusive reconnecting indicator is visible so they
   know updates are paused but the session is not lost.

---

### User Story 2 — Fatal auth errors end the kiosk session predictably (Priority: P1)

When the operator's session expires or access is revoked mid-event,
the kiosk must not spin in a broken polling loop showing outdated
content as if it were still authoritative.

**Why this priority**: Continuing to display stale content after auth
failure misleads the audience and operators.

**Independent Test**: Invalidate session during active polling; verify
redirect to login and cleared client session.

**Acceptance Scenarios**:

1. **Given** an active kiosk poll loop,
   **When** the server responds that the session is unauthorized or
   forbidden,
   **Then** the client clears credentials and navigates to login.
2. **Given** a fatal auth response,
   **When** the operator returns to the hall and signs in again,
   **Then** they can reopen the display without a full browser restart.

---

### User Story 3 — Failed display open offers recovery (Priority: P1)

Opening the kiosk display can fail on first load (server restart,
network, misconfiguration). The operator must see a clear error and be
able to retry without navigating away.

**Why this priority**: A blank "display unavailable" screen with no
recovery path blocks the event start.

**Independent Test**: Force `open display` failure on first attempt;
verify error UI and successful recovery on retry.

**Acceptance Scenarios**:

1. **Given** the operator navigates to the kiosk display route,
   **When** the initial open-display request fails,
   **Then** an error message explains the failure in operator-friendly
   language and a retry action is available.
2. **Given** the open-display failure screen is shown,
   **When** the operator retries and the server is healthy,
   **Then** the display starts normally and polling begins.
3. **Given** repeated open failures,
   **When** the operator retries,
   **Then** retries use backoff so the client does not overwhelm the
   server.

---

### User Story 4 — Polling lifecycle is owned by one service (Priority: P2)

Operators and maintainers benefit when display polling, open session,
backoff, and error surfaces live in a single cohesive module wired into
the display screen — not duplicated inline in the component.

**Why this priority**: Completes the structural intent of CHG-021 and
prevents future regressions.

**Independent Test**: Code review confirms display screen delegates
polling to the dedicated service; service unit tests cover backoff curve
and fatal vs transient classification.

**Acceptance Scenarios**:

1. **Given** the display screen is mounted,
   **When** lifecycle starts,
   **Then** polling open, start, stop, and manual refresh are delegated
   to the polling service rather than inline subscriptions.
2. **Given** existing display screen behavior tests from prior changes,
   **When** this change ships,
   **Then** rotation, branding, and remote-control behavior remain
   unchanged aside from resilience improvements defined here.

### Edge Cases

- Poll error during video playback: last frame continues; no timer reset
  on failed poll that does not deliver new state.
- Recovery after long outage: first successful poll applies state without
  double-applying navigation commands.
- `pollNow()` from cross-tab sync during backoff: immediate fetch without
  resetting backoff counter incorrectly.
- Operator leaves display route during backoff: all timers and
  subscriptions stop cleanly.
- Multiple rapid 503s then 200: backoff resets; no duplicate open-display
  calls.
- Session expires during open-display retry: fatal path wins over retry.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The kiosk display MUST delegate polling lifecycle (open,
  start, stop, manual refresh) to a dedicated polling module integrated
  into the display screen component scope.
- **FR-002**: Transient poll failures MUST NOT terminate the polling loop;
  retries MUST use exponential backoff from approximately 1 second to a
  30 second cap with approximately ±20% jitter.
- **FR-003**: Successful poll after transient failure MUST restore the
  configured polling interval from display configuration.
- **FR-004**: Unauthorized or forbidden poll responses MUST clear the
  client session and redirect to login.
- **FR-005**: Initial open-display failure MUST present recoverable error
  UI with operator-readable messaging and explicit retry.
- **FR-006**: Open-display retry MUST use backoff on repeated failure.
- **FR-007**: During consecutive transient failures the kiosk MUST show a
  reconnecting indicator while continuing to render the last known state.
- **FR-008**: Leaving the display route MUST stop polling and release
  subscriptions without leaks.

### Traceability & Quality Requirements

- **TQ-001**: `DISPLAY.RUNTIME` contract MUST be updated before merge.
- **TQ-002**: Automated tests MUST cover: transient failure recovery,
  backoff curve bounds, fatal 401/403, open-display failure and retry,
  and cleanup on destroy.
- **TQ-003**: `specs/manifest.yml` MUST register CHG-030 before
  implementation is complete.

### Key Entities

- **Polling service**: Owns open, poll loop, backoff, and error signals.
- **Transient failure**: Network or server errors where retry is appropriate.
- **Fatal failure**: Auth errors requiring re-login.
- **Last known display state**: Cached snapshot shown while reconnecting.

## Success Criteria *(mandatory)*

- **SC-001**: In resilience tests, 100% of transient failure sequences
  resume polling without manual page reload after connectivity returns.
- **SC-002**: Backoff intervals stay within 1–30 seconds (plus jitter) for
  consecutive transient failures in automated tests.
- **SC-003**: Operators see reconnecting feedback within one poll cycle
  after the first transient failure.
- **SC-004**: Open-display failure shows retry UI in 100% of simulated
  failure cases; successful retry starts display within one user action
  when the server is healthy.
- **SC-005**: No increase in duplicate open-display sessions compared to
  pre-change behavior in integration tests.

## Assumptions

- CHG-029 fingerprint fixes ship first so resumed polls detect material
  state changes correctly.
- CHG-021 structural decomposition (navigation service, child
  components) may proceed in parallel but polling integration is the
  minimum scope of this change.
- Branding refresh throttling remains out of scope (planned with
  CHG-024).
- Offline detection via browser online events is optional enhancement;
  backoff alone satisfies FR-002.

## Relationships

- Modifies: `DISPLAY.RUNTIME`
- Extends: CHG-021 (polling user story 3)
- Depends on: CHG-029 (fingerprint correctness on resumed polls)
- Supersedes: none
- Superseded by: none
