---
description: "Task list for CHG-046 top content list UX"
---

# Tasks: Top Content List UX Improvements

**Input**: Design documents from `/specs/changes/046-top-content-list-ux/`

**Prerequisites**: `spec.md`, `context-pack.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/contract-deltas.md`

**Tests**: Mandatory per TQ-002 — `client-pagination` + storage unit specs, `media-hover-preview` component spec, `content-list` component spec (extracted before expansion), timed smoke checks for SC-003/SC-004, and manual `quickstart.md` (SC-001, SC-002 UAT).

**Organization**: SDD governance → shared pagination utilities → **test extraction** → US1 → US2 (may parallel US1 after Phase 1) → US3 → US4 → US5 → polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: US1–US5 maps to spec user stories
- Exact file paths required in every task description

## Path Conventions

- Content list: `frontend/src/app/features/content/content-list.component.ts`
- Preview: `frontend/src/app/shared/ui/media-hover-preview/`
- Pagination utils: `frontend/src/app/shared/util/`
- Contract: `specs/contracts/content-ads-admin/contract.md`
- Change: `specs/changes/046-top-content-list-ux/`

---

## Phase 1: SDD Governance & Contracts (blocking)

**Purpose**: Merge contract deltas before code (Constitution IV, TQ-001).

**⚠️ CRITICAL**: No implementation below until T001–T004 complete.

- [x] T001 Read `specs/manifest.yml` and `specs/changes/046-top-content-list-ux/{spec.md,context-pack.md,plan.md,research.md,data-model.md,quickstart.md,contracts/contract-deltas.md}`.
- [x] T002 Merge CONTENT.ADS.ADMIN section from `specs/changes/046-top-content-list-ux/contracts/contract-deltas.md` into `specs/contracts/content-ads-admin/contract.md` (compact list, preview, pagination, reorder gating).
- [x] T003 Add CHG-046 entry `status: in-progress` to `specs/manifest.yml` under `content-ads-admin.related_changes`.
- [x] T004 Set `status: in-progress` in `specs/changes/046-top-content-list-ux/spec.md` frontmatter.

**Note**: No ADR required — UI-only scope per `research.md` R8.

**Checkpoint**: Contract and manifest updated; implementation may begin.

---

## Phase 2: Foundational Utilities (blocking for US3+)

**Purpose**: Shared pagination helpers used by US3–US5. **Not required for US1 or US2.**

**⚠️ CRITICAL**: Complete before Phase 6 (US3 pagination).

- [x] T005 [P] Implement `slicePage`, `clampPageIndex`, and `formatPaginationRange` in `frontend/src/app/shared/util/client-pagination.ts` per `data-model.md`.
- [x] T006 [P] Add unit tests in `frontend/src/app/shared/util/client-pagination.spec.ts` for slice, clamp after delete, and Spanish range label (`21–40 de 87`).
- [x] T007 [P] Implement `readContentListPageSize` / `writeContentListPageSize` in `frontend/src/app/shared/util/client-pagination-storage.ts` using key `kiosk_admin_content_list_page_size` (default `20`, validate `10|20|50|100|all`).
- [x] T008 [P] Add unit tests in `frontend/src/app/shared/util/client-pagination-storage.spec.ts` for read/write round-trip, invalid stored value fallback to `20`, and `'all'` persistence.

**Checkpoint**: Pagination utilities ready; US3 can wire signals.

---

## Phase 3: Test Foundation (blocking for list spec work)

**Purpose**: Extract existing list tests before adding new ones (avoids duplicate/conflicting suites).

- [x] T009 Move existing content-list tests from `frontend/src/app/features/content/content-form.component.spec.ts` to `frontend/src/app/features/content/content-list.component.spec.ts`; leave form-only tests in `content-form.component.spec.ts`; set `pageSize` to **Todas** in reorder/drag tests until US3 lands.

**Checkpoint**: Single canonical `content-list.component.spec.ts` exists before US1/US3 test expansion.

---

## Phase 4: User Story 1 — Compact Desktop List Rows (P1) 🎯 MVP

**Goal**: Denser desktop table — icon-only inline actions with Spanish tooltips/`aria-label`, truncated cells, smaller thumbnails, compact status/rotation chips.

**Independent test**: Open `/admin/content` on desktop with 15+ items; actions are icon-only with Spanish tooltips; no horizontal page scroll; row actions work.

- [x] T010 [US1] Replace text `mat-button` actions with inline `mat-icon-button` + `matTooltip` in `frontend/src/app/features/content/content-list.component.ts`; use Spanish labels for tooltips **and** `aria-label` (FR-015): "Mostrar en pantalla", "Editar", "Eliminar"; import `MatTooltipModule`.
- [x] T011 [US1] Add compact row CSS in `frontend/src/app/features/content/content-list.component.ts`: reduce cell padding, shrink `.content-list__thumb` (e.g. 48px), add `.content-list__truncate` with `text-overflow: ellipsis` on title and media columns; compact rotation/status chips (abbreviated labels + `aria-label`/tooltip for full meaning per US1).
- [x] T012 [P] [US1] Extend `frontend/src/app/features/content/content-list.component.spec.ts`: icon-only action buttons, Spanish `aria-label`/tooltip text, long title truncates without extra row height, compact chips expose full meaning via `aria-label`.

