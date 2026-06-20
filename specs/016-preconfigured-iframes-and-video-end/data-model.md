# Data Model: Pre-configured Iframes and Video Plays To End

**Date**: 2026-06-20
**Spec**: [spec.md](./spec.md)

This document describes the data model additions, changes, and removals for the feature. It is the authoritative description for the implementation phase.

## Overview

The feature introduces **one** new persisted entity (`Iframe`), modifies **two** existing entities (`DisplayControlState`, `KioskDisplayConfiguration`), and **removes** one persisted entity (`ApprovedEmbeddedDomain`) and its dependents. All structural changes are shipped in a single Alembic migration that also purges any existing `embedded_web` rows from `top_content_items`. After the migration, the data model is fully consistent with the new behaviour.

## New Entity: `Iframe`

A pre-configured URL the operator may pin to the kiosk top zone at runtime.

### Table: `iframes`

| Field | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `String(36)` (UUID) | No | (generated) | Stable identifier. |
| `organization_id` | `String(36)` (FK → `organizations.id`) | No | — | Owning organization. |
| `url` | `String(1024)` | No | — | The iframe URL. Validated as `http(s)://...` with a non-empty host. |
| `created_at` | `DateTime(timezone=True)` | No | (now) | Standard timestamp. |
| `updated_at` | `DateTime(timezone=True)` | No | (now) | Standard timestamp, updated on any field change. |
| `created_by_user_id` | `String(36)` (FK → `users.id`) | Yes | `null` | The admin who created the iframe. |
| `updated_by_user_id` | `String(36)` (FK → `users.id`) | Yes | `null` | The admin who last edited the iframe. |

### Indexes

- `ix_iframes_organization_id` on `organization_id` (for the admin list query and the remote-control list query).
- `uq_iframes_organization_id_url` unique on `(organization_id, url)` (FR-003).

### Constraints

- `ck_iframes_url_scheme`: `url` matches `^https?://` (enforced at the application layer; the SQL column is plain text because the team has consistently kept URL validation in the service layer, not at the DB level).
- No CHECK constraint on `url` length at the SQL level; the column is `String(1024)` which enforces it implicitly.

### State Transitions

The entity has no state machine. An `Iframe` either exists or does not. The only mutation is create / update (URL only) / delete. There is no `is_active` flag (per the spec, FR-005: "the only way to 'disable' an iframe is to delete it").

### Lifecycle Invariants

