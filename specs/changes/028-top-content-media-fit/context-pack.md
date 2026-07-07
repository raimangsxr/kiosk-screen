# Context Pack: CHG-028 Top Content Blur-Fill Media Fit

## Task classification

- Type: change to existing runtime contract
- Affected contract: `DISPLAY.RUNTIME`
- Requires contract update: yes
- Current status: implemented

## Mandatory context

Read these files before planning or implementing:

- `specs/manifest.yml`
- `specs/contracts/display-runtime/contract.md`
- `specs/changes/028-top-content-media-fit/spec.md`
- `docs/adr/0007-top-content-blur-fill.md`

## Code entrypoints

- `frontend/src/app/display/display-screen.component.ts`
- `frontend/src/app/display/display-screen.component.css`
- `frontend/src/app/display/display-screen.component.spec.ts`

## Tests

- `npm --prefix frontend run test -- --include=**/display-screen.component.spec.ts`
