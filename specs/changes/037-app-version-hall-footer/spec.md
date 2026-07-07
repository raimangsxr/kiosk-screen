---
id: CHG-037
type: change
status: implemented
modifies:
  - READINESS.SETUP
  - OPS.PLATFORM
  - ADMIN.SHELL.NAVIGATION
depends_on: []
extends:
  - CHG-035
supersedes: []
superseded_by: []
consolidated_into: []
requires_contract_update: true
read_by_default: true
---

# Feature Specification: App Version in Hall Footer

**Feature Branch**: `037-app-version-hall-footer`

**Created**: 2026-07-07

**Status**: Implemented

**Input**: Show the deployed release version in the hall footer for operator support, inject `APP_VERSION` at Docker build time from the release tag, and remove the admin drawer search filter that added little value on a short navigation list.

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `READINESS.SETUP`, `OPS.PLATFORM`, `ADMIN.SHELL.NAVIGATION`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## User Scenarios & Testing

### User Story 1 — Operators see the deployed version in the hall (Priority: P1)

After signing in, an operator opens `/hall` and sees the running application version at the bottom of the page. This helps venue support confirm which release is deployed without inspecting container tags.

**Why this priority**: Reduces time to diagnose version-specific issues during live events.

**Independent Test**: Build a production frontend image with `APP_VERSION=1.2.3`; open `/hall` and verify the footer shows `Versión 1.2.3`.

**Acceptance Scenarios**:

1. **Given** a release image built with tag `0.9.5`, **When** the operator opens the hall, **Then** the footer displays `Versión 0.9.5`.
2. **Given** local development without build injection, **When** the operator opens the hall, **Then** the footer displays `Versión dev`.
3. **Given** the hall page, **When** rendered on compact viewports, **Then** the version footer respects safe-area padding and does not overlap primary actions.

---

### User Story 2 — Release pipeline stamps the version at build time (Priority: P1)

Release CI passes the GitHub release tag into the frontend Docker build so the stamped version matches the published image tag.

**Acceptance Scenarios**:

1. **Given** `release-images.yml` runs for tag `0.9.5`, **When** the frontend image builds, **Then** `APP_VERSION` build arg is set to `0.9.5` and `app-version.ts` is generated before `ng build`.
2. **Given** a manual Docker build without `APP_VERSION`, **When** the image is produced, **Then** the default `dev` version is used.

---

### User Story 3 — Admin navigation without search filter (Priority: P2)

The grouped admin sidenav remains (Operación, Configuración, Acceso) but without a search box, because the nav list is short enough to scan directly.

**Acceptance Scenarios**:

1. **Given** the admin drawer on any viewport, **When** opened, **Then** nav groups and items are visible without a search field.
2. **Given** CHG-035 mobile shell, **When** navigating on compact viewports, **Then** hamburger, backdrop, and grouped items still work.

## Functional Requirements

- **FR-001**: The hall page MUST display the application version in a footer (`Versión {version}`).
- **FR-002**: `APP_VERSION` MUST be injected at frontend Docker build time via `write-app-version.mjs`.
- **FR-003**: Release workflow MUST pass `github.event.release.tag_name` as `APP_VERSION` to the frontend build.
- **FR-004**: Local dev and tests MUST use a checked-in default of `dev` when no injection runs.
- **FR-005**: Admin drawer navigation MUST NOT include a search filter (supersedes CHG-035 acceptance item for search).

## Success Criteria

- **SC-001**: Hall component spec asserts version text is rendered.
- **SC-002**: Production release images show the tag in `/hall`, not `dev`.
- **SC-003**: Contracts and manifest reflect footer version and nav without search.

## Non-goals

- Version display on kiosk `/display` or login.
- Runtime version API endpoint.
- Semantic version parsing or update notifications (see CHG-038 PWA update banner for app updates).