**Checkpoint**: US1 independently testable on desktop table layout.

---

## Phase 5: User Story 2 — Enlarged Preview on Thumbnail Hover (P1)

**Goal**: Full-resolution media preview anchored beside thumbnail on hover/focus; dismiss on exit, blur, Escape, drag-start; no preview on placeholder.

**Independent test**: Hover photo thumbnail → enlarged full-res image beside thumb; keyboard focus opens preview; Escape closes; placeholder shows no preview.

**May start after Phase 1** — does not require Phase 2 (pagination utils).

- [x] T013 [P] [US2] Create `frontend/src/app/shared/ui/media-hover-preview/media-hover-preview.component.ts` using CDK Overlay (`OverlayModule`, `FlexibleConnectedPositionStrategy`) with max display `min(480px, 80vh)` and `object-fit: contain` for photo/video (`mediaFile.mediaUrl`).
- [x] T014 [US2] Wire preview triggers on desktop table thumbnails in `frontend/src/app/features/content/content-list.component.ts`: mouseenter/mouseleave, focus/blur, Escape key; close on `cdkDragStarted`; skip rows without `mediaFile.mediaUrl` (FR-006).
- [x] T015 [P] [US2] Add `frontend/src/app/shared/ui/media-hover-preview/media-hover-preview.component.spec.ts`: opens on focus, closes on Escape, uses full `mediaUrl`, placeholder trigger does not open overlay (FR-006), reposition strategy attached to trigger element; timed smoke: overlay visible within 500ms of focus (SC-003).
- [x] T016 [US2] Ensure preview overlay does not capture pointer events that block row selection or action clicks in `frontend/src/app/shared/ui/media-hover-preview/media-hover-preview.component.ts` (pointer-events / overlay panel config).

**Checkpoint**: US2 independently testable on desktop thumbnails.

---

## Phase 6: User Story 3 — Pagination and Page Size (P1)

**Goal**: Client-side pagination 10/20/50/100/Todas; range indicator; `localStorage` persistence; shared table + cards.

**Independent test**: 25+ items, page size 10 shows `1–10 de N`; Todas shows all; reload restores page size; page change clears selection.

**Requires Phase 2** (T005–T008).

- [x] T017 [US3] Add pagination signals (`pageIndex`, `pageSize`) and computed chain `filteredItems` → `paginatedItems` in `frontend/src/app/features/content/content-list.component.ts`; replace `visibleItems()` to use `paginatedItems`; reset `pageIndex` to 0 on page-size or novelty-filter change; clamp `pageIndex` after deletes via `clampPageIndex`.
- [x] T018 [US3] Add footer pagination UI in `frontend/src/app/features/content/content-list.component.ts`: `mat-select` for page size (10, 20, 50, 100, Todas), prev/next buttons, range label via `formatPaginationRange`; hide when `total === 0`.
- [x] T019 [US3] Integrate `client-pagination-storage.ts` on init and page-size change in `frontend/src/app/features/content/content-list.component.ts`.
- [x] T020 [US3] Scope `toggleAll` and bulk selection to current `paginatedItems()`; clear `selection` on page change in `frontend/src/app/features/content/content-list.component.ts`.
- [x] T021 [P] [US3] Extend `frontend/src/app/features/content/content-list.component.spec.ts`: page size 10 slices rows, Todas shows all, page change clears selection, novelty filter resets page 1, page index clamps after delete on last page (no blank page); timed smoke: page navigation updates DOM within 1s (SC-004).

**Checkpoint**: US3 independently testable; list paginates without backend changes.

---

## Phase 7: User Story 4 — Reorder Safety with Pagination (P2)

**Goal**: Drag-and-drop and mobile reorder disabled unless `pageSize === 'all'` and novelty filter off; Spanish hint.

**Independent test**: Page size 20 → drag disabled + hint; Todas + no novelty filter → drag works.

- [x] T022 [US4] Add `reorderEnabled` computed (`pageSize === 'all' && !noveltyFilterOnly`) and bind `[cdkDropListDisabled]="!reorderEnabled()"` in `frontend/src/app/features/content/content-list.component.ts`.
- [x] T023 [US4] Add Spanish reorder hint `Muestra todas las filas para reordenar` when pagination blocks reorder (distinct from novelty hint) in `frontend/src/app/features/content/content-list.component.ts` template.
- [x] T024 [US4] Disable mobile `moveItem` up/down buttons when `!reorderEnabled()` in `frontend/src/app/features/content/content-list.component.ts` card template.
- [x] T025 [P] [US4] Add tests in `frontend/src/app/features/content/content-list.component.spec.ts`: drag list disabled when page size not Todas; enabled on Todas; mobile reorder buttons disabled/enabled accordingly.

