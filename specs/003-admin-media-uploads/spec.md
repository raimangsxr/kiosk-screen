# Feature Specification: Admin Media Uploads

**Feature Branch**: `003-admin-media-uploads`
**Spec Directory**: `specs/003-admin-media-uploads/`
**Created**: 2026-06-23
**Status**: Approved
**Input**: the foundational media storage layer — the
`media_file_references` table, the per-item rotation animation
fields, the default-duration and inline-ad knobs, and the central
upload validation that gates every spec that uploads a file
(content, ads, organizer logo, public upload).

## User Scenarios & Testing

### User Story 1 — Upload an image or video (Priority: P1)

An administrator (or `content_manager` / `advertising_manager`)
uploads a media file as part of creating a content or ad item. The
backend stores the file on disk, creates a `media_file_references`
row, and returns the new reference. The file is served back via
`GET /media/{media_id}` to any authenticated user or to an
unexpired operator session token.

**Why this priority**: every content and ad spec depends on the
media reference layer.

**Independent Test**: POST `/content/upload` with a 1 KB JPEG
returns 201 + `ContentItemSchema` containing a `mediaFile` with a
non-null `publicReference`; subsequent `GET /media/{id}` returns the
binary.

**Acceptance Scenarios**:

1. **Given** a valid `image/jpeg` file under 25 MB, **When** the
   upload is accepted, **Then** a row is created in
   `media_file_references` and the file is stored on disk under
   `MEDIA_STORAGE_PATH`.
2. **Given** a 30 MB JPEG, **When** the upload is attempted,
   **Then** the response is 400 with the "Image uploads must be
   25 MB or smaller" detail.
3. **Given** a `text/plain` file, **When** the upload is
   attempted, **Then** the response is 415 (Unsupported Media
   Type) with the allowed list.
4. **Given** an unauthenticated request, **When** GET
   `/media/{id}` is called, **Then** the response is 401.
5. **Given** a media file owned by another organization, **When**
   GET `/media/{id}` is called, **Then** the response is 404 (no
   cross-org leakage).

### User Story 2 — Per-item rotation animation override (Priority: P2)

A `content_manager` creates a top content item with a per-item
`duration_seconds`, a `rotation_animation` (one of
`none | fade | slide`), and an `animation_duration_milliseconds`
override. The kiosk resolves the effective values from the per-item
overrides, falling back to the kiosk configuration defaults when the
per-item value is `NULL`.

**Why this priority**: the kiosk UX requires per-item override to
let operators tune pacing per slide.

**Independent Test**: a top content item with
`duration_seconds=20, rotation_animation='fade', animation_duration_milliseconds=500`
shows for 20 s with a 500 ms fade when polled.

**Acceptance Scenarios**:

1. **Given** a top content item with
   `duration_seconds=20, rotation_animation='fade'`, **When** GET
   `/display/state` is called, **Then** the response carries
   `effectiveDurationSeconds=20`,
   `effectiveRotationAnimation='fade'`,
   `effectiveAnimationDurationMilliseconds=300` (the kiosk default).
2. **Given** a value of `rotation_animation='spin'`, **When** the
   form is submitted, **Then** the backend returns 400 with the
   "Rotation animation must be none, fade, or slide" detail.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST persist media uploads in
  `media_file_references` with the documented columns.
- **FR-002**: The system MUST store uploaded files on disk under
  `MEDIA_STORAGE_PATH/<organization_id>/<public_reference>` and
  MUST NOT store raw bytes in the database.
- **FR-003**: The system MUST validate every upload through
  `domain/media.py`; image uploads ≤ 25 MB, video uploads ≤ 500 MB,
  logo uploads ≤ 1 MB, content types restricted to the four allow
  lists.
- **FR-004**: The system MUST reject uploads whose filename has no
  recognised extension with `UnsupportedExtensionError` mapped to
  415.
- **FR-005**: The system MUST auto-detect `content_type ∈ {photo,
  video}` from the filename extension on every upload endpoint
  (admin and public); the auto-detected value overrides an explicit
  `contentType` if both are present.
- **FR-006**: The system MUST enforce
  `ALLOWED_ROTATION_ANIMATIONS = {none, fade, slide}` on every
  `rotation_animation` field.
- **FR-007**: The system MUST extend `top_content_items` and
  `client_ad_items` with the per-item rotation columns
  (`duration_seconds`, `rotation_animation`,
  `animation_duration_milliseconds`).
- **FR-008**: The system MUST extend
  `kiosk_display_configurations` with the four default rotation
  columns plus `inline_ad_count`.
- **FR-009**: The kiosk runtime MUST resolve per-item rotation
  fields against the kiosk configuration defaults via
  `domain/rotation.resolve_effective_rotation(...)` and MUST
  expose the resolved values on `DisplayStateSchema`.
- **FR-010**: The system MUST serve `GET /media/{id}` only to
  authenticated sessions (cookie or unexpired operator session
  token); 401 otherwise; 404 on cross-org or missing file.

### Key Entities

- **MediaFileReference**: `id`, `organization_id`, `storage_path`,
  `public_reference` (UNIQUE), `original_filename`, `media_type`
  (e.g. `image`, `video`, `logo`), `content_type` (MIME),
  `file_size_bytes`, audit fields.

## Success Criteria

- **SC-001**: A new admin upload of a 1 KB JPEG returns within
  300 ms (p95) on the local lab.
- **SC-002**: `GET /media/{id}` always returns 404 for cross-org
  media ids.
- **SC-003**: The full set of MIME and extension allow lists is
  defined in one place (`domain/media.py`) and imported by every
  upload endpoint.

## Assumptions

- `MEDIA_STORAGE_PATH` is an environment variable pointing at a
  writable directory; defaults to `<repo>/var/media`.
- Disk storage is sufficient for MVP; object storage (S3) is out of
  scope.
- Logos (used in spec 008) reuse the same `media_file_references`
  table and share the same MIME validation, capped at 1 MB.

## Supersedes

None.

## Superseded by

None yet.
