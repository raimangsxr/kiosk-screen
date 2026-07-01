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

# Feature Specification: Auto-bump argocd-apps images

**Feature Branch**: `025-ci-argocd-bump-caller`
**Created**: 2026-07-01
**Status**: In Progress

**Input**: After every kiosk-screen release, an automated bump PR should open in `argocd-apps` to update the pinned image tags in `manifests/kiosk-screen/`. The PR must auto-merge when the release is a hotfix (same major.minor as the currently pinned version) and stay open for manual review otherwise.

## Final architecture (after iteration)

The workflow is **inlined** in this repo at `.github/workflows/bump-kiosk.yml`. We initially attempted to host it as a reusable workflow in `argocd-apps` and call it from kiosk-screen via `uses:`, but the GitHub Actions validator refused to resolve `workflow_call` references from kiosk-screen to argocd-apps in this account (every ref shape — tag, branch, SHA — was rejected with `workflow was not found`, regardless of `actions/permissions/access.access_level`). The inline approach avoids the cross-repo call entirely and works reliably.

Each consuming repo (kiosk-screen today, bull / escalabirras / my-garage / my-warehouse tomorrow) ships its own copy of the same workflow with app-specific values hardcoded. The `argocd-apps` repo does not contain CI; it is updated only via these PRs.

## User Scenarios & Testing

### User Story 1 — Bump PR after every kiosk-screen release (Priority: P1)

Cutting a release in kiosk-screen triggers `Release Images`, which on success triggers `Bump kiosk-screen images in argocd-apps`. The workflow downloads the release-tag artifact, reads the tag, opens a PR in `argocd-apps` updating `rromani/kiosk-backend`, `rromani/kiosk-frontend`, and the migration-job image to the new tag.

**Why this priority**: today the operator must manually edit the three manifests and open a PR per release. Easy to forget; easy to typo.

**Independent Test**: cut release `0.8.13` in kiosk-screen. Within 60 s a PR titled `chore: bump kiosk-screen to 0.8.13` appears in `argocd-apps` against branch `bump-kiosk-0.8.13`. Because `0.8.13` is a hotfix over `0.8.12`, the PR also auto-merges (squash) and deletes the branch.

**Acceptance Scenarios**:

1. **Given** `Release Images` succeeds for release `0.8.13`, **When** the bump workflow runs, **Then** a PR opens in `argocd-apps` with the right title and body.
2. **Given** `argocd-apps` already pins `0.8.13`, **When** a release is published, **Then** no PR is created (no-op).
3. **Given** the bump PR targets `manifests/kiosk-screen/`, **When** inspected, **Then** it only touches `backend.yaml`, `frontend.yaml`, and `migration-job.yaml`.

### User Story 2 — Hotfix auto-merge (Priority: P1)

When the release is a hotfix (same major.minor as the currently pinned tag and a different patch), the bump PR is auto-merged via squash and the bump branch is deleted.

**Why this priority**: hotfixes are by definition low-risk patches. Auto-merging removes a manual approval that does not add value.

**Independent Test**: current `argocd-apps` pins `0.8.12`; cut release `0.8.13`. PR opens and merges within 60 s; branch `bump-kiosk-0.8.13` is deleted.

**Acceptance Scenarios**:

1. **Given** current pinned tag is `0.8.12`, **When** release `0.8.13` is cut, **Then** the bump PR opens and merges automatically.
2. **Given** current pinned tag is `0.8.12`, **When** release `0.9.0` is cut (minor bump), **Then** the PR opens and stays open for manual review.
3. **Given** current pinned tag is `0.8.12`, **When** release `1.0.0` is cut (major bump), **Then** the PR opens and stays open for manual review.

### User Story 3 — Re-release is a no-op (Priority: P2)

If `argocd-apps` already pins the target tag when the bump workflow runs, no PR is created. This avoids opening identical PRs on release re-publishes or workflow re-runs.

**Acceptance Scenarios**:

1. **Given** `argocd-apps` already pins `0.8.13`, **When** `Release Images` produces release `0.8.13` again, **Then** no bump PR is opened.

## Requirements

### Functional Requirements