**Checkpoint**: US4 independently testable; no partial-list reorder.

---

## Phase 8: User Story 5 — Compact Mobile Card Actions (P3)

**Goal**: Card layout parity — icon actions, tap-to-preview overlay, paginated cards.

**Independent test**: Compact viewport shows paginated cards, icon actions, tap thumbnail opens full-res overlay.

- [x] T026 [US5] Apply icon-only actions + Spanish tooltips/`aria-label` to `mat-card-actions` in `frontend/src/app/features/content/content-list.component.ts` card template (mirror desktop labels, FR-015).
- [x] T027 [US5] Wire tap-to-preview on card thumbnails using `media-hover-preview` in tap/backdrop mode in `frontend/src/app/features/content/content-list.component.ts`.
- [x] T028 [US5] Ensure card `@for` iterates `paginatedItems()` and footer pagination is visible in card layout in `frontend/src/app/features/content/content-list.component.ts`.
- [x] T029 [P] [US5] Add card-layout tests in `frontend/src/app/features/content/content-list.component.spec.ts` (mock `BreakpointService` or `prefersCards`): paginated card count, tap preview opens, Spanish icon actions present.

**Checkpoint**: US5 complete; mobile/desktop parity for pagination and preview.

---

## Phase 9: Polish & Cross-Cutting

**Purpose**: Regression, performance validation, consolidation.

- [x] T030 Run `npm --prefix frontend run test -- --include='**/content-list**' --include='**/media-hover-preview**' --include='**/client-pagination**'`.
- [x] T031 Run `npm --prefix frontend run build`.
- [x] T032 Execute manual scenarios in `specs/changes/046-top-content-list-ux/quickstart.md` including SC-001 row-density measurement (≥30% more visible rows), SC-002 UAT regression on show-on-screen/edit/delete, SC-003/SC-004 perceived timing; record pass/fail in `specs/changes/046-top-content-list-ux/checklists/requirements.md` notes.
- [x] T033 Set `status: implemented` in `specs/changes/046-top-content-list-ux/spec.md` and update CHG-046 status in `specs/manifest.yml`.

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (SDD) ──┬──► Phase 3 (T009 test extract) ──► Phase 4 (US1)
                ├──► Phase 5 (US2)  [no Phase 2 required]
                └──► Phase 2 (Utils) ──► Phase 6 (US3) ──► Phase 7 (US4)
Phase 4 + 5 + 6 ──► Phase 8 (US5) ──► Phase 9 (Polish)
```

- **US1** (Phase 4): After Phase 1 + Phase 3 (test extract). **MVP** with Phase 1 + 4.
- **US2** (Phase 5): After Phase 1 only; **parallel with US1** after T009.
- **US3** (Phase 6): Requires Phase 2 utilities.
- **US4** (Phase 7): Requires US3.
- **US5** (Phase 8): Requires US1 + US2 + US3.

### Parallel Opportunities

| After phase | Parallel tasks |
|-------------|----------------|
| Phase 2 | T005, T006, T007, T008 |
| Phase 4 | T012 while T010–T011 sequential |
| Phase 5 | T013, T015 parallel; then T014, T016 |
| Phase 6 | T021 parallel after T017–T020 |
| Phase 7 | T025 parallel after T022–T024 |
| Phase 8 | T029 parallel after T026–T028 |
| Cross-story | US1 (Phase 4) ∥ US2 (Phase 5) after T009 |

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001–T004)
2. Complete Phase 3 (T009)
3. Complete Phase 4 (T010–T012)
4. **STOP and VALIDATE**: Desktop list compact; Spanish tooltips; no regressions

### Incremental Delivery

1. Phase 1 → Phase 3 → US1 (MVP)
2. US2 in parallel with US1 (after T009)
3. Phase 2 → US3 → US4 → US5 → Phase 9

---

## Task Summary

| Phase | Story | Tasks | Count |
|-------|-------|-------|-------|
| 1 | — | T001–T004 | 4 |
| 2 | — | T005–T008 | 4 |
| 3 | — | T009 | 1 |
| 4 | US1 | T010–T012 | 3 |
| 5 | US2 | T013–T016 | 4 |
| 6 | US3 | T017–T021 | 5 |
| 7 | US4 | T022–T025 | 4 |
| 8 | US5 | T026–T029 | 4 |
| 9 | — | T030–T033 | 4 |
| **Total** | | **T001–T033** | **33** |

**Suggested MVP scope**: Phase 1 + Phase 3 + Phase 4 — tasks T001–T004, T009, T010–T012.

**Independent test criteria**:

| Story | Verify |
|-------|--------|
| US1 | Icon actions + Spanish tooltips/`aria-label`; truncated rows; compact chips |
| US2 | Full-res preview; placeholder no preview; Escape dismiss; SC-003 smoke |
| US3 | Page sizes; range label; localStorage; selection reset; page clamp; SC-004 smoke |
| US4 | Reorder disabled unless Todas; Spanish hints |
| US5 | Paginated cards; tap preview; Spanish icon actions |
