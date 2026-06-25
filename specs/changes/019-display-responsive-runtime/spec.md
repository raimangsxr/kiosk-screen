---
id: CHG-019
type: change
status: in-progress
modifies:
  - DISPLAY.RUNTIME
  - EVENT.BRANDING
depends_on:
  - CHG-020
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
requires_contract_update: true
read_by_default: true
---
## Oversize justification

`spec.md` is 349 lines (limit 250) because the five user stories
each carry measurable acceptance scenarios and explicit viewport
sizes. The detail is required to make SC-001..SC-005 testable in
Karma at fixed viewports without ambiguity; collapsing the
scenarios would shift the precision into the implementation plan,
which is the wrong layer for testable assertions.

# Feature Specification: Display Responsive Runtime

**Feature Branch**: `019-display-responsive-runtime`
**Created**: 2026-06-25

**Status**: In Progress

**Input**: User description: "Refactor the kiosk display component CSS to be fluid, aspect-ratio aware, orientation-aware, and cross-browser stable while honoring the polled configuration ratios."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Kiosk renders consistently across landscape viewports (Priority: P1)

The kiosk display must remain visually stable and legible across the
landscape viewports the operator and the audience encounter in
practice: laptop preview at 1280×720 and 1920×1080, the standard
kiosk 1920×1080, and large-format displays at 2560×1440 and 3840×2160.
At every viewport the kiosk must render the top region, the sponsor
ad band, and the optional branding overlay without clipped text,
overflowed images, or layout shifts when the operator resizes the
window or the browser enters / leaves fullscreen.

**Why this priority**: the kiosk is the operator's revenue and
identity surface during a live event; a layout that breaks on common
screens kills the experience before any content rotation happens.

**Independent Test**: with the standard 1920×1080 kiosk browser and
the default kiosk configuration (`topRegionRatio=5`,
`bottomRegionRatio=1`), the top region occupies 5/6 of the viewport
height and the ad band occupies 1/6; the same numbers hold at 1280×720
and 2560×1440 without scroll bars, horizontal scroll, or text clipped
at the boundaries.

**Acceptance Scenarios**:

1. **Given** a 1920×1080 landscape viewport with the default kiosk
   configuration, **When** the kiosk renders, **Then** the top region
   is exactly 900 px tall and the ad band is exactly 180 px tall, with
   no scroll bars or layout overflow.
2. **Given** the operator resizes the browser window from 1920×1080
   to 1280×720 during the live event, **When** the kiosk re-renders,
   **Then** the top region and ad band maintain the 5:1 ratio and
   every text element remains legible without manual zoom.
3. **Given** a 3840×2160 (4K) landscape display with the same
   configuration, **When** the kiosk renders, **Then** typography and
   sponsor logos scale up proportionally and no element appears
   smaller than the relative size seen at 1920×1080.
4. **Given** any landscape viewport, **When** the kiosk rotates from
   `loop` to `iframe` and back, **Then** the layout does not shift by
   more than 1 px and the ad band keeps rotating on its configured
   cadence.

### User Story 2 — Kiosk prompts the operator to rotate on portrait (Priority: P1)

The kiosk assumes landscape orientation because the 4:1 sponsor /
content split only makes sense horizontally. When the device is in
portrait (a tablet held vertically, a phone, or a kiosk display with
the cable rotated), the kiosk must hide the top region and the ad
band and surface a single, high-contrast message telling the operator
to rotate the device. The kiosk must keep polling the backend state
while the portrait prompt is visible so no event is missed when the
operator rotates back.

**Why this priority**: this is the explicit, supported fallback for
the only common orientation the kiosk does not serve; without it,
the kiosk either blanks out or renders a broken layout.

**Independent Test**: with a 768×1024 portrait viewport and the
default kiosk configuration, the top region and ad band are not in
the visible DOM, the prompt reads "Por favor, rota el dispositivo" in
the centre of the screen, and the polled state continues to update.

**Acceptance Scenarios**:

1. **Given** the kiosk is open and the device is in portrait,
   **When** the kiosk renders, **Then** the top region, the ad band,
   and the branding overlay are not visible and a single portrait
   prompt is centred on the screen with high contrast.
2. **Given** the portrait prompt is visible, **When** the operator
   rotates the device back to landscape, **Then** the prompt is
   removed within one polling cadence and the top region plus ad band
   are visible again with the last known content state.
3. **Given** the device is in portrait, **When** the polled state
   changes (e.g., a new ad arrives), **Then** the kiosk keeps the
   state up to date even though it is not rendering the regions.

### User Story 3 — Kiosk honours the polled region ratios (Priority: P2)

The kiosk must surface the top / bottom region ratio from the polled
`configuration.topRegionRatio` and `configuration.bottomRegionRatio`
so the operator can adjust the split from the admin configuration
without redeploying the frontend. The 4:1 (or 5:1) default remains the
baseline; a future operator might want a 3:1 split to give the ads
more space.

**Why this priority**: today the CSS hard-codes a 5.25:1 split that
does not match the spec's 5:1 default; this story makes the layout
configurable as the spec already promises.

