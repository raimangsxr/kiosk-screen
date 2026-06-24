# Context Pack: CHG-019 Display Responsive Runtime

## Task classification

- Type: change to existing runtime contract
- Affected contract: `DISPLAY.RUNTIME`
- Requires contract update: yes
- Current status: in-progress

## Mandatory context

Read these files before planning or implementing:

- `specs/manifest.yml`
- `specs/contracts/display-runtime/contract.md`
- `specs/changes/019-display-responsive-runtime/spec.md`
- `specs/changes/019-display-responsive-runtime/plan.md`
- `specs/changes/019-display-responsive-runtime/tasks.md`

## Optional context

Read only if the task explicitly touches the area:

- `docs/adr/0001-token-aware-sdd-governance.md`
- `docs/adr/0002-display-runtime-region-ratios.md`
- `docs/adr/0003-display-control-event-catalog.md`
- `specs/contracts/display-control/contract.md`
- `specs/contracts/content-rotation/contract.md`
- `specs/contracts/event-branding/contract.md`

## Do not read by default

- `specs/archive/**`
- Consolidated change specs under `specs/changes/**` unless one is explicitly referenced by a contract or task
- macOS AppleDouble files named `._*`
- Python bytecode caches

## Code entrypoints

- `frontend/src/app/display/display-screen.component.ts`
- `frontend/src/app/display/display-screen.component.css`
- `frontend/src/app/display/display-screen.component.spec.ts`
- `frontend/src/app/display/kiosk-rotation.controller.ts`
- `frontend/src/app/display/display-rotation.service.ts`
- `frontend/src/app/display/display-api.service.ts`
- `frontend/src/app/core/event-branding.service.ts`

## Tests

- `npm --prefix frontend run test`
- Narrow specs first when possible:
  - `frontend/src/app/display/display-screen.component.spec.ts`
  - `frontend/src/app/display/kiosk-rotation.controller.spec.ts`
  - `frontend/src/app/display/display-rotation.service.spec.ts`

## Implementation constraints

- Preserve backend polling while portrait fallback is visible.
- Do not introduce client-side polling loops outside the existing display API service and component lifecycle.
- Use configuration ratios from the polled `DisplayState` with stable defaults before the first poll.
- Keep branding non-overlapping in landscape and hidden for iframe mode.
- Add or update tests for viewport ratios, ad image fit, portrait prompt, and branding overlay behavior.
