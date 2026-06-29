---
description: "Task list for the Event Branding Layout change"
---

# Tasks: Event Branding Layout

**Input**: Design documents from `/specs/changes/023-event-branding-layout/`

**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `quickstart.md`, `checklists/requirements.md`, `context-pack.md`

**Tests**: Tests are mandatory for changed behavior. Backend Pydantic range validation, service round-trip, mapper round-trip, migration idempotency, frontend form controls and validators, kiosk overlay CSS custom property binding, and default-look preservation at 1280×720 / 1920×1080 / 3840×2160.

**Organization**: Tasks are grouped by user story to enable independent implementation and validation of each story. The implementation is layered: SDD governance → backend foundation → frontend types → user stories in priority order → polish & cross-cutting validation.

**Depends on**: CHG-019 (display-responsive-runtime) must have landed so that the overlay CSS work does not conflict.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, ...)
- Include exact file paths in descriptions

## Path Conventions

- Backend: `backend/app/...`, `backend/alembic/versions/...`, `backend/tests/...`
- Frontend: `frontend/src/app/...`, `frontend/src/app/features/event-config/**`, `frontend/src/app/display/**`
- Specs / contracts: `specs/changes/023-event-branding-layout/**`, `specs/contracts/event-branding/contract.md`

## Phase 1: SDD Governance & Context

**Purpose**: Confirm the active change, update the affected contract, and lock down the public surface before implementation.

- [x] T001 Read `specs/manifest.yml` and confirm `CHG-023` is registered with `status: in-progress`, `modifies: [EVENT.BRANDING, DISPLAY.RUNTIME]`, `depends_on: [CHG-019]`. (Done as part of `speckit.specify`.)
- [x] T002 Create `specs/changes/023-event-branding-layout/context-pack.md` with mandatory context, optional context, code entrypoints, tests, and excluded paths. (Done as part of `speckit.specify`.)
- [x] T003 Update `specs/contracts/event-branding/contract.md` to record the new `BrandingLayout` Pydantic model, the two new schema fields on `EventConfigurationSchema` and `EventBrandingSchema`, the new PUT FormData fields, the dynamic reflection behavior, and the default-look preservation guarantee. (Done before implementation per AGENTS.md rule 7.)
- [x] T004 Update `specs/manifest.yml` to add CHG-023 with `in-progress` status and the right `modifies` / `depends_on`. (Done as part of `speckit.specify`.)
- [x] T005 Update `docs/adr/0005-branding-overlay.md` to append a note that the overlay CSS is now data-driven via CSS custom properties bound from the polled `EventBranding` snapshot; existing visual rationale is preserved by the documented default values.

## Phase 2: Backend Foundation (Blocking Prerequisites)

**Purpose**: Land the backend surface every user story depends on: the `BrandingLayout` Pydantic model, the two JSON columns, the migration, the schema and request extensions, the mapper, and the service-level audit metadata. After this phase, both user stories (logo and event name) can be exercised end-to-end against the same backend.

- [x] T006 [P] Add the `BrandingLayout` Pydantic model in `backend/app/api/schemas.py` with five optional numeric fields (`size`, `x`, `y`, `transparency`, `borderRadius`) and explicit `Field(ge=..., le=...)` range constraints (`size` 1..50, `x` 0..100, `y` 0..100, `transparency` 0..100, `borderRadius` 0..50); the model MUST tolerate missing / null subfields (every field is `Optional`).
- [x] T007 [P] Add two nullable JSON columns (`logo_layout`, `event_name_layout`) to the `EventConfiguration` SQLAlchemy model in `backend/app/repositories/models/event_configuration.py`, defaulting to `NULL`.
- [x] T008 Add the idempotent Alembic migration `backend/alembic/versions/0016_event_branding_layout.py` that uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for both columns; the migration MUST be safe to run while the backend is serving traffic and MUST be reversible via `downgrade()`.
- [x] T009 Extend `EventConfigurationSchema` and `EventBrandingSchema` in `backend/app/api/schemas.py` with the new optional fields (`logoLayout`, `eventNameLayout`), both typed as `BrandingLayout | None` and emitted only when the column is non-NULL.
- [x] T010 Extend `EventConfigurationRequest` (or add a sibling) in `backend/app/api/schemas.py` with `logoLayout` and `eventNameLayout` as optional JSON-encoded strings, so the existing PUT route can accept them via the multipart FormData without changing the wire format.
- [x] T011 Extend `to_event_configuration_schema` and `to_event_branding_schema` in `backend/app/api/mappers.py` to read the two new columns from the SQLAlchemy row and pass them through; the mapper MUST omit the fields when the columns are `NULL` rather than emitting `null`.
- [x] T012 Extend `EventConfigurationService.update` in `backend/app/services/event_configuration_service.py` to (a) parse `logoLayout` / `eventNameLayout` from the incoming dict (JSON string → `BrandingLayout` model), (b) validate the parsed payload and raise `ValueError` with a field-keyed message on range violation (translated to HTTP 400 by the route), (c) extend the `changed_fields` list with `logoLayout` / `eventNameLayout` when the parsed value differs from the existing column, and (d) write the parsed payload back to the row.

