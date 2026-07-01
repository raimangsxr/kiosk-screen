# Context Pack: CHG-025 Caller for the reusable argocd-bump workflow

## Task classification

- Type: change to CI/ops only (no backend or frontend code changes)
- Affected contracts: `OPS.CI` (new, declared in `specs/manifest.yml`)
- Requires contract update: no (no production contract is modified)
- Current status: in-progress

## Mandatory context

Read these files before planning or implementing:

- `specs/manifest.yml`
- `specs/changes/025-ci-argocd-bump-caller/spec.md`
- `argocd-apps/.github/workflows/argocd-bump.yml` (external — read on GitHub: `https://github.com/raimangsxr/argocd-apps/blob/v1/.github/workflows/argocd-bump.yml`)
- `argocd-apps/.github/workflows/argocd-bump.README.md` (external — same URL)

## Optional context

Read only if the task explicitly touches the area:

- `.github/workflows/release-images.yml` (the upstream workflow that publishes the artifact)
- `specs/contracts/event-branding/contract.md` (reference for SDD style only)

## Do not read by default

- `specs/archive/**`
- Consolidated change specs under `specs/changes/**` unless one is explicitly referenced by a contract or task
- macOS AppleDouble files named `._*`
- Python bytecode caches

## Code entrypoints

- `.github/workflows/bump-kiosk-screen.yml` (new — caller)
- `.github/workflows/release-images.yml` (existing — produces the artifact the caller reads)

## New files

- `.github/workflows/bump-kiosk-screen.yml`
- `specs/changes/025-ci-argocd-bump-caller/{spec.md,context-pack.md,tasks.md}`

## Files removed

- `.github/workflows/argocd-bump.yml` (logic moved to `argocd-apps`)

## Tests

There are no automated tests for CI/ops changes in this repo. Validation is end-to-end:

1. Push a branch with the caller + deletion of the old file.
2. Merge to `main`.
3. Cut a release `0.8.X-test` in kiosk-screen.
4. Observe in `argocd-apps` that a PR opens (and merges if hotfix).

## Implementation constraints

- The caller MUST NOT contain any of the bump logic; only artifact download, tag extraction, and the `uses:` invocation.
- The reusable workflow reference MUST be pinned to a tag (`@v1`), not `@main` or a SHA, so callers can opt into upgrades.
- The PAT (`ARGOCD_APPS_TOKEN`) MUST be passed as a workflow_call input from the caller, never hardcoded.
- The `release_images.yml` workflow MUST keep uploading the `release-tag` artifact (its removal would break the caller).