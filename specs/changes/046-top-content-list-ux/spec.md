---
id: CHG-046
type: change
status: implemented
modifies:
  - CONTENT.ADS.ADMIN
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
source_of_truth: false
read_by_default: false
requires_contract_update: true
oversize: false
---

# Feature Specification: Top Content List UX Improvements

**Feature Branch**: `046-top-content-list-ux`

**Spec Directory**: `specs/changes/046-top-content-list-ux/`

**Created**: 2026-07-28

**Status**: Draft

**Input**: User description: "quiero añadir features al panel de contenido de top content en el panel de administrador. 1. Quiero hacer los items de la lista más compactos, podemos empezar por poner inline las acciones y pasar el texto a tooltip on hover. Si se te ocurren más optimizaciones propónmelas. 2. Quiero añadir un on hover sobre la imagen de vista previa, para que la muestre en grande, la idea es poder ver en grande una imagen desde la vista previa de la lista con simplemente pasar el ratón por encima de la vista previa. 3. Quiero añadir paginación y tamaño por página en esta lista. Tamaños disponibles en un dropdown que indique 10, 20, 50, 100, Todas"

## Clarifications

### Session 2026-07-28

- Q: Should the enlarged hover preview use full-resolution media or only upscale the list thumbnail? → A: Full-resolution media (same source as kiosk display).
- Q: Should mobile card view paginate items or show the full filtered list? → A: Mobile uses the same pagination and page-size setting as desktop.
- Q: Where should the desktop enlarged hover preview appear relative to the pointer? → A: Anchored beside the thumbnail, repositioning when needed to stay in viewport.
- Q: Should page-size preference survive browser restarts on the same device? → A: Yes — persist in local storage on the device.
- Q: Should keyboard focus on the thumbnail open the enlarged preview? → A: Yes — focus opens preview; blur or Escape closes it.

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `CONTENT.ADS.ADMIN`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Compact desktop list rows (Priority: P1)

An event operator manages dozens of top-content items on a desktop admin session. The current table uses wide action buttons with visible text labels, which forces horizontal scrolling and wastes vertical space. The operator needs to scan more items at once without losing access to row actions.

The desktop table view becomes denser: row actions appear as a single inline group of icon-only controls. Each control keeps its current behavior (show on screen, edit, delete) but hides button text; the full action label appears on hover via tooltip. Row height and horizontal padding are reduced so more items fit on screen.

**Proposed additional density improvements** (same priority, bundled with this story):

- Truncate long titles and media filenames with ellipsis instead of wrapping to multiple lines.
- Reduce thumbnail size slightly while keeping media recognizable.
- Keep status and rotation badges compact; use abbreviated chip labels where space is tight, with full meaning available via tooltip or `aria-label`.

**Why this priority**: Directly addresses the stated pain of an overcrowded list and improves daily operator throughput before any new interaction patterns.

**Independent Test**: Open the top content list on an expanded desktop viewport with at least 15 items; verify actions are icon-only with tooltips, rows are visibly shorter than before, and all three actions remain usable without horizontal page scroll.

**Acceptance Scenarios**:

1. **Given** the operator views the top content list on desktop table layout, **When** they hover an action icon, **Then** a tooltip shows the full Spanish action label (for example "Mostrar en pantalla", "Editar", "Eliminar").
2. **Given** a row with a long title or filename, **When** the list renders, **Then** the text truncates with ellipsis and does not increase row height.
3. **Given** an active content item eligible for "show on screen", **When** the operator clicks the play icon, **Then** the same jump-to behavior occurs as today.
4. **Given** icon-only actions, **When** using keyboard focus or a screen reader, **Then** each control exposes an accessible name equivalent to the former text label.

---

### User Story 2 — Enlarged preview on thumbnail hover (Priority: P1)

An operator reviews uploaded photos in the list and needs to verify image quality, cropping, or branding without opening the edit form. Hovering the small preview thumbnail shows a larger version at **full media resolution** (the same source used on kiosk displays), **anchored beside the thumbnail** (preferring right or left based on available space), so fine details are visible at a glance.

For video items, the enlarged preview uses the full video source (muted, same as kiosk) rather than upscaling the small list thumbnail. Items without media show no hover preview.

**Why this priority**: Saves clicks during content QA and was explicitly requested; complements compact rows without adding permanent UI chrome.

**Independent Test**: Hover a photo thumbnail in the desktop table; a larger preview appears within one second and disappears when the pointer leaves. Repeat with a video thumbnail and a row without media.

**Acceptance Scenarios**:

