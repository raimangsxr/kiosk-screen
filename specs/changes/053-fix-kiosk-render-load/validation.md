# Validation evidence: CHG-053

**Date**: 2026-08-06  
**Branch**: `053-fix-kiosk-render-load`  
**Environment**: macOS, Chrome Headless 151.0.0.0, Angular 20.3.25

## Automated evidence

- Expected-red TDD run: 11 failures reproduced the dual-photo DOM, unbounded preload, stale completion retention, probe object-URL leak, command-ID sponsor restart, inert fallback activation, and command replay.
- Focused display/cache/viewer run after implementation: passed.
- Accelerated cache rotation: 100 sequential top-media rotations retain at most two top URLs and two blob URLs.
- Ten-candidate preload: only the first candidate creates a request.
- Asynchronous lifecycle: out-of-window and post-teardown completions are revoked; an old lifecycle cannot erase a newer same-URL request.
- Full frontend suite: `npm --prefix frontend run test` → **521 passed, 18 pre-existing skipped, 0 failed** (539 total).
- Production build: `npm --prefix frontend run build` → **passed**; output `frontend/dist/kiosk-screen`.
- Manifest: parsed successfully as YAML.
- Patch hygiene: `git diff --check` → passed.

## Structural evidence

- Photo template has one original `<img>` foreground and one `<div>` backdrop.
- Photo/video backdrop capture is bounded by `BACKDROP_MAX_WIDTH = 320` and bakes blur/saturation into the raster.
- `.top-region__media-backdrop` has no CSS filter or duplicate original media source.
- `DisplayViewerController` and `DisplayMediaCacheService.warmItems()` both slice the top preload window to one candidate.
- Stream command application is isolated with `untracked()`; fallback activation and polling state are signals.
- `show_ads` visible-window fingerprint excludes command identity and includes visible media/presentation fields.

## Non-blocking existing warnings

- Two existing QR dependencies (`qrcode`, `dijkstrajs`) are CommonJS and trigger Angular optimization warnings.
- The suite reports existing skipped specs and unrelated no-expectation/404 test warnings; no test failed.

## Pending manual evidence

- [ ] Ten-minute Production-equivalent renderer CPU/responsiveness comparison against 1.9.0 on representative kiosk hardware.
- [ ] Multi-hour release soak.

CHG-053 remains `in-progress` until the representative runtime measurement is executed; automated implementation and build gates are complete.

