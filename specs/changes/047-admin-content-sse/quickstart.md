# Quickstart: Admin Content List SSE (CHG-047)

Validate CHG-047 manually after implementation.

## Prerequisites

- Backend + frontend running locally (`docs/dev/local-lab.md`)
- Two operator sessions (two browsers or one normal + one incognito)
- Optional: public API key for novelty upload test

## 1. Live update from second operator (~SC-001)

1. Browser A: log in → `/admin/content`
2. Browser B: log in → `/admin/content`
3. Browser B: create or delete a content item
4. **Expect**: Browser A reflects the change within 3 s without reload

## 2. Public novelty upload (~SC-002)

1. Browser A: `/admin/content` (optionally enable **Solo novedades**)
2. Upload via public API (`POST /api/v1/public/content` with API key)
3. **Expect**: New row with novelty highlight within 3 s

## 3. Novelty consume via kiosk (~US3)

1. Upload public novelty; open list with **Solo novedades**
2. Open kiosk display; wait until novelty is shown/consumed
3. **Expect**: Admin list drops novelty badge or empty-state within 5 s

## 4. Manual refresh (~SC-004)

1. On `/admin/content`, click **Actualizar**
2. **Expect**: Loading state + list matches server (network tab shows `GET /api/content`)

## 5. Burst coalescing (~FR-012)

1. Upload 5+ public files rapidly
2. **Expect**: List settles without rapid flicker; final count matches server

## 6. Disconnect stale indicator (~FR-014)

1. Open `/admin/content`
2. Block network to backend (devtools offline) for 35+ s
3. **Expect**: Hint «Los datos pueden estar desactualizados» appears (`[data-testid="content-stream-stale-hint"]`); no toast on each failed ping
4. Restore network
5. **Expect**: Hint `[data-testid="content-stream-stale-hint"]` clears and list syncs within 10 s (~SC-003)

## 7. Drag defer (~FR-015)

1. Set page size **Todas**; start dragging a row
2. From another browser, delete a different item
3. **Expect**: List does not jump during drag; updates after drop

## Automated checks

```sh
pytest backend/tests/unit/test_admin_content_sse_hub.py backend/tests/integration/test_admin_content_stream.py
npm --prefix frontend run test -- --include='**/admin-content-stream*' --include='**/content-list*'
```
