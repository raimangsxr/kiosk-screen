# Data Model: CHG-049 Display Device Admin

No PostgreSQL or API schema changes. Documents client view models and merge logic.

---

## Server entity (unchanged): `DisplayDevice`

From `GET /api/admin/display-devices` (`DisplayDeviceSchema`):

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` (UUID) | Stable; survives rename |
| `organizationId` | `string` | Tenant scope |
| `label` | `string` | Unique per org; 1–80 chars |
| `lastSeenAt` | `string \| null` | ISO datetime; updated on kiosk register |
| `createdAt` | `string` | ISO datetime |
| `updatedAt` | `string` | ISO datetime |

**Mutations** (existing):

| Action | Endpoint | Body |
|--------|----------|------|
| Create | `POST /api/admin/display-devices` | `{ label }` |
| Rename | `PATCH /api/admin/display-devices/{id}` | `{ label }` |
| Delete | `DELETE /api/admin/display-devices/{id}` | — |

---

## Server slice (unchanged): `LiveKiosk`

From `GET /api/admin/display/kiosks/live`:

| Field | Type | Notes |
|-------|------|-------|
| `kioskId` | `string` | Connection id |
| `displayLabel` | `string \| null` | Used for merge; null ignored |

---

## Client view model: `DisplayDeviceRow`

| Field | Type | Source |
|-------|------|--------|
| `id` | `string` | `DisplayDevice.id` |
| `label` | `string` | `DisplayDevice.label` |
| `connected` | `boolean` | `liveLabels.has(label)` |
| `lastSeenAt` | `string \| null` | `DisplayDevice.lastSeenAt` |
| `createdAt` | `string` | `DisplayDevice.createdAt` |
| `updatedAt` | `string` | `DisplayDevice.updatedAt` |

### Merge algorithm

```text
liveLabels = new Set(
  liveKiosks
    .map(k => k.displayLabel)
    .filter((label): label is string => !!label?.trim())
)

rows = devices
  .map(d => ({ ...d, connected: liveLabels.has(d.label) }))
  .sort((a, b) => a.label.localeCompare(b.label, 'es'))
```

---

## Facade state: `DisplayDevicesFacade`

| Signal | Type | Notes |
|--------|------|-------|
| `devices` | `readonly DisplayDeviceRow[]` | Sorted merged rows |
| `loading` | `boolean` | True during fetch |
| `mutating` | `boolean` | True during create/rename/delete |
| `error` | `ApplicationErrorContract \| null` | Last load/mutation error |
| `empty` | `computed` | `!loading && devices.length === 0 && !error` |

### Polling lifecycle

```text
startPolling(intervalMs = 30_000):
  interval(intervalMs).pipe(
    startWith(0),
    switchMap(() => refresh()),
    takeUntilDestroyed(destroyRef)
  )
```

`refresh()` = `forkJoin([displayDevicesApi.list(), liveKiosksApi.listLive()])` → merge → `devices.set(rows)`.

---

## UI state: create form (inline)

| Field | Type | Validation |
|-------|------|------------|
| `newLabel` | `FormControl<string>` | `required`, `maxLength(80)`, trim non-empty |

**On success**: clear control, snackbar «Pantalla añadida», `refresh()`.

**On duplicate (400)**: snackbar with server message; retain field value.

---

## UI state: rename dialog

| Field | Type | Notes |
|-------|------|-------|
| `deviceId` | `string` | Dialog data |
| `label` | `FormControl<string>` | Pre-filled; same validation as create |

**On save**: `PATCH` → close with `true` → parent `refresh()`.

---

## UI state: delete confirmation

| Input | Type | Notes |
|-------|------|-------|
| `row` | `DisplayDeviceRow` | Selected row |

**Message variants**:

- Disconnected: `¿Eliminar "{label}"? Esta acción no se puede deshacer.`
- Connected: prepend `Esta pantalla está conectada ahora mismo. ` to message

**On confirm**: `DELETE` → snackbar → `refresh()`.

---

## Cascade behavior (server, unchanged)

Deleting a `DisplayDevice`:

- Clears `kiosk_connections.display_device_id` references
- Cascades `iframe_display_scale_overrides` rows for that device id

No client-side cascade logic required.

---

## Iframe form impact

`IframeFacade.displayScales` still loaded from iframe `GET` response. Rows may reference devices created via `/admin/displays`. Lifecycle methods removed from facade; scale save unchanged.
