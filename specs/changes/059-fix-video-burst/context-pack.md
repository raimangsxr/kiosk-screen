# Context Pack: CHG-059 Video Burst Recovery

## Task classification

- Type: runtime bug fix
- Status: draft
- Affected contracts: `DISPLAY.RUNTIME`, `CONTENT.ROTATION`
- Contract update required: yes, before implementation

## Mandatory context

1. `specs/manifest.yml`
2. `specs/contracts/display-runtime/contract.md`
3. `specs/contracts/content-rotation/contract.md`
4. `specs/changes/059-fix-video-burst/spec.md`
5. `specs/changes/059-fix-video-burst/plan.md`
6. `specs/changes/059-fix-video-burst/tasks.md`

## Code entrypoints

- `frontend/src/app/display/display-media-cache.service.ts`
- `frontend/src/app/display/display-content-gate.service.ts`
- `frontend/src/app/display/novelty-queue-tracker.service.ts`
- `frontend/src/app/display/novelty-preload-ready.service.ts`
- `frontend/src/app/display/display-viewer.controller.ts`
- `frontend/src/app/display/display-screen.component.ts`

## Focused tests

- `frontend/src/app/display/display-media-cache.service.spec.ts`
- `frontend/src/app/display/display-content-gate.service.spec.ts`
- `frontend/src/app/display/novelty-queue-tracker.service.spec.ts`
- `frontend/src/app/display/novelty-preload-ready.service.spec.ts`
- `frontend/src/app/display/display-viewer.controller.spec.ts`
- `frontend/src/app/display/display-screen.component.spec.ts`

## Optional context

- `specs/changes/050-novelty-media-preload/context-pack.md` when tracing original FIFO/concurrency semantics.
- `specs/changes/053-fix-kiosk-render-load/context-pack.md` when validating bounded retention.
- `specs/changes/056-novelty-defer-rotation/context-pack.md` when validating novelty-ready behavior.
- `backend/app/application/display_orchestrator/preload.py` when checking the ordered preload payload.

## Do not read by default

- `specs/archive/**`
- Unrelated consolidated change specs
- Backend modules outside display preload/orchestration unless a focused cross-contract test fails
- Python bytecode caches and macOS AppleDouble files

## Validation order

1. New focused cache and video-event specs.
2. All `frontend/src/app/display/**/*.spec.ts` tests.
3. `npm --prefix frontend run build`.

## Constraints

- Preserve existing SSE and kiosk-event payloads.
- Preserve server ownership of rotation timing.
- Do not add third-party dependencies.
- Keep top-media blob retention bounded to visible plus one preload.
