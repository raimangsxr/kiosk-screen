---
id: CHG-034
type: change
status: implemented
modifies:
  - OPS.PLATFORM
depends_on: []
extends:
  - CHG-025
  - CHG-026
supersedes: []
superseded_by: []
consolidated_into: []
requires_contract_update: true
read_by_default: true
---

# Feature Specification: CI PR Validation

**Feature Branch**: `034-ci-pr-validation`

**Created**: 2026-07-06

**Status**: Implemented

**Input**: User description: "Fase 6 del plan maestro: workflow CI en cada pull request y push a main, tests backend y frontend, build, docker build sin push, y Postgres en CI para tests de concurrencia marcados postgres."

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `OPS.PLATFORM`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Every pull request is validated before merge (Priority: P1)

Contributors open pull requests expecting automated feedback. Today tests
run primarily on release; defects should be caught when code is proposed,
not when tagging a release.

**Why this priority**: Shifts quality left and protects main branch.

**Independent Test**: Open a PR with a deliberate test failure; verify
CI reports failure. Open a clean PR; verify all jobs pass.

**Acceptance Scenarios**:

1. **Given** a pull request against main,
   **When** CI runs,
   **Then** backend tests, frontend tests, and frontend production build
   complete and report status on the PR.
2. **Given** a push to main,
   **When** CI runs,
   **Then** the same validation suite executes.
3. **Given** a failing unit test in the PR,
   **When** CI completes,
   **Then** the workflow fails and merge can be blocked by branch policy.

---

### User Story 2 — Concurrency tests run against real PostgreSQL in CI (Priority: P1)

Tests that rely on advisory locks and Postgres-specific behavior are
skipped locally on SQLite; CI must exercise them so regressions in public
upload ordering and similar paths are caught.

**Why this priority**: Production uses PostgreSQL; skipped tests hide
real concurrency bugs.

**Independent Test**: Mark postgres tests; run CI workflow; verify they
execute against a service container, not SQLite.

**Acceptance Scenarios**:

1. **Given** tests marked for PostgreSQL only,
   **When** CI backend job runs,
   **Then** those tests execute against a PostgreSQL service with
   `DATABASE_URL` pointing to it.
2. **Given** postgres tests pass in CI,
   **When** a developer merges,
   **Then** advisory-lock behavior is covered at least once per pipeline.
3. **Given** postgres service is unavailable in CI,
   **When** the job starts,
   **Then** the workflow fails fast with a clear service health message.

---

### User Story 3 — Container images build in CI without publishing (Priority: P2)

Dockerfiles drift silently if only release builds exercise them. PR CI
should build backend and frontend images to validate Docker context without
pushing to a registry.

**Why this priority**: Catches broken Dockerfiles before release night.

**Independent Test**: PR CI includes docker build steps with push disabled;
successful build on valid PR.

**Acceptance Scenarios**:

1. **Given** a valid pull request,
   **When** CI docker build steps run,
   **Then** backend and frontend images build successfully without
   registry push.
2. **Given** a broken Dockerfile in the PR,
   **When** CI runs,
   **Then** the docker build job fails.

---

### User Story 4 — CI aligns with documented Node and Python versions (Priority: P2)

PR pipeline must use the same Node major version as the repository pin
(CHG-029) and Python 3.12 as backend standard.

**Why this priority**: Avoids CI passing while local dev fails on version
mismatch.

**Independent Test**: Compare workflow matrix versions to `.nvmrc` and
backend Python version docs.

**Acceptance Scenarios**:

1. **Given** root Node version pin from CHG-029,
   **When** frontend CI job installs Node,
   **Then** it uses the same major version as the pin file.
2. **Given** backend CI job,
   **When** it installs Python,
   **Then** it uses 3.12 consistent with release workflow.

### Edge Cases

- Fork PRs: secrets for docker push remain absent; build-only still runs.
- Flaky frontend tests: CI uses headless browser flags consistent with
  release workflow.
- Migration import check optional job should not mask test failures.
- Long-running postgres tests: job timeout sufficient for full suite.
- Concurrent PRs each get isolated postgres service instance.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Repository MUST include a CI workflow triggered on pull
  request and push to main.
- **FR-002**: CI MUST run backend test suite (`pytest backend/tests`).
- **FR-003**: CI MUST run frontend unit tests and production build.
- **FR-004**: CI MUST provide a PostgreSQL service for tests marked as
  requiring PostgreSQL.
- **FR-005**: CI MUST build backend and frontend Docker images without
  pushing to a registry on pull requests.
- **FR-006**: CI MUST cache dependencies (pip, npm) comparable to release
  workflow for acceptable duration.
- **FR-007**: Node and Python versions in CI MUST match documented project
  standards and CHG-029 pin.

### Traceability & Quality Requirements

- **TQ-001**: `OPS.PLATFORM` contract MUST document PR CI workflow and
  postgres service requirement.
- **TQ-002**: At least one integration test marked postgres MUST be
  verified running in CI (not skipped) after implementation.
- **TQ-003**: `specs/manifest.yml` MUST register CHG-034.
- **TQ-004**: Relationship to CHG-025/026 documented — PR CI complements
  release and bump workflows without replacing them.

### Key Entities

- **PR CI workflow**: Automated validation on proposed changes.
- **PostgreSQL service job**: Ephemeral database for integration tests.
- **Build-only docker step**: Validates container build without publish.

## Success Criteria *(mandatory)*

- **SC-001**: 100% of merged PRs during trial period ran CI before merge
  (measured over first 10 PRs after rollout).
- **SC-002**: PostgreSQL-marked tests show zero skips due to missing
  `DATABASE_URL` in CI logs.
- **SC-003**: Median CI duration remains under 15 minutes for typical
  changes (excluding cache cold start).
- **SC-004**: Intentionally broken test PR fails CI in 100% of trial runs.

## Assumptions

- GitHub Actions remains the CI platform (consistent with existing
  workflows).
- Branch protection requiring CI pass is recommended but configured outside
  this repository change.
- Release workflow (`release-images.yml`) continues to run full suite on
  release; PR CI mirrors core jobs.
- CHG-029 adds `.nvmrc`; this change references it.

## Relationships

- Modifies: `OPS.PLATFORM`
- Extends: CHG-025, CHG-026 platform standardization efforts
- Depends on: CHG-029 (Node pin) recommended
- Supersedes: none
- Superseded by: none
