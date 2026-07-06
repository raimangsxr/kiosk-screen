---
id: CHG-029
type: change
status: implemented
modifies:
  - PUBLIC_CONTENT.API_KEYS
  - DISPLAY.RUNTIME
  - DISPLAY.EVENTS.AUDIT
  - AUTH.RBAC
  - OPS.PLATFORM
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
requires_contract_update: true
read_by_default: true
---

# Feature Specification: Production Quick Wins

**Feature Branch**: `029-production-quick-wins`

**Created**: 2026-07-06

**Status**: In Progress

**Input**: User description: "Fase 0 del plan maestro de mejoras: eliminar router duplicado de contenido público, extender fingerprint de display para cambios de media e iframe, conectar auditoría de cola vacía, fixes menores de kiosk y admin shell, y alinear versión Node en toolchain."

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `PUBLIC_CONTENT.API_KEYS`, `DISPLAY.RUNTIME`, `DISPLAY.EVENTS.AUDIT`, `AUTH.RBAC`, `OPS.PLATFORM`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Public content upload has a single, unambiguous entry point (Priority: P1)

Integrators and automated systems that publish content via API keys must
use exactly one documented upload path. Today a duplicate registration
creates ambiguity: the same logical operation could be reached through
two routes with different authentication expectations, and a future
router reorder could silently change which path wins.

**Why this priority**: A misrouted public upload breaks partner
integrations and can expose the wrong authentication model without
any code change in the client.

**Independent Test**: Attempt public upload only through the documented
public path with a valid API key; verify success. Attempt the same
operation through any alternate admin-style path with only an API key;
verify it is rejected or unreachable.

**Acceptance Scenarios**:

1. **Given** a valid active API key, **When** a client uploads content
   through the documented public upload path, **Then** the upload succeeds
   and the content appears in the kiosk rotation queue according to
   existing rules.
2. **Given** a valid active API key and no admin session cookie,
   **When** a client attempts upload through any non-public path that
   previously accepted or shadowed public upload, **Then** the request
   fails with an unauthorized or not-found outcome — never with a
   successful upload.
3. **Given** the API surface after this change, **When** an operator
   reviews integration documentation, **Then** exactly one public upload
   URL is listed with no duplicate or conflicting entry.

---

### User Story 2 — Kiosk reflects media and iframe changes without requiring a new content id (Priority: P1)

During a live event, operators often replace a photo or video or change
an embedded page URL while keeping the same content record. The kiosk
must pick up those changes on the next poll without requiring a manual
browser reload and without resetting rotation timers when nothing
material changed.

**Why this priority**: Stale media on screen during an event is a
visible failure that undermines trust in remote updates.

**Independent Test**: With the kiosk running in loop mode, update only
the media file or source URL (or iframe URL) on an existing content id;
verify the kiosk shows the new asset within one poll cycle while
preserving the rotation timer when remote-control fields are unchanged.

**Acceptance Scenarios**:

1. **Given** the kiosk is displaying content item A with image X,
   **When** an operator replaces image X with image Y on the same
   content id and the next poll arrives, **Then** the kiosk renders
   image Y without a full page reload.
2. **Given** the kiosk is in iframe mode showing URL U1 for iframe id I,
   **When** an operator changes the iframe URL to U2 without changing id I
   and the next poll arrives, **Then** the embedded page loads U2.
3. **Given** a poll where only the media URL changed and all
   remote-control fields are identical, **When** the kiosk applies the
   new state, **Then** the content rotation timer is not reset
   (same behavior as today for identical remote-control fingerprints).
4. **Given** a poll where display order or active flags change,
   **When** the kiosk applies the new state, **Then** existing
   rotation and remote-control semantics are preserved.

---

### User Story 3 — Empty content queue is recorded in the audit log (Priority: P2)

When the kiosk has no eligible content to show in loop mode, operators
and auditors need a traceable event in the display audit log — not only
a blank or frozen screen with no backend record.

**Why this priority**: Post-event troubleshooting requires knowing
whether the queue was empty versus a network or auth failure.

**Independent Test**: Configure an empty or fully inactive content queue,
open the kiosk in loop mode, and verify a `content_rotation_empty` (or
equivalent catalogued) audit event is persisted.

**Acceptance Scenarios**:

1. **Given** loop mode and zero eligible top content items,
   **When** the rotation engine detects an empty queue,
   **Then** exactly one audit event is recorded per debounce window
   (matching existing catalog semantics).
2. **Given** content is later added to the queue,
   **When** rotation resumes, **Then** normal rotation audit events
   continue without duplicate empty-queue spam.

---

### User Story 4 — Minor kiosk and admin shell reliability fixes (Priority: P2)

Operators who fix a broken organizer logo, lose a session, or navigate
the admin shell should see predictable behavior: a new logo URL recovers
display, expired sessions are handled consistently for forbidden and
unauthorized responses, and long-lived admin navigation does not leak
subscriptions.

**Why this priority**: Small UX defects compound during multi-hour event
operations.

**Independent Test**: Exercise logo URL change, session expiry (401 and
403), and repeated admin route changes; verify recovery without reload
where specified.

**Acceptance Scenarios**:

1. **Given** the kiosk hid a broken organizer logo URL,
   **When** branding is updated to a new valid logo URL,
   **Then** the new logo is shown on the next branding refresh.
2. **Given** an authenticated session that is no longer valid,
   **When** any protected API returns 401 or 403,
   **Then** the client clears the session and redirects to login with
   the same outcome for both status codes.