**Independent Test**: with `topRegionRatio=3` and `bottomRegionRatio=1`
in the polled configuration, the top region occupies 3/4 and the ad
band occupies 1/4 of the viewport height at 1920×1080.

**Acceptance Scenarios**:

1. **Given** the polled configuration has `topRegionRatio=3` and
   `bottomRegionRatio=1`, **When** the kiosk renders at 1920×1080,
   **Then** the top region is 810 px tall and the ad band is 270 px
   tall.
2. **Given** the polled configuration has `topRegionRatio=7` and
   `bottomRegionRatio=3`, **When** the kiosk renders, **Then** the
   top region occupies 7/10 and the ad band occupies 3/10 of the
   viewport height.
3. **Given** the polled state is null (the initial poll has not
   returned yet), **When** the kiosk renders, **Then** the default
   5:1 ratio applies so the layout is stable before any state
   arrives.

### User Story 4 — Kiosk renders ad images with consistent proportions (Priority: P2)

Each ad figure must reserve a stable aspect-ratio cell so the
operator's uploaded sponsor logos and banner images keep their
proportions and never collapse to a thin sliver or stretch to a
tall ribbon. When the ad band is hidden via the remote control, the
remaining region must fill the freed space.

**Why this priority**: today the ad image sizes are driven by a
`min-height: 60px / max-height: 120px` floor combined with a fixed
percentage of the figure, which produces inconsistent rendering
across browsers and screen sizes.

**Independent Test**: with 6 active ads in the polled state, every
ad figure has the same width and the same height, every ad image is
fully visible inside its figure (no clipping), and the figures share
a single row.

**Acceptance Scenarios**:

1. **Given** 6 active ads in the polled state at 1920×1080,
   **When** the kiosk renders, **Then** every ad figure has the same
   width and the same height, the images inside fit without
   cropping, and the figures share a single horizontal row.
2. **Given** the operator issues `adsVisible=false` from the remote
   control, **When** the kiosk re-renders, **Then** the ad band is
   not in the DOM and the top region fills the entire viewport.
3. **Given** a sponsor uploads a tall portrait ad image,
   **When** the kiosk renders, **Then** the image is centred inside
   its figure with empty space above and below, not cropped.

### User Story 5 — Kiosk keeps the branding overlay visible at every landscape viewport (Priority: P3)

The branding overlay (organizer logo and event name) must remain
visible, legible, and free of layout overlap across the supported
landscape viewports. Today the overlay's parent container is
identified by `id` only, not by the class that carries the layout
rules, so the children can collide with each other.

**Why this priority**: this is the on-screen identity of the event;
making sure the overlay never collides with itself is a polish item
that lives inside this responsive refactor.

**Independent Test**: at 1280×720, 1920×1080, and 3840×2160, when
both the organizer logo and the event name are configured, they
render side by side inside a single overlay container without
overlapping each other.

**Acceptance Scenarios**:

1. **Given** both `organizerLogoUrl` and `eventName` are configured,
   **When** the kiosk renders, **Then** the logo and the event name
   are both visible inside the same overlay container and neither
   one occludes the other.
2. **Given** only the event name is configured (no logo),
   **When** the kiosk renders, **Then** the event name is centred or
   anchored to its expected edge inside the overlay container.
3. **Given** no branding fields are configured, **When** the kiosk
   renders, **Then** no overlay is in the DOM (same as today).

### Edge Cases

- The kiosk browser is opened before the first polled state arrives;
  the layout must already be stable using the default 5:1 ratio.
- The operator opens the kiosk in a window narrower than 1280 px
  (e.g., a 1024×768 projector preview); the layout must still render
  without horizontal scroll, even though the device is not the
  primary target.
- The operator switches into and out of fullscreen; the kiosk must
  re-measure on the new viewport without leaving stale pixels from
  the previous size.
- The polled state advertises `adsVisible=false` while the operator
  is mid-resize; the kiosk must finish the resize without flashing
  the ad band.
- The operator's CSS prefers-reduced-motion is set; the existing
  global reduced-motion rule continues to neutralise the rotation
  animations, and this spec does not regress that behaviour.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The kiosk display component MUST compute the height of
  the top region and the ad band from the polled
  `configuration.topRegionRatio` and `configuration.bottomRegionRatio`
  (defaulting to 5 and 1 respectively), and MUST use a stable
  default ratio before the first polled state arrives.
- **FR-002**: The kiosk display component MUST size the host
  container to the viewport using dynamic viewport units
  (`dvh`/`svh` with a `vh` fallback) so the layout remains stable
  when the browser chrome resizes or the device enters / leaves
  fullscreen.
- **FR-003**: The kiosk display component MUST use fluid typography
  (CSS `clamp()`) for every text element so the type remains legible
  from 1280×720 to 3840×2160 without per-breakpoint media queries
  for every value.
- **FR-004**: The kiosk display component MUST apply an `aspect-ratio`
  to every ad figure so the operator's images keep their proportions
  regardless of how many ads are visible or how wide the viewport is.
