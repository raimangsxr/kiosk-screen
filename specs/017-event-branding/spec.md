---
capability: C7-event-branding
supersedes:
superseded_by:
status: in-progress
oversize: false
---

# Feature Specification: Event Branding and Ads Section Title

> Superseded by: 018-content-rotation-modes (US2 — branding overlay hidden in iframe mode). See `specs/018-content-rotation-modes/supersedes-017.md`.

**Feature Branch**: `017-event-branding`
**Spec Directory**: `specs/017-event-branding/`
**Created**: 2026-06-20
**Status**: Draft
**Input**: User request: "Quiero que la parte de Ads tenga un título bien integrado y que no moleste que ponga 'Patrocinadores del evento'. También en la parte Top Content quiero poner el logo del organizador, el nombre del organizador y el nombre del evento también bien integrado y sin que moleste. Para ello va a ser necesario en el panel de administrador añadir un nuevo módulo con la configuración del evento (puedes mover ahí también la duración del evento), que debe dar la capacidad para subir un logo del organizador, poner el nombre del organizador y el nombre del evento."

## Clarifications

### Session 2026-06-20

- Q1: Where is the event configuration stored? → A: A new dedicated `event_configurations` table. The current `configured_event_duration_minutes` column is migrated from `kiosk_display_configurations` to the new table; the old column and its check constraint are removed.
- Q2: Is the ads section title configurable from admin? → A: No. The title is the fixed string "Patrocinadores del evento", rendered as a visible integrated label inside the gold ads band. The `aria-label` of the band becomes the same string.
- Q3: Where is the organizer/event branding shown on the Top Content region? → A: As a small overlay in the top-left corner of the top region, sitting above the media. It contains (in order) the organizer logo, the organizer name, a separator dot, and the event name. The 4fr/1fr grid is not changed.
- Q4: Which image formats and sizes are allowed for the organizer logo? → A: PNG, JPG, WebP and SVG. Maximum file size 1 MB (aligned with the existing image upload limit). The same content-type and size validation used for content/ad uploads is reused.
- Q5: What is shown when the admin has not yet configured the event? → A: Nothing. When `eventName`, `organizerName`, and `organizerLogoUrl` are all empty/missing, neither the branding overlay nor the ads section title chrome is shown on the kiosk (the ads images themselves still rotate as before).
- Q6: Who can edit event configuration? → A: Roles `administrator`, `content_manager`, and `advertising_manager` (same set as the existing display configuration form).
- Q7: Does the move of event duration break any existing behaviour? → A: No. The kiosk and the display open flow still use the duration value; only the storage location changes. A database migration backfills the value to the new column for every existing organization, then drops the old column.
- Q8: Is the logo upload a separate endpoint or inline with the event configuration save? → A: Inline. `PUT /api/event-configuration` accepts a multipart body with an optional `file` field; if present, it replaces the current logo atomically with the rest of the configuration fields. No separate `POST`/`DELETE` logo endpoints are introduced. This eliminates orphan files (no file is ever stored without its owning event configuration row) and matches the existing inline-upload pattern used by `POST /api/content/upload`.
- Q9: Should saving the event configuration emit an audit event? → A: Yes. Each successful `PUT /api/event-configuration` MUST emit a `event_configuration_changed` audit event carrying `eventConfigurationId`, `changedFields` (a list of changed field names: `eventName`, `organizerName`, `organizerLogoMediaId`, `eventDurationMinutes`), `previousLogoMediaId` (if the logo was replaced or removed), `newLogoMediaId` (if a new logo was uploaded), and the `userId` of the actor. The event is visible in the existing admin events listing alongside `configuration_changed` and `remote_control_iframe_deleted`. The logo binary is never included in the event payload.
- Q10: How does the kiosk learn that the branding changed? → A: On every poll of `GET /api/display/state`, the kiosk issues a parallel `GET /api/event-branding` request (sharing the same configured poll interval, default 3s, max 60s). Both responses are merged into the kiosk's local cache; the branding component of the cache is replaced on every successful branding fetch and an empty-fields response clears the overlay. No dedicated branding-only polling channel is introduced, and no push channel is added. The existing `DisplayControlSyncService` is not relied on for this update because its BroadcastChannel/localStorage mechanism is browser-local and does not cross machines (admin and kiosk run in different browsers in production).
- Q11: How does `PUT /api/event-configuration` respond when both `file` and `removeLogo=true` are sent in the same request? → A: Reject as HTTP 400 with a clear error message (e.g. `"Contradictory fields: 'file' and 'removeLogo' must not both be set."`). No partial change is persisted: the configuration row is left as-is, and no file is written to disk. The contract is that the client must send exactly one intent per PUT.
- Q12: Does the migration `0011_event_branding` need to be idempotent? → A: Yes. Every step (create table, add columns, add constraints, backfill rows, drop column, drop constraint) MUST be guarded by `_table_exists` / `_column_exists` / `_constraint_exists` checks (and `INSERT ... ON CONFLICT DO NOTHING` for the backfill) following the same pattern as `0010_remote_control_fullscreen.py` and `0008_preconfigured_iframes_and_video_end.py`. Re-running `alembic upgrade head` MUST NOT raise and MUST NOT duplicate rows, columns, or constraints.
- Q13: How does the kiosk behave when `GET /api/event-branding` fails (5xx, timeout, network error) while `GET /api/display/state` succeeds? → A: Stale-while-error. The kiosk keeps the last successfully fetched branding payload cached and continues to render the overlay with those values. The display state is processed normally and independently. If the kiosk has never received a successful branding response (first poll fails), the overlay is simply not rendered (no error chrome is shown). When `event-branding` starts succeeding again, the cache is replaced atomically with the new payload. The "Patrocinadores del evento" label on the ads region is unaffected because it is a static template string, not data from the branding endpoint.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure event branding from admin (Priority: P1)

