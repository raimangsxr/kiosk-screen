---
id: CHG-020
type: change
status: consolidated
modifies:
  - DISPLAY.CONFIG_SESSION
depends_on: []
extends:
  - CHG-019
supersedes: []
superseded_by: []
consolidated_into:
  - DISPLAY.CONFIG_SESSION
requires_contract_update: true
read_by_default: false
oversize: false
---
# Feature Specification: Kiosk Region Ratio Configurability

**Feature Branch**: `020-relax-kiosk-region-ratio`
**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "Relax the kiosk region ratio constraint from a fixed 4:1 to a configurable value with default 5:1, and surface the two ratio inputs in the admin configuration form so the operator can adjust the split without redeploying the frontend."

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `DISPLAY.CONFIG_SESSION`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes
- Extends: `CHG-019` (the responsive runtime that consumes the polled ratios)
- Related ADRs: `docs/adr/0004-relax-kiosk-region-ratio.md`

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Operator adjusts the region split from the admin form (Priority: P1)

An administrator (or `content_manager` / `advertising_manager` for cross-domain writes) opens the display configuration form at `/admin/configuration`, edits the new **Top region units** and **Bottom region units** inputs, and saves. The backend persists the new ratios in `kiosk_display_configurations`, the audit log records `configuration_changed`, and within one `remoteControlPollingSeconds` cadence the kiosk re-renders the top region and the ad band to the new proportion.

**Why this priority**: the operator has been promising "without redeploying" in spec 002 and spec 019; without this change, the only way to change the split is a direct database update. Closing this loop is what makes the polled-ratios contract (ADR-0002, FR-001 in CHG-019) deliver real value to the operator.

**Independent Test**: PUT `/api/display/configuration` with `topRegionRatio=3, bottomRegionRatio=1` returns 200; subsequent GET returns 3/1; opening the kiosk in a fresh tab re-renders with the top region at 810 px and the ad band at 270 px at 1920×1080.

**Acceptance Scenarios**:

1. **Given** an administrator, **When** PUT `/api/display/configuration` is called with `topRegionRatio=3, bottomRegionRatio=1, ...`, **Then** the response is 200 and a `configuration_changed` audit event is recorded.
2. **Given** a saved configuration with `topRegionRatio=3`, **When** GET `/display/state` is called, **Then** `configuration.topRegionRatio` is 3 and the polled state carries the value end-to-end.
3. **Given** the admin form at `/admin/configuration`, **When** the operator edits **Top region units** from 5 to 3 and saves, **Then** the form's PUT request body includes `topRegionRatio=3`, the response confirms the change, and the snackbar shows "Display configuration saved."

### User Story 2 — Backend rejects out-of-range ratios (Priority: P1)

The backend MUST enforce the new contract range `[1, 20]` for both ratios so the operator cannot accidentally request an absurd split (e.g., `topRegionRatio=0` would collapse the top region, `topRegionRatio=1000` would leave the ad band invisible). Invalid inputs return 400 from `KioskConfigurationRequest` validation and never reach the database.

**Why this priority**: the relaxed CHECK constraint widens the valid set from a single point to a range; without a schema-level range, an operator typo at `/admin/configuration` could silently leave the kiosk broken until someone notices.

**Independent Test**: PUT `/api/display/configuration` with `topRegionRatio=0` returns 400; PUT with `topRegionRatio=21` returns 400; PUT with `topRegionRatio=-1` returns 400. The 400 response body uses the standard `ErrorSchema` shape.

**Acceptance Scenarios**:

1. **Given** `topRegionRatio=0`, **When** PUT is called, **Then** the response is 400 with `code="validation_error"` and a message that names the field.
2. **Given** `topRegionRatio=21`, **When** PUT is called, **Then** the response is 400.
3. **Given** `topRegionRatio=20, bottomRegionRatio=1`, **When** PUT is called, **Then** the response is 200 (boundary value accepted).
4. **Given** `topRegionRatio=1, bottomRegionRatio=1`, **When** PUT is called, **Then** the response is 200 (boundary value accepted).

### User Story 3 — Historical configurations migrate without data loss (Priority: P2)

Existing rows in `kiosk_display_configurations` carry `top_region_ratio=4` from the old contract. After the Alembic migration lands, every existing row MUST be normalized to `top_region_ratio=5` (the new default) so the kiosk keeps the visual ratio it had under the old contract. The migration MUST be idempotent (re-running `alembic upgrade head` does not change the data) and MUST NOT require any operator action.

**Why this priority**: the kiosk is the operator's revenue surface during a live event; a failed migration that strands rows at 4:1 while the frontend now defaults to 5:1 would produce visible inconsistency on every existing deployment until an admin manually intervenes.

**Independent Test**: before the migration, a row has `top_region_ratio=4`; after `alembic upgrade head`, the same row has `top_region_ratio=5` and the new CHECK constraints accept it.

**Acceptance Scenarios**:

1. **Given** a row with `top_region_ratio=4`, **When** the migration runs, **Then** the row's `top_region_ratio` is 5 and the migration is recorded in `alembic_version`.
2. **Given** the migration has already run, **When** the migration is replayed (idempotency), **Then** no rows are touched and the alembic version is unchanged.
3. **Given** `alembic downgrade -1`, **When** the downgrade runs, **Then** the row returns to `top_region_ratio=4` and the original CHECK constraints are restored.

## Edge Cases