- **FR-001**: A workflow named `.github/workflows/bump-kiosk.yml` MUST be triggered on `workflow_run` of `Release Images` with `types: [completed]` and `if: github.event.workflow_run.conclusion == 'success'`.
- **FR-002**: The workflow MUST download the `release-tag` artifact uploaded by `Release Images`, read the tag (with optional leading `v`), and normalise it to `X.Y.Z`.
- **FR-003**: The workflow MUST check out `raimangsxr/argocd-apps` using the `ARGOCD_APPS_TOKEN` secret (Fine-grained PAT, `Contents: Read and write` on `argocd-apps`).
- **FR-004**: The workflow MUST detect hotfix by comparing the X.Y of the new version against the X.Y of the tag currently pinned in `manifests/kiosk-screen/backend.yaml`.
- **FR-005**: The workflow MUST rewrite image lines in `manifests/kiosk-screen/backend.yaml`, `manifests/kiosk-screen/frontend.yaml`, and `manifests/kiosk-screen/migration-job.yaml` (the migration-job uses the backend image).
- **FR-006**: The PR title MUST be `chore: bump kiosk-screen to <version>`; the PR branch MUST be `bump-kiosk-<version>`; the PR label MUST be `kiosk-screen`.
- **FR-007**: When the release is a hotfix, the workflow MUST auto-merge the PR via `gh pr merge --squash --delete-branch`. When not a hotfix, the PR is left open for manual review.
- **FR-008**: If `argocd-apps` already pins the target tag, the workflow MUST exit early without creating a PR (no-op).
- **FR-009**: The workflow MUST NOT use a reusable workflow from `argocd-apps`. The bump logic is inlined in this repo. (See "Final architecture" above for rationale.)
- **FR-010**: The repo MUST define the `ARGOCD_APPS_TOKEN` secret before any release is cut (otherwise the bump step fails).

### Traceability & Quality Requirements

- **TQ-001**: The workflow file MUST be valid YAML.
- **TQ-002**: The workflow MUST be self-contained: no `uses: raimangsxr/...` calls to any private reusable workflow.
- **TQ-003**: No backend or frontend code changes; this is pure CI.
- **TQ-004**: `specs/manifest.yml` MUST list CHG-025 (already done).

## Key Entities

- **`BumpWorkflow`** (`.github/workflows/bump-kiosk.yml`): self-contained workflow file.
- **`ReleaseImages`** (`.github/workflows/release-images.yml`, existing): produces the artifact this workflow reads.

## Success Criteria

- **SC-001**: Cutting a hotfix release opens and merges a bump PR in `argocd-apps` within 60 s.
- **SC-002**: Cutting a non-hotfix release leaves the bump PR open for manual review.
- **SC-003**: Re-releasing the same tag produces no PR.

## Assumptions

- `argocd-apps` has a `kiosk-screen` label (so `--label "kiosk-screen"` succeeds).
- `argocd-apps` `main` has no branch protection requiring external approvals (so merge works without approval; GitHub blocks self-approval at the API level).
- `argocd-apps` is private and remains so. The bump workflow inside kiosk-screen uses its `GITHUB_TOKEN` for the artifact download and a Fine-grained PAT (`ARGOCD_APPS_TOKEN`) for the cross-repo push.
- The PAT stored as `ARGOCD_APPS_TOKEN` has `Contents: Read and write` on `argocd-apps` and is created/rotated manually by the repo owner.

## Supersedes

- The previous embedded `.github/workflows/argocd-bump.yml` introduced earlier in this change's history (deleted once we moved to reusable workflows).
- The reusable-workflow plan documented in earlier versions of this spec, since the GitHub Actions validator in this account does not allow cross-repo reusable workflow calls between same-owner private repos.

## Superseded by

- None yet.

## Cross-repo rollout (future)

The same workflow file must be copied to:

- `bull` (or the inlined equivalent of `bump-bull.yml`)
- `escalabirras`
- `my-garage`
- `my-warehouse`

with the following substitutions:

- `app_name`: `<repo-slug>`
- `image_owner`: `rromani`
- `backend_service`: `<repo-slug>-backend`
- `frontend_service`: `<repo-slug>-frontend`
- `manifest_path`: `manifests/<repo-slug>`
- `pr_label`: `<repo-slug>`
- `pr_branch_prefix`: `bump-<repo-slug>`
- The grep regex in the `Detect hotfix` step: `<backend_service>:[0-9]+(\.[0-9]+)*`

Each consumer repo also needs the `ARGOCD_APPS_TOKEN` secret and the `<repo-slug>` label in `argocd-apps`.