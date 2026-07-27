# Quickstart: CHG-046 Top Content List UX

Manual validation for local lab (`docs/dev/local-lab.md`).

## Prerequisites

- Backend + frontend running; operator logged into `/admin/content`.
- At least **25** top content items with mixed photos/videos (seed or uploads).
- Desktop viewport ≥1200px and a narrow viewport ≤599px for card layout.
- **Before implementing US1**: capture baseline row count on a branch without compact rows (or stash) for SC-001 comparison.

## 0 — Row density baseline (SC-001)

**Purpose**: Verify ≥30% more visible rows at 1920×1080 after compact layout.

1. On **pre-change** build (or documented baseline), open `/admin/content` at 1920×1080 with **Todas** and ≥20 homogeneous rows.
2. Count fully visible table rows without scrolling (record as `baseline_rows`).
3. On **post-change** build, repeat with same item count and viewport.
4. Count visible rows (`new_rows`).
5. **Expect**: `new_rows >= baseline_rows * 1.30` (30% improvement per SC-001).
6. Record both numbers in `specs/changes/046-top-content-list-ux/checklists/requirements.md` notes.

## 1 — Compact actions (US1)

1. Open `/admin/content` on desktop.
2. **Expect**: action column shows icon-only buttons (play, edit, delete); no horizontal page scroll at 1920×1080.
3. Hover each icon.
4. **Expect**: Spanish tooltips — "Mostrar en pantalla", "Editar", "Eliminar".
5. Tab to action icons with keyboard.
6. **Expect**: screen reader / focus ring exposes same Spanish labels (`aria-label`).
7. Inspect rotation/status chips on dense rows.
8. **Expect**: abbreviated chip labels with full meaning in tooltip or `aria-label`.

## 2 — Full-res hover preview (US2)

1. Hover a photo thumbnail for ≥0.5s.
2. **Expect**: enlarged image appears beside thumbnail within **500ms** (SC-003) using full media (not pixelated 64px upscale).
3. Move pointer into preview, then out.
4. **Expect**: preview closes; row actions still clickable.
5. Hover a row **without** media (placeholder icon only).
6. **Expect**: no enlarged preview (FR-006).
7. Tab to thumbnail with keyboard.
8. **Expect**: preview opens on focus; Escape closes.
9. Start dragging a row (with **Todas** selected).
10. **Expect**: any open preview closes.

## 3 — Pagination (US3)

1. Set page size **10** with 25+ items.
2. **Expect**: 10 rows/cards; footer shows `1–10 de N`; next page shows `11–20 de N`; page change feels instant (**&lt;1s**, SC-004).
3. Select **Todas**.
4. **Expect**: all items visible; pagination nav hidden; page-size selector still visible.
5. Reload browser; reopen `/admin/content`.
6. **Expect**: last page size restored from local storage.
7. Enable **Solo novedades** with mixed items.
8. **Expect**: totals count only novelty items; page resets to 1.
9. On last page, delete all items on that page.
10. **Expect**: list shows previous valid page (no blank page).

## 4 — Reorder gating (US4)

1. Page size **20** (not Todas).
2. **Expect**: drag disabled; hint `Muestra todas las filas para reordenar` (or equivalent).
3. Select **Todas**; disable novelty filter.
4. **Expect**: drag reorder works as before.
5. On mobile cards: up/down disabled when not **Todas**; enabled on **Todas**.

## 5 — Bulk selection (FR-013)

1. Page size 10; select 3 rows on page 1.
2. Go to page 2.
3. **Expect**: selection cleared; bulk bar hidden.

## 6 — Regression & UAT (SC-002)

1. Show on screen, edit, delete, bulk activate/deactivate — unchanged behavior (UAT: no regression in success rate for these flows).
2. Novelty filter + reorder hint — still works.

## Automated validation

```sh
npm --prefix frontend run test -- --include='**/content-list**' --include='**/media-hover-preview**' --include='**/client-pagination**'
npm --prefix frontend run build
```

Timed smoke tests in component specs cover SC-003 (preview ≤500ms) and SC-004 (page change ≤1s) in CI; SC-001 and SC-002 rely on sections 0 and 6 above.
