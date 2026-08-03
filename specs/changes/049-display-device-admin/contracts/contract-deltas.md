# Contract Deltas: CHG-049 Display Device Admin

**Date**: 2026-08-03

Pre-implementation deltas to merge into `specs/contracts/display-config-session/contract.md` before coding.

---

## DISPLAY.CONFIG_SESSION

### Adds

- Admin route **`/admin/displays`** lists all organization display devices with label, connection status (conectada / desconectada), and last activity timestamp.
- Navigation entry **Pantallas** in the admin Configuración group links to `/admin/displays`.
- Operators can **pre-create** devices (inline form), **rename** (modal dialog), and **delete** (confirmation dialog with extra warning when connected) from this view.
- Connection status on the list refreshes automatically every **~30 s** while the view is open (client merge of `GET /api/admin/display-devices` + `GET /api/admin/display/kiosks/live` by label).
- Iframe edit form **scale matrix** no longer exposes create/delete display device actions; it retains scale editing and a **Gestionar pantallas** link to `/admin/displays`.

### Owned code paths (add)

- `frontend/src/app/features/display-devices/**`

### Preserves

- `GET/POST/PATCH/DELETE /api/admin/display-devices` request/response shapes and auth (`CONTENT_MANAGEMENT_ROLES`).
- Kiosk registration upsert by label (`POST /api/display/kiosk/register`).
- Iframe per-display scale overrides API and matrix editing (minus device lifecycle controls).
- Delete cascade behavior (connection refs cleared; iframe scale overrides removed).

### Does not add

- New REST endpoints or SSE events for device inventory.
- Bulk delete, import/export, or per-device configuration beyond label.
- On-display calibration UI.

---

## Related manifest entry

Add `CHG-049` under `DISPLAY.CONFIG_SESSION` `related_changes` when implementation starts.
