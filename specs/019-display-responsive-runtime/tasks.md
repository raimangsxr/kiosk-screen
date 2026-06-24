---

description: "Task list for the display responsive runtime refactor"

---

# Tasks: Display Responsive Runtime

**Input**: Design documents from
`/specs/019-display-responsive-runtime/`

**Prerequisites**: plan.md (required), spec.md (required for user
stories), research.md, data-model.md, quickstart.md

**Tests**: Tests are mandatory for changed presentation behavior.
Each user story carries at least one Karma spec that asserts a
measurable success criterion (SC-001..SC-005).

**Organization**: Tasks are grouped by user story to enable
independent implementation and validation of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, ...)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- Paths shown below assume the kiosk-screen web app structure.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the working branch and the baseline display
component before any change is made.

- [ ] T001 Verify the working branch `019-display-responsive-runtime`
      and the four spec artefacts at
      `specs/019-display-responsive-runtime/{spec.md,plan.md,research.md,data-model.md,quickstart.md,checklists/}`.

## Phase 2: Foundational (Blocking prerequisites)

**Purpose**: Land the two Angular-side primitives every user story
depends on: the orientation signal and the polled-ratio custom
property hook.

- [ ] T002 [P] Add an orientation `signal<'landscape' | 'portrait'>`
      and a `matchMedia('(orientation: portrait)')` listener in
      `frontend/src/app/display/display-screen.component.ts`,
      with safe `addEventListener('change', ...)` registration
      in `ngOnInit` and cleanup in `ngOnDestroy`; guard against
      environments where `matchMedia` is undefined.
- [ ] T003 [P] Bind CSS custom properties on the host element in
      `frontend/src/app/display/display-screen.component.ts`:
      `[style.--top-ratio]="(state?.configuration?.topRegionRatio ?? 5)"`
      and
      `[style.--bottom-ratio]="(state?.configuration?.bottomRegionRatio ?? 1)"`.

## Phase 3: User Story 1 — Stable landscape viewports (Priority: P1)

**Goal**: The kiosk renders the top region and the ad band
without overflow, clipped text, or layout shift at 1280×720,
1920×1080, 2560×1440, and 3840×2160.

**Independent Test**: open the kiosk at the four viewports; the
top region height matches `viewport.height × topRegionRatio /
(topRegionRatio + bottomRegionRatio)` within ±1 px and no
horizontal scroll bar is present.

- [ ] T004 [US1] Replace `height: 100vh` with `100dvh` and add a
      `@supports not (height: 100dvh) { ... }` fallback to
      `100vh` in
      `frontend/src/app/display/display-screen.component.css`
      (selector `.display-screen`).
- [ ] T005 [US1] Replace every fixed `px` font-size and height in
      `frontend/src/app/display/display-screen.component.css`
      with `clamp(min, vh or vw, max)` covering the `.ad-region`,
      `.ad-region__title`, `.branding-overlay`,
      `.branding-overlay__logo`, `.branding-overlay__event-name`,
      `.fallback`, and `.fullscreen-prompt` rules.
- [ ] T006 [US1] Karma spec for SC-001 in
      `frontend/src/app/display/display-screen.component.spec.ts`:
      assert that at 1280×720, 1920×1080, 2560×1440, and
      3840×2160 with the default 5:1 ratio the top region
      height matches `Math.round(viewport.height × 5 / 6)`
      within ±1 px and the ad band height matches
      `Math.round(viewport.height × 1 / 6)` within ±1 px, and
      no horizontal scroll bar is present.

## Phase 4: User Story 2 — Portrait rotation prompt (Priority: P1)

**Goal**: When the device is in portrait, the top region, ad band,
and branding overlay are hidden, a high-contrast prompt is shown
with `aria-live="polite"`, and the polled state continues to
update.

**Independent Test**: rotate from 1920×1080 to 1080×1920; the
prompt is visible within one `matchMedia` change event and the
top region / ad band are absent from the DOM.

- [ ] T007 [P] [US2] Add the portrait prompt block in
      `frontend/src/app/display/display-screen.component.ts`:
      a `<div class="rotate-device" role="status"
      aria-live="polite">Por favor, rota el dispositivo</div>`
      rendered when the orientation signal is `portrait`, and
      hide the existing regions when portrait is active.
- [ ] T008 [US2] Karma spec for SC-003 in
      `frontend/src/app/display/display-screen.component.spec.ts`:
      mock `matchMedia` to flip orientation, assert the prompt
      is in the DOM and the regions are not, and assert the
      polled state observable is still subscribed (the api
      spy is called after the flip).

## Phase 5: User Story 3 — Polled region ratios (Priority: P2)

**Goal**: When the polled `configuration.topRegionRatio` and
`bottomRegionRatio` change, the top region and ad band heights
update accordingly.

**Independent Test**: poll a configuration with `topRegionRatio=3`
and `bottomRegionRatio=1`; the top region is 1620 px tall and the
ad band is 540 px tall at 1920×1080.

- [ ] T009 [P] [US3] Karma spec for SC-005 in
      `frontend/src/app/display/display-screen.component.spec.ts`:
      with the polled configuration `topRegionRatio=3,
      bottomRegionRatio=1`, at 1920×1080 the top region height
      is `Math.round(1080 × 3 / 4)` (1620) within ±1 px and the
      ad band height is `Math.round(1080 × 1 / 4)` (270) within
      ±1 px.

