# Data Model: CHG-042 Per-Display Iframe Layout Profiles

## New PostgreSQL entities

### `display_layout_profiles`

Organization-scoped named presets.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID FK | → `organizations.id` |
| `name` | VARCHAR(80) | Unique per org |
| `densities` | JSONB | Map `EmbedAppFamily` → `int` px, e.g. `{"amrn_bull": 520, "amrn_escalabirras": 480}` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints**: `UNIQUE (organization_id, name)`; each density value 300–1200.

---

### `display_devices`

Stable physical screen identity (survives SSE reconnects).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `organization_id` | UUID FK | |
| `label` | VARCHAR(80) | Operator-chosen, unique per org |
| `layout_profile_id` | UUID FK NULL | → `display_layout_profiles.id` `ON DELETE SET NULL` |
| `local_overrides` | JSONB | Map `EmbedAppFamily` → `int` px; wins over profile |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |
| `last_seen_at` | TIMESTAMPTZ NULL | Updated on kiosk register |

**Constraints**: `UNIQUE (organization_id, label)`.

---

### `kiosk_display_configurations` (extend)

Add organization-level defaults:

| Column | Type | Notes |
|--------|------|-------|
| `embed_density_defaults` | JSONB | Default `{"amrn_bull": 720, "amrn_escalabirras": 720}` |

Migration sets existing rows to default map.

---

### `iframes` (extend)

| Column | Type | Notes |
|--------|------|-------|
| `embed_app_family` | VARCHAR(32) NULL | Admin override: `amrn_bull`, `amrn_escalabirras`, or NULL → auto-detect |

---

### `kiosk_connections` (extend link)

| Column | Type | Notes |
|--------|------|-------|
| `display_device_id` | UUID FK NULL | → `display_devices.id`; set on register when label resolves |

Existing `label` column retained for session snapshot; authoritative label text
lives on `display_devices.label`.

---

## Enumerations

### `EmbedAppFamily`

| Value | Detection |
|-------|-----------|
| `amrn_bull` | Host matches `EMBED_APP_FAMILY_HOSTS.amrn_bull` or iframe override |
| `amrn_escalabirras` | Host matches `EMBED_APP_FAMILY_HOSTS.amrn_escalabirras` or override |
| `unknown` | No match and no override |

---

## Effective density resolution

```text
resolve(org_id, display_device, iframe_url, family_override?) → {
  family: EmbedAppFamily,
  effective_px: int,
  source: 'local_override' | 'profile' | 'org_default' | 'fallback'
}
```

Algorithm:

1. `family = iframe.embed_app_family ?? detect_family(iframe_url.host)`
2. If `family == unknown` → `{ effective_px: null, source: 'fallback' }`
3. If `display_device.local_overrides[family]` → source `local_override`
4. Else if profile.densities[family]` → source `profile`
5. Else if `config.embed_density_defaults[family]` → source `org_default`
6. Else `720`, source `fallback`
7. Clamp to [300, 1200]

---

## Kiosk browser cache (non-authoritative)

| Key | Contents |
|-----|----------|
| `kiosk_display_label` | string — claimed label |
| `kiosk_layout_cache:v1` | `{ label, densities: Record<family, number>, fetchedAt }` |

On register success: refresh cache from `GET /api/display/layout/me` (or register response envelope).

---

## API surfaces (summary)

| Method | Path | Role |
|--------|------|------|
| GET | `/api/display/layout/me` | Kiosk — effective densities + source for connected label |
| PATCH | `/api/display/layout/me/overrides` | Kiosk — set local override per family |
| POST | `/api/display/layout/me/reset` | Kiosk — clear local overrides |
| GET | `/api/admin/display-layout/profiles` | Admin list |
| POST | `/api/admin/display-layout/profiles` | Admin create |
| PUT | `/api/admin/display-layout/profiles/{id}` | Admin update |
| DELETE | `/api/admin/display-layout/profiles/{id}` | Admin delete |
| GET | `/api/admin/display-layout/devices` | Admin list devices + assignments |
| PATCH | `/api/admin/display-layout/devices/{id}` | Admin assign profile / rename |
| PATCH | `/api/admin/display-layout/kiosks/{kioskId}/profile` | Admin assign to online kiosk |
| GET | `/api/admin/display-layout/live` | Operations — connected kiosks + effective density + source |

RBAC: `content_manager` for write; `event_operator` read on live view.

---

## SSE event

### `layout_updated`

```json
{
  "type": "layout_updated",
  "payload": {
    "displayLabel": "Sala ultrawide",
    "families": {
      "amrn_bull": { "effectivePx": 480, "source": "local_override" }
    }
  }
}
```

Emitted to affected kiosk(s) after override/profile/default mutation.

---

## State transitions

### Display device

```text
[unclaimed] --first /display open + label--> [claimed]
[claimed] --admin assign profile--> [profile_assigned]
[profile_assigned] --on-display tweak--> [locally_overridden]
[locally_overridden] --reset--> [profile_assigned | org_default]
[profile_assigned] --profile deleted--> [org_default] + admin warning
```

---

## Unchanged entities (read-only)

- `operator_sessions`, `iframes.url`, orchestrator `show_iframe` payload (URL augmented client-side)
