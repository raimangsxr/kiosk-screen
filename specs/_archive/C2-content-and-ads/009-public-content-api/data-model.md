# Data Model: Public Content API with Novelty Priority

**Date**: 2026-06-18
**Spec**: [spec.md](./spec.md)

This document describes the data model additions and changes for the feature. It is the authoritative description for the implementation phase.

## Overview

The feature introduces **one** new persisted entity (`ApiKey`) and **reuses** three existing entities (`TopContentItem`, `MediaFileReference`, `DisplayEvent`) without schema changes. No relationships change. The `ApiKey` table is added via a new Alembic migration `0003_api_keys`. All structural changes go through Alembic; the spec is the only place that decides the shape.

## New Entity: `ApiKey`

A long-lived credential that authenticates the public content upload endpoint on behalf of an organization.

### Table: `api_keys`

| Field | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `String(36)` (UUID) | No | (generated) | Stable identifier. Used in audit events and admin URLs. Does NOT change on rotation (rotation is in-place). |
| `organization_id` | `String(36)` (FK → `organizations.id`) | No | — | The org the key authenticates on behalf of. |
| `label` | `String(120)` | No | — | Human-readable identifier shown in the admin list. Not unique. |
| `key_prefix` | `String(16)` | No | — | Non-secret prefix (`ksk_live_` + 8 URL-safe chars). Used for the list display and as a lookup key. |
| `key_hash` | `String(64)` | No | — | `sha256(full_key)` in hex. The full key is never stored. |
| `is_active` | `Boolean` | No | `true` | Set to `false` on revoke. The verify path rejects `is_active=false` keys with `403 inactive_api_key`. |
| `last_used_at` | `DateTime(timezone=True)` | Yes | `null` | Updated only on a successful 201 response. |
| `last_rotated_at` | `DateTime(timezone=True)` | Yes | `null` | Updated on rotation. `null` until the key is rotated for the first time. |
| `revoked_at` | `DateTime(timezone=True)` | Yes | `null` | Set on revoke. `null` while the key is still active. |
| `created_by_user_id` | `String(36)` (FK → `users.id`) | Yes | `null` | The admin who created the key. Nullable because the column was added on a fresh table. |
| `created_at` | `DateTime(timezone=True)` | No | (now) | Standard timestamp. |
| `updated_at` | `DateTime(timezone=True)` | No | (now) | Standard timestamp, updated on any field change. |

### Indexes

- `ix_api_keys_organization_id` on `organization_id` (for the admin list query).
- `uq_api_keys_key_prefix` unique on `key_prefix` (lookup key for verify).
- No unique constraint on `(organization_id, label)`: the same label can be reused after a key is revoked, and during the small window between "key row exists" and "admin picks a label" we want flexibility. (The spec does not require label uniqueness; deferring it keeps the data model simpler.)

### Constraints

- `ck_api_keys_key_hash_format`: `key_hash` matches `^[0-9a-f]{64}$` (the regex is enforced as a SQL `CHECK` constraint). The 64-character lower-hex form is the standard output of `hashlib.sha256(...).hexdigest()`. Defensive against accidental re-encoding or truncation.
- `ck_api_keys_key_prefix_format`: `key_prefix` matches `^ksk_live_[A-Za-z0-9_-]{8}$` (enforced as a SQL `CHECK` constraint). The literal prefix `ksk_live_` is 9 characters; the 8 trailing characters come from `secrets.token_urlsafe(6)` and are URL-safe (`A-Z`, `a-z`, `0-9`, `_`, `-`). The full `key_prefix` is therefore 17 characters; the `String(16)` length is intentionally one short to detect off-by-one bugs in the generator at the storage layer.

> **Generator reference** (for the implementation task T009):
> ```python
> prefix_body = secrets.token_urlsafe(6)  # 8 url-safe chars
> key_prefix = f"ksk_live_{prefix_body}"   # 17 chars total
> raw = f"{key_prefix}_{secrets.token_urlsafe(24)}"  # ~45 chars total
> key_hash = hashlib.sha256(raw.encode()).hexdigest()  # 64 hex chars
> ```
> The implementation MUST use exactly this pattern; the CHECK constraints exist to catch deviations.

### State Transitions

```
[created, is_active=true, last_used_at=null, last_rotated_at=null, revoked_at=null]
  │
  ├── (successful upload) ──> last_used_at := now()   [is_active stays true]
  │
  ├── (admin rotates) ──>
  │     key_hash := sha256(new_key)
  │     key_prefix := 'ksk_live_' + 8 random chars
  │     last_rotated_at := now()
  │
  └── (admin revokes) ──>
        is_active := false
        revoked_at := now()
        [terminal: cannot transition out of revoked]
```

### Lifecycle Invariants

- A revoked key cannot be re-enabled. Once `is_active=false`, the row is read-only on the verify path. The admin must create a new key.
- Rotation on a revoked key is rejected: the rotate endpoint must check `is_active` first and return 409 if revoked.
- A key with `revoked_at` set MUST have `is_active=false`. Enforced at the application layer; the DB doesn't need a CHECK constraint for this because both columns are set together in a single transition.

## Reused Entities

### `TopContentItem` (existing)

