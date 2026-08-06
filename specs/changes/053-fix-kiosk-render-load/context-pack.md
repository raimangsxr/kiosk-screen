# Context Pack: CHG-053 Kiosk Render Load

**Change**: `specs/changes/053-fix-kiosk-render-load/`
**Status**: in-progress
**Branch**: `053-fix-kiosk-render-load`

## Read first

1. `specs/manifest.yml`
2. `specs/contracts/display-runtime/contract.md`
3. `specs/changes/053-fix-kiosk-render-load/spec.md`
4. `specs/changes/053-fix-kiosk-render-load/plan.md` once generated
5. `specs/changes/053-fix-kiosk-render-load/research.md` once generated
6. `specs/changes/053-fix-kiosk-render-load/validation.md` for executed evidence

## Code entrypoints

- `frontend/src/app/display/display-screen.component.ts`
- `frontend/src/app/display/display-screen.component.css`
- `frontend/src/app/display/display-media-cache.service.ts`
- `frontend/src/app/display/display-viewer.controller.ts`

## Focused tests

- `frontend/src/app/display/display-screen.component.spec.ts`
- `frontend/src/app/display/display-media-cache.service.spec.ts`
- `frontend/src/app/display/display-viewer.controller.spec.ts`

## Do not read for this change

- `specs/archive/**`
- Unrelated consolidated change specs
- Backend implementation outside a failing cross-contract test; CHG-053 changes no backend protocol

## Production evidence (2026-08-06)

- Production version: 1.9.0 / CHG-051.
- `/display` became unresponsive after the initial photograph loaded; screenshot, DOM inspection and normal tab close each timed out after 30 seconds.
- The renderer sustained approximately 106–110 % CPU until its specific process was terminated.
- Active content: `IMG_20260803_134108.jpg`, 2304×4096, 9.44 MP, 5,116,172 bytes.
- Configuration: 15 top photographs (41,690,152 compressed bytes); 13 rotate every 3 s, two every 10 s; fade 500 ms.
- Sponsors: 35 eligible, 15 visible; slide 1,000 ms every 6 s.
- Pending novelties at diagnosis time: 0.

## Confirmed code findings

1. Photo blur-fill uses two full-resolution `<img>` layers and a full-surface `blur(24px)` filter; CHG-051 optimized only video.
2. Media presentation probes decode the original blob before the same resource is rendered.
3. `warmItems()` accepts every announced preload while `retainTop()` only bounds retained URLs; late unretained completions can enter the cache.
4. The fallback handoff effect exits on a plain `displayActive` boolean before tracking connection signals.
5. The component still owns 16 effects; stream command effects call code that reads/mutates additional signals unless explicitly untracked.
6. Sponsor dedupe includes command identity, so an otherwise equivalent consecutive window can restart animation.
7. CHG-051 manual 30-minute and 8-hour gates were pending in the checklist while T035/T037 were marked complete.

## Scope guardrails

- No backend media migration or SSE protocol change.
- Preserve foreground `contain`, server-owned rotation, content gate and novelty indicator semantics.
- Correct the active `DISPLAY.RUNTIME` contract before implementation.
- Tests must cover functional resource bounds; manual performance evidence must remain explicitly pending until actually executed.
