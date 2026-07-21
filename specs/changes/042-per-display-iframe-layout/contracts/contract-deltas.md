# Contract Deltas: CHG-042 Per-Display Iframe Layout Profiles

**Date**: 2026-07-17

Pre-implementation deltas to merge into active contracts before coding.

---

## DISPLAY.RUNTIME

### Adds

- `DisplayLayoutService` resolves effective embed density per active iframe family.
- On iframe mode, `display-screen` augments iframe URL with `embed_app_height_px`
  per [embed-density-protocol.md](./embed-density-protocol.md).
- Parent listens for iframe `load` and sends `bull:config` postMessage.
- Hidden operator density panel (long-press top-left 3 s or `Ctrl+Shift+D`);
  not visible during normal operation.
- Kiosk caches layout snapshot in `localStorage`; backend authoritative on sync.
- First `/display` open without `kiosk_display_label` prompts for display label
  claim (modal, Spanish copy).
- SSE handler for `layout_updated` applies density without full page reload when
  possible.

### Preserves

- Iframe fills top region edge-to-edge (no blur-fill framing).
- `show_iframe` SSE payload shape unchanged (density applied client-side).
- Branding hidden in iframe mode.

---

## DISPLAY.CONFIG_SESSION

### Adds

- `POST /api/display/kiosk/register` accepts `label`; upserts `display_devices`
  and links `kiosk_connections.display_device_id`.
- Register response MAY include `layout` summary:
  `{ displayLabel, effectiveDensities, sources }`.
- Layout REST endpoints documented in [data-model.md](../data-model.md).
- SSE `layout_updated` event type.
- `kiosk_display_configurations.embed_density_defaults` JSON field editable in
  `/admin/configuration` (or dedicated section).

### Preserves

- `clientInstanceId` semantics and supersede behavior (CHG-041).
- Session cookie auth for kiosk routes.

---

## IFRAMES.VIDEO_END (or iframe admin contract)

### Adds

- `iframes.embed_app_family` optional enum (`amrn_bull`, `amrn_escalabirras`).
- Admin iframe form: optional family override dropdown + host auto-detect preview.

### Preserves

- URL uniqueness per organization.
- Remote control iframe selection unchanged.

---

## DISPLAY.EVENTS.AUDIT (optional Phase 2)

### Adds

- `display_layout_calibrated` — `{ displayLabel, family, effectivePx, source }`.
- `display_layout_reset` — `{ displayLabel }`.

---

## Operations dashboard (extends CHG-040)

### Adds

- Connected kiosk row shows: display label, effective density, source chip
  (`perfil`, `ajuste local`, `predeterminado`).

---

## Deprecated / unchanged

- No change to orchestrator rotation timers.
- Embedded apps' global `/admin` height slider remains; effect suppressed in
  embed mode when override active (sibling contract).
