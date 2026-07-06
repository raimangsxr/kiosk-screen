# Context Pack: CHG-034 CI PR Validation

## Task classification

- Type: ops / CI (Fase 6)
- Affected contracts: `OPS.PLATFORM`
- Requires contract update: yes
- Current status: draft

## Mandatory context

- `specs/manifest.yml`
- `specs/changes/034-ci-pr-validation/spec.md`
- `specs/contracts/ops-platform/contract.md`
- `.github/workflows/release-images.yml` (mirror jobs)

## Code entrypoints

- `.github/workflows/ci.yml` (to create)
- `backend/tests/integration/test_public_content_concurrency.py`

## Tests

- Validate workflow by opening a test PR (manual)
- Confirm postgres tests not skipped in CI logs

## Constraints

- No docker push on PR workflow.
- Align Node version with CHG-029 `.nvmrc`.
