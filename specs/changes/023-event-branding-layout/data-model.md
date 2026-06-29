# Data Model: Event Branding Layout

**Date**: 2026-06-28
**Spec**: [spec.md](./spec.md)

## New entities

### `BrandingLayout` (Pydantic model)

Defined in `backend/app/api/schemas.py`. Used by the PUT
endpoint, the GET endpoints (via `EventConfigurationSchema` and
`EventBrandingSchema`), and the SQLAlchemy mapper.

| Field          | Type   | Range          | CSS interpretation            | Default value when NULL |
|----------------|--------|----------------|-------------------------------|-------------------------|
| `size`         | number | `[1, 50]`      | vh for logo, vw for event name| logo: 6; event name: 1.6|
| `x`            | number | `[0, 100]`     | vw from the overlay's left edge | logo: 0; event name: 80 |
| `y`            | number | `[0, 100]`     | vh from the overlay's top edge | 0                       |
| `transparency` | int    | `[0, 100]`     | percent, applied as `opacity: transparency / 100` | 100 |
| `borderRadius` | number | `[0, 50]`      | vh                            | logo: 0; event name: 6  |

All fields are optional. A fully-empty object means "use visual
defaults".

### `event_configurations.logo_layout` (column)

- **Type**: `JSONB` (nullable).
- **Default**: `NULL` (meaning "use visual defaults").
- **Validation**: enforced at the API boundary by the
  `BrandingLayout` Pydantic model; the DB accepts any JSONB
  payload because the values are validated upstream.
- **Backfill**: none. Existing rows keep `NULL` and render
  with the documented visual defaults.

### `event_configurations.event_name_layout` (column)

- Same shape and constraints as `logo_layout`.

### `EventConfigurationSchema.logoLayout` (response field)

- Optional; emitted only when the column is non-NULL.
- Carries a `BrandingLayout` payload.

### `EventConfigurationSchema.eventNameLayout` (response field)

- Same as above.

### `EventBrandingSchema.logoLayout` (kiosko-facing field)

- Optional; emitted only when the column is non-NULL.

### `EventBrandingSchema.eventNameLayout` (kiosko-facing field)

- Same as above.

### `EventConfigurationRequest.logoLayout` (PUT field)

- Optional; serialized as a JSON string in the multipart
  FormData payload. Parsed by the service layer into the
  Pydantic `BrandingLayout` model before persisting.

### `EventConfigurationRequest.eventNameLayout` (PUT field)

- Same as above.

## Consumed entities

### `EventBrandingService.branding` (existing signal)

- The kiosko's `EventBrandingService` already exposes a
  `branding: Signal<EventBranding>` that the overlay reads.
- This change extends the `EventBranding` interface with two
  new optional fields (`logoLayout`, `eventNameLayout`). The
  signal-based contract is preserved.

## State transitions

The layout fields do not introduce a new lifecycle. They flow
through the same path as the existing branding fields:

```
  ┌────────────────────────┐
  │  Admin PUT (FormData)  │
  │  logoLayout,           │
  │  eventNameLayout       │
  └────────────┬───────────┘
               │ Pydantic validation (HTTP 400/422)
               ▼
  ┌────────────────────────┐
  │  Service update        │
  │  - parse JSON          │
  │  - persist columns     │
  │  - audit metadata      │
  └────────────┬───────────┘
               │
               ▼
  ┌────────────────────────┐
  │  Kiosko poll cycle     │
  │  GET /event-branding   │
  │  (every polling sec)   │
  └────────────┬───────────┘
               │
               ▼
  ┌────────────────────────┐
  │  EventBranding signal  │
  │  (Angular change det.) │
  └────────────┬───────────┘
               │
               ▼
  ┌────────────────────────┐
  │  Overlay CSS           │
  │  custom properties     │
  │  (re-render)           │
  └────────────────────────┘
```

## Validation rules

- Pydantic enforces the range constraints at the API boundary
  (HTTP 422). The service layer re-validates and returns HTTP
  400 with a field-keyed `detail` for the admin form path.
- A request with `logoLayout=null` (or missing) is valid; the
  column is set to `NULL` and the kiosko falls back to the
  visual defaults.
- A request with `logoLayout={}` (empty object) is valid; same
  effect as `null`.
- The kiosko's CSS falls back to the documented default values
  via `var(--logo-size, 6)` when the corresponding custom
  property is unset (i.e., when the layout is `NULL`).

## Relationships

- `event_configurations.logo_layout` is owned by
  `event_configurations` (one-to-one, same row).
- The kiosko overlay reads the layout values via the polled
  `EventBranding` signal and binds them as CSS custom
  properties on the overlay container.

## Migration

Idempotent Alembic migration `0016_event_branding_layout.py`:

1. `ALTER TABLE event_configurations ADD COLUMN IF NOT EXISTS
   logo_layout JSONB NULL`.
2. `ALTER TABLE event_configurations ADD COLUMN IF NOT EXISTS
   event_name_layout JSONB NULL`.

No backfill, no NOT NULL constraints, no CHECK constraints at
the DB level (validation lives at the API boundary).
