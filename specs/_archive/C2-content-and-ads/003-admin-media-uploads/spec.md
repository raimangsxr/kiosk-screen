---
capability: C2-content-and-ads
supersedes:
superseded_by:
status: closed
oversize: false
---

# Feature Specification: Admin Media Uploads

> Superseded by: 016-preconfigured-iframes-and-video-end (US2 — `embedded_web` content type and `ApprovedEmbeddedDomain` table removed). See `specs/016-preconfigured-iframes-and-video-end/supersedes-003.md`.

**Feature Branch**: `005-admin-media-uploads`

**Created**: 2026-06-17

**Status**: Draft

**Input**: User description: "The Admin panel have to allow upload content and ads. Remember that content can be images / videos / iframes that will be shown one by one on full container size with a rotation time that can be configured at the admin panel. Ads can be images and we can set rotation time and how many ads inline will be shown. For both content and ads parts, we can configure rotation animation and animation duration time. Uploaded files will be saved in a volume (disk) and the database will have the reference and needed metadata to load and show them."

## Clarifications

### Session 2026-06-17

- Q: Who can configure rotation timing, animations, animation duration, and inline ad count? -> A: Administrators can configure all settings; content managers configure main content settings; advertising managers configure ad settings.
- Q: Are rotation time, animation, and animation duration configured globally, per item, or both? -> A: Global defaults per content area, with optional per-item overrides.
- Q: What happens to uploaded files when content or ad records are deleted? -> A: Deleting a content or ad record deletes the uploaded file only if no other item references it.
- Q: Who can access uploaded media file URLs? -> A: Uploaded media files require authenticated access by an authorized app user or kiosk session.
- Q: What are the MVP upload size limits? -> A: Images up to 25 MB and videos up to 500 MB.
- Q: When two authorized users edit the same content/ad item or rotation configuration at nearly the same time, what should happen? -> A: The most recent successful save overwrites previous values.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload Main Display Content (Priority: P1)

An administrator or content manager uploads main display content from the Admin panel so the kiosk can show images, videos, or iframe entries in the top display region.

**Why this priority**: Main content is the primary purpose of the kiosk screen and must be manageable without manually editing file paths or records.

**Independent Test**: Can be tested by uploading an image, uploading a video, and creating an iframe entry from the Admin panel, then confirming each item appears in the main content list with the metadata needed for display rotation.

**Acceptance Scenarios**:

1. **Given** an authorized user is in the Admin panel, **When** they upload a supported image for main content with required metadata, **Then** the item is saved, listed as main content, and available for kiosk playback.
2. **Given** an authorized user is in the Admin panel, **When** they upload a supported video for main content with required metadata, **Then** the item is saved, listed as main content, and available for kiosk playback.
3. **Given** an authorized user is in the Admin panel, **When** they create an iframe content entry with a source address and required metadata, **Then** the entry is saved, listed as main content, and available for kiosk playback.
4. **Given** a user is not authenticated, **When** they try to load an uploaded media file directly, **Then** access is denied.

---

### User Story 2 - Upload Client Ads (Priority: P2)

An administrator or advertising manager uploads image ads from the Admin panel so client ads can appear in the bottom display region.

**Why this priority**: Client ad management is required for the kiosk's sponsored area and should not depend on manually placing files or editing records.

**Independent Test**: Can be tested by uploading an image ad, associating it with a client, and confirming the ad is listed with the metadata needed for display rotation.

**Acceptance Scenarios**:

1. **Given** an authorized user is in the Admin panel, **When** they upload a supported image ad with required metadata and client association, **Then** the ad is saved, listed as a client ad, and available for kiosk playback.
2. **Given** an authorized user uploads an ad without selecting a client, **When** they submit the form, **Then** the ad is not saved and the user sees a clear validation message.

---

### User Story 3 - Configure Rotation Behavior (Priority: P3)

An administrator configures rotation timing, animation, animation duration, and the number of inline ads so display behavior can be adjusted from the Admin panel.

**Why this priority**: Uploaded media needs predictable display behavior, but configuration can be delivered after upload flows because existing defaults can keep the kiosk usable.

**Independent Test**: Can be tested by changing rotation and animation settings, opening the kiosk display, and confirming content and ads follow the configured behavior.

**Acceptance Scenarios**:

1. **Given** main content items exist, **When** an authorized user sets the main content rotation time, rotation animation, and animation duration, **Then** the kiosk uses those settings when showing main content.
2. **Given** ad items exist, **When** an authorized user sets the ad rotation time, ad rotation animation, animation duration, and number of inline ads, **Then** the kiosk uses those settings when showing ads.
3. **Given** the configured inline ad count is greater than the number of eligible ads, **When** the kiosk display loads, **Then** it shows only the eligible ads without leaving broken placeholders.

---

### User Story 4 - Display Uploaded Media Reliably (Priority: P4)