An administrator opens the new "Event configuration" section in the admin site and sets the organizer name, event name, event duration in minutes, and uploads an organizer logo. After saving, the kiosk reflects the changes within one state poll or, for first-time load, on the next kiosk page refresh.

**Why this priority**: This is the foundational input for the rest of the feature. Without persisted organizer/event branding, the kiosk has nothing to show.

**Independent Test**: Sign in as `administrator`. Navigate to `/admin/event`. Set organizer name to "ACME Events", event name to "Spring Summit 2026", upload a 320×120 PNG logo. Set duration to 180 minutes. Save. Reload the page; the values are persisted. Switch to a `content_manager` or `advertising_manager`; the same form is visible and writable. With a `display_viewer` or `event_operator` account, the form is not visible and the API responds with 403.

**Acceptance Scenarios**:
1. **Given** an authenticated `administrator` on `/admin/event`, **When** they fill in organizer name, event name, duration, and upload a logo and click Save, **Then** the form reports success and the new values are visible on the kiosk top region overlay within one poll or on the next kiosk page reload.
2. **Given** the form is dirty, **When** the user navigates away, **Then** the existing `dirtyFormGuard` prompts them to discard or keep editing.
3. **Given** an authenticated `content_manager` or `advertising_manager`, **When** they open `/admin/event`, **Then** the form is visible and writable.
4. **Given** a `display_viewer` or `event_operator` role, **When** they navigate to `/admin/event`, **Then** the page is not accessible and the API returns 403.
5. **Given** an attempt to save an empty event name or organizer name, **When** the form is submitted, **Then** the empty value is accepted (both fields are optional) and the kiosk simply omits the missing piece of the overlay.

---

### User Story 2 - Branding overlay on the Top Content region (Priority: P1)

The kiosk's top region shows a small, non-intrusive overlay in the top-left corner containing (when configured) the organizer logo, organizer name, and event name. The overlay sits above the rotating media, does not block controls, and disappears entirely when no branding is configured.

**Why this priority**: This is the user-visible value of the feature on the kiosk. Without it, the new admin module has no purpose.

**Independent Test**: With a logo, organizer name, and event name configured in `/admin/event`, open the kiosk on `/display`. The top region shows the media and, in the top-left corner, a compact badge with the logo, organizer name and event name. Remove all three values from `/admin/event` and reload the kiosk. The overlay is gone; the top region shows only the rotating media.

