---
capability: C2-content-and-ads
supersedes:
superseded_by:
status: closed
oversize: false
---

# Feature Specification: Drop Label, Auto display_order, Drag-and-Drop Reorder

**Feature Branch**: `010-admin-cleanup-and-polish`
**Spec Directory**: `specs/013-drop-label-display-order-drag-drop/`
**Created**: 2026-06-19
**Status**: Draft
**Input**: User feedback: "Tampoco quiero que Ads y Content tengan label. En Ads y Content, el display order no debe meterse manualmente al subir Ads y Content, debe ser auto-incremental, y una vez subido el campo sí debe ser editable. Además deben poder reordenarse con drag & drop, incluso seleccionando varios y moviéndolos en bloque."

> This spec is part of a single big-bang release that bundles five
> cleanup specs into the same `010-admin-cleanup-and-polish` branch.
> The other specs cover the Setup-check relabel, UX polish, deleting
> revoked API keys, and dropping the Client concept. The Client drop
> (spec 014) is the last to land; it removes the
> `client_ad_items.client_id` FK and the `clients` table in the same
> migration that removes the `client_ad_items.label` column.

## Clarifications

### Session 2026-06-19

- Q: Content does not have a `label` field — it has `title`. The
  user said "Ads and Content shouldn't have label". Does the spec
  remove `label` from ads only, or also rename `title`? → A: Remove
  `label` from ads only. `title` is a different concept (a
  human-readable caption) and is kept. The "label" being removed
  is the redundant secondary text that ads have alongside their
  client.
- Q: When is `displayOrder` assigned? → A: On create and on
  upload. If the request omits `displayOrder`, the server computes
  `max(existing display_order) + 1` within a per-organization
  Postgres advisory lock (the same pattern used by
  `ContentService.append_via_public_api` for public uploads). If
  the request includes `displayOrder`, the server uses it
  (backward compatible for the PUT path and for the existing
  frontend edit form).
- Q: Is the `displayOrder` form field shown in the create form?
  → A: No. The create form omits the field; the server assigns the
  value. After the item is saved, the row appears in the list and
  can be edited (the edit form exposes the field, and the list
  supports drag-and-drop).
- Q: How is the drag-and-drop multi-select implemented? → A: The
  list component tracks a `selection: Set<string>` of selected row
  ids. A `mat-checkbox` is added to each row. When a drag is
  committed, the visible drag uses `moveItemInArray` to position
  the dragged row; the frontend then computes the new ordering
  for the dragged row plus all selected siblings and calls
  `POST /api/ads/reorder` (or `/api/content/reorder`) with the new
  ordered list of ids. The server renumbers `display_order` per
  the new list. The list refreshes on success.
- Q: What happens if the user reorders items while another admin
  has reordered the same list? → A: The server is last-write-wins.
  The reorder endpoint uses a per-organization advisory lock to
  serialize concurrent reorders; the second call sees the first
  call's renumbering. There is no conflict detection; the contract
  is "your reorder wins, and the list reflects the latest accepted
  state". This is consistent with the existing
  last-save-wins contract (spec 006).
- Q: New endpoint or extend an existing one? → A: New
  `POST /api/ads/reorder` and `POST /api/content/reorder` with
  body `{ "orderedIds": ["id1", "id2", ...] }`. These are
  separate from PUT to keep the bulk-reorder semantics explicit
  (the body is a list, not a single item) and to avoid
  overloading the single-item PUT.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - No Label Field on Ads (Priority: P1)

An administrator who opens the ad creation form no longer sees a
"Label" field. The form continues to ask for a client (until spec
014 lands), a source reference, a media file, an active toggle, a
display order (after the first save), and rotation overrides. The
ad list no longer shows a "Label" column. The spec removes the
`label` field from the entity, the API, the form, the list, and
the database column.

**Why this priority**: The user explicitly asked for this. The
field is redundant (the client already has a name) and removing
it is a one-column drop with form/list updates.

**Independent Test**: Can be tested by signing in as an
administrator, opening the ad form, confirming there is no Label
field, creating an ad, and confirming the ad appears in the list
without a Label column. The same is verified for the API:
`POST /api/ads` does not require `label` and the response does not
include `label`.

**Acceptance Scenarios**:

1. **Given** an administrator is on `/admin/ads/new`, **When** the
   form renders, **Then** there is no "Label" input field. The
   form has: client, source reference, media file, active,
   display order (hidden on create), and rotation overrides.
