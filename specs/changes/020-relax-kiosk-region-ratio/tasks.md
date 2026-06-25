---

description: "Task list for the kiosk region ratio configurability change"

---

# Tasks: Kiosk Region Ratio Configurability

**Input**: Design documents from `/specs/changes/020-relax-kiosk-region-ratio/`

**Prerequisites**: `spec.md`, `context-pack.md`, `plan.md`, affected active contracts, `research.md`, `data-model.md`, `quickstart.md`

**Tests**: Tests are mandatory for changed behavior. Backend contract / integration / unit tests and Angular specs are preferred over manual validation (Principle VI).

**Organization**: Tasks are grouped into SDD Governance, Backend Implementation, Backend Tests, Frontend Implementation, Frontend Tests, and Validation & Consolidation.

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- Backend: `backend/app/...`, `backend/tests/...`, `backend/alembic/versions/...`
- Frontend: `frontend/src/app/...`

## Phase 1: SDD Governance & Context

**Purpose**: Confirm the active change, the affected active contract, and the minimal context before any implementation change is made.

- [ ] T001 Verify the working branch `020-relax-kiosk-region-ratio` and the active change artefacts at `specs/changes/020-relax-kiosk-region-ratio/{spec.md,context-pack.md,plan.md,research.md,data-model.md,quickstart.md,checklists/}`.
- [ ] T001a Read `specs/manifest.yml` and confirm the absence of `CHG-020` (it is being added by this change).
- [ ] T001b Read `specs/contracts/display-config-session/contract.md` as the active source of truth for the current ratio contract.
- [ ] T001c Update `specs/contracts/display-config-session/contract.md` to describe the new configurable ratio contract (before any backend code change, per Principle IV).
- [ ] T001d Update `specs/manifest.yml` to add `CHG-020` under `changes:` and to add `CHG-020` to `DISPLAY.CONFIG_SESSION.related_changes`.
- [ ] T001e Create `docs/adr/0004-relax-kiosk-region-ratio.md` with the durable rationale (cap 20, default 5/1, form binding).

## Phase 2: Backend Implementation

**Purpose**: Land the migration, the model, the Pydantic schema, the service, and the bootstrap in a single coherent commit.

- [ ] T002 Create the Alembic migration `backend/alembic/versions/0015_relax_kiosk_region_ratio.py`: drop the two exact-value CHECK constraints, backfill `UPDATE kiosk_display_configurations SET top_region_ratio = 5 WHERE top_region_ratio <> 5`, and re-add the CHECK constraints as `top_region_ratio > 0` and `bottom_region_ratio > 0`. The `downgrade()` is symmetric: drop the positive CHECK, restore `= 4` / `= 1`, no UPDATE.
- [ ] T003 Update `backend/app/repositories/models/kiosk_configuration.py`: change `CheckConstraint("top_region_ratio = 4", name="ck_kiosk_top_region_ratio")` to `CheckConstraint("top_region_ratio > 0", name="ck_kiosk_top_region_ratio_positive")`; same for bottom (rename constraint name to `ck_kiosk_bottom_region_ratio_positive`). Change `default=4` to `default=5` for `top_region_ratio`.
- [ ] T004 [P] Update `backend/app/api/schemas.py`: in `KioskConfigurationRequest`, add `top_region_ratio: int = Field(default=5, alias="topRegionRatio", ge=1, le=20)` and `bottom_region_ratio: int = Field(default=1, alias="bottomRegionRatio", ge=1, le=20)`.
- [ ] T005 [P] Update `backend/app/services/admin_service.py`: in `update_configuration()`, assign `configuration.top_region_ratio = payload.top_region_ratio` and `configuration.bottom_region_ratio = payload.bottom_region_ratio` before the audit-event line; leave the rest of the method unchanged.
- [ ] T006 [P] Update `backend/app/services/bootstrap_service.py`: change the seeded `top_region_ratio` from 4 to 5.

## Phase 3: Backend Tests First (then update existing)

**Purpose**: Add the new contract tests, then update the existing tests that asserted the 4:1 default.

- [ ] T007 [P] New test file `backend/tests/integration/test_display_configuration.py` (or extend the existing one if present) with three specs:
  - SC-001: PUT `topRegionRatio=3, bottomRegionRatio=1` returns 200; subsequent GET `/api/display/configuration` returns 3/1; subsequent GET `/api/display/state` returns `configuration.topRegionRatio=3`.
  - SC-002: PUT `topRegionRatio=0` returns 400 with `code="validation_error"`.
  - SC-002: PUT `topRegionRatio=21` returns 400.
- [ ] T008 [P] Update existing backend tests to assert the new default:
  - `backend/tests/unit/test_bootstrap_service.py`: `assert result.configuration.top_region_ratio == 5`.
  - `backend/tests/unit/test_configuration_models.py`: `assert configuration.top_region_ratio == 5`.
  - `backend/tests/integration/test_display_api.py`: `assert opened.json()["configuration"]["topRegionRatio"] == 5`.
  - `backend/tests/contract/test_remote_control_display_contract.py`: replace `topRegionRatio=4` with `topRegionRatio=5` and the payload's `"topRegionRatio": 4` with `5`.
  - `backend/tests/contract/test_v1_display_contract.py`: replace `topRegionRatio=4` with `topRegionRatio=5` (both occurrences).
  - `backend/tests/contract/test_schema_contract.py`: replace `topRegionRatio=4` with `topRegionRatio=5` and the assertion.