**Acceptance Scenarios**:
1. **Given** all three values (logo, organizer name, event name) are configured, **When** the kiosk renders the top region, **Then** the overlay is visible with the three pieces in order: logo, organizer name, event name.
2. **Given** only the organizer name is configured, **When** the kiosk renders the top region, **Then** the overlay shows only the organizer name (no logo, no event name, no separator).
3. **Given** only the logo is configured, **When** the kiosk renders the top region, **Then** the overlay shows only the logo.
4. **Given** no values are configured, **When** the kiosk renders the top region, **Then** the overlay is not present in the DOM.
5. **Given** the kiosk is in iframe mode, **When** the iframe is on screen, **Then** ~~the overlay is still rendered (operator still sees who is running the show)~~ **OBSOLETE — superseded by `018-content-rotation-modes` US2 (FR-006).** The overlay is now hidden when `contentMode === 'iframe'`. See `specs/018-content-rotation-modes/spec.md` for the new rule.
6. **Given** the kiosk is in fullscreen mode, **When** the overlay is rendered, **Then** the overlay is fully visible inside the fullscreen viewport and does not block the "Enter fullscreen" button.
7. **Given** a viewer using a screen reader, **When** the kiosk renders the overlay, **Then** the overlay has `aria-label="Organizer and event branding"` and the logo has empty `alt` (decorative).

---

### User Story 3 - "Patrocinadores del evento" title on the Ads region (Priority: P1)

The kiosk's bottom ads region displays the fixed visible title "Patrocinadores del evento" as an integrated label inside the existing gold band, alongside the rotating ad images. The label does not push the ad images out of view and does not change the band height.

**Why this priority**: This is the second user-visible value of the feature, and the explicit motivation provided by the operator.

**Independent Test**: With ads configured, open the kiosk on `/display`. The ads band shows the rotating ads and the label "Patrocinadores del evento" inside the band, on the left edge, in the same gold band styling. Hide ads via remote control. With `adsVisible=false`, the label is not shown (the entire ads band is not rendered). Show ads again; the label reappears with the ads.

**Acceptance Scenarios**:
1. **Given** ads are visible on the kiosk, **When** the kiosk renders the ads region, **Then** the label "Patrocinadores del evento" is visible inside the band, integrated visually (same band, no extra height).
2. **Given** ads are visible and a screen reader user inspects the kiosk, **When** the screen reader reads the ads region, **Then** the region is announced as "Patrocinadores del evento" (single `aria-label`, no "Client ads" leftover).
3. **Given** ads are hidden via remote control, **When** the kiosk renders, **Then** neither the ads nor the label are present.
4. **Given** no ads are configured, **When** the kiosk renders the ads region, **Then** the existing "Ads unavailable" fallback is shown and the label is still rendered above/inside the band (so the operator understands the section exists).

---

### User Story 4 - Move event duration from display configuration to event configuration (Priority: P1)

The "Event duration (minutes)" field is removed from the display configuration form and reappears on the new event configuration form, backed by the same business meaning (the maximum length of an operator display session). The existing kiosk behaviour — `open_display` uses this value to compute `OperatorSession.valid_until` — is unchanged.

**Why this priority**: Without this move, the new event module would be incomplete and the operator would have to set the duration in two different places. The move is also the explicit ask of the feature.

**Independent Test**: With a kiosk configuration that has `configuredEventDurationMinutes=120`, run the migration. After migration, `event_configurations.event_duration_minutes=120` for that organization, and `kiosk_display_configurations` no longer has that column. Open a display session via `POST /api/display/open`; the resulting session `valid_until` is now + 120 minutes. In `/admin/event`, the duration field shows 120 and is editable; saving 180 changes the next session duration to + 180 minutes.