3. **Given** an operator navigates across multiple admin routes during
   a long session, **When** they leave the admin shell,
   **Then** no router subscription continues firing in the background.

---

### User Story 5 — Contributors use a single documented Node version (Priority: P3)

Developers and CI must agree on one Node.js version so local builds,
tests, and release pipelines do not diverge silently.

**Why this priority**: Prevents "works on my machine" drift before
larger refactors land.

**Independent Test**: `nvm use` (or equivalent) from the repository root
selects the same major version documented in README and used in CI.

**Acceptance Scenarios**:

1. **Given** a fresh clone, **When** a contributor follows local setup
   docs, **Then** the documented Node version matches the version pin
   file at the repository root.
2. **Given** the release CI workflow, **When** it installs Node,
   **Then** it uses the same major version as the pin file and README.

### Edge Cases

- Public upload regression: admin cookie + API key on wrong path must not
  create duplicate content.
- Media swap on the currently displayed item: must update mid-rotation
  without skipping the ad band cycle.
- Empty queue debounce: rapid polls must not flood audit with empty events.
- Logo URL changes from broken → broken (different URL): second URL should
  be attempted, not permanently suppressed.
- Session cleared on 403 only for authenticated routes, not for
  intentional anonymous public reads.
- Node pin must not break the existing Angular major version requirement.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose exactly one authenticated public
  content upload entry point for API-key clients; duplicate registrations
  that could shadow or confuse that path MUST be removed.
- **FR-002**: Display state comparison MUST treat changes to media
  source, media file reference, effective duration, and iframe URL as
  material state changes even when content or iframe ids are unchanged.
- **FR-003**: Display state comparison MUST continue to suppress
  redundant rotation timer resets when only immaterial fields change,
  preserving current remote-control fingerprint semantics.
- **FR-004**: When the rotation engine detects an empty eligible content
  queue in loop mode, the system MUST emit the catalogued empty-queue
  audit event through the existing display events pipeline.
- **FR-005**: The kiosk branding overlay MUST retry displaying the
  organizer logo when the configured logo URL changes after a prior
  load failure.
- **FR-006**: The client session handler MUST treat HTTP 401 and 403 on
  protected resources as session-expired for the purpose of clearing
  credentials and redirecting to login.
- **FR-007**: The admin shell MUST release route subscriptions on
  destroy so navigation listeners do not persist after leaving admin.
- **FR-008**: The repository MUST pin a single Node.js version at the
  root and align README and release CI documentation with that pin.

### Traceability & Quality Requirements

- **TQ-001**: Affected active contracts (`PUBLIC_CONTENT.API_KEYS`,
  `DISPLAY.RUNTIME`, `DISPLAY.EVENTS.AUDIT`, `AUTH.RBAC`, `OPS.PLATFORM`)
  MUST be updated before implementation is merged.
- **TQ-002**: Automated tests MUST cover: public upload path uniqueness,
  media-swap and iframe-URL fingerprint behavior, empty-queue audit
  emission, logo URL recovery, and session handling for 401/403.
- **TQ-003**: `specs/manifest.yml` MUST register CHG-029 before
  implementation is considered complete.

### Key Entities

- **Public upload route**: The sole API-key-authenticated path for
  partner content ingestion.
- **Display state fingerprint**: The comparison used to decide whether a
  polled state is materially different for UI and rotation timers.
- **Display audit event**: A persisted record of kiosk/runtime
  occurrences, including empty rotation queue.
- **Organizer branding**: Logo URL and related overlay configuration
  shown on the kiosk.
- **Node version pin**: The canonical Node.js version for local and CI
  builds.

## Success Criteria *(mandatory)*

- **SC-001**: 100% of integration tests for public upload use only the
  documented public path and pass; zero successful uploads via duplicate
  paths in regression tests.
- **SC-002**: In manual or automated kiosk tests, media or iframe URL
  changes on an unchanged id appear on screen within one poll interval
  (≤ configured remote-control polling seconds, default 5s).
- **SC-003**: Empty-queue scenarios produce at least one audit event
  visible in the display events log within the existing debounce window.
- **SC-004**: After branding logo URL correction, the kiosk shows the
  new logo without a full page reload in 100% of tested cases.
- **SC-005**: Session expiry via 401 or 403 redirects operators to login
  within one user-visible navigation in 100% of tested protected calls.
- **SC-006**: README, root version pin, and release CI agree on the same
  Node major version with no undocumented mismatch.

## Assumptions

- Single-tenant deployment remains the default; public upload and
  branding scope do not change in this change.
- Existing empty-queue debounce and audit event catalog from
  `DISPLAY.EVENTS.AUDIT` are reused without new event types.
- CHG-021 (`DisplayPollingService`) integration is out of scope; this
  change only fixes fingerprint and audit wiring on the current
  polling path.
- Node pin targets the version already used successfully in release CI
  unless maintainers explicitly choose LTS alignment during planning.

## Relationships

- Modifies: `PUBLIC_CONTENT.API_KEYS`, `DISPLAY.RUNTIME`,
  `DISPLAY.EVENTS.AUDIT`, `AUTH.RBAC`, `OPS.PLATFORM`
- Extends: audit catalog usage from CHG-007 / CHG-012
- Depends on: none (foundational quick wins before CHG-030+)
- Supersedes: none
- Superseded by: none