## Phase 4: Frontend Implementation

**Purpose**: Extend the TypeScript contract and the display-config form with the two new inputs.

- [ ] T009 Update `frontend/src/app/core/api/admin.api.ts`: in the `KioskConfiguration` interface, add `topRegionRatio: number; bottomRegionRatio: number;`.
- [ ] T010 Update `frontend/src/app/features/display-config/display-config.component.ts`:
  - In the `FormGroup` type literal (line ~265), add `topRegionRatio: FormControl<number>; bottomRegionRatio: FormControl<number>;`.
  - In `buildForm()` (~line 344), add `topRegionRatio: this.fb.nonNullable.control(5, { validators: [Validators.required, Validators.min(1), Validators.max(20)] })` and the same for `bottomRegionRatio` with default `1`.
  - Add a new section "Region ratio" in the template (after the "Kiosk settings" section starts) with two `<mat-form-field>` inputs (`type="number"`, `min="1"`, `max="20"`, `required`) bound to the new form controls; include `mat-error` messages for `min` and `max`.
  - In `populate()` (~line 378), populate `topRegionRatio` and `bottomRegionRatio` from `config`.
  - In `submit()` payload (~line 316), include `topRegionRatio: value.topRegionRatio` and `bottomRegionRatio: value.bottomRegionRatio`.
  - The `snapshot()` helper (used by `hasUnsavedChanges()`) already serializes the form; no change needed.

## Phase 5: Frontend Tests First

**Purpose**: Cover the new form binding with Karma specs.

- [ ] T011 Update `frontend/src/app/features/display-config/display-config.component.spec.ts`:
  - Extend the `configuration` fixture (line 12) with `topRegionRatio: 5, bottomRegionRatio: 1`.
  - New spec: `save()` PUT body includes `topRegionRatio` and `bottomRegionRatio` with the values from the form.
  - New spec: `populate()` writes the GET values into the form controls.
  - New spec: validation rejects `topRegionRatio=0` (control marked invalid) and `topRegionRatio=21`.
  - New spec: round-trip with `topRegionRatio=3, bottomRegionRatio=1` is accepted end-to-end (save PUT + re-populate from the response).

## Phase 6: Validation & Consolidation

**Purpose**: Run the narrow tests, the broader validation, and consolidate the change into the contract and manifest.

- [ ] T012 Run the narrow backend tests: `pytest backend/tests/unit/test_bootstrap_service.py backend/tests/unit/test_configuration_models.py backend/tests/integration/test_display_api.py backend/tests/integration/test_display_configuration.py backend/tests/contract/test_remote_control_display_contract.py backend/tests/contract/test_v1_display_contract.py backend/tests/contract/test_schema_contract.py`. All green.
- [ ] T013 Run the broader backend suite: `pytest backend/tests`. All green.
- [ ] T014 Run the frontend suite: `npm --prefix frontend run test`. The display-config spec is green.
- [ ] T015 Run the frontend build: `npm --prefix frontend run build`. Exits zero.
- [ ] T016 Consolidate the change:
  - Update `specs/changes/020-relax-kiosk-region-ratio/spec.md` frontmatter: `status: consolidated`, `consolidated_into: [DISPLAY.CONFIG_SESSION]`, `read_by_default: false`.
  - Update `specs/manifest.yml`: change `CHG-020.status` from `draft` to `consolidated`; add `consolidated_into: [DISPLAY.CONFIG_SESSION]`.
  - Update `specs/contracts/display-config-session/contract.md` `## Change history` to include `CHG-020`.

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6.
- Within Phase 2, T004, T005, T006 touch different files and are `[P]`-parallel after T003.
- Phase 3 tests must land alongside the implementation they cover; T007 and T008 land after T002-T006.
- Phase 4 (frontend) is independent of backend but gated on Phase 3 to keep the contract consistent.
- Phase 6 only runs after Phase 1-5 are green.

## Parallel Opportunities

- T004, T005, T006 are independent and can land in the same commit.
- T007 and T008 are independent and can land in the same commit.
- T009 and T010 are sequential (T010 depends on the new interface field).
- T011 follows T010.

## Implementation Strategy

1. Land Phase 1 (contract + manifest + ADR) as the SDD governance commit; this is the only commit that touches SDD artefacts outside `specs/changes/020-.../`.
2. Land Phase 2 + Phase 3 (backend implementation + backend tests) as a single commit; both land together so the migration, model, service, schema, and tests are consistent.
3. Land Phase 4 + Phase 5 (frontend form binding + tests) as a single commit; the interface and the form change together.
4. Run Phase 6 validation; only after green, flip the change to `status: consolidated`.

## MVP Scope

Phase 1 + Phase 2 + Phase 3 is the smallest slice that delivers backend configurability. Phase 4 + Phase 5 closes the loop with the operator-visible form.