**Acceptance Scenarios**:
1. **Given** an existing configuration with `configuredEventDurationMinutes=120`, **When** the migration runs, **Then** `event_configurations.event_duration_minutes=120` for the same organization and the old column is gone.
2. **Given** a kiosk display is opened, **When** the server computes `OperatorSession.valid_until`, **Then** it uses `event_configurations.event_duration_minutes`, not the (now-removed) old column.
3. **Given** an organization with no event configuration row yet, **When** the migration runs, **Then** a row is created with `event_duration_minutes=240` and empty organizer/event/logo fields.
4. **Given** the display configuration form, **When** the administrator opens it, **Then** the "Event duration (minutes)" field is not present.
5. **Given** an attempt to PUT the display configuration with `configuredEventDurationMinutes`, **When** the API processes the request, **Then** the request is accepted (no 400) but the field is ignored; only the display-related fields are persisted.
6. **Given** an attempt to set `event_duration_minutes <= 0` or > 1440, **When** the API processes the request, **Then** the request is rejected with HTTP 400 and a clear validation message.

---

### User Story 5 - Dashboard reflects event configuration status (Priority: P2)

The admin dashboard gains a new "Event" card that summarises the current event configuration status (event name configured, duration configured, logo uploaded) and links to `/admin/event`.

**Why this priority**: This is a navigation quality-of-life improvement, not the core feature.

**Independent Test**: With the event module loaded, the dashboard shows an "Event" card. With no event name configured, the card shows "Not set" and a warning status. After configuring an event name, the card shows the configured event name and a ready status.

**Acceptance Scenarios**:
1. **Given** an event configuration with `eventName="Spring Summit 2026"` and `eventDurationMinutes=180`, **When** the dashboard loads, **Then** the Event card shows the configured values and a `ready` status.
2. **Given** an empty event configuration, **When** the dashboard loads, **Then** the Event card shows "Not set" and a `warning` status.

---

### User Story 6 - Logo upload respects allowed formats and size (Priority: P2)

The event configuration form's logo upload accepts PNG, JPG, WebP, and SVG files up to 1 MB and rejects other formats or oversized files with a clear, non-blocking error message.

**Why this priority**: This prevents the operator from uploading broken or oversized files that would either fail later or hurt kiosk performance.

**Independent Test**: Try to upload a 2 MB PNG — the form rejects it with "File too large (max 1 MB)." Try to upload a BMP — rejected with "Unsupported file type. Allowed: PNG, JPG, WebP, SVG." Upload a 200 KB PNG — accepted and shown in the preview.

**Acceptance Scenarios**:
1. **Given** a 1.5 MB PNG, **When** the administrator selects it for upload, **Then** the form rejects the file with "File too large (max 1 MB)" and the previously stored logo (if any) remains intact.
2. **Given** a `.bmp` file, **When** the administrator selects it, **Then** the form rejects the file with "Unsupported file type. Allowed: PNG, JPG, WebP, SVG."
3. **Given** a valid 200 KB PNG, **When** the administrator selects it and saves the form, **Then** the new logo is persisted and visible on the kiosk on the next poll.
4. **Given** a logo is currently stored, **When** the administrator clicks "Remove logo" and saves, **Then** the logo is deleted from storage, the event configuration row's logo reference is cleared, and the kiosk overlay shows only the text fields (or nothing, if those are also empty).

### Edge Cases

- **No event configuration row yet for an organization**: a row is created at migration time with safe defaults; the kiosk overlay is empty until the admin configures the event.
- **Logo file referenced by event configuration is deleted out-of-band**: the kiosk's `mediaUrl` returns 404; the overlay hides the broken `<img>` and renders the text fields only (graceful degradation, no crash).
- **`/api/event-branding` fails on the kiosk while the display-state poll succeeds**: per FR-015a and Q13, the kiosk keeps the last good branding cache; no error chrome is shown; the display state is processed independently.
- **Two admins edit the event configuration concurrently**: last valid write wins; no specific optimistic-locking requirement in this version.
- **Logo upload that succeeds at the API but fails mid-write on disk**: the existing media-storage rollback deletes the partial file and the event configuration is not modified; the form shows the storage error.
- **Admin uploads a logo, then navigates away without saving**: not possible with inline upload (Q8). The file is uploaded only as part of the same PUT that persists the configuration; if the form is dirty but never saved, no file ever reaches the server.
- **Migration rerun**: `alembic upgrade head` is idempotent (FR-011a); rerunning on a database that already has the migration applied is a no-op.
- **Display open with no event configuration row**: cannot happen after migration (row is always present). If somehow it does, the API responds with HTTP 400 "Event configuration not found".
- **Operator deletes the event configuration while a kiosk display is open**: out of scope. The display session's `valid_until` was computed at open time; live re-validation of event duration is not in scope.
- **Admin sends a PUT with both `file` and `removeLogo=true`**: rejected as 400 (FR-010a); no partial state is written.

