# Research: CHG-046 Top Content List UX

**Date**: 2026-07-28

## R1 — Pagination strategy

**Decision**: Client-side pagination over the existing `GET /api/content` full list; slice in a `computed()` signal chain (`filteredItems` → `paginatedItems`).

**Rationale**: Spec assumption and current `ContentFacade` already load all items. No backend paging API needed. Meets SC-004 (sub-second page changes) without network round-trips.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Server-side `?page=&size=` on `/api/content` | Out of scope; adds API + contract surface for a list-only UX win |
| Virtual scroll only (no page controls) | Does not match explicit page-size dropdown requirement |
| `MatTableDataSource` + `MatPaginator` | Awkward **Todas** option; table uses signal `dataSource` array today |

---

## R2 — Page size persistence

**Decision**: `localStorage` key `kiosk_admin_content_list_page_size` storing `10 | 20 | 50 | 100 | all`; default `20` when missing or invalid.

**Rationale**: Clarification session answer (FR-010). Mirrors `ThemeService` localStorage pattern in `frontend/src/app/core/theme/theme.service.ts`.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| `sessionStorage` | Clarification chose cross-restart persistence |
| No persistence | Worse operator UX for recurring admin sessions |

---

## R3 — Enlarged preview implementation

**Decision**: New standalone `MediaHoverPreviewComponent` (or directive) using **Angular CDK Overlay** with `FlexibleConnectedPositionStrategy` anchored to the thumbnail trigger; loads `item.mediaFile.mediaUrl` at full resolution, `max-width/max-height: min(480px, 80vh)`; separate **mobile tap** mode opens centered overlay with backdrop dismiss.

**Rationale**: Clarifications require full-res source, thumbnail-anchored positioning with viewport flip, keyboard focus parity, and non-blocking hover. CDK Overlay is the Material-standard approach; no existing overlay helper in the repo.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| CSS-only `:hover` sibling `position:absolute` | Poor viewport edge handling; drag-and-drop conflicts |
| Upscale 64px thumbnail | Rejected in clarification — insufficient for QA |
| `MatDialog` for desktop hover | Too heavy; blocks interaction |

---

## R4 — Compact actions

**Decision**: Replace `mat-button` + text with `mat-icon-button` + `matTooltip` (`MatTooltipModule`, already used in `remote-control.component.ts`). Keep existing `aria-label` strings in Spanish.

**Rationale**: Minimal diff; satisfies FR-001 and accessibility without custom tooltip CSS.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Custom CSS tooltip | Reinvents Material; worse a11y |
| `mat-menu` for actions | Extra click; slower operator workflow |

---

## R5 — Reorder gating with pagination

**Decision**: Extend existing novelty-filter gating: `reorderEnabled = pageSize === 'all' && !noveltyFilterOnly`. Disable `cdkDropList` and mobile up/down buttons when false; show unified Spanish hint (reuse pattern from `content-novelty-filter-hint`).

**Rationale**: Clarification + spec FR-012; prevents partial-list reorder corrupting `displayOrder`. Matches precedent for novelty filter.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Reorder within current page only | Ambiguous global order; risks incorrect `displayOrder` gaps |
| Server-side reorder per page | No API support; wrong semantics |

---

## R6 — Bulk selection scope

**Decision**: Header checkbox selects **current page only**; changing page clears selection (FR-013). Bulk bar count reflects page selection.

**Rationale**: Explicit in spec; avoids invisible cross-page selections during paginated bulk delete.

---

## R7 — Pagination UI placement

**Decision**: Footer bar below table/cards inside `app-admin-list` card content: page-size `mat-select` (10/20/50/100/Todas) + prev/next icon buttons + range label `{{start}}–{{end}} de {{total}}`. Hide entire bar when `total === 0` or when `pageSize === 'all' && total <= defaultPageSize` is false — show when `total > pageSize` OR `pageSize !== 'all'` with controls for size only.

**Rationale**: Keeps pagination co-located with list; Spanish copy per FR-015. Footer placement avoids fighting `adminListActions` header row.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Extend `AdminListComponent` with built-in pagination | Over-generalizes for one screen; ads out of scope |
| Top-only paginator | Less discoverable on long pages |

---

## R8 — Backend / ADR

**Decision**: No backend changes; no new ADR (UI-only admin ergonomics; rationale captured here).

**Rationale**: Constitution V defers to ADRs for durable cross-cutting architecture; this change does not alter APIs, data model, or kiosk runtime.
