# Data Model: Kiosk Region Ratio Configurability

**Date**: 2026-06-25
**Spec**: [spec.md](./spec.md)

This change relaxes an existing constraint and adds two optional request fields. It does not introduce new tables or new contracts; it modifies the existing `KioskDisplayConfiguration` row shape and the `KioskConfigurationRequest` schema.

## Modified entities

### `KioskDisplayConfiguration`

Source: `backend/app/repositories/models/kiosk_configuration.py`. Already exists from CHG-002; this change modifies its constraints and default.

| Column | Old | New |
|--------|-----|-----|
| `top_region_ratio` | `Integer`, default 4, CHECK `= 4` | `Integer`, default 5, CHECK `> 0` |
| `bottom_region_ratio` | `Integer`, default 1, CHECK `= 1` | `Integer`, default 1, CHECK `> 0` |

Validation rules:

- Both columns MUST be `>= 1` (CHECK constraint).
- The application layer (`KioskConfigurationRequest`) enforces `ge=1, le=20` for input validation; the DB CHECK enforces only the lower bound because Alembic is the only path that mutates the DB and the application always validates first.

### `KioskConfigurationRequest`

Source: `backend/app/api/schemas.py`. Already exists from CHG-002; this change adds two optional fields.

| Field | Old | New |
|-------|-----|-----|
| `topRegionRatio` | n/a | `int`, default 5, `ge=1`, `le=20`, alias `topRegionRatio` |
| `bottomRegionRatio` | n/a | `int`, default 1, `ge=1`, `le=20`, alias `bottomRegionRatio` |

Validation rules:

- Both fields are optional in the request body; if omitted, Pydantic applies the default.
- Out-of-range values (`< 1` or `> 20`) MUST return 400 from the API; Pydantic handles this natively.

### `KioskConfiguration` (TypeScript)

Source: `frontend/src/app/core/api/admin.api.ts`. Already exists; this change adds two number fields.

| Field | New |
|-------|-----|
| `topRegionRatio` | `number` |
| `bottomRegionRatio` | `number` |

## Derived contract surface

| Layer | Surface | Notes |
|-------|---------|-------|
| API (request) | `PUT /api/display/configuration` accepts `topRegionRatio`, `bottomRegionRatio` | New optional fields; backwards compatible |
| API (response) | `GET /api/display/configuration` returns both | Existing behavior, preserved |
| Polled state | `GET /api/display/state` includes `configuration.topRegionRatio`, `configuration.bottomRegionRatio` | CHG-019 consumes this via CSS custom props |
| Admin form | `/admin/configuration` displays two new number inputs | New UI surface |

## State transitions

```
                    ┌──────────────────────────┐
                    │  Existing row (4:1)      │
                    └────────────┬─────────────┘
                                 │ alembic upgrade head
                                 ▼
                    ┌──────────────────────────┐
                    │  Migrated row (5:1)      │
                    └────────────┬─────────────┘
                                 │ admin PUT (any value in [1,20])
                                 ▼
                    ┌──────────────────────────┐
                    │  Customized row          │
                    └────────────┬─────────────┘
                                 │ next poll
                                 ▼
                    ┌──────────────────────────┐
                    │  Kiosk renders           │
                    │  with polled ratios      │
                    └──────────────────────────┘
```

## Relationships

- The Pydantic request schema (`KioskConfigurationRequest`) gates `PUT /api/display/configuration`.
- The SQLAlchemy model (`KioskDisplayConfiguration`) and the Alembic migration are the DB-level authority.
- The TypeScript interface (`KioskConfiguration`) is the frontend authority; the form (`display-config.component.ts`) binds to it via Reactive Forms.
- The polled state (CHG-019) reads from the `DisplayState.configuration` shape; this change keeps that shape unchanged.

## Backfill strategy

The Alembic migration backfills `UPDATE kiosk_display_configurations SET top_region_ratio = 5 WHERE top_region_ratio <> 5`. This is idempotent because re-running the migration finds no rows matching `<> 5`. The migration also tolerates the case where a previous operator already set `top_region_ratio=5` (no-op).
