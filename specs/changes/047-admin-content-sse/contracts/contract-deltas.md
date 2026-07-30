# Contract Deltas: CONTENT.ADS.ADMIN (CHG-047)

**Target contract**: `specs/contracts/content-ads-admin/contract.md`  
**Apply before implementation**

## Add to "Current behavior"

- Top content admin list (`/admin/content`) maintains a live Server-Sent Events connection while the page is open (`GET /api/admin/content/stream`, authenticated, `CONTENT_MANAGEMENT_ROLES`).
- Operators with read access to the list but without `CONTENT_MANAGEMENT_ROLES` see a static list; the stream returns `403` and they must use **Actualizar** to pick up remote changes.
- On `content_inventory_changed`, the list reconciles via existing `GET /content` without full page reload.
- SSE-triggered reconciliation uses a **silent** background refresh: no list skeleton, toast, or banner on success.
- Manual **Actualizar** uses the standard refresh path (may show loading skeleton).
- Rapid events are coalesced (~1 s) into a single silent refresh; refresh is deferred while drag-and-drop reorder is active until the row is dropped.
- Silent SSE refresh is skipped while a save/reorder/delete batch (`saving()`) is in progress.
- If the stream is disconnected for more than 30 seconds, a discrete hint «Los datos pueden estar desactualizados» appears below the action bar until reconnect or manual **Actualizar**.
- Live updates cover: admin mutations, public API uploads, and kiosk novelty consumption (`isNovelty` cleared).
- Navigating back to the list from the edit form reloads inventory on mount (existing `ngOnInit` + stream connect).

## Add to "Public interfaces"

- `GET /admin/content/stream` (SSE, `text/event-stream`)

## Unchanged

- Ads list behavior (no live stream)
- Existing REST content CRUD/upload/reorder endpoints
- CHG-046 pagination, novelty filter, preview, and reorder gating rules
