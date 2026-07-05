---
id: CHG-028
type: change
status: in-progress
modifies:
  - DISPLAY.RUNTIME
depends_on:
  - CHG-019
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
requires_contract_update: true
read_by_default: true
oversize: false
---
# Feature Specification: Top Content Blur-Fill Media Fit

**Feature Branch**: `028-top-content-media-fit`
**Created**: 2026-07-05

**Status**: In progress

**Input**: Top Content photos and videos must show the full frame without cropping or distortion when region ratios and media aspect ratios differ. Use a blurred backdrop fill (blur-fill) for letterbox/pillarbox bands.

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `DISPLAY.RUNTIME`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes
- Related ADRs: `docs/adr/0007-top-content-blur-fill.md`
- Supersedes FR-009 of CHG-019 (top-region `object-fit: cover`)

## User Scenarios & Testing

### User Story 1 — Full-frame photo and video in top region (Priority: P1)

An operator configures mixed-aspect photos and videos in the top content queue. The kiosk renders each item with the full frame visible (`object-fit: contain`) and fills unused band space with a blurred copy of the same media.

**Independent Test**: At 1920×1080 with default 5:1 ratio, a portrait photo renders with `object-fit: contain` on the foreground element and a `.top-region__media-backdrop` sibling is present.

**Acceptance Scenarios**:

1. **Given** active top content of type photo, **When** the kiosk renders landscape, **Then** the foreground uses `object-fit: contain` and is not cropped.
2. **Given** active top content of type video, **When** the kiosk renders landscape, **Then** the foreground uses `object-fit: contain` and a backdrop video layer fills the region behind it.
3. **Given** `prefers-reduced-motion: reduce`, **When** photo/video renders, **Then** the backdrop uses solid `#102832` instead of blur.

### User Story 2 — Iframe unchanged (Priority: P2)

Pinned iframe content continues to fill the top region without blur-fill framing.

**Independent Test**: Fixed iframe mode renders a single iframe with no `.top-region__media-frame` wrapper.

## Functional Requirements

- **FR-001**: Top-region photo and video MUST use `object-fit: contain` on the foreground layer.
- **FR-002**: Top-region photo and video MUST include a decorative backdrop layer (same source, cover + blur) inside `.top-region__media-frame`.
- **FR-003**: The backdrop MUST be `aria-hidden="true"` and MUST NOT receive pointer events.
- **FR-004**: Pinned iframes MUST continue to fill the top region without blur-fill in v1.
- **FR-005**: Under `prefers-reduced-motion: reduce`, the backdrop blur MUST be replaced by solid `#102832`.
- **FR-006**: Region ratio layout (grid, SC-001, SC-005) MUST NOT regress.

## Success Criteria

- **SC-001**: Karma specs assert `object-fit: contain` on foreground top content at 1920×1080.
- **SC-002**: Karma specs assert `.top-region__media-backdrop` exists for photo/video and is absent for iframe/fallback.
- **SC-003**: Existing ratio geometry specs (5:1, 3:1, 7:3) continue to pass.
