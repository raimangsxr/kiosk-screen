# Context Pack: CHG-025 Auto-bump argocd-apps images

## Task classification

- Type: change to CI/ops only (no backend or frontend code changes)
- Affected contracts: `OPS.CI` (declared in `specs/manifest.yml`)
- Requires contract update: no
- Current status: in-progress

## Mandatory context

Read these files before planning or implementing:

- `specs/manifest.yml`
- `specs/changes/025-ci-argocd-bump-caller/spec.md`
- `.github/workflows/release-images.yml` (existing — produces the `release-tag` artifact the bump workflow reads)
- `.github/workflows/bump-kiosk.yml` (in this repo — the self-contained bump workflow)

## Optional context

Read only if the task explicitly touches the area:

- `manifests/kiosk-screen/` in `argocd-apps` (the targets the bump PR rewrites)

## Do not read by default

- `specs/archive/**`
- Consolidated change specs under `specs/changes/**` unless one is explicitly referenced by a contract or task
- macOS AppleDouble files named `._*`
- Python bytecode caches

## Code entrypoints

- `.github/workflows/bump-kiosk.yml` (new — the bump workflow)
- `.github/workflows/release-images.yml` (existing — produces the artifact)

## Files added in this change

- `.github/workflows/bump-kiosk.yml`
- `specs/changes/025-ci-argocd-bump-caller/{spec.md,context-pack.md,tasks.md}`

## Files removed

- `.github/workflows/bump-kiosk-screen.yml` (caller that pointed at reusable workflow in argocd-apps — abandoned because cross-repo reusable workflow calls fail validation in this account)

## Tests

There are no automated tests for CI/ops changes. Validation is end-to-end:

1. Push a branch with the bump workflow.
2. Merge to `main`.
3. Cut a release `0.8.13` in kiosk-screen.
4. Observe in `argocd-apps` that a PR opens (and merges automatically if same-major; stays open for manual review on major bumps).

## Implementation constraints

- The bump workflow MUST be self-contained: no `uses: raimangsxr/argocd-apps/.github/workflows/...` calls. The earlier reusable-workflow plan was abandoned because the GitHub Actions validator in this account refused to resolve any ref (tag / branch / SHA) to reusable workflows in argocd-apps with `workflow was not found`, regardless of `actions/permissions/access.access_level`.
- The workflow MUST use a Fine-grained PAT (`ARGOCD_APPS_TOKEN` secret) to push to argocd-apps; the native GITHUB_TOKEN does not have cross-repo write access.
- The workflow MUST NOT try to `gh pr review --approve` the PR it just created — GitHub blocks self-approval at the API level even when no branch protection is set. Auto-merge proceeds via `gh pr merge` only.
- The `release-images.yml` workflow MUST keep uploading the `release-tag` artifact (its removal would break the bump workflow).