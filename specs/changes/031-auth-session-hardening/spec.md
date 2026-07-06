---
id: CHG-031
type: change
status: implemented
modifies:
  - AUTH.RBAC
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
requires_contract_update: true
read_by_default: true
---

# Feature Specification: Auth Session Hardening

**Feature Branch**: `031-auth-session-hardening`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "Fase 1 del plan maestro: sesiones válidas tras restart y multi-réplica, cookies seguras en producción, uso real de SESSION_SECRET, validación de secrets en startup, y rate limiting básico en login."

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `AUTH.RBAC`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Sessions survive backend restarts and horizontal scaling (Priority: P1)

Operators sign in before an event. If the backend restarts or load
balances across multiple instances, authenticated users must remain
signed in until logout or expiry — not be silently logged out because
sessions lived only in one process's memory.

**Why this priority**: In-memory sessions block safe Kubernetes
deployments with more than one pod.

**Independent Test**: Sign in, restart backend or route requests to a
second instance, call a protected endpoint; session remains valid until
TTL or logout.

**Acceptance Scenarios**:

1. **Given** an operator signed in with a valid session,
   **When** the backend process restarts,
   **Then** subsequent protected requests succeed without re-login until
   session expiry or explicit logout.
2. **Given** two backend instances behind a load balancer,
   **When** requests from the same client alternate between instances,
   **Then** authentication succeeds on every instance until expiry.
3. **Given** an operator logs out,
   **When** they reuse the old session cookie,
   **Then** protected requests are rejected.

---

### User Story 2 — Production cookies and secrets are enforced (Priority: P1)

Deploying to production with development defaults (insecure cookies,
placeholder secrets) must fail fast at startup rather than silently
exposing operators to session hijack on HTTP or predictable credentials.

**Why this priority**: Misconfiguration is a common production incident.

**Independent Test**: Start application with production environment flag
and default secrets; verify startup refusal. Start with proper secrets;
verify secure cookie attributes when served over HTTPS.

**Acceptance Scenarios**:

1. **Given** production environment configuration,
   **When** bootstrap secrets or session signing secret match documented
   development defaults,
   **Then** the application refuses to start with a clear error message.
2. **Given** production served over HTTPS,
   **When** an operator logs in,
   **Then** the session cookie is marked secure and remains HTTP-only.
3. **Given** local development over HTTP,
   **When** an operator logs in,
   **Then** cookies work without requiring TLS locally.

---

### User Story 3 — Login resists brute-force attempts (Priority: P2)

Repeated failed login attempts from the same source must be throttled so
attackers cannot guess passwords unbounded.

**Why this priority**: Default bootstrap credentials increase brute-force
risk if operators forget to override them.

**Independent Test**: Send many failed logins from one IP; verify
rate limit response before success is possible at unlimited speed.

**Acceptance Scenarios**:

1. **Given** many failed login attempts from one client in a short window,
   **When** additional attempts are made,
   **Then** the server responds with rate-limit feedback without
   revealing whether the email exists.
2. **Given** a rate-limited client,
   **When** the window elapses,
   **Then** login attempts are allowed again.
3. **Given** successful login after failures,
   **When** credentials are correct,
   **Then** login succeeds and does not leak timing differences that
   identify valid emails beyond existing generic error messaging.

---

### User Story 4 — Session expiry is honored server-side (Priority: P2)

"Remember me" and standard sessions must expire after their configured
duration even if the client keeps the cookie.

**Why this priority**: Today tokens may persist in memory without TTL
eviction, extending sessions beyond intended policy.

**Independent Test**: Create short-lived session; wait past TTL; verify
protected access denied.

**Acceptance Scenarios**:

1. **Given** a standard 24-hour session without remember-me,
   **When** the TTL elapses,
   **Then** protected endpoints reject the session.
2. **Given** remember-me selected,
   **When** the extended TTL elapses,
   **Then** protected endpoints reject the session.
3. **Given** an expired session cookie,
   **When** the client calls login again,
   **Then** a fresh session is issued on success.

### Edge Cases

- Clock skew between instances: expiry validation must be consistent.
- Logout must invalidate session even if cookie is copied.
- Bootstrap admin creation still runs only when no admin exists; hardened
  secrets do not block first-time lab setup when env is explicitly dev.
- Rate limit must not lock out entire venue NAT unfairly — document
  threshold tuned for kiosk operator LANs.
- Session migration: existing in-memory sessions will not survive deploy;
  one-time re-login after upgrade is acceptable if documented.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Authenticated sessions MUST be verifiable by any backend
  instance without process-local-only state.
- **FR-002**: Session signing or storage MUST use the configured session
  secret; development-only defaults MUST NOT be accepted in production.
- **FR-003**: Session cookies MUST be HTTP-only; MUST be secure when the
  deployment is production over HTTPS.
- **FR-004**: Application startup in production MUST validate that
  bootstrap and session secrets are not documented development defaults.
- **FR-005**: Login endpoint MUST enforce rate limiting per client
  identifier (IP or equivalent).
- **FR-006**: Server MUST enforce session TTL matching remember-me vs
  standard login duration.
- **FR-007**: Logout MUST invalidate the session server-side so reuse
  of the cookie fails.

### Traceability & Quality Requirements

- **TQ-001**: `AUTH.RBAC` contract MUST be updated before merge.
- **TQ-002**: An ADR MUST document the chosen session persistence
  strategy (signed cookie vs shared store).
- **TQ-003**: Automated tests MUST cover multi-instance or restart
  survival, production secret validation, secure cookie flag, TTL expiry,
  and rate limiting.
- **TQ-004**: `specs/manifest.yml` MUST register CHG-031.

### Key Entities

- **Session token**: Opaque or signed credential bound to user and expiry.
- **Session secret**: Server key used to sign or validate sessions.
- **Rate limit window**: Time bucket for counting failed login attempts.

## Success Criteria *(mandatory)*

- **SC-001**: After backend restart, 100% of valid pre-restart sessions
  remain authorized in integration tests (until TTL).
- **SC-002**: Production misconfiguration tests: 100% of default-secret
  startups are rejected.
- **SC-003**: Brute-force simulation: login attempts beyond threshold
  receive rate-limit response within the configured window.
- **SC-004**: Expired sessions are rejected in 100% of post-TTL test
  requests.
- **SC-005**: Security review checklist: cookies HttpOnly + Secure in
  production HTTPS configuration.

## Assumptions

- Single-tenant organization model unchanged.
- Redis is not required for MVP; signed stateless cookies or database
  session rows are acceptable per ADR decision.
- Rate limiting can be application-level for MVP; ingress-level limits
  are complementary, not a substitute for FR-005.
- CHG-033 (password lifecycle) is separate; this change does not remove
  default password on user create.

## Relationships

- Modifies: `AUTH.RBAC`
- Depends on: none
- Extends: CHG-001 foundation auth
- Supersedes: none
- Superseded by: none
