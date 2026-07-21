# Data Model: CHG-043 Live Density Profile Calibration

**Extends**: [CHG-042 data-model](../042-per-display-iframe-layout/data-model.md)

No new PostgreSQL tables. Behavioral extensions only.

---

## Ephemeral client state (admin UI)

### `LiveCalibrationSession` (frontend only)

| Field | Type | Notes |
|-------|------|-------|
| `profileId` | UUID | Created profile or edited profile |
| `profileName` | string | Display + autosave identity |
| `previewKioskId` | string | Connected kiosk from `GET .../live` |
| `previewIframeId` | string | Selected org iframe |
| `densities` | `Record<EmbedAppFamily, number>` | Slider values; debounced to API |
| `autosaveStatus` | `idle \| saving \| saved \| error` | FR-009 |
| `assignedDeviceCount` | number | Controls apply button visibility (FR-013) |
| `lastSavedAt` | ISO string \| null | Checkpoint for stale detection |

Not persisted server-side. Discarded when operator leaves the page.

---

## API extensions

### `PUT /api/admin/display-layout/profiles/{id}`

**Query** (new, optional):

| Param | Type | Notes |
|-------|------|-------|
| `previewKioskId` | string | When set, after save, targeted preview fanout to this kiosk only |

**Behavior change**: Persist profile densities. When `previewKioskId` is set, emit SSE
`layout_updated` with `source: profile_preview` to that kiosk only. Do **not** fan out to
assigned devices or org-wide (FR-012). Remove CHG-042 `_publish_layout_fanout` call from
this path when `previewKioskId` is present.

When `previewKioskId` is absent (e.g. name-only edit), no layout fanout.

---

### `POST /api/admin/display-layout/profiles/{id}/apply-assigned` (new)

Push persisted profile densities to all kiosks currently assigned to this profile.

**Response**: `204` or `{ applied: true, deviceCount: number }`

**Side effects**: SSE `layout_updated` to each assigned device's connected kiosk with
`source: profile` per family. Reuses existing profile-update audit path if present; no new
audit event type.

---

### Assign flow (existing — FR-014)

`PATCH /api/admin/display-layout/devices/{id}` with `layoutProfileId` already calls
`_publish_layout_to_device` for the target device. US3 assign confirm uses this path;
no separate apply button required in assign flow.

---

## SSE payload extension

### `layout_updated` (existing event type)

Per-family source values (extended enum):

| Source | Meaning |
|--------|---------|
| `profile_preview` | **New** — admin live calibration; not persisted as local override |
| `profile` | Assigned profile (unchanged) |
| `local_override` | On-display panel (unchanged) |
| `org_default` | Org default (unchanged) |
| `fallback` | Hard default 720 (unchanged) |

Kiosk runtime: `profile_preview` applies density identically to `profile` for iframe URL/postMessage, but MUST NOT be written to `local_overrides` and MUST be replaced on next authoritative `layout/me` if preview session ends.

---

## Embed density source enum (domain)

Extend `EmbedDensitySource` in `backend/app/domain/embed_layout.py`:

```text
profile_preview  # CHG-043
```

Frontend `densitySourceLabel()` in `embed-density-labels.ts` maps to Spanish: **vista previa**.

---

## State transitions (preview session)

```text
[no session]
  → select kiosk + iframe + name
  → POST profile
  → [calibrating]
       slider debounce → PUT profile?previewKioskId=… (preview only)
       → [calibrating] (saved)
  → optional: POST apply-assigned → all assigned kiosks get profile source
  → optional US3: PATCH device assign → target kiosk gets profile source
  → [done]

[calibrating]
  → switch preview kiosk → PUT with new previewKioskId
  → [calibrating] (new kiosk shows preview; no local_override)
  → exit without apply → profile saved; assigned kiosks unchanged
```

---

## Validation rules

- `previewKioskId` MUST reference a kiosk in `GET /api/admin/display-layout/live` for the org.
- Sliders disabled until `previewKioskId`, `previewIframeId`, and iframe mode active on session.
- Only the slider matching the selected iframe's `embed_app_family` is enabled (FR-003).
- Density values: 300–1200 px (reuse CHG-042 clamps).
- Unsupported iframe family → all sliders disabled with explanatory message (FR-011).