## Phase 6: User Story 4 — Ad figure proportions (Priority: P2)

**Goal**: Every ad figure reserves a stable aspect-ratio cell so
the operator's images keep their proportions across the
supported viewports.

**Independent Test**: with 6 active ads at 1920×1080, every
figure has the same width and the same height, and no image is
clipped by its figure.

- [ ] T010 [US4] Apply `aspect-ratio: 4 / 3` to
      `.ad-region__item` in
      `frontend/src/app/display/display-screen.component.css`
      and replace the existing `grid-template-rows: 0.8fr auto`
      with `display: flex; align-items: center; justify-content:
      center;`; reset the `.ad-region img` rule to
      `width: 100%; height: 100%; max-height: none;
      min-height: 0; object-fit: contain;`.
- [ ] T011 [P] [US4] Move the global `object-fit: cover` rule out
      of the unspecific `img, video, iframe` selector in
      `frontend/src/app/display/display-screen.component.css`
      and keep it only on `.display-content-media`.
- [ ] T012 [US4] Karma spec for SC-004 in
      `frontend/src/app/display/display-screen.component.spec.ts`:
      with 6 active ads at 1920×1080, every `.ad-region__item`
      has width within ±1 px of every other item and height
      within ±1 px of every other item; the inner `<img>` does
      not overflow its figure.

## Phase 7: User Story 5 — Branding overlay layout (Priority: P3)

**Goal**: The branding overlay container carries the layout class
so its children (logo and event name) never overlap, regardless
of which branding fields are populated.

**Independent Test**: with both `organizerLogoUrl` and `eventName`
configured at 1280×720, 1920×1080, and 3840×2160, the logo and
the event name both render inside the overlay container without
overlapping each other.

- [ ] T013 [US5] Add `class="branding-overlay"` to the overlay
      container `<div id="branding-overlay">` in
      `frontend/src/app/display/display-screen.component.ts`,
      and reset the `.branding-overlay__logo` and
      `.branding-overlay__event-name` rules to
      `position: static; opacity: 1; height: auto; max-height:
      clamp(36px, 6vh, 80px);` in
      `frontend/src/app/display/display-screen.component.css`.
- [ ] T014 [P] [US5] Karma spec in
      `frontend/src/app/display/display-screen.component.spec.ts`:
      assert the overlay container carries the
      `branding-overlay` class (not just the `id`), assert the
      logo and the event name both have a non-zero bounding box
      and do not overlap each other at 1280×720, 1920×1080, and
      3840×2160.

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final regression checks and full validation.

- [ ] T015 Run the existing display specs and confirm that
      `prefers-reduced-motion` continues to neutralise CSS
      animations (regression check against
      `frontend/src/styles.scss` line ~159).
- [ ] T016 Run `npm --prefix frontend run build` and confirm it
      exits zero.
- [ ] T017 Run `npm --prefix frontend run test` and confirm it
      exits zero with the new specs green.

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 →
  Phase 7 → Phase 8.
- Within Phase 2, T002 and T003 touch different lines of the
  same file but the bindings are independent, so they can be
  applied in any order or in a single edit.
- T004 and T005 are sequential because both touch the same CSS
  file; the simplest path is one edit per file per user story.
- The Karma specs in each phase MUST run after the
  implementation tasks in the same phase land, so the spec is
  meaningful.

## Parallel Opportunities

- Within Phase 3, T004 and T005 both touch the same CSS file;
  do them in sequence.
- Phase 4 (T007, T008) and Phase 5 (T009) touch the same spec
  file but different sections; they can land in either order
  once the implementation tasks are in.
- Phase 6 (T010, T011, T012) and Phase 7 (T013, T014) both
  touch the same CSS file but at different selectors; T011 and
  T013 can be combined into one CSS edit if preferred.

## Implementation Strategy

1. Land Phase 1 + Phase 2 in a single commit (orientation
   signal + custom property hook).
2. Land Phase 3 (US1, fluid CSS) as the MVP — it produces the
   visible stability win and unblocks SC-001.
3. Land Phase 4 (US2, portrait prompt) — short and additive.
4. Land Phases 5, 6, 7 incrementally; each phase is
   independently testable.
5. Run Phase 8 validation after every phase lands to keep the
   signal-to-noise ratio on regressions low.

## Independent Test per Story

- **US1**: resize the browser between 1280×720 and 3840×2160;
  ratio stays at 5:1 and every element is legible.
- **US2**: rotate to portrait via DevTools; prompt is visible,
  regions are absent, polled state continues to update.
- **US3**: change the polled `topRegionRatio` /
  `bottomRegionRatio`; the rendered heights follow the new
  ratio.
- **US4**: render 6 ads at 1920×1080; every figure is the same
  size and every image fits.
- **US5**: configure both `organizerLogoUrl` and `eventName`;
  the overlay container has the layout class and the children
  do not overlap.

## Suggested MVP Scope

Phase 1 + Phase 2 + Phase 3 (US1) is the smallest slice that
delivers visible value: the kiosk stops breaking on common
screens and the operator's preview window stops jumping.