## Requirements *(mandatory)*

### Functional Requirements

#### Event configuration module

- **FR-001**: System MUST provide an admin section at `/admin/event` to manage event configuration, accessible to roles `administrator`, `content_manager`, and `advertising_manager`.
- **FR-002**: The event configuration MUST be stored in a dedicated `event_configurations` table, one row per organization, identified by `organizationId` (unique).
- **FR-003**: The event configuration MUST persist: `eventName` (string, ≤ 255 chars, optional), `organizerName` (string, ≤ 255 chars, optional), `organizerLogoMediaId` (FK to `media_file_references.id`, nullable, ON DELETE SET NULL), `eventDurationMinutes` (integer, > 0, ≤ 1440), and standard audit fields.
- **FR-004**: System MUST expose `GET /api/event-configuration` and `PUT /api/event-configuration` endpoints under the same role set as FR-001.
- **FR-005**: System MUST expose a public, unauthenticated `GET /api/event-branding` endpoint that returns `eventName`, `organizerName`, and `organizerLogoUrl` (or empty values) for kiosk consumption. In the current single-organization deployment model, the endpoint resolves the active bootstrap organization; if multiple organizations exist, it uses the same default organization resolution as the public display endpoints.
- **FR-006**: When `GET /api/event-branding` is called and the resolved organization has no event configuration row, the endpoint MUST return HTTP 200 with all three fields empty (never 404) and create the missing row with safe defaults.

#### Logo upload and management

- **FR-007**: The `PUT /api/event-configuration` endpoint MUST accept a multipart request body. When the body includes a `file` field, the server MUST validate the file's content type (`image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`) and size (≤ 1 MB). A file failing validation MUST cause the entire PUT to return HTTP 400 with a clear error message; no partial configuration change is persisted and no file is left on disk.
- **FR-008**: When `PUT /api/event-configuration` is called with a valid `file` and no `removeLogo` field, the server MUST atomically replace the existing logo (if any): create a new `MediaFileReference` with `media_type='logo'`, bind it to the event configuration row, and delete the previous `MediaFileReference` if and only if no other row references it (reuse the existing reference-count logic).
- **FR-009**: When `PUT /api/event-configuration` is called without a `file` and without `removeLogo`, the existing logo MUST be left untouched.
- **FR-010**: The admin UI MUST allow the operator to clear the current logo by sending an explicit `removeLogo=true` field in the multipart body (alongside the other configuration fields and no `file`). The server MUST then detach the logo, delete the underlying `MediaFileReference` if unreferenced, and persist the row with `organizerLogoMediaId=null`.
- **FR-010a**: When `PUT /api/event-configuration` is called with both `file` and `removeLogo=true` (in any value), the server MUST reject the request with HTTP 400 and a clear error message. The event configuration row MUST be left unchanged and no file MUST be written to disk. This is a guard against ambiguous intent; clients must express exactly one of "replace" or "clear" per PUT.

#### Move of event duration

- **FR-011**: A database migration MUST create the `event_configurations` table, backfill `event_duration_minutes` from `kiosk_display_configurations.configured_event_duration_minutes` for every existing organization, and drop the old column and its check constraint `ck_kiosk_event_duration_positive`.
- **FR-011a**: Every step of the migration MUST be guarded by `_table_exists` / `_column_exists` / `_constraint_exists` checks (and `INSERT ... ON CONFLICT DO NOTHING` for the backfill) so that `alembic upgrade head` is idempotent: re-running the migration MUST NOT raise and MUST NOT duplicate rows, columns, or constraints. This follows the existing pattern in `0010_remote_control_fullscreen.py` and `0008_preconfigured_iframes_and_video_end.py`.
- **FR-012**: For any organization that has a `kiosk_display_configurations` row but no `event_configurations` row after backfill, the migration MUST create an `event_configurations` row with safe defaults (`event_duration_minutes` from the source row, empty organizer and event fields).
- **FR-013**: After migration, the `kiosk_display_configurations` table MUST NOT contain an `event_duration_minutes` (or similarly named) column. The display configuration form MUST NOT show an "Event duration" field.
- **FR-014**: After migration, `display_service.open_display`, `readiness_service`, and any other consumer of event duration MUST read the value from `event_configurations.event_duration_minutes`.

