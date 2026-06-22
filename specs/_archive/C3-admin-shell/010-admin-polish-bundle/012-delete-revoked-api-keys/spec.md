---
capability: C6-public-api-and-keys
supersedes:
  - 009-public-content-api — hard-delete endpoint for revoked API keys
superseded_by:
status: closed
oversize: false
---

# Feature Specification: Delete Revoked API Keys

**Feature Branch**: `010-admin-cleanup-and-polish`
**Spec Directory**: `specs/012-delete-revoked-api-keys/`
**Created**: 2026-06-19
**Status**: Draft
**Input**: User feedback: "Las API Keys, una vez revocadas, deben poder eliminarse."

> This spec is part of a single big-bang release that bundles five
> cleanup specs into the same `010-admin-cleanup-and-polish` branch.
> The other specs cover the Setup-check relabel, UX polish, dropping
> the Client concept, and simplifying the Ad/Content form fields
> (label removal, drag-and-drop reorder). This spec is one of the
> smallest in the bundle; it adds a single new endpoint and a single
> new row action.

## Clarifications

### Session 2026-06-19

- Q: When can an API key be deleted? → A: Only after it has been
  revoked. A still-active key MUST NOT be deletable from the admin
  UI; the response is 409 with code `api_key_not_revoked`.
- Q: Soft delete or hard delete? → A: Hard delete. The
  `display_events` audit trail already references the key only by
  `entity_id` (a string column, not a foreign key), so the audit
  history survives the row's deletion. The list endpoint filters by
  existing rows, so a deleted key simply disappears from the next
  `GET /api/admin/api-keys` response.
- Q: Should the existing `DELETE /api/admin/api-keys/{id}`
  endpoint change? → A: No. That endpoint is contract-pinned to
  "revoke (idempotent 204)" in
  `specs/009-public-content-api/contracts/api-key-contract.md:119-136`
  and in `test_public_content_openapi.py:25`. Reusing it for
  hard-delete would break clients that re-call `DELETE` to
  "ensure revoked" and would silently start destroying data. The
  new hard-delete endpoint is a separate
  `POST /api/admin/api-keys/{id}/delete` that returns 204 on
  success.
