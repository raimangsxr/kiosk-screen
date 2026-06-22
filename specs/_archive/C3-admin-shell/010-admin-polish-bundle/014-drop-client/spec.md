---
capability: C2-content-and-ads
supersedes:
  - 003-admin-media-uploads — drop Client entity, advertiser free-text replaces client picker
superseded_by:
status: closed
oversize: false
---

# Feature Specification: Drop the Client Concept

**Feature Branch**: `010-admin-cleanup-and-polish`
**Spec Directory**: `specs/014-drop-client/`
**Created**: 2026-06-19
**Status**: Draft
**Input**: User feedback: "Eliminar el concepto de client [...]."

> This spec is part of a single big-bang release that bundles five
> cleanup specs into the same `010-admin-cleanup-and-polish` branch.
> The other specs cover the Setup-check relabel, UX polish, deleting
> revoked API keys, and simplifying the Ad/Content form fields. This
> spec is the last to land; it removes the `Client` entity end-to-end
> (table, model, service, routes, navigation, form field) so the
> kiosk's only top-level entities are Content, Ads, and the existing
> Configuration / Users / API-Keys.

## Clarifications

### Session 2026-06-19

- Q: Should the `Client` entity be soft-deleted (kept in the
  database, hidden in the UI) or hard-deleted? → A: Hard-deleted.
  The spec removes the table, the model, the routes, the service,
  the navigation, and the form field. Existing rows in the
  `clients` table are dropped in the same migration that drops the
  `client_id` FK on `client_ad_items`.
- Q: Where does the operator that previously selected a client for
  an ad get the contextual information about which advertiser an ad
  belongs to? → A: The operator types a free-form `advertiser` text
  on the ad form (replacing the client picker). The field is
  optional and rendered as a plain `<input type="text">` on the ad
  create / edit form. The list view shows the value in a new
  "Advertiser" column; if no value is set, the column shows a
  dash.
- Q: Is the "Sponsor" / "Client" terminology replaced with
  "Advertiser" everywhere? → A: Yes, on the user-visible surface
  (sidenav, form labels, list column, error messages). The database
  column, the Pydantic schema field, the SQLAlchemy model field,
  and the migration column remain named `advertiser` (the column
  is added in this spec on `client_ad_items`).
- Q: Does the spec remove the "Clients" sidenav entry from
  `/admin`? → A: Yes, the entry is removed; the
  `AdminNavigationService.items` list and the
  `AdminNavigationService.quickActions` list drop the
  `Add client` quick action.
- Q: What about the existing backend data? → A: The migration
  drops the `clients` table and the `client_id` column on
  `client_ad_items` in a single transaction. The new `advertiser`
  text column is added to `client_ad_items` in the same
  migration. Pre-existing ad rows are migrated with
  `advertiser = <previous client name>` (looked up at migration
  time); if the lookup fails, `advertiser = NULL`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - No Clients Section in the Admin Site (Priority: P1) 🎯 MVP

An administrator who opens the admin sidenav no longer sees a
"Clients" entry. The `/admin/clients` route returns a 404
(or is removed from the router entirely). The
`/admin/clients/new` and `/admin/clients/{id}/edit` routes are
gone. The `Client` model, the `clients` table, the
`/api/clients` REST endpoint, and the
`/api/clients/{id}` REST endpoint are removed from the
codebase.

**Why this priority**: The user explicitly asked for this. The
"Clients" section is redundant once ads no longer require a
client; removing it from the sidenav is the most visible
consequence of the spec.

**Independent Test**: Sign in as an administrator, open the
admin shell, and confirm the sidenav does not list a
"Clients" entry. The "Add client" quick action on the
dashboard is also gone. Navigating directly to
`/admin/clients` returns a not-found / 404 page (or the
router redirects to the dashboard).

**Acceptance Scenarios**:

1. **Given** an administrator is on the admin shell, **When**
   they look at the sidenav, **Then** there is no "Clients"
   entry (the entries that remain are: Dashboard, Content, Ads,
   Iframe domains, Display configuration, Setup check, Remote
   control, Users and roles, API keys).
2. **Given** an administrator is on the admin shell, **When**
   they look at the dashboard quick actions, **Then** there is
   no "Add client" quick action.
3. **Given** an administrator navigates to `/admin/clients`,
   **When** the route resolves, **Then** the response is a
   404 / not-found page (or a redirect to the dashboard).
