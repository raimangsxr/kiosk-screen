# Research: Kiosk Region Ratio Configurability

**Date**: 2026-06-25
**Spec**: [spec.md](./spec.md)

## Decision: Relax the CHECK constraint from `= 4` / `= 1` to `> 0`

- **Decision**: Replace `CheckConstraint("top_region_ratio = 4", ...)` and `CheckConstraint("bottom_region_ratio = 1", ...)` with `CheckConstraint("top_region_ratio > 0", ...)` and `CheckConstraint("bottom_region_ratio > 0", ...)`.
- **Rationale**: The exact-value constraints were a defensive simplification from the early MVP. The polled-state pipeline (ADR-0002) already carries `topRegionRatio` and `bottomRegionRatio`, and the responsive runtime (CHG-019) consumes them. The exact-value constraints block the only end-to-end story that justifies the polled pipeline.
- **Alternatives considered**:
  - Drop CHECK entirely: rejected. A `topRegionRatio=0` would collapse the top region; we want at least `> 0`.
  - Keep CHECK `= 4` and override in the application: rejected. The application would then be the single source of truth for the ratio, which contradicts ADR-0002.

## Decision: Default `topRegionRatio=5, bottomRegionRatio=1` (5:1 split)

- **Decision**: Seed the bootstrap with `5 / 1`; backfill existing rows to `5` on migration.
- **Rationale**: The user clarified that the intended split is `5/6 + 1/6` (5:1) — that is the visual layout described in CHG-019 US1 AS1 and SC-001. The historical `4:1` was an implementation artefact, not a design choice. Defaulting to `5:1` matches the polled contract from day one.
- **Alternatives considered**:
  - Keep `4:1` as the default to preserve historical layout: rejected. The 4:1 was tied to the exact-value CHECK; once the contract is configurable, the default should match the documented intent.
  - Allow the operator to choose the default at bootstrap time: rejected. That is a separate feature; the bootstrap is a single-row seed.

## Decision: Schema-level cap `[1, 20]`

- **Decision**: Pydantic `ge=1, le=20`; HTML `min=1, max=20`; `Validators.min(1), Validators.max(20)`.
- **Rationale**: An unbounded ratio is a footgun. A `topRegionRatio=1000, bottomRegionRatio=1` would leave the ad band at < 0.1% of the viewport and break legibility. Twenty covers every realistic split (the largest described in CHG-019 is 7:3, well under 10:1). The `[1, 20]` range is the smallest cap that does not require the operator to think about it.
- **Alternatives considered**:
  - No cap (only `ge=1`): rejected. Defensive UX is a contract, not a nice-to-have.
  - Larger cap (e.g., `[1, 100]`): rejected. The cap should match legibility, not abstract safety.

## Decision: Pydantic fields are optional with defaults

- **Decision**: `top_region_ratio: int = Field(default=5, alias="topRegionRatio", ge=1, le=20)` — no required flag.
- **Rationale**: Backwards compatibility with the existing `test_admin_readiness_api.py:21` PUT that omits both fields. Existing PUT payloads must continue to work without modification.
- **Alternatives considered**:
  - Make the fields required: rejected. Breaks the existing integration test and any in-flight operator PUT that does not include the new fields.

## Decision: Form binding lives in this change

- **Decision**: Add two new `<mat-form-field>` inputs (`Top region units`, `Bottom region units`) with `Validators.required`, `Validators.min(1)`, `Validators.max(20)`.
- **Rationale**: CHG-019's US3 promises "the operator can adjust the split from the admin configuration without redeploying the frontend". Without form binding, that promise is false. The user confirmed the form binding lives in this change (CHG-020), not in CHG-019.
- **Alternatives considered**:
  - Defer the form binding to a future change: rejected. The end-to-end promise is the whole point of this change.
  - Restrict the form to `administrator` role: rejected. The existing `AdminService.update_configuration` already restricts to `CONFIGURATION_MANAGEMENT_ROLES` (administrator, content_manager, advertising_manager); the form is already behind those roles.

## Out-of-scope research

- Multi-organization ratio overrides (per-event or per-kiosk): deferred. The kiosk configuration is per-organization today; a finer-grained override would require a new entity.
- Ratio presets (e.g., "compact", "standard", "presentation"): deferred. The form exposes two inputs; presets would be a UX layer on top, not a contract change.
- Server-side clamping with `Math.max(1, value)`: deferred to CHG-019 (the CSS layer already documents this defensive clamp in `data-model.md`).

## Assumptions

- The kiosk browser remains Chromium 108+. No client-side change is required by this change.
- The existing `KioskRotationController`, `DisplayRotationService`, `DisplayControlSyncService`, and `EventBrandingService` are not touched by this change.
- The `configuration_changed` audit event continues to be recorded on every successful PUT; the payload shape is unchanged.
