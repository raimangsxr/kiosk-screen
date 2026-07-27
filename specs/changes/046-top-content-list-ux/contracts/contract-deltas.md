# Contract Deltas: CHG-046 Top Content List UX

**Date**: 2026-07-28

Pre-implementation deltas to merge into `specs/contracts/content-ads-admin/contract.md` before coding.

---

## CONTENT.ADS.ADMIN

### Adds (top content list — `frontend/src/app/features/content/content-list.component.ts`)

- Desktop table rows use **compact layout**: icon-only inline actions with Spanish `matTooltip` labels; truncated title/media cells; slightly smaller thumbnails.
- **Full-resolution media preview** on thumbnail hover (desktop), keyboard focus, or tap (compact cards): anchored beside thumbnail on desktop; uses `mediaFile.mediaUrl`; max display ~480px; dismiss on pointer exit, blur, Escape, or outside tap.
- **Client-side pagination** over the loaded content list: page sizes **10, 20, 50, 100**, and **Todas**; default **20**; range indicator (e.g. `21–40 de 87`); prev/next navigation; same pagination on desktop table and compact cards.
- Page size preference persisted in **browser local storage** on the device until changed.
- Changing page size or **Solo novedades** resets to page 1; changing page clears bulk selection.
- Drag-and-drop reorder disabled when page size is not **Todas** (in addition to existing disable while **Solo novedades** is on); Spanish hint when disabled due to pagination.
- Mobile up/down reorder disabled under the same **Todas** + novelty rules.

### Preserves

- `GET /api/content` full-list fetch (no server paging).
- Bulk activate/deactivate/delete, show-on-screen, novelty filter, novelty row highlighting.
- Ads admin list unchanged (out of scope for CHG-046).

### Does not add

- Server-side pagination query parameters.
- Ads list density/pagination parity (deferred follow-up).

---

## Related manifest entry

Add `CHG-046` under `content-ads-admin` `related_changes` when implementation starts.
