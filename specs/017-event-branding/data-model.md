# Data Model: Event Branding and Ads Section Title (spec 017)

**Branch**: `017-event-branding` | **Date**: 2026-06-20

This document specifies the database changes for spec 017. Two physical changes:

1. **New table** `event_configurations` (one row per organization).
2. **Drop column** `kiosk_display_configurations.configured_event_duration_minutes` and its check constraint `ck_kiosk_event_duration_positive`.

The existing `media_file_references` table is reused for the organizer logo. No new media storage backend.

## 1. New table: `event_configurations`

Per FR-002, FR-003, Q1, Q4.

| Column | SQL type | Constraints | Notes |
|---|---|---|---|
| `id` | `VARCHAR(36)` (UUID) | PRIMARY KEY | Reuse `IdMixin` and `TimestampMixin`. |
| `organization_id` | `VARCHAR(36)` | NOT NULL, UNIQUE, FK `organizations.id` ON DELETE CASCADE | One row per org; matches spec §EventConfiguration. |
| `event_name` | `VARCHAR(255)` | NOT NULL DEFAULT `''` | Empty string when unset (per Q5). |
| `organizer_name` | `VARCHAR(255)` | NOT NULL DEFAULT `''` | Empty string when unset. |
| `organizer_logo_media_id` | `VARCHAR(36)` | NULL, FK `media_file_references.id` ON DELETE SET NULL | Nullable; per Q8, logo is inline-uploaded. |
| `event_duration_minutes` | `INTEGER` | NOT NULL, CHECK `> 0` AND `<= 1440` | Per FR-003 (1–1440 minutes = 24 hours). |
| `created_at` | `TIMESTAMP WITH TIMEZONE` | NOT NULL | Reuse `TimestampMixin`. |
| `updated_at` | `TIMESTAMP WITH TIMEZONE` | NOT NULL | Reuse `TimestampMixin`. |
| `created_by_user_id` | `VARCHAR(36)` | NULL, FK `users.id` | Standard audit. |
| `updated_by_user_id` | `VARCHAR(36)` | NULL, FK `users.id` | Standard audit. |

Indexes:
- PRIMARY KEY on `id`.
- UNIQUE on `organization_id` (enforces 1:1 with organizations).

Check constraints:
- `ck_event_duration_minutes_positive`: `event_duration_minutes > 0`.
- `ck_event_duration_minutes_max`: `event_duration_minutes <= 1440`.

## 2. Drop: `kiosk_display_configurations.configured_event_duration_minutes`

Per FR-011, FR-013.

- Drop the column.
- Drop its check constraint `ck_kiosk_event_duration_positive` first.

## 3. Reused table: `media_file_references`

Per FR-008, Q4.

- Reuse existing schema unchanged.
- New `media_type` value: `'logo'` (string enum). Existing rows use `'image'` and `'video'`.
- Allowed `content_type` values for logo uploads: `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`.
- Size cap: 1 MB (`image_upload_max_bytes` setting, already in `app/config.py`).

## 4. Backfill logic (in migration)

Per FR-012, FR-011a.

```sql
INSERT INTO event_configurations (
  id, organization_id, event_name, organizer_name,
  organizer_logo_media_id, event_duration_minutes,
  created_at, updated_at, created_by_user_id, updated_by_user_id
)
SELECT
  NEW_UUID(), kdc.organization_id, '', '', NULL,
  kdc.configured_event_duration_minutes,
  NOW(), NOW(), NULL, NULL
FROM kiosk_display_configurations kdc
ON CONFLICT (organization_id) DO NOTHING;
```

For organisations without a `kiosk_display_configurations` row (post-creation), `bootstrap_service` (and any future org-creation path) MUST insert an `event_configurations` row with `event_duration_minutes=240` and all text fields empty.

## 5. State transitions

`event_configurations` has no FSM. The row is created once and updated in place. There is no `isActive`, no `displayOrder`, no availability windows (per spec §Key Entities).

## 6. Relationships

- `event_configurations.organization_id` → `organizations.id` (1:1, cascade delete with the org).
- `event_configurations.organizer_logo_media_id` → `media_file_references.id` (optional 1:1, SET NULL on logo file deletion).
- `event_configurations.created_by_user_id` / `updated_by_user_id` → `users.id` (many:1, NULL allowed for system-created rows).

## 7. Consumers (read paths) — must all switch from the old column to the new table

- `app/services/display_service.py:open_display` — reads `event_duration_minutes` to compute `OperatorSession.valid_until`.
- `app/services/readiness_service.py` — passes `event_duration_minutes` into `ReadinessInput`.
- `app/services/bootstrap_service.py` — creates the initial row.
- `app/services/admin_service.py` — removes assignment to the old column.

These are the only production read paths. Tests that reference the old column need updating.

## 8. Validation rules

Per FR-003 and Q4:

| Field | Validation | Failure response |
|---|---|---|
| `eventName` | `len(eventName) <= 255`, may be empty | HTTP 400 if length > 255 |
| `organizerName` | `len(organizerName) <= 255`, may be empty | HTTP 400 if length > 255 |
| `organizerLogo` (file) | content_type in {png, jpeg, webp, svg+xml}, size <= 1 MB | HTTP 400 with clear message; nothing persisted |
| `eventDurationMinutes` | integer, 1 <= value <= 1440 | HTTP 400 with clear message |

The logo file validation also enforces atomic-replace (FR-008) and orphan-prevention (Q8): a file is only written if the entire PUT will succeed.

## 9. Concurrency

Per FR-024 and Edge Cases: last valid write wins. No optimistic locking in this version. Concurrent PUTs from different admin sessions are serialised by the row update.

## 10. Migration downgrade (informational)

Per Q12 and FR-011, downgrade restores the schema (column + check constraint) but does not restore the data values from `event_configurations` back into `kiosk_display_configurations`. A data-preservation downgrade is out of scope; spec §Assumptions declares the migration "one-way".
