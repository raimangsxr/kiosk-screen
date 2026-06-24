# Research: Display Responsive Runtime

**Date**: 2026-06-25
**Spec**: [spec.md](./spec.md)

## Decision: Dynamic viewport units with `vh` fallback

- **Decision**: Use `100dvh` for the host container, with a `@supports
  not (height: 100dvh)` fallback to `100vh`.
- **Rationale**: `dvh` (dynamic viewport height) accounts for the
  browser chrome that appears / disappears on mobile and on
  fullscreen transitions. The fallback keeps the layout stable on
  browsers without `dvh` support (Safari < 15.4). Chromium 108+
  (Nov 2022) ships `dvh` and is the kiosk browser.
- **Alternatives considered**:
  - `svh` (small viewport height): too conservative, leaves a black
    band when the browser chrome is hidden.
  - `lvh` (large viewport height): does not shrink when the chrome
    appears, produces overflow on small screens.
  - JavaScript `resize` listener: pollutes the rotation logic and
    adds an avoidable runtime cost.

## Decision: Fluid typography with `clamp()`

- **Decision**: Replace every hard-coded `font-size` and `height` in
  the display component with `clamp(min, vh / vw, max)` so the
  layout scales smoothly between 1280×720 and 3840×2160 without
  per-breakpoint media queries.
- **Rationale**: `clamp()` is supported in every Chromium version
  the kiosk targets. The `vh` / `vw` references let text and chrome
  follow the viewport instead of the device pixel count, which is
  the actual unit that varies when the operator resizes the
  browser window.
- **Alternatives considered**:
  - Multiple `@media` breakpoints: produces a piecewise step
    function and inflates the CSS for no visible gain.
  - JavaScript `ResizeObserver` to set CSS variables: works but
    races with Angular's change detection and adds code that the
    pure-CSS approach makes unnecessary.

## Decision: `aspect-ratio` on ad figures

- **Decision**: Apply `aspect-ratio: 4 / 3` (or a configurable
  custom property) to `.ad-region__item` so each figure reserves a
  stable shape regardless of the surrounding count.
- **Rationale**: `aspect-ratio` is supported in every Chromium
  version the kiosk targets (Chrome 88+, Jan 2021). It produces a
  deterministic figure size that the grid template can divide
  evenly, which is what the spec tests already expect
  (`display-screen.component.spec.ts:556-587`).
- **Alternatives considered**:
  - JS measurement: unnecessary for a fixed-ratio figure.
  - `min-height` + `max-height` pixels: the current brittle
    approach that produces inconsistent rendering across browsers.

## Decision: Container queries for the ad band

- **Decision**: Container queries are **not** used in this spec.
  The primary targets are fixed landscape viewports (≥ 1280×720)
  where a single ad-band grid works without per-size overrides.
- **Rationale**: keeping the ad band layout viewport-driven keeps
  the CSS minimal and matches the user's selected target (Chromium
  desktop + kiosk landscape only). Container queries can be added
  in a follow-up spec if a phone-sized or split-view layout is ever
  required.
- **Alternatives considered**:
  - `@media` queries on the document width: rejected because the
    ad-band size is determined by the parent container's grid
    rows, not the document width.

## Decision: `matchMedia('(orientation: portrait)')` for portrait detection

- **Decision**: Subscribe to `matchMedia('(orientation: portrait)')`
  in `ngOnInit` and store the result in a signal that the template
  binds to. When the orientation flips, the signal updates and the
  portrait prompt replaces the rendered regions.
- **Rationale**: `matchMedia` is the standard, low-cost API for
  orientation change. Chromium dispatches `change` events reliably
  on rotation, resize, and fullscreen transitions.
- **Alternatives considered**:
  - `window.orientation` (legacy, non-standard, removed in modern
    browsers): rejected.
  - `ResizeObserver` on `window.innerWidth / innerHeight`: works
    but is noisier than `matchMedia`.

## Decision: `aria-live` polite region for the portrait prompt

- **Decision**: Wrap the portrait prompt in an
  `aria-live="polite"` region so assistive technology announces
  the rotation request when the operator rotates the device.
- **Rationale**: The spec mandates accessibility (TQ-004). `polite`
  announces without interrupting the user, which is the right
  behaviour for a non-urgent orientation change.
- **Alternatives considered**:
  - `aria-live="assertive"`: too aggressive for a non-urgent
    prompt.

## Decision: CSS custom properties for the polled ratios

- **Decision**: The component template binds
  `[style.--top-ratio]="state.configuration.topRegionRatio"` and
  `[style.--bottom-ratio]="state.configuration.bottomRegionRatio"`
  on the host element; the CSS reads them via `var(--top-ratio, 5)`
  and `var(--bottom-ratio, 1)`.
- **Rationale**: The custom property hook is the only new contract
  this spec introduces at the boundary between the polled state
  and the stylesheet, matching TQ-003.
- **Alternatives considered**:
  - Angular `[ngStyle]`: identical at runtime; custom properties
    are clearer and easier to override from the browser DevTools.
  - Inline `style` strings: same effect but no default value
    fallback in the CSS layer.

## Decision: Scope `object-fit: cover` to top-region media only

- **Decision**: Move `object-fit: cover` from the global
  `img, video, iframe` rule to `.display-content-media` so it
  applies to top-region content only and the ad band keeps
  `object-fit: contain` on its images.
- **Rationale**: The global rule incorrectly forced ads to fill
  their figure with cropping. The scoped rule matches the spec
  intent (FR-009).
- **Alternatives considered**:
  - Set `object-fit` inline on each `<img>`: works but loses the
    centralised CSS rule.

## Out-of-scope research

- Touch gesture handling, pointer events, screen wake lock: not
  requested by the spec; spec 014 already documents the rotation
  state machine.
- 4K vs 8K content downsampling: not requested; the kiosk serves
  the source image as-is.
- Operator-side high-contrast mode: deferred per spec assumption.

## Assumptions

- The kiosk browser is Chromium 108+ (Nov 2022 release), which
  supports `dvh`, `clamp()`, `aspect-ratio`, container queries,
  and `matchMedia('(orientation: ...)').
- The polled `DisplayState.configuration.topRegionRatio` and
  `bottomRegionRatio` fields are already exposed by the backend
  (spec 002 FR-005); the CSS only reads them.
- `prefers-reduced-motion` is already honoured by
  `frontend/src/styles.scss`; this spec does not regress that
  behaviour.