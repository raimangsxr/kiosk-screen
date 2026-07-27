# Implementation Plan: Top Content List UX Improvements

**Input**: Feature specification from `specs/changes/046-top-content-list-ux/spec.md`  
**Branch**: `046-top-content-list-ux` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

## Context Grounding

- Manifest read: yes (`specs/manifest.yml` — `CONTENT.ADS.ADMIN`)
- Active contracts read: `content-ads-admin`
- Change specs read: CHG-046 (active), CHG-035 (admin mobile patterns), CHG-027 (novelty filter)
- Context pack read or created: [context-pack.md](./context-pack.md)
- ADRs read: none required (frontend-only UX)
- Code entrypoints verified: `content-list.component.ts`, `admin-list.component.ts`, `content.facade.ts`, `content-form.component.spec.ts` (list tests)
- Tests identified: new `content-list.component.spec.ts`, `media-hover-preview` spec, `client-pagination` spec
- Archived or consolidated specs read: none

## Summary

Improve the **top content admin list** (`/admin/content`) with three operator-facing capabilities: (1) denser desktop rows — icon-only inline actions with Spanish tooltips, truncated text, smaller thumbnails; (2) full-resolution media preview on thumbnail hover/focus (desktop) and tap (mobile), anchored beside the thumbnail; (3) client-side pagination with page sizes 10/20/50/100/Todas, persisted in `localStorage`, shared between table and card layouts. Reorder remains disabled unless **Todas** is selected (extends existing novelty-filter rule). **No backend changes.**

## Technical Context

**Language/Version**: TypeScript / Angular 19+ (frontend only)  
**Primary Dependencies**: Angular Material (`MatTooltip`, `MatIconButton`, `MatSelect`), Angular CDK Overlay  
**Storage**: Browser `localStorage` (`kiosk_admin_content_list_page_size`)  
**Testing**: Angular unit specs (Vitest/Karma per project config)  
**Target Platform**: Admin browser (desktop + compact mobile)  
**Project Type**: Full-stack web app — **this change is frontend-only**  
**Performance Goals**: Page change &lt;1s perceived (SC-004); preview open &lt;500ms (SC-003)  
**Constraints**: Spanish UI; accessibility (tooltips, `aria-label`, keyboard preview); no API changes; ads list out of scope  
**Scale/Scope**: Client-side slice over existing full list (100–200+ items acceptable)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status |
|------|--------|
| Active contract identified and read | pass — `CONTENT.ADS.ADMIN` |
| Manifest update needed and planned | pass — add CHG-046 in tasks |
| Context pack created/updated | pass |
| Contract update required before implementation | yes — [contracts/contract-deltas.md](./contracts/contract-deltas.md) |
| Tests planned for changed behavior | pass |
| Security and user-facing error exposure considered | pass — no new endpoints; preview uses existing authenticated media URLs |
| Observability/audit impact considered | pass — none |
| No archived or superseded specs used without justification | pass |

**Post-design re-check**: pass (no NEEDS CLARIFICATION; see [research.md](./research.md))

## Project Structure

### Documentation for this change

```text
specs/changes/046-top-content-list-ux/
├── spec.md
├── context-pack.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── contract-deltas.md
└── tasks.md                    # /speckit-tasks
```

### Source code touched

```text
frontend/
├── src/app/features/content/
│   ├── content-list.component.ts          # compact UI, pagination, reorder gating
│   └── content-list.component.spec.ts     # new (extract + extend list tests)
├── src/app/shared/ui/media-hover-preview/
│   ├── media-hover-preview.component.ts   # CDK Overlay preview
│   └── media-hover-preview.component.spec.ts
├── src/app/shared/util/
│   ├── client-pagination.ts               # slice, clamp, range label
│   ├── client-pagination.spec.ts
│   ├── client-pagination-storage.ts       # localStorage page size
│   └── client-pagination-storage.spec.ts

specs/contracts/content-ads-admin/contract.md   # pre-impl update
specs/manifest.yml                                # CHG-046 entry
```

**Not touched**: `backend/**`, `ads/**`, kiosk `display/**`.

## Phase 0: Outline & Research

Completed — see [research.md](./research.md).

Key decisions:

1. Client-side pagination via computed signals (no new API).
2. `localStorage` page-size persistence (`kiosk_admin_content_list_page_size`).
3. CDK Overlay component for anchored full-res preview.
4. `mat-icon-button` + `MatTooltip` for compact actions.
5. Reorder gated on `pageSize === 'all' && !noveltyFilter`.
6. No ADR (UI-only scope).

## Phase 1: Design & Contracts

Completed — see [data-model.md](./data-model.md), [contracts/contract-deltas.md](./contracts/contract-deltas.md), [quickstart.md](./quickstart.md).

### Active contract updates (before implementation)

1. `specs/contracts/content-ads-admin/contract.md` — merge deltas from `contracts/contract-deltas.md`.
2. `specs/manifest.yml` — add CHG-046 under `content-ads-admin.related_changes`.

## Phase 2: Task Planning Approach

Tasks will be ordered by user story priority:

| Phase | Stories | Focus |
|-------|---------|-------|
| 1 | Setup | Contract delta merge, manifest |
| 2 | — | Pagination utilities (blocks US3 only) |
| 3 | — | Extract list tests before new spec work |
| 4 | US1 | Icon actions, tooltips, truncation, compact chips |
| 5 | US2 | `MediaHoverPreviewComponent` — **may parallel US1 after Phase 1+3** |
| 6 | US3 | Pagination state, footer UI, localStorage, selection reset |
| 7 | US4 | Reorder gating + Spanish hints (desktop + mobile) |
| 8 | US5 | Card layout parity (icon actions, tap preview, pagination) |
| 9 | Polish | Validation, quickstart (SC-001–SC-004), consolidation |

**Parallelism note**: US2 does **not** require pagination utilities (Phase 2). After test extraction (Phase 3), US1 and US2 can proceed in parallel.

### Test strategy

- **Unit**: `client-pagination` slice/clamp/range; **`client-pagination-storage` read/write/fallback**; preview open/close/placeholder triggers.
- **Component**: `content-list` — page size changes, Todas mode, reorder disabled states, Spanish tooltip/`aria-label`, selection cleared on page change, page clamp after delete.
- **Timed smoke**: preview open ≤500ms (SC-003); page navigation DOM update ≤1s (SC-004).
- **Regression**: extract list tests **before** expanding `content-list.component.spec.ts`; novelty/drag tests use `pageSize` Todas.
- **Manual**: [quickstart.md](./quickstart.md) — SC-001 row-density measurement (≥30% more rows), SC-002 UAT regression on core actions.

### Implementation notes

- Replace `visibleItems` computed to chain: `items` → novelty filter → pagination slice.
- `toggleAll` / bulk actions operate on `paginatedItems()` only.
- `onDrop` / `moveItem` use full `filteredItems` order only when `reorderEnabled`; otherwise no-op (buttons already disabled).
- Preview component accepts `trigger` `ElementRef` and positions with `FlexibleConnectedPositionStrategy` (`right`, `left` fallback).
- Use `NgOptimizedImage` only if already imported in feature; otherwise standard `img` with lazy loading for list thumbs.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | — | — |
