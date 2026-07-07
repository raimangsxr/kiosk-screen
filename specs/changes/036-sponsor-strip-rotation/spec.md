---
id: CHG-036
type: change
status: implemented
modifies:
  - DISPLAY.RUNTIME
  - CONTENT.ROTATION
  - DISPLAY.CONFIG_SESSION
depends_on:
  - CHG-007
  - CHG-014
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
requires_contract_update: true
read_by_default: true
---

# Feature Specification: Sponsor Strip Rotation and Borders

**Feature Branch**: `036-sponsor-strip-rotation` (delivered in PR #35 with CHG-035)

**Created**: 2026-07-07

**Status**: Implemented

**Input**: Fix sponsor strip rotation so all eligible ads are polled and rotated while `inlineAdCount` only controls concurrent visibility; make sponsor cells 1:1 with configurable borders; propagate border and count changes to open kiosks without reload.

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `DISPLAY.RUNTIME`, `CONTENT.ROTATION`, `DISPLAY.CONFIG_SESSION`
- Contract update required before implementation: yes (completed in PR #35)

## User Scenarios & Testing

### User Story 1 — Full ad pool rotates in the sponsor strip (Priority: P1)

An operator configures more active ads than `inlineAdCount`. The kiosk must rotate through the full eligible pool, not only the first N ads returned by the API.

**Why this priority**: Capping the polled list broke sponsor revenue when multiple logos were configured.

**Independent Test**: Configure five active ads with `inlineAdCount = 2`; verify all five appear over two rotation cycles.

**Acceptance Scenarios**:

1. **Given** five eligible active ads and `inlineAdCount = 2`, **When** the kiosk runs ad rotation, **Then** each ad appears according to display order and the timer advances through the full pool.
2. **Given** `inlineAdCount` changes in admin, **When** config sync or the next poll applies, **Then** the concurrent visible count updates without a manual kiosk reload.

---

### User Story 2 — Configurable sponsor cell borders (Priority: P1)

Operators can style sponsor strip items with radius, width, and color from kiosk display configuration.

**Acceptance Scenarios**:

1. **Given** default border settings, **When** the kiosk renders the sponsor strip, **Then** cells are 1:1 with 5px radius, 0px width, and white border color.
2. **Given** custom border values saved in admin, **When** the kiosk polls or receives a cross-tab sync, **Then** rendered cells reflect the new border fields.

---

### User Story 3 — Ad rotation independent of top content (Priority: P1)

Top-content advances in loop mode must not reset or restart the ad rotation timer.

**Acceptance Scenarios**:

1. **Given** loop mode with visible ads, **When** top content advances faster than ad duration, **Then** ad rotation continues on its own cadence.

## Functional Requirements

- **FR-001**: `DisplayState.ads` MUST include every eligible active ad in display order.
- **FR-002**: `inlineAdCount` MUST control only how many ads are visible concurrently in the sponsor strip.
- **FR-003**: Sponsor cells MUST be 1:1 aspect ratio with `object-fit: cover` on images.
- **FR-004**: Border radius, width, and color MUST be configurable via kiosk display configuration (`inlineAdItemBorderRadiusPx`, `inlineAdItemBorderWidthPx`, `inlineAdItemBorderColor`).
- **FR-005**: Ad rotation MUST remain independent of top-content timer advances in loop/rotation mode.
- **FR-006**: Configuration changes for inline ad count and border fields MUST propagate to open kiosks via polling and `DisplayControlSyncService`.

## Success Criteria

- **SC-001**: Unit and integration tests cover full-pool ad rotation with `inlineAdCount < ad count`.
- **SC-002**: Display service returns all eligible ads; mapper does not slice the list to `inlineAdCount`.
- **SC-003**: Contracts `DISPLAY.RUNTIME`, `CONTENT.ROTATION`, and `DISPLAY.CONFIG_SESSION` document the behavior.

## Non-goals

- Admin UI for border fields beyond existing display configuration form.
- Non-square sponsor asset cropping policy changes beyond `object-fit: cover`.
