# Context Pack: CHG-020 Relax Kiosk Region Ratio

## Task classification

- Type: change to existing configuration contract (amendment to relax a CHECK constraint and add form inputs)
- Affected contract: `DISPLAY.CONFIG_SESSION`
- Requires contract update: yes
- Current status: draft
- Extends: `CHG-019`

## Mandatory context

Read these files before planning or implementing:

- `specs/manifest.yml`
- `specs/contracts/display-config-session/contract.md`
- `specs/changes/020-relax-kiosk-region-ratio/spec.md`
- `specs/changes/020-relax-kiosk-region-ratio/plan.md`
- `specs/changes/020-relax-kiosk-region-ratio/tasks.md`
- `docs/adr/0002-display-runtime-region-ratios.md`
- `docs/adr/0004-relax-kiosk-region-ratio.md` (to be created)

## Optional context

Read only if the task explicitly touches the area:

- `docs/adr/0001-token-aware-sdd-governance.md`
- `docs/adr/0003-display-control-event-catalog.md`
- `specs/contracts/display-runtime/contract.md`
- `specs/contracts/event-branding/contract.md`
- `specs/changes/019-display-responsive-runtime/spec.md`
- `specs/changes/019-display-responsive-runtime/context-pack.md`
- `specs/changes/019-display-responsive-runtime/data-model.md`

## Do not read by default

- `specs/archive/**`
- Consolidated change specs under `specs/changes/CHG-001..CHG-014/` unless explicitly referenced
- Stray `specs/019-display-responsive-runtime/` (leftover from before the contract-centric migration; the canonical change spec is under `specs/changes/019-.../`)
- macOS AppleDouble files named `._*`
- Python bytecode caches

## Code entrypoints

### Backend

- `backend/app/repositories/models/kiosk_configuration.py` — relax CHECK constraints, change default to 5
- `backend/app/api/schemas.py` — extend `KioskConfigurationRequest` with `topRegionRatio` / `bottomRegionRatio`
- `backend/app/services/admin_service.py` — persist the new ratio fields in `update_configuration()`
- `backend/app/services/bootstrap_service.py` — seed the new default `top_region_ratio=5`
- `backend/alembic/versions/0015_relax_kiosk_region_ratio.py` — new migration (drop + re-add CHECK + backfill)

### Frontend

- `frontend/src/app/core/api/admin.api.ts` — extend `KioskConfiguration` TypeScript interface
- `frontend/src/app/features/display-config/display-config.component.ts` — add the two `<mat-form-field>` inputs and bind them through `populate` / `buildForm` / `submit` / `initialSnapshot`
- `frontend/src/app/features/display-config/display-config.component.spec.ts` — form binding tests (round-trip, validation, populate, save payload)

## Tests

### Backend (Tests First)

- `backend/tests/unit/test_bootstrap_service.py` — update default assertion from 4 to 5
- `backend/tests/unit/test_configuration_models.py` — update default assertion from 4 to 5
- `backend/tests/integration/test_display_api.py` — update opened state assertion from 4 to 5
- `backend/tests/integration/test_display_configuration.py` — new tests for SC-001 (PUT 3/1 → 200), SC-002 (PUT 0 → 400), PUT 21 → 400, PUT without new fields → defaults 5/1
- `backend/tests/contract/test_remote_control_display_contract.py` — update `topRegionRatio=4` to `topRegionRatio=5`
- `backend/tests/contract/test_v1_display_contract.py` — update `topRegionRatio=4` to `topRegionRatio=5`
- `backend/tests/contract/test_schema_contract.py` — update `topRegionRatio=4` to `topRegionRatio=5` and the assertion

### Frontend

- `frontend/src/app/features/display-config/display-config.component.spec.ts` — extend fixture with `topRegionRatio: 5, bottomRegionRatio: 1`; add new specs for save payload, populate, validation (`min=1`, `max=20`)

## Implementation constraints

- Preserve the existing `configuration_changed` audit event with its current payload shape.
- Preserve role-based access control: PUT `/api/display/configuration` remains restricted to `CONFIGURATION_MANAGEMENT_ROLES`.
- Preserve backwards compatibility: PUT requests that omit `topRegionRatio` / `bottomRegionRatio` MUST continue to work and default to 5 / 1 (so the `test_admin_readiness_api.py` integration test stays green).
- Preserve the bootstrap idempotency: `ensure_mvp_bootstrap_data` MUST NOT reseed if a configuration already exists.
- Do not regress any contract under `DISPLAY.RUNTIME`: the polled state MUST always carry `topRegionRatio` and `bottomRegionRatio`.
- The migration MUST be reversible; `alembic downgrade -1` MUST restore the exact-value CHECK constraints.