1. **Given** a photo content item with a preview thumbnail, **When** the operator hovers the thumbnail, **Then** an enlarged image appears without navigating away from the list.
2. **Given** the operator moves the pointer away from the thumbnail and preview, **When** hover ends, **Then** the enlarged preview closes and does not block subsequent clicks or drag-and-drop.
3. **Given** a video content item, **When** the operator hovers the thumbnail, **Then** an enlarged muted preview appears using the full video source (not an upscaled thumbnail).
4. **Given** a row with no media preview, **When** the operator hovers the placeholder, **Then** no enlarged preview is shown.
5. **Given** the operator is dragging a row to reorder, **When** drag starts, **Then** any open hover preview closes and does not interfere with reordering.
6. **Given** keyboard focus on a thumbnail with media, **When** the thumbnail receives focus, **Then** the enlarged full-resolution preview appears anchored beside the thumbnail.
7. **Given** an open enlarged preview from keyboard focus, **When** focus leaves the thumbnail/preview or the operator presses Escape, **Then** the preview closes.

---

### User Story 3 — Pagination and page size control (Priority: P1)

An operator with a large event library (50+ items) needs to page through the top content list instead of loading an endlessly long table. A page-size dropdown offers **10**, **20**, **50**, **100**, and **Todas**. Standard pagination controls (previous/next and current range indicator, for example "21–40 de 87") appear when a finite page size is selected. Choosing **Todas** shows every item and hides pagination chrome.

The default page size is **20**. The operator's last chosen page size is remembered on the device (survives browser restarts) until changed. Changing page size resets to page 1. Changing the **Solo novedades** filter resets to page 1.

Pagination applies to the filtered visible set (when **Solo novedades** is active, only novelty items are counted and paged). The same page size and current page apply to both desktop table and compact card layouts.

**Why this priority**: Explicit user requirement; prevents performance and usability degradation as content libraries grow.

**Independent Test**: Seed 35+ items, set page size 10, navigate pages, switch to **Todas**, enable novelty filter, and verify counts and visible rows match expectations.

**Acceptance Scenarios**:

1. **Given** more items than the selected page size, **When** the list loads, **Then** only that many rows are visible and pagination controls show the current range and total.
2. **Given** the operator selects **Todas**, **When** the list updates, **Then** all items in the current filter are shown and pagination controls are hidden.
3. **Given** page size 20 and the operator on page 2, **When** they change page size to 50, **Then** the list shows page 1 with up to 50 items.
4. **Given** **Solo novedades** is enabled, **When** pagination is active, **Then** page totals reflect only novelty items.
5. **Given** bulk row selection, **When** the operator changes page, **Then** selection is cleared to avoid acting on items no longer visible (consistent with today clearing selection after reorder).

---

### User Story 4 — Reorder safety with pagination (Priority: P2)

Drag-and-drop reorder on desktop is only available when the operator can see the full ordered list (**Todas** selected and **Solo novedades** off), matching the existing pattern that disables reorder while the novelty filter is active. When pagination hides part of the list, a short hint explains that reorder requires showing all items.

Mobile card view keeps up/down reorder buttons; they operate on the **current paginated slice** (same page and page size as desktop). When page size is not **Todas**, reorder buttons are disabled with the same Spanish hint used for disabled drag-and-drop on desktop.

**Why this priority**: Prevents ambiguous partial-list reorder that could corrupt `displayOrder` without blocking pagination for browse/edit workflows.

**Independent Test**: With page size 10 and 30 items, verify drag handles are disabled and hint text appears; switch to **Todas** and verify drag-and-drop works again.

**Acceptance Scenarios**:

1. **Given** page size is not **Todas**, **When** the desktop table is shown, **Then** drag-and-drop reorder is disabled.
2. **Given** page size **Todas** and novelty filter off, **When** the operator drags a row, **Then** reorder behaves as today.
3. **Given** pagination is active, **When** the list renders, **Then** a hint in Spanish explains how to enable reorder (for example: "Muestra todas las filas para reordenar").

---

### User Story 5 — Compact mobile card actions (Priority: P3)

On compact viewports the list uses cards instead of the table. Card action buttons follow the same icon-only + tooltip pattern as desktop so card height stays manageable. Thumbnail tap on mobile opens the full-resolution enlarged preview in a lightweight overlay (tap outside to close). Pagination controls and page-size selector are shared with desktop and govern which cards are visible.

**Why this priority**: Maintains parity with CHG-035 mobile admin patterns without blocking desktop delivery.

**Independent Test**: Resize to card layout; verify icon actions with labels on long-press or tooltip equivalent, and tap-to-preview on thumbnails.

**Acceptance Scenarios**:

1. **Given** compact card layout, **When** the operator views a card, **Then** actions are icon-only with accessible names.
2. **Given** a photo card on touch device, **When** the operator taps the thumbnail, **Then** an enlarged full-resolution preview opens and dismisses on outside tap or close control.
3. **Given** compact card layout with more items than the selected page size, **When** the list renders, **Then** only the current page of cards is visible and pagination matches the desktop page-size setting.

---

### Edge Cases

