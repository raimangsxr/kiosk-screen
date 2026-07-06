---
id: CHG-032
type: change
status: draft
modifies:
  - DISPLAY.CONFIG_SESSION
  - DISPLAY.CONTROL
  - AUTH.RBAC
  - READINESS.SETUP
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
requires_contract_update: true
read_by_default: true
---

# Feature Specification: Backend API Hygiene

**Feature Branch**: `032-backend-api-hygiene`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "Fase 3 del plan maestro: ciclo de vida de sesiones de display, GET sin side effects en display state, errores estandarizados, manejo de IntegrityError, health/readiness probes reales, y documentación single-tenant para event branding público."

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `DISPLAY.CONFIG_SESSION`, `DISPLAY.CONTROL`, `AUTH.RBAC`, `READINESS.SETUP`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## User Scenarios & Testing *(mandatory)*

### User Story 1 — One canonical active display session per operator flow (Priority: P1)

Operators who open the kiosk display multiple times should not leave
orphaned sessions that confuse remote control targeting or audit trails.

**Why this priority**: "Latest session wins" with accumulating rows creates
ambiguous control state during events.

**Independent Test**: Call open display twice; verify one active session
is targeted for remote control and prior session is closed or superseded
per contract rules.

**Acceptance Scenarios**:

1. **Given** an operator already has an open display session,
   **When** they open display again,
   **Then** remote control and state reads target the new session and the
   prior session is no longer active.
2. **Given** superseded sessions exist,
   **When** an auditor reviews display events,
   **Then** events remain attributable without duplicate live control
   targets.

---

### User Story 2 — Reading display state does not mutate data (Priority: P1)

Monitoring tools, kiosks, and operators polling display state expect
read-only semantics. Side effects on GET cause surprise writes, race
conditions, and broken caching assumptions.

**Why this priority**: GET-with-write is a latent bug in concurrent event
operations.

**Independent Test**: Call display state GET repeatedly without writes;
verify database row counts and mutation timestamps unchanged except via
explicit write endpoints.

**Acceptance Scenarios**:

1. **Given** fixed-content mode where fallback logic previously ran on GET,
   **When** the kiosk polls state,
   **Then** no control-state mutations occur on the read path.
2. **Given** fallback is still required when fixed target disappears,
   **When** the condition is detected,
   **Then** mutation happens through an explicit write or internal
   service path invoked by a write operation — not by GET alone.

---

### User Story 3 — API errors are consistent and safe (Priority: P1)

Integrators and the Angular client should receive predictable error
envelopes with codes and categories — not a mix of plain strings,
ad-hoc dicts, and unhandled 500s that leak internals.

**Why this priority**: Inconsistent errors slow debugging and break
client adapters.

**Independent Test**: Trigger validation, not-found, conflict, and
auth errors across display, content, and user endpoints; verify uniform
envelope and sanitized messages.

**Acceptance Scenarios**:

1. **Given** a domain validation failure,
   **When** the API responds,
   **Then** the body includes code, message, and category fields
   matching the application error contract.
2. **Given** an unexpected server failure,
   **When** the API responds,
   **Then** the client receives a safe generic message while the server
   logs diagnostic detail with request correlation id.
3. **Given** duplicate user email on create,
   **When** the admin submits the form,
   **Then** the API returns a conflict outcome (not an unhandled 500).

---

### User Story 4 — Readiness reflects real dependencies (Priority: P2)

Orchestrators (Kubernetes, compose) need `/ready` to fail when the app
cannot serve traffic — database unreachable or media storage not writable —
while `/health` stays lightweight for liveness.

**Why this priority**: False-ready causes traffic to unhealthy pods during
deployments.

**Independent Test**: Stop database or make media path read-only; verify
ready fails and health behavior matches contract.

**Acceptance Scenarios**:

1. **Given** database connectivity is down,
   **When** readiness is checked,
   **Then** the endpoint reports not ready.
