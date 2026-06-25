# Implementation Plan: Kiosk Region Ratio Configurability

**Branch**: `020-relax-kiosk-region-ratio` | **Date**: 2026-06-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/changes/020-relax-kiosk-region-ratio/spec.md`

## Context Grounding

- Manifest read: `specs/manifest.yml`
- Active contracts read: `specs/contracts/display-config-session/contract.md`, `specs/contracts/display-runtime/contract.md`
- Change specs read: `specs/changes/020-relax-kiosk-region-ratio/spec.md`, `specs/changes/019-display-responsive-runtime/spec.md` (for extension relationship)
- Context pack read: `specs/changes/020-relax-kiosk-region-ratio/context-pack.md`
- ADRs read: `docs/adr/0001-token-aware-sdd-governance.md`, `docs/adr/0002-display-runtime-region-ratios.md`
- Code entrypoints verified: `backend/app/repositories/models/kiosk_configuration.py`, `backend/app/api/schemas.py`, `backend/app/services/admin_service.py`, `backend/app/services/bootstrap_service.py`, `frontend/src/app/core/api/admin.api.ts`, `frontend/src/app/features/display-config/display-config.component.ts`
- Tests identified: `backend/tests/unit/test_bootstrap_service.py`, `backend/tests/unit/test_configuration_models.py`, `backend/tests/integration/test_display_api.py`, `backend/tests/contract/test_*.py`, `frontend/src/app/features/display-config/display-config.component.spec.ts`
- Archived or consolidated specs read: none (CHG-002 already consolidated; the contract `display-config-session/contract.md` is the source of truth)

## Summary

Relax the kiosk region ratio from a fixed 4:1 contract to a configurable contract with default 5/1. The technical approach is:

1. Replace the exact-value `CheckConstraint` with positive-value `CheckConstraint` in the SQLAlchemy model.
2. Backfill existing rows in an Alembic migration (`UPDATE ... SET top_region_ratio = 5 WHERE <> 5`) and make the migration reversible.
3. Extend the Pydantic request schema with two new optional integer fields (`ge=1, le=20`).
4. Persist the new fields in `AdminService.update_configuration()` while preserving the `configuration_changed` audit event.
5. Reseed the bootstrap service with the new default `top_region_ratio=5`.
6. Extend the TypeScript `KioskConfiguration` interface and the display-config form with two new number inputs (`min=1, max=20`).
7. Update existing contract and unit / integration / contract tests that previously asserted `top_region_ratio == 4`.
8. Add new tests for the relaxed contract (SC-001, SC-002), the migration idempotency, and the form binding (SC-004, SC-005).

## Technical Context

- **Language/Version**: Python 3.12 (backend), TypeScript 5.8 (frontend).
- **Primary Dependencies**: FastAPI, SQLAlchemy 2, Alembic, Pydantic v2 (backend); Angular 17, Reactive Forms, Material 3 (frontend).
- **Storage**: PostgreSQL via SQLAlchemy; one new Alembic migration.
- **Testing**: pytest for backend (unit, integration, contract); Karma + Jasmine for the form spec.
- **Target Platform**: backend container (docker) + Chromium browser kiosk.
- **Project Type**: web app (FastAPI + Angular).
- **Performance Goals**: no change in polling cadence; the new inputs add at most two more integer fields to the configuration payload.
- **Constraints**: backward-compatible PUT (omitted fields default to 5/1); no new external dependencies; no schema additions beyond the two fields already present in the response.
- **Scale/Scope**: one migration, one model change, one schema change, one service-method extension, one bootstrap line, one TS interface, one form component, ~10 test files touched.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I (Active Contracts Are Source of Truth)**: pass — this plan updates `DISPLAY.CONFIG_SESSION` contract before any code change and reads it as the source of truth.
- **II (Manifest-Driven Context Selection)**: pass — the entrypoint is `specs/manifest.yml`; the active change is `CHG-020`; the context pack enumerates mandatory vs optional vs excluded reads.
- **III (Change Specs Are Incremental Records)**: pass — CHG-020 declares `status: draft`, `modifies: [DISPLAY.CONFIG_SESSION]`, `extends: [CHG-019]`, `requires_contract_update: true`, `read_by_default: false`; the change spec is incremental and gets consolidated after acceptance.
- **IV (Contract Updates Before Implementation)**: pass — Step 2 of the plan updates `specs/contracts/display-config-session/contract.md` before any backend code change in Step 8; the contract describes the post-CHG-020 state.
- **V (Derived Artifacts Are Not Hidden Truth)**: pass — durable rationale for the `[1, 20]` cap and the default 5/1 lives in `docs/adr/0004-relax-kiosk-region-ratio.md`; the change spec and plan operationalize the decision.
- **VI (Tests For Changed Behavior)**: pass — backend unit / integration / contract tests are updated; new tests cover SC-001 (valid PUT), SC-002 (invalid PUT), SC-003 (migration), SC-004 (form display), SC-005 (form validation).
- **VII (Token-Aware Context Packs)**: pass — `context-pack.md` enumerates mandatory context, optional context, excluded reads, code entrypoints, and tests.
- **VIII (Supersedes Means Replacement)**: pass — this change uses `modifies` and `extends` for weaker relationships; `supersedes: []` is empty. The historical 4:1 contract is replaced inside the active contract `DISPLAY.CONFIG_SESSION`, not via a separate supersedes claim.

## Project Structure

### Documentation for this change

```text
specs/changes/020-relax-kiosk-region-ratio/
├── spec.md
├── context-pack.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
└── checklists/
    └── requirements.md