- Q: What about the `create_api_key_event` action whitelist? → A:
  Extend it from `{"create", "rotate", "revoke"}` to
  `{"create", "rotate", "revoke", "delete"}`. The `delete` event
  has `severity="warning"` (mirroring `revoke`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Remove a Revoked API Key From the List (Priority: P1)

An administrator who has revoked an API key can remove the key's
row from the admin list so the list does not accumulate stale
records. The "Delete" action is enabled only on rows that have
already been revoked, and a confirmation dialog explains that the
audit trail is preserved even though the row is removed.

**Why this priority**: The user reported that revoked keys cannot
be removed. This is the smallest behavior change that resolves the
user's complaint and keeps the list manageable for operators with
many keys.

**Independent Test**: Can be tested by signing in as an
administrator, creating a key, revoking it, and confirming a
"Delete" action appears on the row. Clicking "Delete" and
confirming removes the row from the next list response.

**Acceptance Scenarios**:

1. **Given** an administrator is on `/admin/api-keys` and a key
   has been revoked, **When** the row renders, **Then** the row
   shows a "Delete" action button that is enabled (not disabled).
2. **Given** an administrator is on `/admin/api-keys` and a key
   is still active, **When** the row renders, **Then** the row
   does NOT show a "Delete" action (or the action is disabled
   with an explanatory tooltip).
3. **Given** an administrator clicks "Delete" on a revoked key,
   **When** the confirmation dialog appears, **Then** the dialog
   title and message clearly state that the row is being removed
   from the list and that the audit trail is preserved.
4. **Given** the administrator confirms the deletion, **When** the
   request resolves, **Then** a snackbar message confirms the
   deletion, the list refreshes, and the row no longer appears.
5. **Given** the deletion is in flight, **When** the user clicks
   the row's "Rotate" or "Revoke" button, **Then** those actions
   are disabled until the deletion completes (consistent with the
   existing per-row saving-state pattern).

---

### User Story 2 - Backend Blocks Deletion of Active Keys (Priority: P2)

A non-admin client (or a buggy admin client) that sends a delete
request for an active (non-revoked) key receives a 409 response
with the safe error envelope, not a silent success. The error
message is user-facing and does not leak internal paths or
secrets.

**Why this priority**: The hard-delete endpoint is destructive.
A 409 guard for the "active" state prevents accidental data loss
and matches the existing 409 contract for `rotate` on a revoked
key (the inverse case in
`backend/app/api/v1/api_keys/routes.py:91-94`).

**Independent Test**: Can be tested by sending a
`POST /api/admin/api-keys/{id}/delete` HTTP request for an active
key and confirming a 409 response with the documented code and
message.

**Acceptance Scenarios**:

1. **Given** an administrator is authenticated and the target key
   is still active, **When** the admin sends
   `POST /api/admin/api-keys/{id}/delete`, **Then** the response is
   409 with body
   `{ "code": "api_key_not_revoked", "message": "Only revoked keys can be deleted.", ... }`.
2. **Given** the same request, **Then** the key's row is still
   present in the database after the request (the 409 is a no-op).
3. **Given** the target key does not exist, **When** the admin
   sends the request, **Then** the response is 404 with code
   `api_key_not_found`.
4. **Given** the same request for a revoked key, **Then** the
   response is 204 (No Content) and the row is removed from the
   database.

---

### Edge Cases

- The audit log in `display_events` retains the `entity_id` of the
  deleted key (the audit row is not a foreign key, by design; see
  `specs/009-public-content-api/data-model.md:110-113`). A
  post-deletion `GET /api/events` query filtered by `entity_id`
  still returns the historical `create`, `rotate`, and `revoke`
  events.
- A delete request issued while the admin list is in the middle
  of a refresh races: the next refresh wins and the deleted row
  does not appear. This is the same race as the existing
  rotate/revoke flows; the spec does not introduce a new race
  condition.
- A delete request that fails (e.g. database error) is reported
  through the existing safe error envelope. The row is not
  removed; the snackbar shows the user-facing error message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The admin API MUST expose
  `POST /api/admin/api-keys/{key_id}/delete` which deletes the key
  row from the database. The endpoint is gated by
  `require_roles(ADMIN_ROLES)` (same as the existing endpoints).
- **FR-002**: The endpoint MUST return 204 No Content on success
  and MUST record an `api_key_changed` `DisplayEvent` with
  `action="delete"`, `severity="warning"`,
  `entity_id=<key_id>`, and `event_metadata={"action": "delete",
  "key_label": "<label>"}`.
- **FR-003**: The endpoint MUST return 409 with code
  `api_key_not_revoked` and the user-facing message "Only revoked
  keys can be deleted." if the target key is still active
  (`is_active=True`).
- **FR-004**: The endpoint MUST return 404 with code
  `api_key_not_found` if the target key does not exist or
  belongs to a different organization.
- **FR-005**: The existing `DELETE /api/admin/api-keys/{id}`
  endpoint MUST remain unchanged: it is contract-pinned to
  "revoke (idempotent 204)" and continues to revoke (not delete).
- **FR-006**: The admin list view MUST render a "Delete" action
  button on each row that has `isActive === false`. The button
  MUST be disabled while `facade.saving()` is true (consistent
  with the existing "Rotate" and "Revoke" buttons).
- **FR-007**: The "Delete" action MUST open a confirmation dialog
  with `destructive: true`, a title that includes the key's label,
  a message explaining that the row is being removed (the audit
  trail is preserved), a "Delete" confirm label, and a "Cancel"
  cancel label.
- **FR-008**: On confirmation, the frontend MUST call
  `POST /api/admin/api-keys/{id}/delete` via a new
  `ApiKeysApiService.delete(id)` method. On 204 success, the
  frontend MUST refresh the list and show a snackbar with the
  message "API key deleted.".
- **FR-009**: The `create_api_key_event` helper's `action`
  whitelist MUST be extended to include `"delete"`. The factory
  continues to set `severity="warning"` for both `"revoke"` and
  `"delete"`.

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

- **ApiKey (existing)**: The SQLAlchemy model at
  `backend/app/repositories/models/api_key.py`. The spec hard-
  deletes the row; no field is added, no migration is added, no
  soft-delete column is added.
- **ApiKeyRecord (existing DTO)**: The Pydantic schema at
  `backend/app/api/v1/api_keys/schemas.py:31-40` and the matching
  TypeScript DTO at
  `frontend/src/app/shared/contracts/admin-contracts.ts:65-75`.
  No field is added.
- **DisplayEvent (existing)**: The audit-event row. A new
  `api_key_changed` event with `action="delete"` and
  `severity="warning"` is recorded on every successful hard
  delete. The event references the deleted key by `entity_id`
  (string column, no FK), so the audit history survives.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of revoked keys in the admin list show a
  "Delete" action that is enabled; 0% of active keys show an
  enabled "Delete" action.
- **SC-002**: A successful
  `POST /api/admin/api-keys/{id}/delete` removes the key row from
  the database; a subsequent `GET /api/admin/api-keys` does not
  list the key.
- **SC-003**: A `POST /api/admin/api-keys/{id}/delete` for an
  active key returns 409 with the documented code and message;
  the row is unchanged.
- **SC-004**: A `POST /api/admin/api-keys/{id}/delete` for a
  non-existent key returns 404 with code `api_key_not_found`.
- **SC-005**: The existing `DELETE /api/admin/api-keys/{id}`
  endpoint continues to revoke (204) and does not delete; the
  OpenAPI contract is unchanged.
- **SC-006**: Every successful hard delete records exactly one
  `api_key_changed` `DisplayEvent` with `action="delete"`,
  `severity="warning"`. A failed hard delete (409 or 404) records
  zero events.
- **SC-007**: 100% of existing api-key tests pass after the spec;
  new tests cover the new service method, the new endpoint
  (success, 409, 404), and the new frontend action.

## Assumptions

- The audit trail in `display_events` is the long-term record of
  key lifecycle events. The spec adds a `delete` action to the
  whitelist but does not change how the events are stored or
  queried.
- The hard delete is irreversible. The confirmation dialog
  explains this; the spec does not add an undo path.
- The new endpoint is `POST /api/admin/api-keys/{id}/delete` (not
  `DELETE .../delete`) because `DELETE` on the same path is
  already contract-pinned to revoke and reusing the verb would
  break clients. The new verb is a deliberate choice to keep the
  two operations on separate, documented paths.
- The frontend change is contained to `api-keys-list.component.ts`
  and a new method on the api-keys facade / api service. No
  shared layout, no shared component, no new module.
- The spec does not change the public upload endpoint, the kiosk
  display, the remote control, or any other capability.
- The spec is part of the big-bang release
  `010-admin-cleanup-and-polish`. It does not introduce a new
  spec-kit branch; it ships with the rest of the bundle.

## Out of Scope

- Soft delete (`is_deleted` or `deleted_at` column). The audit
  trail in `display_events` already outlives the row, so a
  soft-delete column adds no value and is rejected by the spec.
- Bulk delete (selecting multiple keys and deleting them at once).
  The single-row delete is the smallest change that resolves the
  user's complaint; bulk delete is a follow-up.
- Undo / restore. A hard delete is irreversible.
- Filtering the list by "revoked only" or hiding revoked keys by
  default. The list continues to show all keys; the user removes
  rows explicitly.
- Changing the existing `DELETE /api/admin/api-keys/{id}` endpoint
  to mean "delete" instead of "revoke". The existing endpoint is
  contract-pinned and remains "revoke".
- Renaming the action verbs (e.g. "Delete" → "Remove" or
  "Archive"). The user said "eliminar" and "podrán eliminarse";
  the English label is "Delete" to match the existing "Rotate" and
  "Revoke" verbs.
- Adding a new column to `ApiKeyRecord` or `ApiKey`. The spec is
  a no-schema-change change.
- Deleting a key on behalf of another organization. The endpoint
  filters by the caller's `organization_id` (existing pattern).

## Superseded by

- No direct behavioral supersession. The
  `POST /api/admin/api-keys/{id}/delete` endpoint is still
  authoritative for revoking+deleting API keys.

Amendment chain authored from this spec:
- `supersedes-009.md` (in this directory)