No schema changes. The public endpoint creates new instances with:
- `is_active=true`
- `display_order = max+1` computed inside the per-organization lock
- `created_by_user_id=null` (no human user, just an API key)
- `updated_by_user_id=null`
- All other fields default or null per the existing admin schema.

The existing `content_type` constraint (`photo` / `video` / `embedded_web`) is preserved. The public endpoint only ever sets `photo` or `video`.

### `MediaFileReference` (existing)

No schema changes. The public endpoint reuses the existing `MediaStorageService.save_upload`, which already creates the row with the right fields. The `created_by_user_id` is set to `null` for public uploads (the column is nullable).

### `DisplayEvent` (existing)

No schema changes. Two new event types are added at the application layer:
- `event_type='content_changed'`, with `event_metadata = {"source": "public_api", "api_key_id": "<uuid>"}` on every successful public upload.
- `event_type='api_key_changed'`, with `event_metadata = {"action": "create"|"rotate"|"revoke", "key_label": "<label>"}` on every admin action on a key.

The existing `entity_type` column is set to `"top_content"` for content events and `"api_key"` for key events. `entity_id` is set to the content id or key id.

## Relationships

```
Organization (1) ──< (N) ApiKey
Organization (1) ──< (N) TopContentItem        (existing, unchanged)
Organization (1) ──< (N) MediaFileReference   (existing, unchanged)
Organization (1) ──< (N) DisplayEvent         (existing, unchanged)
TopContentItem   (1) ──> (1) MediaFileReference  (existing, unchanged)
ApiKey           (1) ──> (N) DisplayEvent       (NEW: tracked via event_metadata.api_key_id; no FK because DisplayEvent is append-only and ApiKey can be revoked/deleted)
```

The `ApiKey` → `DisplayEvent` link is via the `event_metadata.api_key_id` JSON field, not a foreign key, because the audit log should survive the deletion/revocation of the originating key. This is consistent with how `content_changed` events reference content that may later be deleted.

## Volume Assumptions

- One organization typically has 1–10 active API keys (the spec permits N per org, but the realistic use is "one key per integration").
- The `api_keys` table grows by O(active integrations), not O(uploads). At 10 integrations × 100 orgs = 1000 rows, this is trivially small.
- `DisplayEvent` grows by O(uploads + admin actions). At 1000 uploads/day × 365 days = 365K rows/year, well within Postgres performance with the existing indexes.

## Migration: `0003_api_keys.py`

Operations (in order):

1. `op.create_table("api_keys", ...)` with the columns above and the unique/index/CHECK constraints.
2. `op.create_index("ix_api_keys_organization_id", "api_keys", ["organization_id"])`.

Down operations (reverse order):

1. `op.drop_index("ix_api_keys_organization_id", "api_keys")`.
2. `op.drop_table("api_keys")`.

No data backfill is required because the table is new and starts empty. No data loss on downgrade.

## Existing Business Data To Preserve

- All `TopContentItem`, `MediaFileReference`, and `DisplayEvent` rows remain untouched. The new `api_keys` table does not affect them.
- The `kiosk_display_configurations` table is unchanged.
- No `displayOrder` values are renumbered; the existing rotation keeps working.

## State Transitions Summary

```
ApiKey lifecycle:
  create → active
  active ↔ active (rotation, multiple times; updates key_hash, key_prefix, last_rotated_at)
  active → revoked (terminal)

TopContentItem:
  No change. Public endpoint creates items in `active` state.

DisplayEvent (semantics, not new state):
  api_key_changed (create | rotate | revoke) — append-only
  content_changed (source=public_api) — append-only
```

## Naming Conventions

This feature touches both the database (SQLAlchemy / Alembic) and the public JSON contract. The two layers use different but consistent naming:

- **Database column names** are `snake_case`: `key_hash`, `key_prefix`, `last_used_at`, `last_rotated_at`, `revoked_at`, `created_by_user_id`, `display_order`, `media_file_id`, `event_metadata`. This is the standard for the existing schema (`media_file_references.storage_path`, `top_content_items.display_order`, etc.) and is preserved by SQLAlchemy's default `Column.attr_name`.
- **Public JSON field names** are `camelCase`: `keyHash`, `keyPrefix`, `lastUsedAt`, `lastRotatedAt`, `revokedAt`, `createdByUserId`, `displayOrder`, `mediaFile`, `eventMetadata`. Pydantic v2 with `alias_generators={to_camel}` (or explicit `Field(alias=...)`) handles the conversion at the API boundary.
- **TypeScript field names** match the public JSON exactly (`camelCase`). The frontend never sees the snake_case form; the OpenAPI schema is the source of truth for the TypeScript types.

**Conversion rule**: at the API boundary only, `snake_case` ↔ `camelCase`. Inside the backend (service layer, repository, domain), the canonical form is `snake_case` to match the DB. The frontend never converts anything; it consumes `camelCase` as the contract dictates.

**Cross-reference**: when the spec text uses a field name ambiguously (e.g., "the `keyHash` field on the ApiKey row"), it is the **public** field name unless explicitly qualified as a DB column. Tasks that touch both layers (T006, T009, T023) MUST keep the conversion at the schema layer; service-layer code uses the snake_case DB form.
