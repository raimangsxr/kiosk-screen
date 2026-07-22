# Data Model: CHG-045 Per-Display Iframe Scale

## New / restored PostgreSQL entities

### `display_devices`

Stable organization-scoped kiosk screen identity (restored, simplified vs CHG-042).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID FK | → `organizations.id` |
| `label` | VARCHAR(80) | Operator-visible name; unique per org |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |
| `last_seen_at` | TIMESTAMPTZ NULL | Updated on kiosk register |

**Constraints**: `UNIQUE (organization_id, label)`

**Lifecycle**:

```text
[manual create in admin] ──► [known offline device]
[kiosk register + new label] ──► [auto-created device]
[known device] --register--> last_seen_at updated
[rename label] --PATCH--> label updated; id unchanged
[delete device] --DELETE--> cascades iframe_display_scale_overrides
```

---

### `iframe_display_scale_overrides`

Explicit per-display per-iframe scale; absence = use iframe default.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `display_device_id` | UUID FK | → `display_devices.id` `ON DELETE CASCADE` |
| `iframe_id` | UUID FK | → `iframes.id` `ON DELETE CASCADE` |
| `scale_x` | NUMERIC(4,2) | 0.10–5.00 |
| `scale_y` | NUMERIC(4,2) | 0.10–5.00 |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints**: `UNIQUE (display_device_id, iframe_id)`

---

### `kiosk_connections` (extend)

| Column | Type | Notes |
|--------|------|-------|
| `display_device_id` | UUID FK NULL | → `display_devices.id`; set on register |

Re-adds column removed in migration `0023`.

---

## Unchanged entities (read/write)

### `iframes`

Keeps `scale_x` / `scale_y` as organization-wide **defaults** (CHG-044).

---

## Effective scale resolution

```text
resolve(display_device_id, iframe) → {
  scaleX: Decimal,
  scaleY: Decimal,
  source: 'override' | 'default'
}
```

Algorithm:

1. Load override row for `(display_device_id, iframe.id)`.
2. If present → return override values, `source: 'override'`.
3. Else → return `iframe.scale_x`, `iframe.scale_y`, `source: 'default'`.

Validation: same bounds as `MIN_IFRAME_SCALE` / `MAX_IFRAME_SCALE` (`0.10`–`5.00`).

---

## API surfaces (summary)

| Method | Path | Role |
|--------|------|------|
| GET | `/api/admin/display-devices` | List known devices for org |
| POST | `/api/admin/display-devices` | Manual create `{ label }` |
| PATCH | `/api/admin/display-devices/{id}` | Rename `{ label }` |
| DELETE | `/api/admin/display-devices/{id}` | Remove device + overrides |
| GET | `/iframes` | List iframes + `displayScales[]` per item |
| GET | `/iframes/{id}` | Iframe + full `displayScales[]` matrix |
| PUT | `/iframes/{id}/display-scales` | Batch upsert/clear overrides |
| POST | `/api/display/kiosk/register` | Upsert device by non-empty `label`; return `displayDeviceId`; reject empty label with `422` |
| GET | `/api/display/iframe-scales/me` | Kiosk — override map for connected device |

RBAC: `content_manager` for iframe/display-device writes; kiosk routes use session cookie auth.

---

## SSE events

### `iframe_scale_updated` (new)

```json
{
  "type": "iframe_scale_updated",
  "payload": {
    "displayDeviceId": "uuid",
    "iframeId": "uuid",
    "scaleX": 1.25,
    "scaleY": 0.9,
    "source": "override"
  }
}
```

Emitted to operator session after override save/clear when active iframe matches (or always; kiosk filters by `displayDeviceId`).

### `show_iframe` (unchanged envelope)

Iframe object still carries default `scaleX`/`scaleY`. Kiosk applies `resolve()` on receive.

---

## Admin DTO shapes

### `DisplayScaleEntry` (list + matrix)

```json
{
  "displayDeviceId": "uuid",
  "displayLabel": "Sala ultrawide",
  "connected": true,
  "scaleX": 1.25,
  "scaleY": 1.0,
  "source": "override"
}
```

`connected` is `true` when the display device has an active kiosk registration in the current operator session (resolved via SSE hub / live kiosk registry join in `list_display_scales`).

### `DisplayScaleOverrideInput` (PUT body item)

```json
{
  "displayDeviceId": "uuid",
  "scaleX": 1.25,
  "scaleY": 1.0
}
```

Omit row or send `{ "displayDeviceId": "...", "clear": true }` to remove override.

---

## Migration

**`0024_per_display_iframe_scale`**:

1. Create `display_devices`.
2. Create `iframe_display_scale_overrides`.
3. Add `kiosk_connections.display_device_id` FK.

No data backfill required (CHG-044 dropped prior device rows).
