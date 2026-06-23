# Feature Specification: Preconfigured Iframes and Video End Delay

**Feature Branch**: `006-preconfigured-iframes-and-video-end`
**Spec Directory**: `specs/006-preconfigured-iframes-and-video-end/`
**Created**: 2026-06-23
**Status**: Approved
**Input**: the iframe entity, the iframe CRUD admin API and UI, the
`video_end_delay_seconds` knob on the kiosk configuration, and the
`remote_control_iframe_deleted` auto-revert when the selected iframe
disappears.

## User Scenarios & Testing

### User Story 1 — Manage preconfigured iframes (Priority: P1)

A `content_manager` opens the iframes admin page, creates an entry
by entering a URL, edits it later, and deletes it. The backend
ensures each `(organization_id, url)` pair is unique.

**Why this priority**: iframes are the only `iframe` content source
for the kiosk.

**Independent Test**: POST `/iframes` with a new URL returns 201
+ `IframeSchema`; a second POST with the same URL returns 409
with `iframe_url_already_exists`.

**Acceptance Scenarios**:

1. **Given** a unique URL within the organization, **When** POST
   `/iframes` is called, **Then** the response is 201 + the new
   `IframeSchema`.
2. **Given** an existing URL in the same organization, **When**
   POST `/iframes` is called again, **Then** the response is 409
   with `code: iframe_url_already_exists`.
3. **Given** an `event_operator`, **When** POST `/iframes` is
   called, **Then** the response is 403.
4. **Given** a `content_manager`, **When** GET `/iframes` is
   called, **Then** the response lists the org's iframes sorted by
   `created_at`.
5. **Given** an `administrator` or `content_manager`, **When**
   DELETE `/iframes/{id}` is called, **Then** the response is
   204.

### User Story 2 — Tune the video end delay (Priority: P2)

A `content_manager` opens the kiosk configuration form, edits
`video_end_delay_seconds` (0-30 s, default 2), and saves. The
kiosk, when a video item fires `ended`, waits the configured
number of seconds before advancing to the next item.

**Why this priority**: live-event polish; the kiosk falls back to
the default if the field is missing.

**Independent Test**: PUT `/display/configuration` with
`video_end_delay_seconds=5` returns 200; the next poll shows the
new value; a video that ends advances after 5 s of idle.

**Acceptance Scenarios**:

1. **Given** `video_end_delay_seconds=2` (default), **When** a
   video ends, **Then** the kiosk waits 2 s before advancing.
2. **Given** `video_end_delay_seconds=5`, **When** a video ends,
   **Then** the kiosk waits 5 s before advancing.
3. **Given** `video_end_delay_seconds=0`, **When** a video ends,
   **Then** the kiosk advances immediately.
4. **Given** `video_end_delay_seconds=31`, **When** PUT is
   called, **Then** the response is 400 (CHECK
   `ck_kiosk_video_end_delay_range`).

### User Story 3 — Auto-revert when the selected iframe is deleted (Priority: P2)

While the kiosk is in `contentMode='iframe'` and the selected
iframe is deleted, the next `GET /display/state` returns
`contentMode='loop'`, clears `selected_iframe_id`, and records a
`remote_control_iframe_deleted` info event.

**Why this priority**: prevents the kiosk from getting stuck on a
deleted iframe.

**Independent Test**: select iframe `X`, DELETE `/iframes/{X}`,
next poll → `loop` and audit event recorded.

**Acceptance Scenarios**:

1. **Given** the kiosk in `iframe` mode with selected iframe `X`,
   **When** DELETE `/iframes/{X}` is called and then GET
   `/display/state` is polled, **Then** the response shows
   `contentMode='loop'` and a `remote_control_iframe_deleted`
   event is recorded.
2. **Given** the kiosk in `loop` mode, **When** an iframe is
   deleted, **Then** the kiosk state is unchanged and no event is
   recorded.
3. **Given** the kiosk in `iframe` mode with selected iframe
   `X`, **When** iframe `Y` (different id) is deleted, **Then**
   the kiosk state is unchanged.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST persist iframes in `iframes` with
  the documented columns and the `UNIQUE (organization_id, url)`
  constraint.
- **FR-002**: The system MUST expose the iframe CRUD endpoints
  (`GET /iframes`, `POST /iframes`, `GET /iframes/{id}`,
  `PUT /iframes/{id}`, `DELETE /iframes/{id}`) gated by
  `CONTENT_MANAGEMENT_ROLES`.
- **FR-003**: A duplicate URL within the same organization MUST
  return 409 with `code: iframe_url_already_exists`.
- **FR-004**: The kiosk configuration MUST carry a
  `video_end_delay_seconds` column with the CHECK constraint
  `0..30` and a default of 2; PUT `/display/configuration` MUST
  reject values outside the range.
- **FR-005**: When a video item on the kiosk fires `ended`, the
  kiosk MUST wait `video_end_delay_seconds` before advancing to
  the next item.
- **FR-006**: When the iframe currently selected on the kiosk is
  deleted, the next `GET /display/state` MUST auto-revert to
  `contentMode='loop'`, clear `selected_iframe_id`, and record
  a `remote_control_iframe_deleted` info event.
- **FR-007**: The frontend MUST expose the iframe admin page at
  `/admin/iframes` with the CRUD form, the URL validation
  feedback, and the delete confirmation.

### Key Entities

- **Iframe**: `id`, `organization_id`, `url` (String(1024)),
  `created_by_user_id`, `updated_by_user_id`, timestamps. UNIQUE
  on `(organization_id, url)`.

## Success Criteria

- **SC-001**: A `content_manager` can list, create, edit, and
  delete an iframe in under 30 s.
- **SC-002**: A 0 s delay is honored end-to-end (the kiosk
  advances within 50 ms of the `ended` event).
- **SC-003**: The auto-revert runs on the next poll after the
  iframe deletion and never blocks the poll.

## Assumptions

- Iframe URL validation is delegated to the browser / iframe
  sandbox; the backend accepts any well-formed URL string up to
  1024 chars.
- The `video_end_delay_seconds` knob is global; per-item
  overrides are out of scope.

## Supersedes

None.

## Superseded by

None yet.