2. **Given** an administrator creates an ad without a label,
   **When** the request resolves, **Then** the ad is saved and
   the response does not include a `label` field.
3. **Given** an administrator is on `/admin/ads`, **When** the
   list renders, **Then** there is no "Label" column.
4. **Given** the API exposes the change, **When** the spec is
   validated by an OpenAPI client, **Then** the
   `AdItemRequest` and `AdItemSchema` schemas do not include a
   `label` field.
5. **Given** the migration runs on a populated database, **When**
   the migration completes, **Then** the `label` column is
   dropped and the data is preserved otherwise (the existing
   `label` values are simply discarded; this is a hard drop per
   the user's request).

---

### User Story 2 - Auto displayOrder on Create (Priority: P1)

An administrator who creates a new ad or content item no longer
types a display order. The form omits the field on create; the
server assigns `max(existing display_order) + 1` and returns the
new value. The edit form (for existing items) continues to expose
the field so the administrator can override the value.

**Why this priority**: The user explicitly asked for this. The
admin already orders items via drag-and-drop; the manual
`displayOrder` input is redundant on create.

**Independent Test**: Can be tested by signing in as an
administrator, creating two ads in sequence without specifying a
display order, and confirming the second ad has
`displayOrder = 1` (the first) and `displayOrder = 2` (the
second). Editing the second ad and setting `displayOrder = 99`
succeeds.

**Acceptance Scenarios**:

1. **Given** an organization has no ads, **When** the
   administrator creates the first ad without specifying
   `displayOrder`, **Then** the server assigns
   `displayOrder = 1` and the response includes the assigned
   value.
2. **Given** the organization already has 3 ads, **When** the
   administrator creates a fourth ad without specifying
   `displayOrder`, **Then** the server assigns
   `displayOrder = 4`.
3. **Given** the administrator creates an ad with an explicit
   `displayOrder`, **When** the request resolves, **Then** the
   server uses the supplied value (backward compatible).
4. **Given** the form is in "edit" mode for an existing ad,
   **When** the form renders, **Then** the "Display order" field
   is shown and pre-populated with the current value.
5. **Given** two concurrent `POST /api/ads` calls both omit
   `displayOrder`, **When** the requests resolve, **Then** the
   two new ads have distinct `displayOrder` values (no collisions)
   and the values are contiguous with the existing max
   (Postgres advisory lock serializes the max-read and the
   insert).

---

### User Story 3 - Drag-and-Drop Reorder With Multi-Select (Priority: P2)

An administrator who wants to change the playback order of ads
or content items can drag any row to a new position. The list
also supports multi-select: the administrator can check two or
more rows and drag any one of them; the entire selection moves as
a block to the new position. A reorder is committed in a single
API call.

**Why this priority**: The user explicitly asked for this. It is
the most visible workflow change: the manual `displayOrder` input
on the create form is replaced by a visual reordering surface.

**Independent Test**: Can be tested by signing in as an
administrator, opening the ad list, dragging the first row to the
third position, refreshing, and confirming the new order is
persisted. Then selecting three rows and dragging them as a
block, and confirming the three rows stay together in the new
position.

**Acceptance Scenarios**:

1. **Given** the ad list has 5 rows, **When** the administrator
   drags row 1 to position 4, **Then** the list reorders to
   `[2, 3, 4, 1, 5]` and the new order is persisted (verified by
   a page refresh).
2. **Given** the ad list has 5 rows, **When** the administrator
   checks rows 1, 2, 3 and drags row 2 to position 5, **Then** the
   list reorders to `[4, 1, 2, 3, 5]` and the new order is
   persisted.
3. **Given** a drag is in progress, **When** the drag is
   cancelled (Escape, drop outside the list), **Then** the list
   reverts to its original order and no API call is made.
4. **Given** the list is empty or has only one row, **When** the
   page renders, **Then** the drag handle is disabled (no
   operation to perform).
5. **Given** a reorder API call fails (e.g. 500), **When** the
   error is reported, **Then** the list reverts to the
   pre-drag order and a snackbar message shows the error.

---

### Edge Cases

- The reorder endpoint receives an `orderedIds` list that does
  not match the current set of ids in the database (e.g. an item
  was deleted by another admin in between). The spec rejects the
  request with 409 (the set of ids must match exactly, modulo
  items the caller did not include intentionally — see FR-005
  below).
- The reorder endpoint is called with an empty `orderedIds` list.
  The spec rejects the request with 400 (no-op reorders are not
  allowed; this catches accidental client bugs).
- The drag-and-drop interaction is keyboard-accessible: the user
  can select rows via the checkboxes (existing keyboard pattern)
  and the drag handle exposes a keyboard alternative. The CDK
  drag-drop's built-in keyboard support is used.
- A new ad is created while the user is dragging. The visible
  list refreshes; the drag operation may be cancelled by the
  refresh. No data corruption occurs because the server is the
  authority on the list state.
- The `displayOrder` field on the edit form is bounded to `>=1`
  by the existing Pydantic `Field(ge=1)` validator. The spec
  does not change this.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `label` column MUST be removed from the
  `client_ad_items` table. The Alembic migration
  `0004_admin_cleanup.py` (combined with the Client drop in spec
  014) drops the column.
- **FR-002**: The Pydantic schemas `AdItemRequest` and
  `AdItemSchema` MUST NOT include a `label` field. The OpenAPI
  document MUST reflect the change.
- **FR-003**: The frontend ad form (`ad-form.component.ts`) MUST
  NOT render a "Label" field. The frontend ad list
  (`ad-list.component.ts`) MUST NOT render a "Label" column.
  Frontend aria-labels that referenced `ad.label` MUST be
  rewritten to use the ad's display order or client name.
- **FR-004**: The Pydantic schemas `AdItemRequest` and
  `ContentItemRequest` MUST accept a request that omits
  `displayOrder` (the field becomes optional with
  `default=None`). The OpenAPI document MUST reflect the change.
- **FR-005**: The `AdsService.create_ad`, `AdsService.create_uploaded_ad`,
  `ContentService.create`, and `ContentService.create_uploaded`
  methods MUST compute `max(existing display_order) + 1` for
  the organization when the payload omits `displayOrder`. The
  computation is wrapped in a Postgres
  `pg_advisory_xact_lock(hashtext('ad_append:' || org_id))` (or
  `'content_append:'` for content) to serialize concurrent
  appends. The pattern matches the existing
  `ContentService.append_via_public_api` advisory lock.
- **FR-006**: The frontend ad form and content form MUST hide
  the `displayOrder` input when the form is in "create" mode
  (the route is `/admin/ads/new` or `/admin/content/new`). The
  field MUST be visible in "edit" mode (the route includes
  `/{id}/edit`).
- **FR-007**: The backend MUST expose
  `POST /api/ads/reorder` and `POST /api/content/reorder`. Each
  accepts a body `{ "orderedIds": [string, ...] }` and renumbers
  `display_order` per the new list (the first id gets
  `displayOrder = 1`, the second `2`, etc.). The endpoint is
  gated by the same role as the existing list endpoint
  (`AD_MANAGEMENT_ROLES` for ads, the admin role for content —
  matching the existing `content.py` router's auth).
- **FR-008**: The reorder endpoint MUST validate that
  `orderedIds` is non-empty and that the set of ids matches
  exactly the current set of ad/content ids for the organization
  (modulo the caller's intent). A mismatch returns 409 with
  code `reorder_ids_mismatch` and the safe user-facing message
  "The list changed; refresh and try again."
- **FR-009**: The reorder endpoint MUST wrap the renumbering in
  a per-organization advisory lock so concurrent reorders
  serialize cleanly. The endpoint returns 204 on success and
  records a `display_event` with
  `event_type="<entity>_reordered"`,
  `severity="info"`, and `metadata={"count": N}`.
- **FR-010**: The frontend ad list and content list MUST render
  a `mat-checkbox` per row (the selection model) and a drag
  handle (the row itself, via `cdkDrag`). The list MUST use
  `cdkDropList` and must call `moveItemInArray` to position
  the visible drag. On drop, the list MUST compute the new
  order including all selected siblings and call the
  corresponding reorder endpoint.
- **FR-011**: The drag-and-drop interaction MUST be
  keyboard-accessible. The CDK drag-drop's built-in keyboard
  support (Space to pick up, arrow keys to move, Space to drop,
  Escape to cancel) is used. The selection checkboxes are
  keyboard-accessible via the existing Material checkbox
  pattern.

### Traceability & Quality Requirements *(mandatory)*

- **TQ-001**: Each functional requirement MUST map to at least one
  user story and one measurable success criterion.
- **TQ-002**: Changed behavior MUST have a testable validation
  method described in this specification or deferred to the
  implementation plan.
- **TQ-003**: Public, integration, data, and user-interface
  boundaries MUST list expected contracts or explicitly state that
  no boundary is introduced.
- **TQ-004**: Security, observability, and accessibility
  considerations MUST be captured as requirements, assumptions, or
  out-of-scope decisions.
- **TQ-005**: Speculative or future-scope behavior MUST be listed as
  out of scope rather than implemented implicitly.

### Key Entities *(include if feature involves data)*

- **ClientAdItem (existing)**: The SQLAlchemy model at
  `backend/app/repositories/models/ad.py`. The spec drops the
  `label` column; no other field is removed.
- **TopContentItem (existing)**: The SQLAlchemy model at
  `backend/app/repositories/models/content.py`. No column is
  removed; `display_order` semantics change (auto-assigned on
  create, optional in the request).
- **DisplayEvent (existing)**: The audit-event row. The
  reorder endpoint records a new event type per entity
  (`ad_reordered` / `content_reordered`) with `severity=info`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the `label` field is removed from the
  entity, the database, the API, the form, the list, and the
  OpenAPI document. The migration drops the column without
  losing other data.
- **SC-002**: 100% of create/upload requests for ads and content
  that omit `displayOrder` succeed and the server assigns a
  unique, contiguous, max+1 value. 100% of edit requests that
  include an explicit `displayOrder` succeed with the supplied
  value.
- **SC-003**: Two concurrent create requests for the same
  organization, both omitting `displayOrder`, succeed with
  distinct, contiguous `displayOrder` values (no collisions,
  no gaps) — verified by an integration test that fires the
  requests in parallel.
- **SC-004**: A drag-and-drop reorder of a single row persists
  the new order. A drag-and-drop reorder of N selected rows
  (N ≥ 2) persists the new order with the N rows still
  contiguous in the new position.
- **SC-005**: The drag-and-drop interaction is keyboard-
  accessible: a keyboard-only user can select rows, pick up a
  drag, move it, and drop it without using the mouse.
- **SC-006**: 100% of existing tests pass after the spec; new
  tests cover the label drop, the auto-assignment, the reorder
  endpoint, and the drag-and-drop frontend behavior.

## Assumptions

- The `label` column is hard-dropped in the same migration that
  drops the `client_id` column (spec 014). The two columns are
  removed together because the Client concept is being removed in
  the same release; the spec mentions the combined migration in
  FR-001.
- The advisory lock is `pg_advisory_xact_lock(hashtext('ad_append:'
  || organization_id))` for ads and the existing
  `'content_append:'` for content. Different entity types use
  different lock keys so a content append and an ad append do
  not block each other.
- The reorder endpoint renumbers the entire list, not just the
  moved rows. This is the simplest correct semantics; the
  alternative (renumber only the moved rows) introduces
  contiguity bugs.
- The drag-and-drop interaction uses `@angular/cdk`'s drag-drop
  module, which is already a dependency. No new packages are
  added.
- The form's `displayOrder` field is hidden via `*ngIf="mode ===
  'edit'"` (or equivalent) on the create view, not via CSS
  display:none, so the field is removed from the accessibility
  tree.
- The list's selection state is per-component (a `signal<Set<string>>`
  in the list component). It is reset to an empty set on
  `OnInit` and on a successful refresh.
- The spec does not change the kiosk display's runtime
  behavior; the kiosk polls the display state and re-renders
  with the new `display_order` within one polling cycle (≤ 6
  seconds, per spec 009 SC-001).

## Out of Scope

- Renaming `displayOrder` to a different field name.
- Renaming `title` on content (the user said "Ads and Content
  shouldn't have label" — content does not have `label`; it has
  `title`, which is kept).
- A new icon font, a new Material icon, or a new visual
  primitive for the drag handle. The row itself is the drag
  handle; an icon is added in the row's first column if needed.
- A separate `display_order` history table or audit trail of
  every reorder. The current `display_event` recording of the
  reorder is the audit.
- Cross-list drag (moving an ad into the content list, or vice
  versa). The two lists are independent.
- Auto-sorting the list by a criterion other than
  `display_order` (e.g. by `createdAt` or by `title`). The
  spec keeps the existing `display_order` ordering.
- Soft delete of ads or content. The spec does not change
  the existing delete behavior.
- A new "bulk create" endpoint. The spec only changes
  `displayOrder` semantics on the existing single-item create
  endpoint.
