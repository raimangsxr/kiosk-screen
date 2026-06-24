# Feature Specification: Content and Ads Admin

**Feature Branch**: `009-content-and-ads-admin`
**Spec Directory**: `specs/009-content-and-ads-admin/`
**Created**: 2026-06-23
**Status**: Approved
**Input**: the admin CRUD for `top_content_items` and
`client_ad_items`, including upload, drag-and-drop reorder, the
extension-based content-type auto-detect, the
`is_fixed` / `recurring_every_x_iterations` exclusivity on content,
the `advertiser` free-text on ads, and the audit events.

## User Scenarios & Testing

### User Story 1 — Create, edit, reorder content (Priority: P1)

A `content_manager` opens `/admin/content`, creates a new top
content item (with optional file upload), edits it later, deletes
it, and reorders the queue via drag-and-drop. The backend
auto-detects the content type from the file extension; an explicit
`contentType='photo'` for a `.mp4` is overridden by the extension.

**Why this priority**: the content queue is the primary on-screen
rotation source for the kiosk.

**Independent Test**: POST `/content/upload` with a `.mp4` and
`contentType='photo'` returns 201 with `contentType='video'` and
records `content_type_autodetected`.

**Acceptance Scenarios**:

1. **Given** a `content_manager`, **When** POST
   `/content/upload` is called with a `.jpg`, **Then** the
   response is 201 and `contentType='photo'`.
2. **Given** a `.mp4` and `contentType='photo'`, **When** POST
   `/content/upload` is called, **Then** the response is 201 with
   `contentType='video'` and a `content_type_autodetected` event
   is recorded.
3. **Given** `.xyz`, **When** POST is called, **Then** the
   response is 415 with `unsupported_media_type`.
4. **Given** a `content_manager`, **When** POST `/content/reorder`
   is called with an `orderedIds` list, **Then** the response is
   204 and the `displayOrder` is renumbered to match the list.
5. **Given** an `orderedIds` list that does not match the current
   set, **When** POST `/content/reorder` is called, **Then** the
   response is 409.

### User Story 2 — Content with is_fixed / recurringEveryXIterations (Priority: P1)

A `content_manager` creates a content with `is_fixed=true` and no
`recurringEveryXIterations`; the kiosk can pin it (per spec 007).
Conversely, a content with `recurringEveryXIterations=N` (N ≥ 1)
appears every N advances. A payload with both `is_fixed=true` and
`recurringEveryXIterations != null` is rejected with 400
(mutual-exclusion hint in the form).

**Why this priority**: enables spec 007 to ship the rotation
modes.

**Independent Test**: POST `/content` with `isFixed=true,
recurringEveryXIterations=3` returns 400 with the
`ck_top_content_not_fixed_and_recurring` violation.

**Acceptance Scenarios**:

1. **Given** a payload with both `is_fixed=true` and
   `recurringEveryXIterations=3`, **When** POST `/content` is
   called, **Then** the response is 400.
2. **Given** `recurringEveryXIterations=0`, **When** POST
   `/content` is called, **Then** the response is 400.
3. **Given** `is_fixed=true` alone, **When** POST `/content` is
   called, **Then** the response is 201 and the row has
   `is_fixed=true, recurring_every_x_iterations=null`.
4. **Given** `recurringEveryXIterations=3` alone, **When** POST
   `/content` is called, **Then** the response is 201.

### User Story 3 — Create, edit, reorder ads (Priority: P1)

An `advertising_manager` opens `/admin/ads`, creates an ad with an
optional `advertiser` free-text and an optional file upload, edits
it later, deletes it, and reorders the queue via drag-and-drop.

**Why this priority**: the ad band is the sponsor revenue
surface.

**Independent Test**: POST `/ads/upload` with a `.jpg` and
`advertiser="Acme Corp"` returns 201 with the row containing
`advertiser="Acme Corp"`.

**Acceptance Scenarios**:

1. **Given** an `advertising_manager`, **When** POST `/ads` is
   called with `advertiser="Acme Corp"`, **Then** the response is
   201 with `advertiser="Acme Corp"`.
2. **Given** a `content_manager`, **When** POST `/ads` is called,
   **Then** the response is 403.
