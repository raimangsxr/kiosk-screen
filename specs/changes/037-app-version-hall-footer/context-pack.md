# Context Pack: CHG-037 App Version in Hall Footer

## Task classification

- Type: change to existing contracts
- Affected contracts: `READINESS.SETUP`, `OPS.PLATFORM`, `ADMIN.SHELL.NAVIGATION`
- Requires contract update: yes
- Current status: implemented

## Mandatory context

- `specs/manifest.yml`
- `specs/changes/037-app-version-hall-footer/spec.md`
- `specs/contracts/readiness-setup/contract.md`
- `specs/contracts/ops-platform/contract.md`
- `specs/contracts/admin-shell-navigation/contract.md`

## Code entrypoints

- `frontend/scripts/write-app-version.mjs`
- `frontend/src/app/core/app-version.ts`
- `frontend/src/app/features/hall/hall.component.ts`
- `frontend/Dockerfile`
- `.github/workflows/release-images.yml`
- `frontend/src/app/features/admin-shell/admin-nav-drawer.component.ts`
- `frontend/src/app/features/admin-shell/admin-navigation.service.ts`

## Validation

```sh
npm --prefix frontend run test -- --include='**/hall.component.spec.ts' --include='**/admin-shell.component.spec.ts'
npm --prefix frontend run build
docker build -f frontend/Dockerfile --build-arg APP_VERSION=9.9.9-test frontend
```