## Phase 3: Frontend Types & Service Foundation

**Purpose**: Extend the TypeScript types and the API client surface so the user-story phases can consume the new fields without retroactive type changes.

- [x] T013 [P] Extend `EventBranding` in `frontend/src/app/core/api/event-branding.api.ts` with the two new optional fields (`logoLayout`, `eventNameLayout`), both typed as `BrandingLayout | null`; export the `BrandingLayout` interface from the same module.
- [x] T014 [P] Extend `EventConfiguration` in `frontend/src/app/core/api/event-config.api.ts` (or the relevant shared type) with the two new optional fields (`logoLayout`, `eventNameLayout`), matching the backend schema.

## Phase 4: User Story 1 — Logo layout (Priority: P1)

**Goal**: The operator can configure the organizer's logo layout (size, X, Y, transparency, border radius) from the Event admin form; the kiosko renders the new layout on the next polling cycle.

**Independent Test**: with the operator signed in, set `logoSize=4`, `logoX=2`, `logoY=0`, `logoTransparency=80`, `logoBorderRadius=2`; save; the kiosko (open in a separate tab) re-renders the logo within `remoteControlPollingSeconds` seconds with the new dimensions and opacity.

- [x] T015 [US1] Add five reactive-form controls to `EventConfigComponent` in `frontend/src/app/features/event-config/event-config.component.ts` for the logo (`logoSize`, `logoX`, `logoY`, `logoTransparency`, `logoBorderRadius`), each with the matching client-side range validator (mirrors backend Pydantic ranges) and inline error messages.
- [x] T016 [US1] Extend `EventConfigFacade.save` in `frontend/src/app/features/event-config/event-config.facade.ts` to encode the five logo fields as a JSON string under the FormData key `logoLayout` (and, symmetrically, the five event-name fields under `eventNameLayout` in Phase 5).
- [x] T017 [P] [US1] Backend pytest in `backend/tests/test_event_configuration.py`: range validation for each logo field (one spec per field, one boundary test per lower and upper bound); round-trip spec that PUT with valid `logoLayout` returns 200 and the GET response carries the saved values; audit-metadata spec that `event_configuration_changed` lists `logoLayout` in `changed_fields` when the value changes.
- [x] T018 [P] [US1] Frontend Karma spec in `frontend/src/app/features/event-config/event-config.component.spec.ts` (to be created): the five logo controls exist; setting `logoSize=0` shows the client-side error and blocks the PUT; setting valid values enables the submit button; saving produces a snackbar and a re-populated form.
- [x] T019 [P] [US1] Mapper round-trip pytest in `backend/tests/test_event_configuration_mapper.py` (or extend the existing spec): the mapper returns `logoLayout` when the column is populated and omits the field when the column is `NULL`.

## Phase 5: User Story 2 — Event name layout (Priority: P1)

**Goal**: The operator can configure the event name pill's layout (size, X, Y, transparency, border radius) from the same Event admin form; the kiosko renders the new layout on the next polling cycle.

**Independent Test**: with the operator signed in, set `eventNameSize=2`, `eventNameX=60`, `eventNameY=0`, `eventNameTransparency=100`, `eventNameBorderRadius=0`; save; the kiosko re-renders the event name pill at the new horizontal coordinate within `remoteControlPollingSeconds` seconds.

- [x] T020 [US2] Add five reactive-form controls to `EventConfigComponent` in `frontend/src/app/features/event-config/event-config.component.ts` for the event name (`eventNameSize`, `eventNameX`, `eventNameY`, `eventNameTransparency`, `eventNameBorderRadius`), each with the matching client-side range validator and inline error messages.
- [x] T021 [US2] Extend `EventConfigFacade.save` in `frontend/src/app/features/event-config/event-config.facade.ts` to encode the five event-name fields as a JSON string under the FormData key `eventNameLayout`.
- [x] T022 [P] [US2] Backend pytest in `backend/tests/test_event_configuration.py`: range validation for each event-name field; round-trip spec that PUT with valid `eventNameLayout` returns 200 and the GET response carries the saved values; audit-metadata spec that `event_configuration_changed` lists `eventNameLayout` in `changed_fields` when the value changes.
- [x] T023 [P] [US2] Frontend Karma spec in `frontend/src/app/features/event-config/event-config.component.spec.ts`: the five event-name controls exist; validators fire correctly; saving produces a snackbar and a re-populated form.

