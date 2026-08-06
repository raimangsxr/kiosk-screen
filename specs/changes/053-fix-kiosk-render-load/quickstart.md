# Validation quickstart: CHG-053

Run from the repository root.

## Focused automated tests

```sh
npm --prefix frontend run test -- --include='**/display-screen.component.spec.ts' --include='**/display-media-cache.service.spec.ts' --include='**/display-viewer.controller.spec.ts'
```

## Full frontend gates

```sh
npm --prefix frontend run test
npm --prefix frontend run build
```

## Structural inspection

- A photo frame contains exactly one original `<img data-testid="display-content">` and one `<div data-testid="display-content-backdrop">`.
- Computed backdrop style has no `filter` and uses a captured low-resolution data URL after image load.
- A ten-item preload creates at most one top preload request/retained URL.
- An out-of-window in-flight completion is revoked and not returned by `getDisplayUrl()`.
- A command-ID-only sponsor update does not increment `adAnimationRun`.

## Manual 10-minute reference profile

1. Use the Production-equivalent playlist: 15 photos, up to 2304×4096 / 5.5 MB, 13 at 3 s and two at 10 s, 500 ms fade.
2. Show 15 sponsors from the 35-item pool, 1,000 ms slide every 6 s.
3. Record Chromium renderer CPU after warm-up, peak sustained interval, responsiveness to a visible command, renderer crashes/hangs, and retained media count for 10 minutes.
4. Repeat the same sampling method against version 1.9.0 (`b05826d`).
5. Accept only if SC-001 through SC-005 hold. Record hardware, Chromium version, viewport, timestamps, and raw measurements.

The multi-hour soak remains a release gate and must stay unchecked until actually executed.