```

### Source code touched

```text
backend/
├── alembic/versions/0015_relax_kiosk_region_ratio.py   # new migration
├── app/repositories/models/kiosk_configuration.py      # relax CHECK, default 5
├── app/api/schemas.py                                  # add topRegionRatio / bottomRegionRatio to KioskConfigurationRequest
├── app/services/admin_service.py                       # persist the new fields
├── app/services/bootstrap_service.py                   # seed default 5
└── tests/                                              # unit + integration + contract updates

frontend/
├── src/app/core/api/admin.api.ts                       # extend KioskConfiguration interface
└── src/app/features/display-config/
    ├── display-config.component.ts                     # add two new mat-form-field inputs
    └── display-config.component.spec.ts                # form binding tests
```

### Active contract updates

```text
specs/contracts/display-config-session/contract.md      # gain configurable-ratio contract
specs/manifest.yml                                     # add CHG-020 entry
docs/adr/0004-relax-kiosk-region-ratio.md              # new ADR
```

## Phase 0: Outline & Research

Research already captured in `research.md`:

- The historical 4:1 contract was a defensive simplification, not a design choice; the polled-state pipeline already carries `topRegionRatio` and `bottomRegionRatio` for ADR-0002.
- The `[1, 20]` cap is a UX safety bound; ratios above 20 would push the smaller region under ~5% of the viewport and break legibility.
- Default 5/1 (instead of preserving 4/1) reflects the user-intent confirmation that "5/6 + 1/6" is the intended kiosk layout; ADR-0002 already encodes the polled-source-of-truth principle.

## Phase 1: Design & Contracts

### Data model

- `kiosk_display_configurations.top_region_ratio`: INTEGER, CHECK > 0, default 5.
- `kiosk_display_configurations.bottom_region_ratio`: INTEGER, CHECK > 0, default 1.
- `KioskConfigurationRequest.topRegionRatio`: int, default 5, ge=1, le=20.
- `KioskConfigurationRequest.bottomRegionRatio`: int, default 1, ge=1, le=20.
- `KioskConfiguration` (TS): gains `topRegionRatio: number; bottomRegionRatio: number;`.

### Active contract updates

- `specs/contracts/display-config-session/contract.md`: extend `## Current behavior` with two bullets describing the configurable contract; add `CHG-020` to `## Change history`.

### ADR updates

- New `docs/adr/0004-relax-kiosk-region-ratio.md` (Status: Accepted-upon-consolidation).

## Phase 2: Task Planning Approach

Tasks follow the SDD governance + user-story hybrid structure used by `CHG-019` (Phase 1 SDD Governance, then per-user-story implementation, then validation & consolidation).

- Phase 1: SDD Governance & Context (T001-T001d).
- Phase 2: Backend Foundational (migration, model, schema, service, bootstrap — T002-T006).
- Phase 3: Backend Tests First (T007-T008).
- Phase 4: Frontend Foundational (TS interface + form binding — T009-T010).
- Phase 5: Frontend Tests First (T011).
- Phase 6: Validation & Consolidation (T012-T016).

## Phase 3: Implementation Outline

1. Land the migration and the relaxed CHECK first so the database can hold 5:1 before any test asserts it.
2. Land the Pydantic request schema with defaults so existing PUTs (without the new fields) keep working.
3. Land the service-method extension so PUT actually persists the new fields.
4. Land the bootstrap reseed so new organizations get 5/1 from day one.
5. Land the TS interface and the form inputs; tests first, then implementation.
6. Update the contract + manifest + ADR as part of consolidation, not as part of implementation.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| None | The change is bounded to the configuration domain and follows the existing CHG-002 pattern. | n/a |