## Phase 6: User Story 3 — Dynamic reflection via polling (Priority: P1)

**Goal**: After the operator saves a layout change in the admin form, the kiosko reflects the new layout within `remoteControlPollingSeconds` seconds (default 3 s) without any manual reload.

**Independent Test**: open the kiosko at 1920×1080 in tab A and the admin form in tab B; change `logoSize` from `6` to `12` and save in tab B; the logo's rendered height becomes `12vh` within at most `remoteControlPollingSeconds` seconds.

- [x] T024 [US3] Extend `kiosk-branding-overlay.component.ts` in `frontend/src/app/display/kiosk-branding-overlay.component.ts` so the host `<div class="branding-overlay">` binds the layout values as CSS custom properties (`--logo-x`, `--logo-y`, `--logo-size`, `--logo-transparency`, `--logo-border-radius`, `--event-name-x`, `--event-name-y`, `--event-name-size`, `--event-name-transparency`, `--event-name-border-radius`); when a layout field is `null` in the polled snapshot, the corresponding custom property is unset (so the CSS `var(--*, default)` fallback applies).
- [x] T025 [US3] Update the component-scoped CSS in `kiosk-branding-overlay.component.ts` so `.branding-overlay__logo` and `.branding-overlay__event-name` consume the new CSS custom properties via `calc(var(--*, default) * 1vh)` / `1vw` and use the documented visual defaults as `var()` fallbacks (logo: `--logo-size: 6`, `--logo-x: 0`, `--logo-y: 0`, `--logo-transparency: 100`, `--logo-border-radius: 0`; event name: `--event-name-size: 1.6`, `--event-name-x: 80`, `--event-name-y: 0`, `--event-name-transparency: 100`, `--event-name-border-radius: 6`).
- [x] T026 [P] [US3] Karma spec in `frontend/src/app/display/kiosk-branding-overlay.component.spec.ts`: with a populated `BrandingLayout` snapshot, the overlay container carries the new CSS custom properties with the expected numeric values; with `null` layout, the container does not carry those properties (the CSS `var()` fallback path applies).
- [x] T027 [P] [US3] Karma spec in `frontend/src/app/display/display-screen.component.spec.ts`: simulate a polling cycle (mock `eventBranding.refresh()` to emit a new layout snapshot), assert the overlay re-renders without an Angular lifecycle event and the computed styles reflect the new values within one tick.

## Phase 7: User Story 4 — HTTP 400 / 422 validation (Priority: P2)

**Goal**: Out-of-range layout values are rejected by the backend with a clear, field-keyed error message; the operator sees a useful message in the admin form.

**Independent Test**: `PUT /api/event-configuration` with `logoSize=0` returns HTTP 422 with a body that mentions `logoLayout.size` and the valid range; the corresponding database row is not mutated.

- [x] T028 [P] [US4] Backend pytest in `backend/tests/test_event_configuration.py`: Pydantic range validation produces HTTP 422 with the standard envelope for each field × each boundary (lower-out-of-range, upper-out-of-range, non-numeric, missing-required subfield); service-level `_clean_layout` produces HTTP 400 with the admin-friendly message format when invoked directly.
- [x] T029 [P] [US4] Backend pytest in `backend/tests/test_event_configuration.py`: a request with valid `eventName` but invalid `logoLayout` returns the error without mutating the row's other columns (atomic write).

## Phase 8: User Story 5 — Default-look preservation (Priority: P2)

**Goal**: Events with NULL layout columns render identically to the pre-change baseline at 1280×720, 1920×1080, and 3840×2160; the admin form pre-populates the controls with the documented visual defaults so the operator sees a stable starting point.

**Independent Test**: an event with `logo_layout IS NULL` and `event_name_layout IS NULL` renders the same DOM and computed styles as before this change at 1280×720, 1920×1080, and 3840×2160.

