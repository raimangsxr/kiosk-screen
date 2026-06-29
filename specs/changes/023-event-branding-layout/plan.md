# Implementation Plan: Event Branding Layout

**Input**: Feature specification from `/specs/changes/023-event-branding-layout/spec.md`
**Branch**: `023-event-branding-layout` | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)

## Context Grounding

- Manifest read: `specs/manifest.yml` (entry for CHG-023 added; CHG-019 noted as `in-progress` and a `depends_on`).
- Active contracts read: `specs/contracts/event-branding/contract.md`, `specs/contracts/display-runtime/contract.md`.
- Change specs read: `specs/changes/023-event-branding-layout/spec.md`, `specs/changes/023-event-branding-layout/checklists/requirements.md`.
- Context pack: `specs/changes/023-event-branding-runtime/context-pack.md` (created in Phase 1; points at the same entrypoints).
- ADRs read: `docs/adr/0001-token-aware-sdd-governance.md`, `docs/adr/0002-display-runtime-region-ratios.md`, `docs/adr/0005-branding-overlay.md` (read in implementation to confirm the current overlay rendering).
- Code entrypoints verified: `backend/app/api/event_configuration.py`, `backend/app/api/event_branding.py`, `backend/app/api/schemas.py`, `backend/app/api/mappers.py`, `backend/app/repositories/models/event_configuration.py`, `backend/app/services/event_configuration_service.py`, `frontend/src/app/features/event-config/event-config.component.ts`, `frontend/src/app/features/event-config/event-config.facade.ts`, `frontend/src/app/core/event-branding.service.ts`, `frontend/src/app/core/api/event-branding.api.ts`, `frontend/src/app/display/display-screen.component.ts`, `frontend/src/app/display/kiosk-branding-overlay.component.ts`.
- Tests identified: `backend/tests/...` (event configuration + branding), `frontend/src/app/features/event-config/event-config.component.spec.ts` (to be created), `frontend/src/app/display/display-screen.component.spec.ts` (overlay specs), `frontend/src/app/display/kiosk-branding-overlay.component.spec.ts`.
- Archived or consolidated specs read: none. CHG-008 (event-branding) is consolidated into `EVENT.BRANDING` and is the historical baseline for the existing PUT /event-configuration contract.

## Summary

Extend the Event administration panel with ten new layout controls
(five per element × logo and event name) that drive the visual
treatment of the kiosk branding overlay. The admin saves them via
the existing `PUT /event-configuration`; the kiosko picks them up
on its next branding refresh (≤ `remoteControlPollingSeconds`,
default 3 s) and applies them as CSS custom properties on the
overlay container so the layout re-renders without a page reload.

The change touches:
- Backend: `event_configurations` gains two nullable JSON columns
  (`logo_layout`, `event_name_layout`); a `BrandingLayout`
  Pydantic model with five range-validated fields is the new
  validation surface; the mapper and the two GET endpoints are
  extended; the `update` service accepts the new fields.
- Frontend: `EventConfigComponent` gains ten reactive-form
  controls with client-side range validation; the facade's
  FormData payload includes the two new JSON-encoded fields;
  the kiosko overlay component binds the layout values as CSS
  custom properties.
- Tests: backend Pydantic and service specs for validation and
  round-trip; frontend form spec for the new controls and
  validators; overlay component spec for CSS custom property
  binding; display screen spec for default-look preservation
  and iframe/portrait regression coverage.

## Technical Context

- **Language/Version**: Python 3.12 (backend), TypeScript 5.8 (frontend). Angular 17.3.x.
- **Primary Dependencies**: FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2 (backend); Angular Reactive Forms, Material 3 (frontend). No new dependencies.
- **Storage**: PostgreSQL via SQLAlchemy. Two new nullable JSON columns on `event_configurations`; Alembic migration is idempotent (only adds the columns if missing).
- **Testing**: pytest (backend), Karma + Jasmine (frontend). All new behavior gets tests in the same change.
- **Target Platform**: Chromium desktop/kiosk (Chrome / Edge 108+). No change to the supported browser set.
- **Project Type**: web (FastAPI + Angular SPA).
- **Performance Goals**: PUT < 200 ms p95 on the lab database; kiosko's branding refresh piggybacks on the existing 3 s polling cycle, no new HTTP requests.
- **Constraints**: 
  - The kiosko's `EVENT.BRANDING` contract does not change its public HTTP shape beyond the two new optional response fields.
  - The PUT endpoint stays `multipart/form-data` to keep the file-upload story (logo upload) intact; the layout fields are JSON-encoded FormData strings.
  - No new dependencies, no new migrations beyond the two columns.
