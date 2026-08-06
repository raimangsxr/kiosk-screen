# Research: CHG-053 kiosk render load

## R1 — Decorative photo backdrop

**Decision**: Render one original foreground `<img>`/`<video>` and derive a maximum-320-pixel-wide JPEG backdrop once through canvas. Apply blur and saturation during canvas capture, then stretch the small raster with `background-size: cover` and no CSS `filter`.

**Rationale**: Production decoded the same 9.44 MP photo twice and continuously composited a blurred viewport-sized layer. Detail is intentionally invisible in the backdrop, so a small baked raster preserves the visual purpose while sharply reducing decode and composition work.

**Alternatives rejected**: dual original `<img>` layers retain the incident trigger; a CSS blur on a downscaled DOM image still requests another original and keeps a live filter; backend thumbnails widen scope and require media migration/API work.

## R2 — Retention and late completion

**Decision**: Slice preload input to the first candidate at the viewer boundary, prune warm-queue entries whenever retained sets change, mark evicted in-flight URLs, and reject storage of any completion no longer retained or from an earlier `releaseAll()` generation. Revoke object URLs when presentation probing fails.

**Rationale**: Retaining only two URLs after queueing all candidates does not bound downloads or late writes. The cache must enforce its invariant at every asynchronous boundary.

**Alternatives rejected**: only slicing in the component leaves the service unsafe for other callers; aborting HttpClient requests would require a larger cancellation redesign and is unnecessary if late results are promptly revoked.

## R3 — Command effects

**Decision**: Each effect reads its stream signal and performs imperative application inside `untracked()`. `displayActive` and `fallbackPollingActive` become signals.

**Rationale**: Angular tracks all synchronous signal reads in an effect. Applying a command currently reads viewer/cache signals, which can replay the command after its own mutations. The plain activation boolean also prevents the fallback effect from ever acquiring later connection dependencies when its first run exits.

**Alternatives rejected**: merging commands into one effect broadens dependencies; manual subscriptions duplicate existing signal adapters and teardown plumbing.

## R4 — Sponsor equivalence

**Decision**: Fingerprint ordered visible IDs, start index, count, border, and transition; exclude `commandId`.

**Rationale**: Command identity is transport metadata and does not change pixels. Including it restarts 15 sponsor animations and media work for an equivalent window.

## R5 — Angular animations

**Decision**: Retain the existing legacy content transition during CHG-053 and add reduced-motion suppression for sponsor/content animations in component CSS.

**Rationale**: The project runs Angular 20.3, where native CSS enter/leave is preferred, but Angular guidance says not to mix native and legacy systems in one component. A migration is separable and not required to remove the measured hot path.

## R6 — Validation

**Decision**: Add deterministic DOM/state/lifecycle tests, run focused specs, then the complete frontend test suite and production build. Measure the same 10-minute Production profile separately against 1.9.0; do not mark it complete from unit-test evidence.

**Rationale**: Karma skips real presentation probes and no-op animations cannot prove renderer CPU, but automated tests can enforce the structural bounds that prevent recurrence.