- [x] T030 [US5] Extend `EventConfigComponent.populate` in `frontend/src/app/features/event-config/event-config.component.ts` so that, when the API returns `logoLayout` / `eventNameLayout` as `null`, the corresponding form controls are pre-populated with the documented visual defaults (`logoSize=6`, `logoX=0`, `logoY=0`, `logoTransparency=100`, `logoBorderRadius=0`; `eventNameSize=1.6`, `eventNameX=80`, `eventNameY=0`, `eventNameTransparency=100`, `eventNameBorderRadius=6`).
- [x] T031 [P] [US5] Karma spec in `frontend/src/app/display/kiosk-branding-overlay.component.spec.ts` (or `display-screen.component.spec.ts`): with `null` layout, the computed styles of `.branding-overlay__logo` and `.branding-overlay__event-name` match the pre-change baseline at 1280×720, 1920×1080, and 3840×2160 — including `height`, `left`, `top`, `opacity`, `border-radius`, and `font-size`.

## Phase 9: Polish & Cross-Cutting Validation

**Purpose**: Final regression checks, full validation, and contract consolidation.

- [x] T032 Run `pytest backend/tests` and confirm all specs (existing + new) pass.
- [x] T033 Run `npm --prefix frontend run test` and confirm all specs (existing + new) pass.
- [x] T034 Run `npm --prefix frontend run build` and confirm the production build exits zero with no new warnings beyond the documented `angular-locale-data` note.
- [x] T035 Run `docker build -f backend/Dockerfile backend` and `docker build -f frontend/Dockerfile frontend` and confirm both exit zero.
- [x] T036 Execute the manual validation steps in `specs/changes/023-event-branding-layout/quickstart.md` against the local lab (per `docs/dev/local-lab.md`) and record the outcome in `specs/changes/023-event-branding-layout/checklists/requirements.md`.
- [x] T037 Update `specs/contracts/event-branding/contract.md` if any deviation from the pre-implementation contract snapshot is observed (otherwise the contract snapshot from Phase 1 is the source of truth).
- [x] T038 Mark `CHG-023` as `consolidated` in `specs/manifest.yml` after acceptance; update the active change pointer in `AGENTS.md` to the next open change.

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9.
- Phase 2 (backend foundation) MUST complete before Phase 4 / 5 (user stories can be exercised against the same backend).
- Phase 3 (frontend types) MUST complete before Phase 4 / 5 (the user stories consume the new types).
- Phase 4 (logo) and Phase 5 (event name) touch different controls in the same component but the facade work can land in either order; the spec asks for a single combined FormData payload.
- Phase 6 (kiosko) requires both Phase 4 and Phase 5 form controls to be present so the full layout snapshot can be tested.
- Phase 9 runs after every prior phase lands, to keep the signal-to-noise ratio on regressions low.

## Parallel Opportunities

- T006 (Pydantic model), T007 (SQLAlchemy columns), T013 (frontend `EventBranding` type), and T014 (frontend `EventConfiguration` type) all touch different files and can land in parallel.
- T017, T018, T019, T022, T023, T026, T027, T028, T029, T031 are all `[P]` — they touch separate test files and can land in parallel with their corresponding implementation tasks.
- T015 and T020 touch the same component but different control blocks; they can land in a single edit if preferred.

## Implementation Strategy

1. Land Phase 1 + Phase 2 + Phase 3 in one logical commit (SDD governance + backend + frontend types). This unblocks the user-story phases.
2. Land Phase 4 (US1, logo layout) as the first MVP slice — the operator can already configure the logo without the event name controls.
3. Land Phase 5 (US2, event name layout) symmetrically.
4. Land Phase 6 (US3, kiosko reflection) — this is the visual payoff.
5. Land Phases 7 and 8 incrementally; each is independently testable.
6. Run Phase 9 validation after every phase lands.

## Independent Test per Story

- **US1**: change logo size, position, transparency, border radius from the admin form; save; observe the new rendering in the kiosko within `remoteControlPollingSeconds` seconds.
- **US2**: same as US1 for the event name pill.
- **US3**: open the kiosko in tab A and the admin form in tab B; change a layout value in tab B; verify tab A re-renders without an F5.
- **US4**: PUT with `logoSize=999` via curl returns HTTP 422 with a Pydantic error envelope that names `logoLayout.size` and the valid range.
- **US5**: an event with NULL layout renders byte-identical DOM (modulo animations) and equivalent computed styles at 1280×720, 1920×1080, and 3840×2160 compared to the pre-change baseline.

## Suggested MVP Scope

Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5 + Phase 6 (US1, US2, US3) is the smallest slice that delivers operator-visible value: the kiosko's branding overlay is now data-driven from the admin form, with dynamic reflection through the existing polling cadence.