- **Scale/Scope**: one organization has one event configuration; the change affects one row per org. Ten reactive-form controls, two JSON columns, one Pydantic model, two GET endpoints, one PUT endpoint.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Active contract identified and read: `EVENT.BRANDING` and `DISPLAY.RUNTIME`. Pass.
- Manifest update needed and planned: CHG-023 added with `in-progress` status; will move to `consolidated` after acceptance. Pass.
- Context pack created/updated: to be added at the end of Phase 1 with the implementation entrypoints. Pass.
- Contract update required before implementation: yes — `EVENT.BRANDING` records the new `BrandingLayout` shape, the expanded `EventConfigurationSchema` and `EventBrandingSchema`, and the new PUT FormData fields. Will land in Phase 1 alongside `data-model.md`.
- Tests planned for changed behavior: yes — Pydantic range-validation specs, service round-trip specs, frontend form specs, overlay CSS custom property specs, default-look preservation spec. Pass.
- Security and user-facing error exposure considered: HTTP 400/422 with field-keyed messages; no PII leak; the same auth roles that can edit `event-configuration` today can also edit the layout (no new role). Pass.
- Observability/audit impact considered: existing `event_configuration_changed` audit event already captures changed fields; the new columns extend `changed_fields` with `logoLayout` and `eventNameLayout` if a change is detected. Pass.
- No archived or superseded specs used without justification: none read. Pass.

## Project Structure

### Documentation for this change

```text
specs/changes/023-event-branding-layout/
├── spec.md              # already drafted (CHG-023 source of truth)
├── plan.md              # this file
├── context-pack.md      # Phase 1
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── checklists/
│   └── requirements.md  # already drafted (Spec Kit quality gate)
└── tasks.md             # Phase 2 (/speckit.tasks)
```

### Source code touched

```text
backend/
├── alembic/versions/0016_event_branding_layout.py  # new
├── app/api/schemas.py            # add BrandingLayout + extend schemas
├── app/api/mappers.py            # extend to_event_configuration_schema and to_event_branding_schema
├── app/api/event_configuration.py # extend PUT FormData
├── app/api/event_branding.py     # unchanged (reuses mapper)
├── app/services/event_configuration_service.py # extend update payload + audit metadata
└── app/repositories/models/event_configuration.py # add two JSON columns

frontend/
└── src/app/
    ├── core/api/event-branding.api.ts            # extend EventBranding + EventConfiguration types
    ├── core/api/event-config.api.ts              # extend EventConfiguration type
    ├── core/event-branding.service.ts            # unchanged signal-based API
    ├── features/event-config/event-config.component.ts # 10 new form controls + validators
    ├── features/event-config/event-config.facade.ts # FormData includes the new JSON fields
    └── display/kiosk-branding-overlay.component.ts # bind layout values to CSS custom properties + update scoped CSS
```

**Structure Decision**: backend adds one Pydantic model and two columns; frontend adds ten reactive-form controls and updates two components. The contract surface change is documented in `EVENT.BRANDING` (Phase 1). No new modules, no new routes, no new polling endpoints.

## Phase 0: Outline & Research

The five design questions (units, anchor, storage, defaults, validation) were resolved via the clarification round before the spec was written. See [research.md](./research.md) for the full decision rationale. Summary:

