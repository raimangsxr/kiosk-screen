# Tasks: Auto-bump argocd-apps images

**Input**: Design documents from `/specs/changes/025-ci-argocd-bump-caller/`

**Prerequisites**: spec.md, context-pack.md (this file), `.github/workflows/release-images.yml` (existing).

**Tests**: No automated tests. Validation is end-to-end (see Phase 4).

**Organization**: Tasks are grouped by phase.

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 1: Bump workflow implementation

- [x] T001 Create `.github/workflows/bump-kiosk.yml` as a self-contained workflow (no reusable workflow call). Steps:
  - trigger on `workflow_run` of `Release Images` success.
  - download `release-tag` artifact, read tag.
  - check out `argocd-apps` using `ARGOCD_APPS_TOKEN`.
  - detect hotfix by comparing X.Y of new version vs current pinned in `manifests/kiosk-screen/backend.yaml`.
  - rewrite image lines in `backend.yaml`, `frontend.yaml`, `migration-job.yaml` via Python regex.
  - no-op exit if no changes.
  - configure git, create branch `bump-kiosk-<ver>`, commit, push via PAT.
  - open PR with title `chore: bump kiosk-screen to <ver>`, label `kiosk-screen`.
  - if hotfix, run `gh pr merge --squash --delete-branch`. No `gh pr review --approve` (self-approval is blocked by GitHub).
- [x] T002 Delete `.github/workflows/bump-kiosk-screen.yml` (the abandoned reusable-workflow caller).

## Phase 2: SDD artefacts

- [x] T003 [P] Create `specs/changes/025-ci-argocd-bump-caller/spec.md` per the spec template.
- [x] T004 [P] Create `specs/changes/025-ci-argocd-bump-caller/context-pack.md`.
- [x] T005 [P] Create `specs/changes/025-ci-argocd-bump-caller/tasks.md` (this file).
- [x] T006 `specs/manifest.yml` updated with CHG-025 (`modifies: [OPS.CI]`, status `in-progress`).

## Phase 3: Pre-flight (operator)

- [ ] T007 Create the `ARGOCD_APPS_TOKEN` secret in kiosk-screen (Settings → Secrets and variables → Actions):
  - Token: Fine-grained PAT
  - Repository access: only `raimangsxr/argocd-apps`
  - Permissions: `Contents: Read and write`

## Phase 4: Validation

- [ ] T008 Cut release `0.8.13` (or any next-version) in kiosk-screen.
- [ ] T009 Verify `Bump kiosk-screen images in argocd-apps` runs successfully.
- [ ] T010 Verify a PR titled `chore: bump kiosk-screen to <ver>` appears in `argocd-apps` with the right image tags.
- [ ] T011 Verify the PR merges automatically (hotfix) and the bump branch is deleted.
- [ ] T012 Cut a second release with a different major.minor (e.g. `0.9.0` from `0.8.13`) and verify the PR stays open for manual review.

## Dependencies & Execution Order

- Phase 1 (T001, T002) — implement the workflow and remove the abandoned caller.
- Phase 2 (T003..T006) — committed together with Phase 1.
- Phase 3 (T007) — must be done before Phase 4.
- Phase 4 (T008..T012) — post-merge validation.

## Parallel Opportunities

- T003/T004/T005 are independent files and can be created in any order.

## Suggested MVP Scope

Phase 1 + Phase 2 + Phase 3 + Phase 4 = the entire change.

## Future cross-repo rollout (not in this change)

To extend the bump to other repos (bull, escalabirras, my-garage, my-warehouse), copy `.github/workflows/bump-kiosk.yml` as `bump-<repo>.yml` and substitute the app-specific values listed in the spec's "Cross-repo rollout" section. Each consumer repo also needs `ARGOCD_APPS_TOKEN` and the `<repo>` label in `argocd-apps`.