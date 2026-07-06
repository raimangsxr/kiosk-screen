# Context Pack: CHG-035 Admin Mobile-First Refactor

## Task classification

- Type: change to existing contract
- Affected contract: `ADMIN.SHELL.NAVIGATION`
- Requires contract update: yes
- Current status: in-progress

## Mandatory context

- `specs/manifest.yml`
- `specs/contracts/admin-shell-navigation/contract.md`
- `specs/changes/035-admin-mobile-refactor/spec.md`
- `specs/changes/035-admin-mobile-refactor/tasks.md`

## Code entrypoints

- `frontend/src/app/features/admin-shell/**`
- `frontend/src/app/core/layout/**`
- `frontend/src/app/shared/ui/admin/**`
- `frontend/src/app/features/**` (admin routes only)

## Validation

```sh
npm --prefix frontend run test
npm --prefix frontend run build
```
