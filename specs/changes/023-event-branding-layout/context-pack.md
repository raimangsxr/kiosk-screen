# Context Pack: CHG-023 Event Branding Layout

## Task classification

- Type: change to existing active contracts
- Affected contracts: `EVENT.BRANDING`, `DISPLAY.RUNTIME`
- Requires contract update: yes (`EVENT.BRANDING`)
- Current status: in-progress

## Mandatory context

Read these files before planning or implementing:

- `specs/manifest.yml`
- `specs/contracts/event-branding/contract.md`
- `specs/contracts/display-runtime/contract.md`
- `specs/changes/023-event-branding-layout/spec.md`
- `specs/changes/023-event-branding-layout/plan.md`
- `specs/changes/023-event-branding-layout/research.md`
- `specs/changes/023-event-branding-layout/data-model.md`
- `specs/changes/023-event-branding-layout/quickstart.md`
- `specs/changes/023-event-branding-layout/checklists/requirements.md`

## Optional context

Read only if the task explicitly touches the area:

- `docs/adr/0001-token-aware-sdd-governance.md`
- `docs/adr/0005-branding-overlay.md` (current overlay rendering rationale)
- `specs/changes/019-display-responsive-runtime/spec.md` (CHG-019 lays the
  overlay CSS groundwork that CHG-023 builds on; CHG-023 depends on CHG-019)
- `specs/changes/008-event-branding/spec.md` (historical baseline for the
  existing PUT contract)

## Do not read by default

- `specs/archive/**`
- Consolidated change specs under `specs/changes/**` unless one is
  explicitly referenced by a contract or task
- macOS AppleDouble files named `._*`
- Python bytecode caches

## Code entrypoints

- `backend/app/api/schemas.py` (add `BrandingLayout`, extend
  `EventConfigurationSchema`, `EventConfigurationRequest`, `EventBrandingSchema`)
- `backend/app/api/mappers.py` (extend `to_event_configuration_schema` and
  `to_event_branding_schema` to include the new layout fields)
- `backend/app/api/event_configuration.py` (extend the PUT FormData to
  accept `logoLayout` and `eventNameLayout` JSON-encoded fields)
- `backend/app/services/event_configuration_service.py` (extend `update`
  payload parsing, validation, and audit metadata)
- `backend/app/repositories/models/event_configuration.py` (add two JSON
  columns)
- `backend/alembic/versions/0016_event_branding_layout.py` (new migration)
- `frontend/src/app/core/api/event-branding.api.ts` (extend `EventBranding`
  type with two new optional fields)
- `frontend/src/app/core/api/event-config.api.ts` (extend
  `EventConfiguration` type with two new optional fields)
- `frontend/src/app/features/event-config/event-config.component.ts` (add
  ten reactive-form controls with range validators)
- `frontend/src/app/features/event-config/event-config.facade.ts` (extend
  FormData to include the JSON-encoded layout fields)
- `frontend/src/app/display/kiosk-branding-overlay.component.ts` (bind
  layout values to CSS custom properties; update component-scoped CSS to
  consume them with documented visual defaults)

## Tests

- `pytest backend/tests`
- `npm --prefix frontend run test`
- Narrow specs first when possible:
  - `frontend/src/app/features/event-config/event-config.component.spec.ts`
    (to be created)
  - `frontend/src/app/display/kiosk-branding-overlay.component.spec.ts`
  - `frontend/src/app/display/display-screen.component.spec.ts`

## Implementation constraints

- Preserve the current visual look as the default for events with NULL
  layout columns; do not introduce a visible change for existing operators.
- Keep the kiosko's polling cadence unchanged (no new endpoints, no
  websockets).
- Maintain the existing audit event `event_configuration_changed`; extend
  `changed_fields` with `logoLayout` and `eventNameLayout` when those
  columns are mutated.
- The PUT endpoint stays `multipart/form-data` for compatibility with the
  existing logo upload story; the two new fields are JSON-encoded strings.
- No new dependencies on either backend or frontend.
- This change depends on CHG-019; CHG-019's overlay CSS work must land
  first to avoid merge conflicts on `kiosk-branding-overlay.component.ts`.