- **FR-005**: The kiosk display component MUST detect landscape vs
  portrait orientation and, while in portrait, hide the top region,
  ad band, and branding overlay, and surface a single high-contrast
  prompt asking the operator to rotate the device; the polled state
  MUST continue to update while the prompt is visible.
- **FR-006**: The kiosk display component MUST ensure the branding
  overlay's container carries the layout class so its children
  (logo and event name) never overlap each other across the
  supported landscape viewports.
- **FR-007**: The kiosk display component MUST keep the existing
  rotation timer, the `KioskRotationController` contract, the
  cross-tab sync, the fullscreen flow, and the empty-queue POST
  intact; this spec is restricted to presentation changes.
- **FR-008**: The kiosk display component MUST keep the existing
  `prefers-reduced-motion` behaviour (the global rule that
  neutralises CSS animations when the operator requests reduced
  motion); this spec MUST NOT regress that behaviour.
- **FR-009**: The kiosk display component MUST scope `object-fit:
  cover` to the top-region media only and MUST NOT apply it to the
  ad images (ads must keep their natural proportions via
  `object-fit: contain`).
- **FR-010**: The kiosk display component MUST remove the
  `overflow: hidden` from the host container when an alternative
  (per-region overflow handling) prevents content from being
  silently clipped; only sub-regions that genuinely need clipping
  (e.g., the ad figure) MAY carry `overflow: hidden`.

### Traceability & Quality Requirements *(mandatory)*

- **TQ-001**: Each functional requirement MUST map to at least one
  user story and one measurable success criterion in this spec.
- **TQ-002**: Changed presentation behaviour MUST be testable
  through Karma specs that assert computed styles and rendered
  geometry at fixed viewports (1280×720, 1920×1080, 2560×1440,
  3840×2160) and at the portrait orientation.
- **TQ-003**: This spec introduces no new public or integration
  boundary; the only contract touched is the existing polled
  `DisplayState.configuration` shape, which is reused unchanged.
- **TQ-004**: Security, observability, and accessibility are not
  in scope for this spec; the existing event / audit pipeline
  continues to capture every state transition and the portrait
  prompt MUST be announced via an `aria-live` region.
- **TQ-005**: Speculative features (mobile-first redesign,
  high-contrast admin themes, animated orientation transitions) are
  out of scope and MUST NOT be implemented implicitly.

### Key Entities *(include if feature involves data)*

- **`DisplayKioskConfiguration.topRegionRatio`** (consumed): the
  ratio numerator used to size the top region. The CSS reads this
  via a CSS custom property and defaults to 5 before the first poll
  arrives.
- **`DisplayKioskConfiguration.bottomRegionRatio`** (consumed): the
  ratio denominator used to size the ad band. The CSS reads this
  via a CSS custom property and defaults to 1 before the first poll
  arrives.
- **OrientationState** (derived): the current viewport orientation,
  computed in the component from `matchMedia('(orientation: portrait)')`,
  driving the portrait prompt visibility.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At 1920×1080, 2560×1440, and 3840×2160 with the
  default 5:1 ratio, the top region height matches the expected
  `viewport.height × topRegionRatio / (topRegionRatio + bottomRegionRatio)`
  within ±1 px; no horizontal scroll bar is present.
- **SC-002**: At 1280×720 with the default 5:1 ratio, every text
  element in the ad band and the branding overlay measures at least
  14 px in computed font size and no text is clipped by its
  container.
- **SC-003**: When the viewport is rotated from 1920×1080 landscape
  to 1080×1920 portrait and back, the kiosk hides the regions and
  shows the portrait prompt within one `matchMedia` event cycle,
  and the prompt is replaced by the rendered regions within one
  polling cadence (default 5 s).
- **SC-004**: With 6 active ads at 1920×1080, every ad figure has
  width within ±1 px of every other figure and height within ±1 px
  of every other figure; no ad image is clipped by its figure.
- **SC-005**: When the polled `configuration.topRegionRatio=3` and
  `bottomRegionRatio=1`, the top region height at 1920×1080 is
  810 px and the ad band height is 270 px (within ±1 px).

## Assumptions

- The kiosk browser is Chromium (Chrome or Edge) running on a
  desktop, kiosk machine, or operator laptop; Firefox and Safari
  will render correctly with the same CSS but are not the primary
  QA target for this spec.
- The viewport is in landscape; portrait is a fallback only.
- The polled `DisplayState.configuration` continues to expose
  `topRegionRatio` and `bottomRegionRatio` (CHG-020 makes these
  independently configurable in `[1, 20]` with default 5/1; see
  `ADR-0002` and `ADR-0004`). The backend is the single source of
  truth for these values.
- The CSS custom property hook is the only contract this spec
  introduces at the boundary between the polled state and the
  stylesheet.
- The existing `KioskRotationController`, `DisplayRotationService`,
  `DisplayControlSyncService`, and `EventBrandingService` are not
  modified by this spec; only the component template and CSS are
  touched.

## Supersedes

- None.

## Superseded by

- None yet.