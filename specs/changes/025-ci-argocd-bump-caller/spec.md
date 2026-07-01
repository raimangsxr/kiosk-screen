---
id: CHG-025
type: change
status: in-progress
modifies:
  - OPS.CI
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
requires_contract_update: false
read_by_default: true
---

# Feature Specification: Caller for the reusable argocd-bump workflow

**Feature Branch**: `025-ci-argocd-bump-caller`
**Created**: 2026-07-01
**Status**: In Progress

**Input**: The auto-bump logic previously embedded in `.github/workflows/argocd-bump.yml` is moved to a reusable workflow that lives in `raimangsxr/argocd-apps` and is invoked by a thin caller in each consuming repo. This change replaces the embedded workflow in kiosk-screen with the kiosk-screen caller (`bump-kiosk-screen.yml`) so the bump behaviour is preserved while the implementation lives in one place.

## User Scenarios & Testing

### User Story 1 — Caller delegates to reusable workflow (Priority: P1)

Cutting a release in kiosk-screen triggers `Release Images`, which on success triggers the caller `Bump kiosk-screen images in argocd-apps`. The caller downloads the release-tag artifact, reads the tag, and invokes `raimangsxr/argocd-apps/.github/workflows/argocd-bump.yml@v1` with `app_name: kiosk-screen`. The reusable workflow opens (and, if hotfix, merges) the bump PR in `argocd-apps`.

**Why this priority**: the behaviour must match the pre-refactor embedded workflow. Any divergence breaks the release contract.

**Independent Test**: cut release `0.8.9-test` in kiosk-screen. Within 60 s a PR titled `chore: bump kiosk-screen to 0.8.9` opens in `argocd-apps`, updates `manifests/kiosk-screen/{backend,frontend,migration-job}.yaml` to `0.8.9`, and (because `0.8.9` is a hotfix over `0.8.8`) merges via squash and deletes the branch.

**Acceptance Scenarios**:

1. **Given** `Release Images` succeeds for release `0.8.9`, **When** the caller fires, **Then** the reusable workflow runs at tag `v1` and produces a PR in `argocd-apps`.
2. **Given** `argocd-apps` already pins `0.8.9`, **When** a release is published, **Then** no PR is created (no-op).
3. **Given** the caller, **When** inspected, **Then** it contains no logic beyond artifact download, tag extraction, and `uses: raimangsxr/argocd-apps/.github/workflows/argocd-bump.yml@v1`.

### User Story 2 — Behaviour parity with the embedded workflow (Priority: P1)

The caller + reusable combo produces the same observable behaviour as the embedded `argocd-bump.yml` it replaces:

- Same PR title, branch name, label.
- Same hotfix auto-merge semantics.
- Same no-op behaviour on re-release.
- Same image targets: `rromani/kiosk-backend`, `rromani/kiosk-frontend`, plus `migration-job.yaml` (backend image).

**Why this priority**: any regression here would break the release pipeline for kiosk-screen.

**Acceptance Scenarios**:

1. **Given** current pinned tag is `0.8.8`, **When** release `0.8.9` is cut (hotfix), **Then** the PR opens and merges within 60 s; the `bump-kiosk-0.8.9` branch is deleted.
2. **Given** current pinned tag is `0.8.8`, **When** release `0.9.0` is cut (minor), **Then** the PR opens and stays open for manual review.
3. **Given** the reusable workflow is upgraded to `v1.1`, **When** the caller is updated to reference `@v1.1`, **Then** behaviour is unchanged from the caller's perspective.

### User Story 3 — Other repos adopt the same caller pattern (Priority: P2)

The caller in kiosk-screen is the reference implementation. Other repos (bull, escalabirras, my-garage, my-warehouse) replicate it with only `app_name` changed. Each repo's caller is a copy-paste with one line modified.

**Why this priority**: the value of the refactor is reuse. Each additional caller is trivial.

**Acceptance Scenarios**:

1. **Given** the kiosk-screen caller file, **When** bull copies it and changes `app_name: bull`, **Then** the bull caller invokes the same reusable workflow with the right inputs.

## Requirements

### Functional Requirements

- **FR-001**: `.github/workflows/bump-kiosk-screen.yml` MUST trigger on `workflow_run` of `Release Images` with `types: [completed]` and `conclusion == 'success'`.
- **FR-002**: The caller MUST download the `release-tag` artifact uploaded by `Release Images` and extract the raw tag (with optional leading `v`).
- **FR-003**: The caller MUST invoke `raimangsxr/argocd-apps/.github/workflows/argocd-bump.yml@v1` with `release_tag`, `app_name: kiosk-screen`, and `argocd_apps_token` from `secrets.ARGOCD_APPS_TOKEN`. The reusable workflow lives in `argocd-apps` (a private repo) and accepts a cross-repo PAT as input; attempts to use the native `GITHUB_TOKEN` failed because `actions/permissions/access.access_level=user` does not enable `workflow_call` resolution from other same-owner private repos in this account, so the PAT pattern is required.
- **FR-004**: The caller MUST have `permissions: contents: read, actions: read` so the `GITHUB_TOKEN` can download the cross-run artifact.
- **FR-005**: The legacy `.github/workflows/argocd-bump.yml` MUST be removed; the bump logic now lives exclusively in `argocd-apps`.

### Traceability & Quality Requirements

- **TQ-001**: The caller workflow MUST be valid YAML.
- **TQ-002**: The repo MUST NOT retain any local copy of the bump logic; all behavioural changes happen via reusable workflow versioning in `argocd-apps`.
- **TQ-003**: `specs/manifest.yml` MUST list CHG-025 under the change records (no new contract is required; bump is pure CI/ops).
- **TQ-004**: No backend or frontend code changes; this is pure CI.

## Key Entities

- **`BumpCaller`** (`.github/workflows/bump-kiosk-screen.yml`): thin caller workflow, ~30 lines.
- **`ReusableBumpWorkflow`** (external, in `raimangsxr/argocd-apps`, tag `v1`): the canonical implementation.

## Success Criteria

- **SC-001**: Cutting a hotfix release (`0.8.X` over current `0.8.Y`) opens and merges a bump PR in `argocd-apps` within 60 s.
- **SC-002**: Cutting a non-hotfix release leaves the bump PR open for manual review.
- **SC-003**: Re-releasing the same tag produces no PR.
- **SC-004**: Upgrading the reusable workflow tag (e.g. `@v1` → `@v1.1`) requires only the `uses:` line change in this repo.

## Assumptions

- `argocd-apps` exposes the reusable workflow at tag `v1`.
- `argocd-apps` has a `kiosk-screen` label (so `--label "kiosk-screen"` succeeds).
- `argocd-apps` `main` has no branch protection requiring external approvals (so merge works without approval; GitHub blocks self-approval at the API level).
- A `ARGOCD_APPS_TOKEN` secret exists in kiosk-screen: Fine-grained PAT with `Contents: Read and write` on `argocd-apps`. The PAT is required because `workflow_call` from kiosk-screen to argocd-apps is rejected with `workflow was not found` even when `access_level: user` is set on argocd-apps — see the reverted FR-003 above.

## Supersedes

- The previous embedded `.github/workflows/argocd-bump.yml` (removed in this change).

## Superseded by

- None yet.