3. **Given** an `advertising_manager`, **When** POST
   `/ads/reorder` is called, **Then** the response is 204 and the
   `displayOrder` is renumbered.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST persist `top_content_items` and
  `client_ad_items` with the documented columns and the three
  per-item rotation columns (`duration_seconds`,
  `rotation_animation`, `animation_duration_milliseconds`).
- **FR-002**: The system MUST expose the content CRUD endpoints
  (`GET /content`, `POST /content`, `POST /content/upload`,
  `GET /content/{id}`, `PUT /content/{id}`,
  `DELETE /content/{id}`, `POST /content/reorder`) gated by
  `CONTENT_MANAGEMENT_ROLES`.
- **FR-003**: The system MUST expose the ad CRUD endpoints
  (`GET /ads`, `POST /ads`, `POST /ads/upload`, `GET /ads/{id}`,
  `PUT /ads/{id}`, `DELETE /ads/{id}`, `POST /ads/reorder`)
  gated by `AD_MANAGEMENT_ROLES`.
- **FR-004**: On every content or ad mutation (create, update,
  delete, reorder), the system MUST record an audit event
  (`content_changed` or `ad_changed`) with the user id and a
  short diff metadata.
- **FR-005**: The content and ad upload endpoints MUST auto-detect
  `contentType` from the file extension
  (`detect_media_type_from_extension(...)`); the auto-detected
  value overrides an explicit `contentType`. The auto-detect MUST
  record a `content_type_autodetected` event.
- **FR-006**: The content creation/update MUST validate the
  `is_fixed` XOR `recurring_every_x_iterations` exclusivity
  (CHECK `ck_top_content_not_fixed_and_recurring`) and reject
  `recurring_every_x_iterations < 1` (CHECK
  `ck_top_content_recurring_positive`).
- **FR-007**: The reorder endpoint MUST renumber `displayOrder` to
  match the `orderedIds` list (first id = 1, second = 2, ...);
  the list MUST contain exactly the same ids as the current set,
  otherwise 409.
- **FR-008**: The frontend MUST expose
  `/admin/content` (list + form + drag-drop reorder) and
  `/admin/ads` (list + form + drag-drop reorder); the content
  form MUST show a "Fijo" checkbox and a "Recurrente cada N"
  number input with a mutual-exclusion hint.
- **FR-009**: The `client_ad_items.advertiser` field MUST be a
  free-text String(120) (no FK); it replaced the legacy `Client`
  entity (consumed in 0007).
- **FR-010**: The system MUST enforce CHECK
  `display_order > 0`, `duration_seconds IS NULL OR > 0`, and
  `animation_duration_milliseconds IS NULL OR > 0` on both tables.

### Key Entities

- **TopContentItem**: `id`, `organization_id`, `title`,
  `content_type` (`photo | video`), `source_reference`,
  `media_file_id` (nullable FK), `is_active`, `display_order`,
  `duration_seconds` (nullable), `rotation_animation` (nullable),
  `animation_duration_milliseconds` (nullable),
  `available_from` / `available_until` (nullable),
  `recurring_every_x_iterations` (nullable, ≥ 1),
  `is_fixed` (default false), audit fields.
- **ClientAdItem**: `id`, `organization_id`, `source_reference`,
  `media_file_id` (nullable FK), `is_active`, `display_order`,
  `duration_seconds` (nullable), `rotation_animation` (nullable),
  `animation_duration_milliseconds` (nullable),
  `available_from` / `available_until` (nullable),
  `advertiser` (String(120), nullable), audit fields.

## Success Criteria

- **SC-001**: A `content_manager` can create 10 content items
  (mix of photo and video) and reorder them in under 2 minutes.
- **SC-002**: The auto-detect always wins over an explicit
  `contentType`; the audit log records the override.
- **SC-003**: The drag-and-drop reorder is reflected in the next
  kiosk poll within one cadence.

## Assumptions

- The content / ad form uses the Angular CDK drag-and-drop
  primitive; the backend never sees the dragged order until the
  user clicks "Save".
- The `is_active` flag defaults to false at create time; the user
  must opt in via the toggle.

## Supersedes

