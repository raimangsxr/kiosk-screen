# Context Pack: CHG-030 Kiosk Polling Resilience

## Task classification

- Type: runtime reliability (Fase 2)
- Affected contracts: `DISPLAY.RUNTIME`
- Requires contract update: yes
- Current status: draft

## Mandatory context

- `specs/manifest.yml`
- `specs/changes/030-kiosk-polling-resilience/spec.md`
- `specs/contracts/display-runtime/contract.md`
- `specs/changes/029-production-quick-wins/spec.md` (dependency)
- `specs/changes/021-kiosk-runtime-refactor/spec.md` (extends polling story)

## Code entrypoints

- `frontend/src/app/display/display-polling.service.ts`
- `frontend/src/app/display/display-polling.service.spec.ts`
- `frontend/src/app/display/display-screen.component.ts`
- `frontend/src/app/core/api/display.api.ts`

## Tests

- `npm --prefix frontend run test -- --include='**/display-polling.service.spec.ts'`
- `npm --prefix frontend run test -- --include='**/display-screen.component.spec.ts'`

## Constraints

- Integrate existing `DisplayPollingService`; do not duplicate backoff logic inline.
- Preserve rotation timer behavior from CHG-019 fingerprint rules.