- Empty list: pagination and page-size controls are hidden; empty state unchanged.
- Filtered novelty list shorter than one page: pagination hidden or shows single page without next/previous disabled confusion.
- Single item: pagination shows "1–1 de 1" or hides controls when unnecessary.
- Hover preview near viewport edge: preview repositions (flip to opposite side of thumbnail) so it remains fully visible without following the cursor.
- Very large image sources: enlarged preview uses constrained max dimensions without blocking the UI thread perceptibly.
- Delete or bulk action on current page reduces item count: current page clamps to last valid page (no blank page).
- **Todas** with 200+ items: list remains usable; performance acceptable for operator workflows (client-side slice only affects rendering batch, full dataset still loaded as today).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The top content admin list desktop table MUST render row actions as an inline icon-only group with Spanish tooltips on hover exposing the former text labels.
- **FR-002**: Compact row layout MUST reduce vertical padding and/or thumbnail footprint so more rows are visible at 1080p without horizontal page scroll.
- **FR-003**: Long title and media filename cells MUST truncate with ellipsis rather than expanding row height.
- **FR-004**: Hovering a photo or video thumbnail in the desktop table MUST show an enlarged preview at full media resolution (kiosk-equivalent source, not an upscaled list thumbnail) without leaving the list.
- **FR-005**: Hover preview MUST be anchored beside the thumbnail (not cursor-following), MUST reposition to remain in viewport, MUST close when the pointer leaves the thumbnail/preview area, and MUST NOT block row selection, actions, or drag-and-drop initiation. Keyboard focus on the thumbnail MUST open the same enlarged preview; blur or Escape MUST close it.
- **FR-006**: Rows without media preview MUST NOT show an enlarged hover preview.
- **FR-007**: The list MUST provide a page-size control with options 10, 20, 50, 100, and Todas (default 20).
- **FR-008**: When page size is not Todas, the list MUST show pagination with previous/next navigation and a range indicator (for example "21–40 de 87") over the currently filtered item set, on both desktop table and compact card layouts.
- **FR-009**: Selecting Todas MUST display all filtered items and hide pagination controls.
- **FR-010**: Page size preference MUST persist on the operator's device across browser restarts (local storage) until changed.
- **FR-011**: Changing page size or toggling **Solo novedades** MUST reset to page 1.
- **FR-012**: Desktop drag-and-drop reorder MUST be disabled unless page size is Todas and **Solo novedades** is off; a Spanish hint MUST explain the constraint when reorder is disabled due to pagination.
- **FR-013**: Bulk selection MUST apply to visible rows on the current page only; changing page MUST clear the selection.
- **FR-014**: Compact card layout MUST use icon-only actions with accessible names; photo/video thumbnails MUST support tap-to-enlarge full-resolution preview on touch devices; pagination and page-size controls MUST match desktop behavior.
- **FR-015**: All new UI strings MUST be Spanish.

### Traceability & Quality Requirements

- **TQ-001**: The affected active contract (`CONTENT.ADS.ADMIN`) MUST be updated before implementation if observable behavior changes.
- **TQ-002**: The change MUST include automated tests or an explicit manual validation task with rationale.
- **TQ-003**: The manifest entry MUST be updated before implementation is considered complete.

### Key Entities

- **Top content list view**: Admin presentation of ordered content items with filters, selection, actions, and pagination state.
- **Pagination state**: Current page index, selected page size, and derived visible slice over the filtered item collection.
- **Preview overlay**: Transient enlarged media presentation triggered by hover or keyboard focus (desktop) or tap (mobile); dismissed on pointer exit, blur, Escape, or outside tap.

## Success Criteria *(mandatory)*

- **SC-001**: On a 1920×1080 desktop viewport, operators can see at least 30% more list rows than before without horizontal scrolling (measured on a fixture with 20+ homogeneous rows).
- **SC-002**: Operators can identify action purpose via tooltip within one hover interaction; zero regression in show-on-screen, edit, and delete success rates during UAT.
- **SC-003**: Enlarged thumbnail preview appears within 500 ms of hover and closes immediately on pointer exit in 95% of trials.
- **SC-004**: With 100+ items loaded, switching between page sizes and navigating pages completes perceived UI update in under 1 second without full page reload.
- **SC-005**: Operators can reach any item using pagination in at most ceil(total / page size) navigation steps; **Todas** shows the complete filtered set in one view.

## Assumptions

- Pagination is client-side over the existing full-list fetch; no new server-side paging API is required for this change.
- Default page size is 20; device-local persistence (survives browser restart on the same device) is sufficient; no cross-device sync.
- Enlarged preview loads full-resolution media but displays it within a reasonable viewport fraction (for example up to 480 px on the longest edge) preserving aspect ratio.
- Video hover preview uses the full video source (muted); no new frame-extraction pipeline is required.
- Desktop table is the primary target for density and hover; mobile receives aligned pagination, preview, and action patterns adapted for touch.
- Ads list is out of scope unless explicitly extended in a follow-up change.

## Relationships

- Modifies: `CONTENT.ADS.ADMIN`
- Extends: CHG-035 (admin mobile list patterns), CHG-027 (novelty filter interaction)
- Depends on: none
- Supersedes: none
- Superseded by: none