A display viewer sees uploaded media fill its assigned region, rotating one item at a time for main content and the configured number of inline image ads for the ad region.

**Why this priority**: This validates the end-user outcome of the upload and configuration work, but depends on content, ads, and rotation settings existing first.

**Independent Test**: Can be tested by opening the kiosk display after uploads and confirming each eligible item loads from its saved reference with the configured timing and animation behavior.

**Acceptance Scenarios**:

1. **Given** uploaded main content is active and eligible, **When** the kiosk display is open, **Then** each main content item is shown one by one at full container size.
2. **Given** uploaded image ads are active and eligible, **When** the kiosk display is open, **Then** the bottom region shows the configured number of inline ads and rotates through eligible ads.
3. **Given** an uploaded file reference cannot be loaded, **When** the kiosk display reaches that item, **Then** the display avoids a broken visual state and records or exposes an observable error condition.

### Edge Cases

- Uploaded image or video file is missing, unreadable, empty, or has an unsupported file type.
- Uploaded image exceeds 25 MB or uploaded video exceeds 500 MB.
- An iframe entry has an invalid or unavailable source address.
- A user submits upload metadata without required title, label, client, rotation, or animation values.
- Rotation time or animation duration is zero, negative, or not a valid number.
- The configured number of inline ads is zero, negative, or greater than the number of active ads.
- Multiple users upload or update the same content, ad, or rotation configuration at nearly the same time; the most recent successful save is retained.
- Disk storage is unavailable or full when a user uploads a file.
- A previously uploaded file is deleted or moved outside the Admin panel.
- A content or ad record is deleted while another item still references the same uploaded file.
- An unauthenticated viewer tries to open an uploaded media file URL directly.
- No active content or no active ads are available for display.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Admin panel MUST allow authorized users to upload image files for main display content.
- **FR-002**: The Admin panel MUST allow authorized users to upload video files for main display content.
- **FR-003**: The Admin panel MUST allow authorized users to create iframe content entries by providing a source address instead of uploading a file.
- **FR-004**: The Admin panel MUST allow authorized users to upload image files for client ads.
- **FR-005**: Uploaded files MUST be saved in persistent disk-backed storage and remain available after application restart.
- **FR-006**: The system MUST store a reference to each uploaded file or iframe source along with the metadata needed to load, list, manage, and display it.
- **FR-007**: Main content metadata MUST include at minimum title, media type, source reference, active status, display order, optional per-item rotation time, optional per-item rotation animation, optional per-item animation duration, and audit information for creation or update.
- **FR-008**: Ad metadata MUST include at minimum label, client association, source reference, active status, display order, optional per-item rotation time, optional per-item rotation animation, optional per-item animation duration, and audit information for creation or update.
- **FR-009**: The Admin panel MUST allow administrators and content managers to configure the default main content rotation time.
- **FR-010**: The Admin panel MUST allow administrators and advertising managers to configure the default ad rotation time.
- **FR-011**: The Admin panel MUST allow administrators and advertising managers to configure how many image ads are shown inline in the ad region.
- **FR-012**: The Admin panel MUST allow administrators and content managers to configure the rotation animation used for main content.
- **FR-013**: The Admin panel MUST allow administrators and advertising managers to configure the rotation animation used for ads.
- **FR-014**: The Admin panel MUST allow administrators and content managers to configure animation duration for main content, and administrators and advertising managers to configure animation duration for ads.
- **FR-014A**: The Admin panel MUST allow authorized users to leave item-level rotation settings empty so the item uses the configured default for its content area.
- **FR-015**: The kiosk display MUST show active, eligible main content one item at a time at full container size.
- **FR-016**: The kiosk display MUST show active, eligible image ads in the configured inline quantity in the ad region.
- **FR-017**: The kiosk display MUST rotate main content and ads according to their configured timing and animation settings.
- **FR-018**: The system MUST validate required metadata before saving uploaded content or ads.
- **FR-019**: The system MUST reject unsupported media types with a clear user-facing error.
- **FR-020**: The system MUST reject image uploads larger than 25 MB and video uploads larger than 500 MB with a clear user-facing error.
- **FR-021**: The system MUST prevent unauthorized users from uploading files, creating iframe entries, or changing rotation settings.
- **FR-022**: The Admin panel MUST show upload and save success, validation failure, and storage failure states in language understandable to non-technical users.
- **FR-023**: The system MUST avoid broken kiosk display states when an uploaded file or iframe source cannot be loaded.
- **FR-024**: The system MUST preserve existing active/inactive and ordering behavior when uploaded media is added to content and ad lists.
- **FR-025**: The system MUST expose enough information for operators to identify which uploaded item failed to save or display.
- **FR-026**: When a content or ad record is deleted, the system MUST delete its uploaded file only when no other content or ad item references that file.
- **FR-027**: Uploaded media file URLs MUST require authenticated access by an authorized app user or kiosk session.
- **FR-028**: When concurrent authorized edits affect the same content item, ad item, or rotation configuration, the system MUST retain the most recent successful save.

