# Data Model: CHG-046 Top Content List UX

Frontend-only state. No PostgreSQL or API schema changes.

---

## Client state: `ContentListPaginationState`

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `pageIndex` | `number` | `0` | Zero-based; reset on filter/page-size change |
| `pageSize` | `10 \| 20 \| 50 \| 100 \| 'all'` | `20` (or restored from storage) | `'all'` = **Todas** |

**Persistence**: `pageSize` only → `localStorage['kiosk_admin_content_list_page_size']`. `pageIndex` is ephemeral.

---

## Derived collections (computed signals)

```text
facade.items()
  → filteredItems     (novelty filter)
  → paginatedItems    (slice by pageIndex + pageSize)
  → visibleItems      (alias for paginatedItems in template)
```

### Slice algorithm

```text
if pageSize === 'all':
  paginatedItems = filteredItems
else:
  start = pageIndex * pageSize
  paginatedItems = filteredItems.slice(start, start + pageSize)
```

### Page clamp (after delete)

```text
maxPage = max(0, ceil(filteredCount / pageSize) - 1)
pageIndex = min(pageIndex, maxPage)
```

---

## Client state: `ContentListSelectionState`

| Field | Type | Notes |
|-------|------|-------|
| `selection` | `ReadonlySet<string>` | Content item ids on **current page** only |

**Transitions**:

- Toggle row → add/remove id
- Toggle all → all ids on current `paginatedItems`
- Page change → `selection = ∅`
- Reorder success → `selection = ∅` (existing)

---

## Client state: `ReorderEnabled`

```text
reorderEnabled = (pageSize === 'all') && !noveltyFilterOnly
```

When `false`:

- `cdkDropListDisabled = true` on desktop
- Mobile up/down buttons `disabled`
- Show hint: `Muestra todas las filas para reordenar` (pagination) or existing novelty hint

---

## Preview overlay state

| Field | Type | Notes |
|-------|------|-------|
| `open` | `boolean` | Hover, focus, or tap |
| `trigger` | `HTMLElement` | Thumbnail anchor for CDK Overlay |
| `mediaUrl` | `string` | `item.mediaFile.mediaUrl` (full resolution) |
| `contentType` | `'photo' \| 'video'` | Renders `<img>` or muted `<video>` |
| `mode` | `'hover' \| 'tap'` | Desktop vs mobile dismiss rules |

**Dismiss**: pointer leave (hover), blur, `Escape`, outside tap (mobile), drag-start.

**Display constraints**: `max-width: min(480px, 80vw)`; `max-height: min(480px, 80vh)`; `object-fit: contain`.

---

## Range label (Spanish)

```text
formatRange(start, end, total) → "{start}–{end} de {total}"
```

`start = pageIndex * pageSize + 1` (1-based), `end = min(start + pageSize - 1, total)`.

When `total === 0`, hide pagination chrome.

---

## Unchanged server entities

`ContentItem` from `GET /api/content` — no new fields. Preview uses existing `mediaFile.mediaUrl`.
