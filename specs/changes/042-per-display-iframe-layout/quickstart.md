# Quickstart: Per-Display Iframe Layout Profiles (CHG-042)

**Branch**: `042-per-display-iframe-layout`

## Prerequisites

- Local lab running (`docs/dev/local-lab.md`)
- CHG-041 SSE display path active
- amrn-bull and amrn-escalabirras-dual running locally (sibling repos) with
  embed override implemented
- Preconfigured iframe URLs in `/admin/iframes` pointing to local AMRN instances
- Two or three browser windows / machines with different aspect ratios (or
  devtools device modes)

## Contract prep (before code)

1. Merge `contracts/contract-deltas.md` into active contracts.
2. Apply sibling deltas in amrn-bull and amrn-escalabirras-dual contracts.
3. Accept ADR-0010 when implementation starts.

## Phase 1 — Core per-display density (US-1, SC-001)

### Setup

```sh
docker compose up -d postgres migrate backend frontend
# Start sibling apps per their local-lab docs
```

### Manual: three displays, three densities

1. Open `/display` in **Browser A** — claim label `Ultrawide`.
2. Open `/display` in **Browser B** — claim label `16-9-main`.
3. Open `/display` in **Browser C** — claim label `4-3-side`.
4. Remote control → iframe mode (same tournament iframe).
5. On each browser, invoke hidden density panel (`Ctrl+Shift+D`), set different
   values (e.g. 420 / 560 / 720). Save.
6. Reload all three browsers.
7. **Expect**: each shows visibly different compactness; network iframe URLs
   contain distinct `embed_app_height_px` values.

### Automated

```sh
pytest backend/tests/unit/test_embed_density_resolver.py -v
pytest backend/tests/integration/test_display_layout_api.py -v
npm --prefix frontend run test -- --include='**/display-layout**'
npm --prefix frontend run test -- --include='**/display-screen**'
```

## Phase 2 — Admin profiles (US-2, SC-003, SC-005)

1. `/admin` → create profiles `Ultrawide hall` (bull: 450) and `4:3 hall` (bull: 650).
2. Assign profiles to display labels or online kiosks.
3. Open iframe mode on each display without manual slider.
4. **Expect**: densities match profiles; operations dashboard shows source `perfil`.

```sh
pytest backend/tests/integration/test_display_layout_api.py -v -k profile
```

## Phase 3 — Global embed admin does not clobber (SC-002)

1. Calibrate Browser A to 480 via hidden panel.
2. Open amrn-bull `/admin` — change global height slider to 900.
3. **Expect**: Browser A still renders ~480 density; non-embed bull tab uses 900.

## Phase 4 — Joint E2E gate (SC-004, SC-006)

Repeat Phase 1 for:

- amrn-bull iframe
- amrn-escalabirras-dual iframe

Across aspect ratios 16:9, 21:9, 4:3 — confirm no internal scrollbar in top
region after calibration (operator sign-off).

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Same density on all screens | Display labels distinct? Backend `display_devices` rows? |
| URL missing `embed_app_height_px` | Family detection / iframe host override |
| Override ignored in embed | Sibling embed override merged? Query param spelling |
| Density resets on reload | `GET /api/display/layout/me` + label in localStorage |