- The operator edits the form while a poll is in flight; the polled state at the kiosk reflects the last saved value, not the in-flight edit (the form's `dirty` state keeps the operator aware via `pristine/dirty` markers).
- The operator opens the form before the first GET returns; the form initializes with the new defaults (5/1) so the operator can still save a valid configuration.
- The `configuration_changed` audit event is recorded even when the form's payload does not change the ratio (e.g., only the operator name changed); this is the existing behavior in `AdminService.update_configuration` and is preserved.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST relax the `kiosk_display_configurations` CHECK constraints to `top_region_ratio > 0` and `bottom_region_ratio > 0` (replacing the previous exact-value constraints).
- **FR-002**: The system MUST seed the default ratio values as `top_region_ratio=5, bottom_region_ratio=1` in the bootstrap data.
- **FR-003**: `KioskConfigurationRequest` MUST accept `topRegionRatio` and `bottomRegionRatio` as optional integer fields with `default=5` / `default=1`, `ge=1`, and `le=20`.
- **FR-004**: `KioskConfigurationSchema` MUST continue to expose `topRegionRatio` and `bottomRegionRatio` so the polled state always carries both values (existing behavior, preserved).
- **FR-005**: `AdminService.update_configuration` MUST persist the new ratio values from the payload to the `KioskDisplayConfiguration` row and MUST continue to record a `configuration_changed` audit event.
- **FR-006**: The frontend `KioskConfiguration` TypeScript interface MUST declare `topRegionRatio: number` and `bottomRegionRatio: number`.
- **FR-007**: The display configuration form at `/admin/configuration` MUST expose two new `<mat-form-field>` inputs (`Top region units`, `Bottom region units`) with `type="number"`, `min=1`, `max=20`, `Validators.required`, and `positiveInteger` validation.
- **FR-008**: The form MUST include the new fields in its `populate()`, `buildForm()`, `submit()` payload, and `initialSnapshot` for dirty-state tracking.
- **FR-009**: The migration MUST backfill existing rows: `UPDATE kiosk_display_configurations SET top_region_ratio = 5 WHERE top_region_ratio <> 5` (idempotent).
- **FR-010**: The Alembic migration MUST be reversible: `downgrade()` restores the exact-value CHECK constraints and `top_region_ratio=4`.

### Traceability & Quality Requirements

- **TQ-001**: Each functional requirement MUST map to at least one user story and one measurable success criterion in this spec.
- **TQ-002**: The `DISPLAY.CONFIG_SESSION` active contract MUST be updated to reflect the new ratio contract before implementation (Principle IV).
- **TQ-003**: The `specs/manifest.yml` entry for `CHG-020` MUST be created before implementation and updated to `status: consolidated` after acceptance.
- **TQ-004**: ADR `docs/adr/0004-relax-kiosk-region-ratio.md` MUST record the durable rationale for the `[1, 20]` cap and the default 5/1 (Principle V).
- **TQ-005**: New automated tests MUST cover: PUT valid ratio (SC-001), PUT invalid ratio (SC-002), migration idempotency, form payload round-trip, form validation.

### Key Entities

- **`KioskDisplayConfiguration.top_region_ratio`**: persisted column, relaxed CHECK (`> 0`), default 5. The CSS layer (CHG-019) reads this value via the polled `DisplayState.configuration.topRegionRatio` and binds it to the CSS custom property `--top-ratio`.
- **`KioskDisplayConfiguration.bottom_region_ratio`**: persisted column, relaxed CHECK (`> 0`), default 1. Same flow as above via `--bottom-ratio`.
- **`KioskConfigurationRequest`**: Pydantic request schema for `PUT /api/display/configuration`; adds `topRegionRatio` (default 5, ge=1, le=20) and `bottomRegionRatio` (default 1, ge=1, le=20).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: PUT `/api/display/configuration` with `topRegionRatio=3, bottomRegionRatio=1` returns 200; subsequent GET `/api/display/configuration` returns `topRegionRatio=3, bottomRegionRatio=1`; subsequent GET `/api/display/state` returns `configuration.topRegionRatio=3`.
- **SC-002**: PUT `/api/display/configuration` with `topRegionRatio=0` returns 400 with `code="validation_error"` and the error message names the field.
- **SC-003**: After `alembic upgrade head`, every row in `kiosk_display_configurations` has `top_region_ratio >= 1` and the two new CHECK constraints accept any value `>= 1`.
- **SC-004**: The form at `/admin/configuration` displays `Top region units` and `Bottom region units` inputs, both with `min=1, max=20`. Saving with `topRegionRatio=3` updates the form state and triggers the standard snackbar.
- **SC-005**: The form rejects `topRegionRatio=0` and `topRegionRatio=21` client-side before the PUT is issued (the form control is marked invalid).

## Assumptions

- The kiosk browser remains Chromium 108+; no client-side change in CHG-019 is affected by this backend amend (CHG-019 is gated on `CHG-020` only for the end-to-end SC-005, not for the CSS layer itself).
- The `[1, 20]` cap is a defensive UX choice (ADR-0004); a future operator may request a higher cap in a follow-up spec, but this spec does not promise it.
- Existing audit event handling for `configuration_changed` is preserved unchanged; the event payload continues to include the diff implied by the payload fields, not just the ratio.
- The bootstrap seed for new organizations keeps `top_region_ratio=5`; existing rows are migrated in place.

## Relationships

- Modifies: `DISPLAY.CONFIG_SESSION` (the active contract gains the configurable-ratio contract and the form-binding contract).
- Extends: `CHG-019` (the responsive runtime that consumes the polled ratios end-to-end; CHG-019's US3 / SC-005 require CHG-020 to be in place).
- Depends on: none at the SDD level; this change is a prereq for CHG-019's end-to-end delivery but not for CHG-019's CSS-layer-only validation with mocked state.
- Supersedes: nothing (the original 4:1 contract is replaced by the configurable contract inside `DISPLAY.CONFIG_SESSION`; CHG-002 is already consolidated).
- Superseded by: nothing yet.

## Supersedes

- None.

## Superseded by

- None yet.
