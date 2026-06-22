# Data Model: Content Rotation Modes

**Branch**: `018-content-rotation-modes` | **Date**: 2026-06-22

This file documents the database schema changes for spec 018. Two existing tables are extended; no new tables and no removed columns.

## Migration: `0012_content_rotation_modes.py`

Idempotent (follows the `0010` / `0011` pattern). Every step is guarded.

### 1. `top_content_items` — two new columns

| Column | Type | Null | Default | Constraints |
|---|---|---|---|---|
| `recurring_every_x_iterations` | `Integer` | YES | `NULL` | `CHECK (recurring_every_x_iterations IS NULL OR recurring_every_x_iterations >= 1)` |
| `is_fixed` | `Boolean` | NO | `false` | `CHECK (NOT (is_fixed AND recurring_every_x_iterations IS NOT NULL))` |

Existing rows are backfilled with the defaults (`NULL` and `false`); no manual data migration needed.

Index: `CREATE INDEX IF NOT EXISTS ix_top_content_items_is_fixed ON top_content_items (is_fixed) WHERE is_fixed = true` (partial index, used by `fixedEligibleContentIds` query).

### 2. `display_control_states` — one new column and one widened CHECK

| Column | Type | Null | Default | Constraints |
|---|---|---|---|---|
| `selected_fixed_content_id` | `Integer` FK → `top_content_items.id` ON DELETE SET NULL | YES | `NULL` | — |

Existing `CHECK (content_mode IN ('loop', 'iframe'))` is widened to `CHECK (content_mode IN ('loop', 'iframe', 'fixed'))`.

A new CHECK enforces `selected_fixed_content_id IS NOT NULL => content_mode = 'fixed'`.

### 3. No data backfill needed

- Existing Contents get `is_fixed=false` and `recurring_every_x_iterations=NULL` (defaults).
- Existing `display_control_states` rows keep their `content_mode` ('loop' or 'iframe'); `selected_fixed_content_id` is `NULL`.

## SQLAlchemy models

### `backend/app/repositories/models/content.py` (modified)

```python
class TopContentItem(Base, IdMixin, TimestampMixin):
    __tablename__ = "top_content_items"

    # ... existing columns unchanged ...

    recurring_every_x_iterations: Mapped[int | None] = mapped_column(
        Integer, nullable=True,
    )
    is_fixed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false",
    )

    __table_args__ = (
        CheckConstraint(
            "recurring_every_x_iterations IS NULL OR recurring_every_x_iterations >= 1",
            name="ck_top_content_recurring_positive",
        ),
        CheckConstraint(
            "NOT (is_fixed AND recurring_every_x_iterations IS NOT NULL)",
            name="ck_top_content_not_fixed_and_recurring",
        ),
    )
```

### `backend/app/repositories/models/display_control_state.py` (modified)

```python
class DisplayControlState(Base, IdMixin, TimestampMixin):
    __tablename__ = "display_control_states"

    # ... existing columns ...

    selected_fixed_content_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("top_content_items.id", ondelete="SET NULL"), nullable=True,
    )

    __table_args__ = (
        CheckConstraint(
            "content_mode IN ('loop', 'iframe', 'fixed')",
            name="ck_display_control_content_mode",
        ),
        CheckConstraint(
            "selected_fixed_content_id IS NOT NULL OR content_mode != 'fixed'",
            name="ck_display_control_fixed_has_target",
        ),
    )
```

## State machine: `contentMode`

```
   loop ──(PUT contentMode='iframe', selectedIframeId?)──> iframe
   loop ──(PUT contentMode='fixed', selectedFixedContentId)──> fixed
   iframe ──(PUT contentMode='loop')──> loop
   fixed ──(PUT contentMode='loop')──> loop
   fixed ──(PUT contentMode='iframe')──> iframe
   iframe ──(PUT contentMode='fixed')──> fixed
   loop ──(PUT contentMode='loop')──> loop (no-op)
```

Invariant: `contentMode='fixed'` ⇔ `selected_fixed_content_id IS NOT NULL AND target.is_fixed=true`. Enforced on the backend in `DisplayControlService.update_state`.

## State machine: kiosk rotation controller (frontend, in-memory only)

```
   mode=loop, isPaused=false  ──(next/previous)──>  same state, cursor advances
   mode=loop, isPaused=false  ──(pause)──>  mode=loop, isPaused=true
   mode=loop, isPaused=true   ──(resume)──>  mode=loop, isPaused=false
   any                       ──(mode change)──>  isPaused reset to false
   mode=loop, isPaused=true   ──(next/previous)──>  cursor advances, isPaused stays true
   mode=iframe                ──(next/previous/pause/resume)──>  rejected (HTTP 409)
   mode=fixed                 ──(next/previous/pause/resume)──>  rejected (HTTP 409)
```

Invariant: `cadenceCounter` only advances while `mode='loop' AND isPaused=false`. When `mode` becomes `'iframe'` or `'fixed'`, the counter is frozen until `mode='loop'` returns.

## Audit events

| Event | Trigger | Payload |
|---|---|---|
| `display_control_paused` | Successful `POST /api/display/remote-control/navigation` with `command='pause'` | `{ userId, organizationId, mode }` |
| `display_control_resumed` | Successful `POST /api/display/remote-control/navigation` with `command='resume'` | `{ userId, organizationId, mode }` |
| `display_control_fixed_changed` | Successful `PUT /api/display/remote-control` setting `contentMode='fixed'` or changing `selectedFixedContentId` | `{ userId, organizationId, previousContentMode, newContentMode, selectedFixedContentId }` |
| `content_rotation_empty` | Kiosk detects empty queue; debounced 60 s | `{ organizationId }` |
| `content_type_autodetected` | Upload where `contentType` form field was missing or contradicted the extension | `{ organizationId, filename, extension, detectedContentType, requestedContentType }` |

All events follow the existing `audit_event` table schema (no schema change).

## Public / integration contract impact

- `ContentItemSchema` adds `isFixed: bool` and `recurringEveryXIterations: int | null`. Both are read-only on the public API (always `false`/`null` on rows created there).
- `DisplayKioskConfiguration.remoteControl` adds `selectedFixedContentId: int | null`.
- `DisplayKioskConfiguration` adds `fixedEligibleContentIds: { id, name, mediaUrl, thumbnailUrl }[]` for the remote-control dropdown.
- No new top-level tables.

## Indexing

- New partial index `ix_top_content_items_is_fixed` (see above).
- Existing `ix_top_content_items_display_order` is sufficient for the rotation queue.
- No new index on `recurring_every_x_iterations` because the query "WHERE recurring_every_x_iterations IS NOT NULL" is rare and the row count is small.

## Seed / bootstrap

No bootstrap changes. The `bootstrap_service` already creates default Contents / DisplayControlStates; the new columns take their defaults (`NULL` / `false`).

## Backwards compatibility

- Existing API consumers of `ContentItemSchema` that ignore unknown fields continue to work; the new fields appear as additional properties.
- Existing remote-control UI consumers that ignore `contentMode='fixed'` simply never set it.
- Existing kiosk deployments that never send `pause` / `resume` navigation commands are unaffected.

## Out of scope

- Soft-delete of Contents (cascading FK behaviour for `selected_fixed_content_id` already covered by `ON DELETE SET NULL`).
- Multi-tenant isolation beyond what `organization_id` already provides.
- Audit-event retention policy (uses existing audit table retention).