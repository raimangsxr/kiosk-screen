# Context Pack: CHG-038 Frontend PWA

## Task classification

- Type: change to existing contract
- Affected contract: `OPS.PLATFORM`
- Requires contract update: yes (done)
- Current status: implemented

## Mandatory context

- `specs/manifest.yml`
- `specs/changes/038-frontend-pwa/spec.md`
- `specs/contracts/ops-platform/contract.md`

## Code entrypoints

- `frontend/ngsw-config.json`
- `frontend/public/manifest.webmanifest`
- `frontend/public/icons/**`
- `frontend/src/app/app.config.ts`
- `frontend/src/app/core/pwa/**`
- `frontend/angular.json`

## Validation

```sh
npm --prefix frontend run test -- --include='**/pwa-*.spec.ts'
npm --prefix frontend run build
```
