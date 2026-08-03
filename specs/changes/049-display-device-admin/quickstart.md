# Quickstart: CHG-049 Display Device Admin

Manual validation for local lab (`docs/dev/local-lab.md`).

## Prerequisites

- Backend + frontend running; operator logged in with content-management role.
- Optional: one kiosk on `/display` with a chosen label for connection tests.

## 1 — Navigation (US4 / SC-001)

1. Open admin sidebar → **Configuración**.
2. **Expect**: entry **Pantallas** with summary about device inventory.
3. Click **Pantallas**.
4. **Expect**: URL `/admin/displays`; page title describes registered screens.

## 2 — Empty state (US1)

1. With zero devices (fresh org or after deleting all), open `/admin/displays`.
2. **Expect**: empty state with guidance to pre-create or connect a labeled kiosk.
3. **Expect**: inline «Añadir pantalla» form still visible in header.

## 3 — Pre-create (US2)

1. Enter `Sala principal` in inline form → **Añadir pantalla**.
2. **Expect**: row appears within 2 s; field clears; success snackbar.
3. Try creating `Sala principal` again.
4. **Expect**: error snackbar; no duplicate row.
5. Open `/admin/iframes/:id` scale matrix.
6. **Expect**: `Sala principal` appears in scale rows.

## 4 — Kiosk link (US2 / SC-004)

1. Pre-create `Ultrawide`.
2. Open kiosk `/display`; register with label `Ultrawide`.
3. Return to `/admin/displays`.
4. **Expect**: `Ultrawide` shows **conectada** (≤30 s if already on page).

## 5 — Connection refresh (SC-006)

1. Keep `/admin/displays` open.
2. Disconnect kiosk (close tab or network).
3. Wait up to 30 s.
4. **Expect**: row changes to **desconectada** without manual reload.

## 6 — Rename (US3)

1. Click rename on `Sala principal` → modal opens with current label.
2. Change to `Sala VIP` → Guardar.
3. **Expect**: list updates; iframe scale matrix shows `Sala VIP`.

## 7 — Delete disconnected (US3)

1. Ensure target row is **desconectada**.
2. Delete → confirm dialog (no connected warning).
3. **Expect**: row removed; absent from iframe scale matrix.

## 8 — Delete connected warning (FR-006)

1. With connected kiosk, attempt delete.
2. **Expect**: confirmation mentions pantalla conectada; can still confirm and delete.

## 9 — Iframe form decoupling (FR-009 / SC-005)

1. Open `/admin/iframes/:id`.
2. **Expect**: no «Añadir pantalla» field/button; no per-row Eliminar for devices.
3. **Expect**: «Gestionar pantallas» link navigates to `/admin/displays`.
4. Return to iframe form via browser back.
5. **Expect**: iframe edit context preserved.

## 10 — Permissions (FR-008)

1. Log in as user without content-management role (if available).
2. Navigate to `/admin/displays`.
3. **Expect**: access denied consistent with other admin sections.

## Automated validation

```sh
npm --prefix frontend run test -- --include='**/display-devices**' --include='**/iframe-form**'
pytest backend/tests/integration/test_display_devices_api.py
npm --prefix frontend run build
```