### Traceability & Quality Requirements *(mandatory)*

- **TQ-001**: Each functional requirement MUST map to at least one user story and one measurable success criterion.
- **TQ-002**: Changed behavior MUST have a testable validation method described in this specification or deferred to the implementation plan.
- **TQ-003**: Public, integration, data, and user-interface boundaries MUST list expected contracts or explicitly state that no boundary is introduced.
- **TQ-004**: Security, observability, and accessibility considerations MUST be captured as requirements, assumptions, or out-of-scope decisions.
- **TQ-005**: Speculative or future-scope behavior MUST be listed as out of scope rather than implemented implicitly.

### Boundary Contracts

- **Admin user interface boundary**: Users can upload files, create iframe entries, enter metadata, configure rotation behavior, and see validation or storage errors.
- **Display user interface boundary**: The kiosk display loads saved media references and applies configured rotation timing, inline ad count, animation, and animation duration.
- **Data boundary**: Persisted records must contain source references, media type, display metadata, default or item-level rotation metadata, active status, ownership/audit metadata, and client association for ads.
- **Storage boundary**: Uploaded image and video files must be stored in persistent disk-backed storage, referenced by persisted metadata, protected from unauthenticated access, and removed only when no remaining item references the file.
- **Permission boundary**: Administrators may perform all upload and configuration actions; content managers may upload and configure main content only; advertising managers may upload and configure ads only; uploaded media file access requires an authenticated authorized app user or kiosk session.

### Key Entities

- **Uploaded Content Item**: A main display item representing an uploaded image, uploaded video, or iframe source; includes display metadata, optional per-item rotation settings, optional per-item animation settings, active status, ordering, and source reference.
- **Uploaded Ad Item**: A client ad representing an uploaded image; includes client association, display metadata, optional per-item rotation settings, optional per-item animation settings, active status, ordering, and source reference.
- **Media File Reference**: A persistent reference to a file saved on disk, including information needed to load it, diagnose display or storage problems, and determine whether any content or ad items still reference it.
- **Rotation Configuration**: Admin-managed default settings for rotation time, animation type, animation duration, and inline ad count, with item-level overrides allowed where configured.
- **Client**: The advertiser or sponsor associated with uploaded ads.
- **Actor**: A signed-in user whose roles determine whether they can upload content, upload ads, configure rotation behavior, or view the display.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Authorized users can upload a valid image or video content item with required metadata in under 2 minutes.
- **SC-002**: Authorized users can upload a valid image ad and associate it with a client in under 2 minutes.
- **SC-003**: Authorized users can update rotation time, animation, animation duration, and inline ad count in under 1 minute.
- **SC-004**: 100% of unsupported file type, missing required metadata, and file size limit submissions are rejected before becoming active display items.
- **SC-005**: After application restart, 100% of successfully uploaded files remain loadable through their saved references.
- **SC-006**: During a 30-minute display session with valid uploaded media, active content and ads rotate according to configured timing without broken visual placeholders.
- **SC-007**: At least 95% of non-technical admin users can complete a basic content upload and ad upload flow without developer assistance in usability testing.
- **SC-008**: 100% of unauthenticated direct requests for uploaded media files are denied.

## Assumptions

- Existing role concepts remain in use: administrators can manage all upload and rotation settings, content managers can manage main content and its rotation settings, and advertising managers can manage ads and their rotation settings.
- Images and videos are uploaded files; iframe content is represented by a source address and metadata, not by a file upload.
- MVP file size limits are 25 MB per image and 500 MB per video.
- Rotation animation choices for the MVP are `none`, `fade`, and `slide`, presented as a predefined set in the Admin panel.
- Main content and ads use default rotation settings unless an authorized user sets item-specific overrides.
- Uploaded content and ads follow existing active/inactive and display ordering behavior.
- Uploaded files are retained while at least one associated content or ad record still references them.
- This feature extends the existing single-organization MVP and does not introduce multi-tenant ownership.

## Out of Scope

- Video ads in the ad region.
- Audio controls or playlist-style media editing.
- Image or video editing, cropping, transcoding, or thumbnail generation.
- External cloud storage providers.
- Bulk upload, drag-and-drop batch upload, or scheduled publishing.
- Per-client ad targeting, analytics, billing, or impression reporting.
- Automatic iframe approval policy changes beyond existing source validation behavior.

## Superseded by

- `016-preconfigured-iframes-and-video-end` (US2) — `embedded_web`
  content type removed; `ApprovedEmbeddedDomain` table and admin
  section removed. Detail:
  `specs/016-preconfigured-iframes-and-video-end/supersedes-003.md`.
- `013-drop-label-display-order-drag-drop` (US1) — `label` column
  dropped; drag-and-drop reorder added.
- `014-drop-client` (US1) — `Client` entity hard-deleted; `advertiser`
  free-text replaces client picker.