#### Kiosk rendering

- **FR-015**: The kiosk MUST call `GET /api/event-branding` once on page load and then once per `GET /api/display/state` poll (sharing the same configured poll interval). Both fetches are issued in parallel on each poll cycle. The branding response is stored in a per-session cache that is replaced atomically on each successful response; an empty-fields response clears the overlay (see FR-017).
- **FR-015a**: When `GET /api/event-branding` fails (HTTP 5xx, timeout, or network error), the kiosk MUST keep the last successfully fetched branding payload in the cache and continue to render the overlay with that payload. The display-state poll MUST be processed independently. If no branding response has ever succeeded in the current kiosk session, the overlay is simply not rendered. A recovered endpoint MUST replace the cache atomically on the next successful response. The kiosk MUST NOT surface a "Branding unavailable" error chrome in the UI for this failure class.
- **FR-016**: When the cached branding has a non-empty `eventName`, `organizerName`, or `organizerLogoUrl`, the kiosk MUST render the overlay in the top-left corner of the top region containing the configured pieces in this order: logo (if any), organizer name (if any), separator dot (only when at least two of the three are present), event name (if any).
- **FR-017**: When all three branding values are empty, the kiosk MUST NOT render the overlay element in the DOM.
- **FR-018**: The overlay MUST have `aria-label="Organizer and event branding"`, `pointer-events: none`, and a `z-index` below the kiosk's fullscreen prompt button.
- **FR-019**: The ads region MUST render the visible label "Patrocinadores del evento" as the first element inside the existing gold band, with the existing band height unchanged.
- **FR-020**: The ads region MUST have `aria-label="Patrocinadores del evento"` (replacing the previous "Client ads").
- **FR-021**: When ads are hidden via remote control (`adsVisible=false`), the ads region (and therefore the label) MUST NOT be rendered.

#### Dashboard

- **FR-022**: The admin dashboard MUST include an "Event" card summarising the current event configuration: `eventName` (or "Not set"), status `ready` if `eventName` is set, otherwise `warning`. The card MUST link to `/admin/event`.

#### Authorisation

- **FR-023**: All `event-configuration` admin endpoints MUST require the `administrator`, `content_manager`, or `advertising_manager` role. Other authenticated roles MUST receive HTTP 403. The public `event-branding` endpoint has no role requirement.
- **FR-024**: PUT requests to the existing display configuration endpoint that include a legacy `configuredEventDurationMinutes` field MUST be accepted but the field MUST be ignored. New PUT requests from the admin UI MUST NOT include the field, and the new multipart `PUT /api/event-configuration` does not define that field.

#### Observability

- **FR-025**: Every successful `PUT /api/event-configuration` MUST emit an audit event of type `event_configuration_changed` (severity `info`) with the payload described in Q9. Failed PUTs (validation or storage errors) MUST NOT emit the event. The event MUST be returned by the existing admin events listing endpoint without code changes there.
- **FR-026**: The audit event MUST NOT include the logo binary. The logo fields in the payload are media IDs only.

### Requirement-to-Criterion Traceability

Per TQ-001, every FR maps to at least one user story and one SC. Sub-FRs (FR-010a, FR-011a, FR-015a) and access-control/security FRs without a dedicated SC are covered by their parent acceptance scenarios or by tests explicitly listed in `tasks.md`. The mapping is:

| FR | Primary SC | Additional coverage |
|---|---|---|
| FR-001 | SC-001 | US1 acceptance scenarios 1, 3, 4 |
| FR-002 | SC-004 | — |
| FR-003 | SC-001 | US1 acceptance scenario 5 (empty fields accepted) |
| FR-004 | SC-005 | T021 contract test |
| FR-005 | SC-005 | T032 implementation |
| FR-006 | SC-005 | T011 `get_or_create` service test |
| FR-007 | SC-006 | T018 service test, T048 Karma test, T049 integration test |
| FR-008 | SC-006 | T018 service test (atomic replace with reference-count decrement) |
| FR-009 | SC-001 | T018 service test (no logo → no-op) |
| FR-010 | SC-007 | T018 service test (clear logo + decrement ref count) |
| **FR-010a** | (covered by T018 + T020 contract test) | US1 acceptance scenario: ambiguous PUT returns 400 |
| FR-011 | SC-004 | — |
| **FR-011a** | **SC-004a** | T016 migration idempotency test |
| FR-012 | SC-004 | T017 data-preservation test |
| FR-013 | (covered by T040 + T042 + display-config spec) | US4 acceptance scenario 4 |
| FR-014 | SC-004 | T039 display-open integration test |
| FR-015 | SC-001 | — |
| **FR-015a** | **SC-001a** | T030 stale-while-error Karma test |
| FR-016 | SC-001 | T029 overlay DOM test, T031 iframe-mode test |
| FR-017 | SC-002 | T029 empty-overlay test |
| FR-018 | (covered by T029 + T031 + T034 + T035) | US2 acceptance scenario 7 (screen reader) |
| FR-019 | SC-003 | T036 ads-label test |
| FR-020 | SC-003 | T036 aria-label assertion |
| FR-021 | SC-003 | T036 ads-hidden test |
| FR-022 | SC-001 | T045 dashboard spec |
| FR-023 | SC-005 | T020/T021 RBAC assertions, T028 Karma spec |
| FR-024 | (covered by T041 + T042 + T043 + T044) | US4 acceptance scenario 5 |
| FR-025 | SC-008 | T022 audit-emission integration test |
| FR-026 | SC-008 | T022 payload assertion (no binary) |

Sub-FRs (bolded) without a one-to-one SC are covered by parent acceptance scenarios and the test tasks called out above; the implementation plan in `tasks.md` enforces this explicitly.

### Traceability & Quality Requirements *(mandatory)*

- **TQ-001**: Each functional requirement MUST map to at least one user story and one measurable success criterion in this specification.
- **TQ-002**: Each changed behaviour MUST have a testable validation method (unit, integration, or documented manual smoke) called out in the implementation plan.
- **TQ-003**: Public, integration, and data boundaries (admin API, public kiosk API, file storage, role checks) MUST list expected contracts or explicitly state that no boundary is introduced.
- **TQ-004**: Security and accessibility considerations MUST be captured as requirements or assumptions (server-side MIME and size validation for FR-007/FR-008; `aria-label` and decorative `alt` for FR-018 and FR-020; audit-event emission for FR-025/FR-026; ambiguous-intent rejection in FR-010a; idempotent migration per FR-011a).
- **TQ-005**: Speculative or future-scope behaviour MUST be listed as out of scope rather than implemented implicitly.

### Key Entities *(include if feature involves data)*

- **EventConfiguration**: A per-organization record that captures the identity of the event for branding on the kiosk and the duration of an operator display session.
  - Attributes: `id` (UUID), `organizationId` (UUID, unique), `eventName` (string, ≤255, optional), `organizerName` (string, ≤255, optional), `organizerLogoMediaId` (UUID, nullable, FK to `media_file_references.id`, ON DELETE SET NULL), `eventDurationMinutes` (integer, 1–1440), `createdAt` / `updatedAt` (timestamps), `createdByUserId` / `updatedByUserId` (UUIDs).
  - Relationships: at most one per organization; references an optional `MediaFileReference` for the logo.
  - No `isActive`, no `displayOrder`, no availability windows. The entity is always present (one row per organization).

- **MediaFileReference (existing, reused)**: The unified media asset record.
  - New `media_type` value: `'logo'`. Allowed content types: `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`. Maximum size: 1 MB.