2. **Given** database and media root are healthy,
   **When** readiness is checked,
   **Then** the endpoint reports ready.
3. **Given** liveness probe on health,
   **When** the process is up but database is down,
   **Then** health may still pass while ready fails (per contract split).

---

### User Story 5 — Public event branding scope is explicit (Priority: P3)

Anonymous branding reads are acceptable for single-tenant kiosks but must
be documented so future multi-tenant work does not surprise operators.

**Why this priority**: Clarifies security boundary without forcing
multi-tenant implementation now.

**Independent Test**: Review contract text; verify documented
single-organization semantics for public branding GET.

**Acceptance Scenarios**:

1. **Given** the deployment is single-tenant,
   **When** the kiosk loads branding without auth,
   **Then** behavior is unchanged and documented as first-organization
   semantics.
2. **Given** contract documentation,
   **When** a new integrator reads it,
   **Then** they understand branding is not organization-scoped via
   request context today.

### Edge Cases

- Concurrent open_display from two browsers: last write wins with clear
  active flag semantics.
- Invalid role string in database: returns forbidden, not 500.
- ensure_default_state race on cold start: retry or upsert without 500.
- Readiness during migration job: document interaction with migrate
  container ordering in compose.
- Logging must not print passwords or session tokens.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Opening a new display session MUST supersede or close
  prior active display sessions for the same operator flow per contract.
- **FR-002**: Display state GET MUST NOT commit database mutations.
- **FR-003**: Fixed-content auto-fallback MUST occur only on write paths
  or dedicated internal commands — not on read polling.
- **FR-004**: API errors MUST use the standardized application error
  envelope for auth, display, content, and user admin endpoints.
- **FR-005**: A global handler MUST map unhandled exceptions to safe
  responses and log diagnostics with request id.
- **FR-006**: Unique constraint violations (e.g. duplicate email) MUST
  return conflict responses, not generic 500.
- **FR-007**: Invalid role values in persistence MUST yield forbidden
  responses when enforcing RBAC.
- **FR-008**: Readiness endpoint MUST check database connectivity and
  media storage writability; health endpoint MUST remain lightweight.
- **FR-009**: Structured logging MUST be enabled at application startup.
- **FR-010**: Public event branding semantics MUST be documented in the
  affected contract as single-tenant.

### Traceability & Quality Requirements

- **TQ-001**: Listed contracts MUST be updated before merge.
- **TQ-002**: Tests MUST cover: display session supersession, GET
  idempotence, error envelope shape, duplicate user conflict, ready vs
  health behavior.
- **TQ-003**: `specs/manifest.yml` MUST register CHG-032.

### Key Entities

- **Display session**: Operator-bound kiosk session for control and state.
- **Application error envelope**: Standard code, message, category, details.
- **Readiness probe**: Dependency check for traffic routing.
- **Health probe**: Process liveness signal.

## Success Criteria *(mandatory)*

- **SC-001**: 100% of display state GET idempotence tests show zero
  writes on read path.
- **SC-002**: 100% of catalogued error scenarios return structured
  envelope in contract tests.
- **SC-003**: Duplicate user creation returns conflict in integration
  tests, never unhandled 500.
- **SC-004**: Readiness fails within one probe interval when database is
  unavailable in automated tests.
- **SC-005**: Remote control targets exactly one active session after
  double open in integration tests.

## Assumptions

- CHG-029 removes duplicate public content router; this change does not
  duplicate that work.
- Media path default remains configurable via environment.
- Multi-tenant branding is out of scope; documentation only.
- Display audit event schema unchanged.

## Relationships

- Modifies: `DISPLAY.CONFIG_SESSION`, `DISPLAY.CONTROL`, `AUTH.RBAC`,
  `READINESS.SETUP`, `EVENT.BRANDING` (documentation slice only)
- Depends on: none (may ship after CHG-029)
- Supersedes: none
- Superseded by: none
