# Tasks: Caller for the reusable argocd-bump workflow

**Input**: Design documents from `/specs/changes/025-ci-argocd-bump-caller/`

**Prerequisites**: spec.md, context-pack.md (this file). External reusable workflow at `raimangsxr/argocd-apps/.github/workflows/argocd-bump.yml@v1`.

**Tests**: No automated tests for CI/ops. Validation is end-to-end (see Phase 4).

**Organization**: Tasks are grouped by phase; each phase has minimal dependencies on the previous one.

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 1: Caller implementation

- [ ] T001 Create `.github/workflows/bump-kiosk-screen.yml` with the caller shape: `workflow_run` trigger on `Release Images` success, `actions/download-artifact@v4` to fetch `release-tag`, a `Read release tag` step exposing `raw` output, and a `uses: raimangsxr/argocd-apps/.github/workflows/argocd-bump.yml@v1` invocation with `release_tag` and `app_name: kiosk-screen`. No PAT or secret is passed.
- [ ] T002 Remove `.github/workflows/argocd-bump.yml` (the embedded workflow it replaces). Logic now lives in `argocd-apps`.

## Phase 2: SDD artefacts

- [ ] T003 [P] Create `specs/changes/025-ci-argocd-bump-caller/spec.md` per the spec template.
- [ ] T004 [P] Create `specs/changes/025-ci-argocd-bump-caller/context-pack.md`.
- [ ] T005 [P] Create `specs/changes/025-ci-argocd-bump-caller/tasks.md` (this file).
- [ ] T006 Update `specs/manifest.yml` to add a `changes:` entry for CHG-025 (or confirm the existing record-keeping path).

## Phase 3: SDD governance

- [ ] T007 Confirm no production contract is modified (no entry in `EVENT.BRANDING`, `DISPLAY.RUNTIME`, etc.). Bump is pure CI.

## Phase 4: Validation

- [ ] T008 Push the branch and merge to `main` on kiosk-screen.
- [ ] T009 Cut release `0.8.9-test` in kiosk-screen.
- [ ] T010 Verify `Bump kiosk-screen images in argocd-apps` runs and invokes the reusable workflow.
- [ ] T011 Verify a PR titled `chore: bump kiosk-screen to 0.8.9` appears in `argocd-apps`.
- [ ] T012 Verify the PR merges automatically (hotfix) and the bump branch is deleted.
- [ ] T013 Cut a second release (e.g. `0.9.0-test`) and verify the PR stays open for manual review (non-hotfix).

## Dependencies & Execution Order

- Phase 1 (T001, T002) — implement the caller and delete the old file.
- Phase 2 (T003..T006) — can be merged with Phase 1 in the same commit.
- Phase 3 (T007) — read-only verification.
- Phase 4 (T008..T013) — post-merge validation.

## Parallel Opportunities

- T001/T002 are sequential (different files but conceptually one change).
- T003/T004/T005 are independent files and can be created in any order.

## Suggested MVP Scope

Phases 1, 2, 3, 4 — the entire change. There is no incremental slice; the embedded workflow must be removed atomically with the caller being introduced to avoid two parallel bump paths.