- The legacy `Client` entity (consumed by migration `0007`).
- The legacy `label` column on `client_ad_items` (consumed by
  migration `0006`).

## Superseded by

- `007-content-rotation-modes` extends the content model with
  `is_fixed` and `recurring_every_x_iterations`; this spec
  carries the validation.
- `004-api-keys-and-public-content-upload` consumes the public
  upload endpoint (silent ignore of `is_fixed` /
  `recurring_every_x_iterations`).
- This addendum adds the thumbnail column to the admin Content
  and Ads lists; see "Addendum — Thumbnails in admin lists"
  below.

## Addendum — Thumbnails in admin lists

The admin Content and Ads lists gain a small thumbnail column
so operators can visually identify items at a glance. Photos
show the actual image; videos show the first frame (using the
same media URL the kiosk uses); ads without an uploaded file
show a placeholder icon.

### User Story 4 — Visual identification in admin lists (Priority: P2)

A `content_manager` opens `/admin/content` and sees a thumbnail
column on the left of each row: the actual photo / video frame
for items that were uploaded via the media upload flow, or a
generic placeholder icon for items that reference an external
URL (`source_reference`). The same column appears on
`/admin/ads` for `advertising_manager`s. The thumbnail is a
fixed-size, lazy-loaded image (or `<video>` preview frame for
videos), rendered with `object-fit: cover` so the column has a
consistent width regardless of the source aspect ratio.

**Why this priority**: lets operators scan long content /
ad queues without opening each item; reduces misclicks on the
"Edit" / "Delete" actions.

**Acceptance Scenarios**:

1. **Given** a content item uploaded via `POST /content/upload`
   with a `.jpg`, **When** the operator opens `/admin/content`,
   **Then** the thumbnail column shows the image
   (`mediaFile.mediaUrl`) at 64×64 px with `object-fit: cover`.
2. **Given** a content item with an external
   `source_reference` URL (no `mediaFile`), **When** the operator
   opens `/admin/content`, **Then** the thumbnail column shows a
   generic `photo` / `videocam` Material icon.
3. **Given** a video content item, **When** the operator opens
   `/admin/content`, **Then** the thumbnail is the video's first
   frame (rendered via a `<video preload="metadata" muted>` or
   the same `<img>` URL fallback if the browser cannot decode
   the video metadata).
4. **Given** an ad item uploaded via `POST /ads/upload`, **When**
   the operator opens `/admin/ads`, **Then** the thumbnail
   column shows the image at 64×64 px.
5. **Given** a long list (50+ items), **When** the operator
   scrolls, **Then** off-screen thumbnails use `loading="lazy"`
   so the initial render stays under 1 s on a 3G connection.

### New Functional Requirements

- **FR-011**: The content list at `/admin/content` MUST render a
  thumbnail column to the left of the "Order" column; the cell
  shows `mediaFile.mediaUrl` as an `<img loading="lazy">` at a
  fixed width of 64×64 px with `object-fit: cover`. When
  `mediaFile` is null the cell shows a Material icon
  (`photo` for `contentType='photo'`, `videocam` for
  `contentType='video'`).
- **FR-012**: The ad list at `/admin/ads` MUST render the same
  thumbnail column for `mediaFile.mediaUrl`; ads without a
  `mediaFile` show a generic `image` Material icon.
- **FR-013**: The `<img>` elements MUST carry `alt=""` (the
  thumbnail is decorative; the row's title carries the
  accessible name) and `loading="lazy"` so off-screen rows do
  not block the initial paint.
- **FR-014**: The card view (mobile / narrow viewport) MUST show
  the thumbnail at the top of each card with the same
  `object-fit: cover` styling.

### Behavioural Notes

- The thumbnail URL is the existing
  `mediaFile.mediaUrl` (which is the `public_reference` of the
  uploaded media file, per spec 003). No new backend columns or
  endpoints are required for the thumbnail itself — the data is
  already on `ContentItemSchema.mediaFile.mediaUrl` /
  `AdItemSchema.mediaFile.mediaUrl`.
- The Content list also gains a "Show on screen now" action
  button that issues a `jump_to` navigation command (per spec
  005 addendum). This is co-located with the thumbnail so the
  operator can both identify the item and trigger it in one
  glance.