- **KioskDisplayConfiguration (existing, modified)**: The kiosk's display timing and animation preferences.
  - Removed attribute: `configured_event_duration_minutes` (and its check constraint).

- **OperatorSession (existing, unchanged externally)**: The kiosk display session record.
  - The `valid_until` field is still computed at open time from `EventConfiguration.event_duration_minutes` instead of the (removed) `KioskDisplayConfiguration.configured_event_duration_minutes`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can set organizer name, event name, duration, and upload a logo on `/admin/event` and see all values reflected on the kiosk top region overlay within one kiosk poll or on the next kiosk page reload.
- **SC-001a**: When `GET /api/event-branding` returns HTTP 500 for one or more consecutive polls while the display-state poll succeeds, the kiosk continues to render the overlay with the last good branding values. When the endpoint returns HTTP 200 again, the overlay updates with the new values within one poll. No error chrome is shown for the branding failure. (Verified by an integration test that mocks the kiosk's HTTP layer and asserts the overlay DOM across a sequence of success/failure/success responses.)
- **SC-002**: When all three branding values are empty, the kiosk's top region overlay is absent from the rendered DOM (verifiable by `document.querySelector('.branding-overlay')` returning `null`).
- **SC-003**: The ads region of the kiosk contains the visible text "Patrocinadores del evento" as the first element of the band, and the band height is unchanged (pixel-identical to the pre-feature measurement, ± 1 px tolerance for sub-pixel rendering).
- **SC-004**: After the migration, every existing organization has exactly one `event_configurations` row, and no row in `kiosk_display_configurations` references `event_duration_minutes` or any renamed equivalent (verified by an automated database inspection test).
- **SC-004a**: Running `alembic upgrade head` twice in a row succeeds without raising and produces the same final schema/data as a single run (verified by an automated test that runs the migration on a fresh database, then runs it again, and asserts no exception and no duplicate rows/columns/constraints).
- **SC-005**: A `display_viewer` or `event_operator` role receives HTTP 403 on every `event-configuration` admin endpoint, and HTTP 200 on the public `event-branding` endpoint.
- **SC-006**: Uploading a 1.5 MB PNG returns HTTP 400 with a clear message; uploading a `.bmp` returns HTTP 400 with a clear message; uploading a valid 200 KB PNG returns HTTP 200 and the new logo is visible on the kiosk overlay within one poll.
- **SC-007**: After deleting the logo via the admin form, the underlying media file is removed from disk and the kiosk overlay no longer renders the `<img>` element on the next poll.
- **SC-008**: A successful `PUT /api/event-configuration` is followed within one second by a `event_configuration_changed` audit event visible in the admin events listing, carrying the changed field names and the user ID of the actor; the event payload does NOT contain the logo binary.

## Assumptions

- The kiosk's existing 4fr/1fr grid (top region 4fr, ads region 1fr) is the right balance for the overlay. No grid change is required.
- The fixed string "Patrocinadores del evento" is acceptable for the operator's audience in this version. Localisation is out of scope.
- Existing media storage (`media_file_references`) is reused for logos. No new storage backend is introduced.
- The migration is a one-way transformation. There is no rollback script for the data move itself; down-migration restores the schema but not the data values.
- The kiosk refreshes branding on each `GET /api/display/state` poll, sharing the existing poll interval. No push channel is used for this feature; the existing `DisplayControlSyncService` is browser-local and does not cross machines.
- The new "Event configuration" admin module follows the same `display-config` UX pattern: a single form page with all fields, save button, snackbar on success, and `dirtyFormGuard` on navigation.
- The poll interval, top-zone default duration, ad-zone default duration, and other display configuration knobs from spec 006 and its successors continue to apply unchanged, except for the moved `eventDurationMinutes` field.
- Future-scope items (TBD, not implemented): per-event theming, multi-language branding strings, scheduled branding changes, logo upload from a URL, animated logos, separate mobile/desktop overlays, A/B test of overlay placement, multi-tenant branding, kiosk-side caching beyond the operator session.

## Superseded by

- `018-content-rotation-modes` (US2) — branding overlay hidden in
  iframe mode. Detail: `specs/018-content-rotation-modes/supersedes-017.md`.