- A delete MUST trigger the service-level cleanup described in [§ Changes to `DisplayControlState`](#changes-to-displaycontrolstate) below.
- The same `url` cannot be created twice within the same organization; the unique index is the source of truth.
- An `Iframe` belongs to exactly one `Organization`; the kiosk and remote control lists are always filtered by the caller's organization.

## Changes to `DisplayControlState`

The `display_control_states` table gains a renamed column and a re-pointed foreign key.

### Field Rename

| Old | New | Type | Nullable | Notes |
|---|---|---|---|---|
| `selected_content_id` | `selected_iframe_id` | `String(36)` (UUID, FK → `iframes.id` with `ON DELETE SET NULL`) | Yes | The selection is now an `Iframe` row, not a `TopContentItem`. |

### State Transitions

```
[content_mode='loop', selected_iframe_id=NULL, ads_visible=true]
  │
  ├── (operator selects an iframe in remote control) ──>
  │     content_mode := 'iframe'
  │     selected_iframe_id := <iframe.id>
  │
  ├── (operator switches back to "Rotation") ──>
  │     content_mode := 'loop'
  │     selected_iframe_id := NULL
  │
  ├── (operator hides ads) ──>
  │     ads_visible := false
  │
  └── (iframe deleted while content_mode='iframe') ──>
        content_mode := 'loop'
        selected_iframe_id := NULL
        [event 'remote_control_iframe_deleted' recorded]
```

The "loop" state is the default on session open. The transition from "iframe" to "loop" via iframe deletion is the service-level cleanup. All other transitions are driven by remote-control PUT requests from the operator.

### Lifecycle Invariants

- `content_mode='iframe'` implies `selected_iframe_id IS NOT NULL`; `content_mode='loop'` implies `selected_iframe_id IS NULL`. Enforced at the application layer in `DisplayControlService.update_state` and the new `IframeService.delete` cleanup.
- Only the active display session's `DisplayControlState` is exposed to the kiosk; the service picks the latest active session per spec 006.
- The kiosk polls `GET /api/display/state`; the public DTO always returns the latest committed state.

## Changes to `KioskDisplayConfiguration`

The `kiosk_display_configurations` table gains a new column.

### Added Field

| Field | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `video_end_delay_seconds` | `Integer` | No | `2` | Seconds the kiosk waits after a video's natural `ended` event before advancing to the next Content item. Range 0..30 inclusive. Enforced by SQL CHECK and by the application-layer validation in `KioskConfigurationService` (and the PUT endpoint). |

### Lifecycle Invariants

- The value is part of the `configuration` object returned in `GET /api/display/state`; the kiosk fingerprint equality (in `DisplayApiService.watchState`) MUST include it so changes are picked up on the next poll.
- A change is hot-applied; no kiosk restart is required.

## Changes to `TopContentItem`

The `top_content_items.content_type` column is unchanged at the SQL level (`String(32)`), but the application-layer allow-list is reduced.

### Allowed `content_type` Values After This Feature

- `photo`
- `video`

`embedded_web` is no longer accepted. Any incoming request to create or update a `TopContentItem` with `content_type='embedded_web'` is rejected with HTTP 400 by `ContentService.validate_content` and `ContentService.validate_uploaded_content` (FR-011).

### Data Purged in This Migration

- All rows in `top_content_items` with `content_type='embedded_web'` are deleted in the same migration that drops the `approved_embedded_domains` table and creates the `iframes` table. No backup; per the user's "no migration of data" answer.

## Removed Entity: `ApprovedEmbeddedDomain`

The `approved_embedded_domains` table and all its dependents are removed. This is FR-021 in the spec.

### What Is Removed

- The `approved_embedded_domains` table (SQL).
- The `ApprovedEmbeddedDomain` SQLAlchemy model (`backend/app/repositories/models/approved_domain.py`).
- The `ApprovedEmbeddedDomainRepository` (if any).
- The `AdminService` methods that operate on approved domains (`create`, `list`, `update`, `delete`, plus the "cannot delete because of active iframe content" check).
- The `/api/approved-domains` FastAPI router.
- The `frontend/src/app/features/domains/` directory and its routes/components.
- The "Iframe domains" entry in the admin sidenav (`admin-navigation.service.ts`).
- The "unapproved embedded domains" readiness check in `readiness_service.py`.
- The `domain/embedded_domains.py` module.
- Any other import or reference to the table, model, or router (verified by automated search returning zero results, per SC-006).

### What Replaces It

- Nothing. The spec removes the entire concept.

## Reused Entities (unchanged)

- `TopContentItem` (modulo the reduced `content_type` allow-list and the data purge).
- `OperatorSession` (the active display session handle).
- `Organization` (the per-tenant boundary; both `Iframe` and `DisplayControlState` are scoped by it).
- `User` (the audit `createdByUserId` / `updatedByUserId` references).
- `MediaFileReference` (unchanged; only photos and videos use it after this feature).
- `DisplayEvent` (extended with the new event type `remote_control_iframe_deleted`).

## Migration Plan

A single Alembic migration `0008_preconfigured_iframes_and_video_end.py` performs the following in one transaction:

1. `DELETE FROM top_content_items WHERE content_type = 'embedded_web';`
2. `DROP TABLE IF EXISTS approved_embedded_domains CASCADE;`
3. `CREATE TABLE iframes (...)` with the indexes and constraints above.
4. `ALTER TABLE display_control_states DROP CONSTRAINT IF EXISTS <old FK>;` `ALTER TABLE display_control_states DROP COLUMN selected_content_id;` `ALTER TABLE display_control_states ADD COLUMN selected_iframe_id VARCHAR(36) REFERENCES iframes(id) ON DELETE SET NULL;`
5. `ALTER TABLE kiosk_display_configurations ADD COLUMN video_end_delay_seconds INTEGER NOT NULL DEFAULT 2 CHECK (video_end_delay_seconds BETWEEN 0 AND 30);`
6. (Downgrade reverses all of the above, recreating `approved_embedded_domains` empty and adding `selected_content_id` as nullable without data; the purge is not reversible.)

The migration is the only schema change. No data backfill; no fallback path for `embedded_web`.