4. **Given** an external client issues
   `GET /api/clients`, **When** the request resolves,
   **Then** the response is 404 (the endpoint is removed).

---

### User Story 2 - Ad Form Uses a Free-Form Advertiser Field (Priority: P1)

An administrator who opens the ad creation or edit form no
longer sees a "Client" picker. The form shows a free-form
"Advertiser" text field (optional, max 120 chars). The
backend `AdItemRequest` schema gains an `advertiser` field
(an optional string) and loses the `clientId` field. The
`ClientAdItem` SQLAlchemy model gains an `advertiser` column
and loses the `client_id` FK.

**Why this priority**: The "Client" picker is the second
visible consequence of the spec. Replacing it with a free-form
text field keeps the contextual information ("which advertiser
does this ad belong to") while removing the join to a now-gone
table.

**Independent Test**: Sign in as an administrator, open the ad
creation form, confirm there is no client picker, enter an
advertiser name, save, and confirm the ad is persisted. Reopen
the form for the same ad and confirm the advertiser value is
pre-populated. Open the list and confirm the ad has the
advertiser in the "Advertiser" column.

**Acceptance Scenarios**:

1. **Given** an administrator is on `/admin/ads/new`, **When**
   the form renders, **Then** there is no "Client" picker.
   The form has: advertiser (text), source reference, media
   file, active, display order (hidden on create), and
   rotation overrides.
2. **Given** an administrator creates an ad with
   `advertiser = "ACME Corp"`, **When** the request resolves,
   **Then** the ad is saved and the response includes
   `advertiser = "ACME Corp"`.
3. **Given** an administrator edits an existing ad, **When**
   the form renders, **Then** the "Advertiser" field is
   pre-populated with the current value (or empty if the row
   had no value).
4. **Given** an administrator creates an ad without an
   `advertiser`, **When** the request resolves, **Then** the
   ad is saved with `advertiser = null` and the list shows a
   dash in the "Advertiser" column.
5. **Given** the API exposes the change, **When** the spec is
   validated by an OpenAPI client, **Then** the
   `AdItemRequest` schema has an `advertiser` field
   (`string | null`, max 120) and does NOT have a
   `clientId` field.

---

### User Story 3 - List and Bootstrap Reflect the New Shape (Priority: P2)

An administrator who opens the ads list sees a new "Advertiser"
column. The bootstrap data seeds at least one ad with
`advertiser = "Sample Client"` (the previous sample name) so
the column has a non-empty value out of the box. The
`AdItemSchema` returned by the API includes `advertiser` and
no longer includes the embedded `clientId` (or, if a
`clientId` field is kept for backward compatibility on the
wire, it is always `null` and the docs flag it as deprecated).

**Why this priority**: The list and the bootstrap are the
operational surfaces that the operator sees. Updating them
ensures the spec is observable end-to-end, not just on the
form.

**Independent Test**: Sign in as an administrator, open the ads
list, and confirm the table has an "Advertiser" column with
the value from the form. Run a fresh database bootstrap and
confirm the seeded ad has `advertiser = "Sample Client"`.

**Acceptance Scenarios**:

1. **Given** an administrator is on `/admin/ads`, **When** the
   list renders, **Then** the table has an "Advertiser"
   column. Each row shows the value (or a dash if null).
2. **Given** the bootstrap data is seeded, **When** the
   administrator opens the ads list, **Then** at least one row
   has `advertiser = "Sample Client"`.
3. **Given** the API returns an ad, **When** the response is
   inspected, **Then** the body has an `advertiser` field
   (string | null) and no longer has a `clientId` field (or,
   if `clientId` is kept for backward compatibility, it is
   always `null` and is flagged as deprecated in the OpenAPI
   schema).

---

### Edge Cases

- An ad row that previously had a `client_id` referencing a
  client whose name is now dropped is migrated with
  `advertiser = NULL` (no lookup fallback) on a fresh
  database. The migration runs the lookup only when both
  tables exist; the new `advertiser` column is added
  regardless.
- The migration is irreversible in the strict sense: dropping
  the `clients` table deletes the data. A downgrade that
  recreates the table from the new `advertiser` column on
  `client_ad_items` is provided for test environments; it
  re-creates one row per distinct advertiser with
  `is_active = true`.
- The `DELETE /api/clients/{id}` and `PUT /api/clients/{id}`
  endpoints are removed; any client that still calls them
  receives a 404. The spec does not add a 410 (Gone) response.
- An OpenAPI client that depends on the `clientId` field in
  the ad schema continues to compile if the field is
  deprecated rather than removed. The spec keeps the field on
  the wire for one release and flags it as deprecated; the
  frontend does not read the field.
- The `Advertiser` field is bounded to 120 characters (same
  max as the existing `Client.name` column it replaces). A
  longer value is rejected with the existing Pydantic 422
  error envelope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `Client` SQLAlchemy model MUST be removed
  from `backend/app/repositories/models/client.py`. The file
  may be deleted or emptied; the `models/__init__.py` re-export
  MUST be removed.
- **FR-002**: The `clients` table MUST be dropped by an Alembic
  migration. The `client_id` column on `client_ad_items` MUST
  be dropped in the same migration. The new `advertiser`
  column (`String(120)`, nullable) MUST be added to
  `client_ad_items` in the same migration. The pre-existing
  `client_id` data MUST be backfilled into `advertiser` (one
  row per distinct client name) before the column is dropped.
- **FR-003**: The `AdItemRequest` schema MUST have an
  `advertiser` field (`string | null`, max 120 chars,
  optional) and MUST NOT have a `clientId` field. The
  `AdItemSchema` MUST have an `advertiser` field
  (`string | null`) and SHOULD have `clientId` either removed
  or flagged as deprecated (always `null`).
- **FR-004**: The `AdsService` MUST accept and return the
  `advertiser` field on create and update. The
  `create_client`, `update_client`, `delete_client`, and
  `list_clients` methods MUST be removed. The
  `has_active_ads` check (used to block client deletion) MUST
  be removed (the table is gone, so the check is moot).
- **FR-005**: The backend MUST remove the
  `GET /api/clients`, `GET /api/clients/{id}`,
  `POST /api/clients`, `PUT /api/clients/{id}`, and
  `DELETE /api/clients/{id}` routes. The OpenAPI document
  MUST reflect the removal.
- **FR-006**: The `AdminNavigationService.items` list MUST NOT
  include a "Clients" entry. The
  `AdminNavigationService.quickActions` list MUST NOT include
  an "Add client" quick action. The
  `iconFor(route)` switch in `AdminShellComponent` MUST drop
  the `'/admin/clients'` case.
- **FR-007**: The admin router MUST NOT include the
  `/admin/clients` route (or any nested route). A direct
  navigation to `/admin/clients` MUST resolve to a 404 page
  (the default Angular router behavior when no route matches).
- **FR-008**: The frontend ad form (`ad-form.component.ts`)
  MUST replace the client picker with a free-form text input
  labeled "Advertiser". The input MUST be optional (no
  required validator). The ad list (`ad-list.component.ts`)
  MUST add an "Advertiser" column showing the value or a
  dash.
- **FR-009**: The frontend `ads.api.ts` MUST add
  `advertiser: string | null` to the `AdItem` interface and
  MUST remove (or deprecate) the `clientId` field. The
  `ClientsApiService` and any `clients.facade.ts` / list /
  form files MUST be removed from the codebase.
- **FR-010**: The bootstrap service MUST seed at least one ad
  with `advertiser = "Sample Client"` so the operator sees
  the new column populated on a fresh database.

### Traceability & Quality Requirements *(mandatory)*

- **TQ-001**: Each functional requirement MUST map to at least
  one user story and one measurable success criterion.
- **TQ-002**: Changed behavior MUST have a testable validation
  method described in this specification or deferred to the
  implementation plan.
- **TQ-003**: Public, integration, data, and user-interface
  boundaries MUST list expected contracts or explicitly state
  that no boundary is introduced.
- **TQ-004**: Security, observability, and accessibility
  considerations MUST be captured as requirements,
  assumptions, or out-of-scope decisions.
- **TQ-005**: Speculative or future-scope behavior MUST be
  listed as out of scope rather than implemented implicitly.

### Key Entities *(include if feature involves data)*

- **Client (removed)**: The existing SQLAlchemy model at
  `backend/app/repositories/models/client.py` is deleted. No
  rows in the `clients` table survive the migration.
- **ClientAdItem (modified)**: The existing SQLAlchemy model
  at `backend/app/repositories/models/ad.py` gains an
  `advertiser: str | None` column and loses the
  `client_id: str` FK. The table is renamed in this spec to
  `ad_items` (the new model is `AdItem`); the
  `client_ad_items` name is kept on the wire for one release
  to avoid breaking the migration history.
- **AdItem (new)**: The new model name. The repository is
  `AdRepository`. The existing `AdRepository` class is renamed
  to use the new entity name on the SQLAlchemy side, while
  the table name stays `client_ad_items` for now.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After the spec, the sidenav has zero "Clients"
  entries. A `grep -r "admin/clients" frontend/src` returns
  zero hits in the active navigation code.
- **SC-002**: After the spec, the `Client` model and the
  `clients` table are gone. A
  `grep -r "from app.repositories.models.client" backend/`
  returns zero hits in the active code.
- **SC-003**: After the spec, the ad form has a free-form
  "Advertiser" input (max 120 chars) and no client picker. A
  `grep -r "clientId" frontend/src/app/features/ads/` returns
  zero hits in the active form code.
- **SC-004**: After the spec, the ad list has an "Advertiser"
  column. The bootstrap seeds at least one ad with
  `advertiser = "Sample Client"`. A fresh
  `alembic upgrade head` on an empty database, followed by
  `ensure_mvp_bootstrap_data(...)`, produces a row with
  `advertiser = "Sample Client"`.
- **SC-005**: 100% of existing tests pass after the spec
  (after the spec, the previous tests that referenced the
  Client entity are removed; the new tests cover the new
  shape). The `pytest backend/tests` and
  `npm --prefix frontend run test` runs pass without
  modification outside the spec's own files.

## Assumptions

- The "Client" concept was a thin wrapper around the
  `name` + `is_active` fields on the ad. The free-form
  `advertiser` text replaces it. There is no need to keep the
  "active advertiser" notion (the existing ad already has an
  `is_active` field).
- The `clients` table is dropped in the same migration that
  drops the `client_id` FK on `client_ad_items` and adds the
  `advertiser` column. The migration backfills the
  `advertiser` column with the corresponding client name
  before dropping the FK.
- The `client_id` field is deprecated on the wire rather than
  removed. The field is always `null` after the spec; the
  OpenAPI schema flags it as deprecated. The frontend does
  not read the field. A follow-up spec can remove the field
  from the wire in a later release.
- The `ClientRequest` and `ClientSchema` Pydantic classes are
  removed. Any consumer that still imports them at runtime
  fails fast (loud break) which is the desired behavior for
  a breaking change.
- The `AuditEvent.event_type` does not introduce a new event
  type for "client changed". Existing `client_changed` events
  (if any exist in the audit log) are preserved; no new
  `client_changed` events are created after the spec.
- The spec does not change the kiosk display, the remote
  control, the API key feature, or any other capability.
- The spec is part of the big-bang release
  `010-admin-cleanup-and-polish`. It does not introduce a new
  spec-kit branch; it ships with the rest of the bundle.

## Out of Scope

- Soft delete of clients (no soft-delete column is added; the
  table is hard-dropped).
- Restoring the client entity in a later release. The spec is
  a one-way migration.
- Renaming the table `client_ad_items` to `ad_items` in this
  release. The table is renamed in a follow-up spec; this
  spec only changes the column shape.
- A new "advertiser" entity (a separate table with its own
  CRUD endpoints). The spec uses a free-form text field on
  the ad; the advertiser is denormalized.
- Reporting or analytics on advertisers. The text field is
  searchable in the ad list (free-text filter) but there is
  no separate advertiser summary view.
- Changing the existing `AdItemRequest` / `AdItemSchema` field
  names other than removing the `clientId` / `client_id`
  field and adding the `advertiser` field. Other field names
  are unchanged.
- Migrating the audit trail. Existing `client_changed` events
  in `display_events` are kept as-is; the spec does not
  rewrite them to a new event type.
- Multi-tenant ownership. The kiosk is single-tenant per
  organization; the spec does not introduce a per-organization
  advertiser entity.

## Superseded by

- No direct behavioral supersession. The hard-delete of `clients`
  and the `advertiser` free-text column are still authoritative.

Amendment chain authored from this spec:
- `supersedes-003.md` (in this directory)