| Decision              | Choice                                                | Why                                                                                  |
|-----------------------|-------------------------------------------------------|--------------------------------------------------------------------------------------|
| Units                 | vh / vw / % of viewport                               | Scales identically to the existing fluid CSS; no per-resolution tweaking needed.      |
| Position anchor       | Top-left of overlay container (X from left, Y from top)| Mirrors the CSS custom property convention; lets the overlay grow with content.       |
| Storage               | Two JSON columns: `logo_layout`, `event_name_layout`  | Granular validation per element; one column per element keeps the schema readable.  |
| Defaults              | Replicate current visual look                          | No migration visible to operators; existing rows render byte-identical to today.     |
| Validation            | Reject out-of-range with HTTP 400 + field-keyed detail | Operator gets a clear error; no silent clamping surprises.                           |

## Phase 1: Design & Contracts

### Data model

See [data-model.md](./data-model.md). New artifacts:

- `event_configurations.logo_layout JSONB NULL`
- `event_configurations.event_name_layout JSONB NULL`
- `BrandingLayout` Pydantic model with five optional, range-validated fields
- `EventConfigurationSchema` and `EventBrandingSchema` gain two new optional fields
- `EventConfigurationRequest` (the PUT FormData mapping) gains two new fields serialized as JSON strings

### Active contract updates

- `specs/contracts/event-branding/contract.md`:
  - Update `Public interfaces` to record the new `BrandingLayout` shape and the two new fields on both schemas.
  - Update `Current behavior` to record the dynamic reflection via the existing polling cadence.
  - Update `Owned code paths` to add the new alembic migration and the two Pydantic extensions.
  - Add the change to `Change history`.

### ADR updates

- `docs/adr/0005-branding-overlay.md`: append a note that the overlay CSS is now data-driven via CSS custom properties bound from the polled `EventBranding` snapshot. The visual default is preserved by the new default values; existing ADR rationale (logo at left, event name at right) is unchanged.

### UI contracts

- The ten new reactive-form controls in `EventConfigComponent` carry the names listed in FR-006 and FR-007. Range validators mirror the backend Pydantic constraints (size 1..50, x 0..100, y 0..100, transparency 0..100, borderRadius 0..50). Error messages are key-stable for i18n.

## Phase 2: Task Planning Approach

Tasks are grouped by user story to enable independent implementation and validation of each story. The implementation is layered: backend first (so the frontend has something to talk to), then frontend form, then kiosko overlay. Each layer gets tests in the same change.

Test strategy:
- Backend Pydantic: range validators fire HTTP 400 / 422 for each field; round-trip preserves the values.
- Backend service: `update` accepts the new fields and stores them; mapper returns them; audit metadata includes the changed-field names when the layout changes.
- Backend migration: idempotent; can be run twice without error; existing rows get `NULL` for both new columns.
- Frontend form: ten controls, range validators, server-error display, dirty-form snapshot, FormData payload includes the JSON-encoded layout fields.
- Frontend kiosko overlay: when `BrandingLayout` is set, the CSS custom properties bind correctly; when NULL, the CSS falls back to the documented defaults and renders identically to the pre-change baseline.
- Default-look preservation regression: an explicit Karma spec that boots the kiosko with `null` layout and asserts the computed `height`, `left`, `top`, `opacity`, and `border-radius` match the pre-change values at 1280×720, 1920×1080, and 3840×2160.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Two JSON columns instead of one | One column per element keeps the Pydantic model, the form validation, and the audit metadata symmetric with the operator's mental model (one set of controls per element). | A single JSON column with two nested objects would couple the elements' validation and audit; per-column CHECK constraints (if added later) would not be possible. |
| Asymmetric position anchors for logo vs event name (both use `top`; logo uses `left`, event name would have used `right` but we chose uniform `left` for symmetry) | Uniform `left` anchor + `text-align: right` on the event name keeps the CSS model simple and lets both elements use the same X range. | Asymmetric anchors require two different range validators and confuse the operator. |
| Default values replicated in two places (CSS and Pydantic) | Necessary because the kiosko CSS falls back via `var(--x, default)` and the Pydantic model needs explicit defaults for the openapi schema. | A single source of truth would require a build-time constants file shared across backend and frontend, which is out of scope. |
