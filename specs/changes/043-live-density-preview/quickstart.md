# Quickstart: CHG-043 Live Density Profile Calibration

**Prerequisites**: CHG-042 deployed; at least one kiosk on `/display` with label claimed; iframe URLs configured; amrn-bull or escalabirras running locally.

## Phase 1 — Create profile with live sliders (US1)

1. Open kiosk A on `/display`; note label (e.g. `Sala prueba`).
2. Open `/admin/display-layout` in another browser.
3. **Expect**: Sin quioscos conectados → sliders deshabilitados con mensaje claro.
4. Select kiosk A as **pantalla de prueba**.
5. Select iframe (bull URL).
6. Click **Activar iframe en pantalla de prueba** if kiosk not in iframe mode.
7. Enter profile name `Ultrawide hall`; create.
8. Move Bull slider to ~480 px; wait 500 ms.
9. **Expect**: Kiosk A iframe content resizes within 2 s; admin shows **guardado**.
10. Reload admin page → profile shows 480 px without manual save clicks.

## Phase 2 — Edit without affecting other kiosks (US2)

1. Connect kiosk B with different profile assigned.
2. Edit `Ultrawide hall` using kiosk A as test display; move slider.
3. **Expect**: Only kiosk A preview changes; kiosk B unchanged.

## Phase 3 — Assign with fine-tune (US3)

1. On registered device row for `Sala prueba`, open **Calibrar y asignar**.
2. Fine-tune slider; autosave.
3. Confirm assignment.
4. **Expect**: Kiosk A matches profile on next iframe load without hidden on-display panel.

## Phase 4 — Debounce coalescing (SC-003)

1. Rapidly sweep Bull slider 10 times; release at 520 px.
2. **Expect**: Network tab shows one PUT per rest (not 10); stored value 520.

## Phase 5 — Failure handling

1. Stop backend mid-calibration; move slider.
2. **Expect**: Error state; slider values retained; retry succeeds.

Record pass/fail in `checklists/requirements.md` notes.
