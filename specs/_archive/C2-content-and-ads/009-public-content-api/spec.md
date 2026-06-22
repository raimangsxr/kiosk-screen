---
capability: C2-content-and-ads
supersedes:
superseded_by:
status: closed
oversize: false
---

# Feature Specification: Public Content API with Novelty Priority

**Feature Branch**: `009-public-content-api`
**Created**: 2026-06-18
**Status**: Draft
**Input**: User description: "Public REST API to upload images and videos to a kiosk via API key, with novelty-priority live updates."

## Clarifications

### Session 2026-06-18

- Q: What is the scope of the new POST? → A: Only top content (images/videos). Ads and iframes remain admin-UI-only.
- Q: How is the kiosk notified of new content in real time? → A: Polling `GET /api/display/state` every 5 seconds + a pre-transition poll 1 second before each rotation transition.
- Q: How are API keys modelled? → A: One key per organization; N keys per org allowed; managed from the admin site.
- Q: Which header does the client use? → A: `Authorization: Bearer <key>`.
- Q: What metadata does the POST accept? → A: Minimum: `file` + `title`. Server assigns `isActive=true` and `displayOrder = max+1`.
- Q: After the novelty queue is drained, do the new items re-appear in later rotations? → A: Yes. They are appended to the regular rotation by `displayOrder` and cycle normally.
- Q: How are burst uploads capped? → A: No cap. The kiosk shows all uploads in arrival order.
- Q: Where does this spec live? → A: New `specs/009-public-content-api/`, separate from the in-flight `005-admin-refactor` big-bang release.
- Q: What does "rotate an API key" mean semantically — replace in place, mark old inactive and create new, or chain via `rotatedFromKeyHash`? → A: Replace in place. The same row keeps its `id` and `label`; the `keyHash`, `keyPrefix`, and a new `lastRotatedAt` timestamp are updated. The admin list shows one entry per label.
- Q: When is `lastUsedAt` updated — at authentication (every authenticated request, success or failure) or only on a successful 201 response? → A: Only on a successful 201 response. `lastUsedAt` reflects completed uploads, not attempts. Failed requests (oversized, wrong MIME, missing title, etc.) do not update the timestamp.
- Q: Should the public endpoint support CORS for browser-based clients, or is it server-to-server only? → A: CORS is configurable per deployment. The operator declares an allowlist of origins via environment configuration (`PUBLIC_API_CORS_ORIGINS`). Default is an empty allowlist, which means the public endpoint behaves as same-origin only. Browser cross-origin access is opt-in per deploy; server-to-server and native clients are unaffected by CORS in either case.
- Q: Should admin actions on API keys (create, rotate, revoke) be audited as `DisplayEvent`, only persisted as row fields, or kept in a separate audit log table? → A: Audited as `DisplayEvent`. Each create, rotate, and revoke generates an event with `eventType=api_key_changed`, `entityType=api_key`, `entityId=<key_id>`, `createdByUserId=<admin_id>`. Create and rotate are `severity=info`; revoke is `severity=warning`. The event payload includes the key label for readability.
- Q: Should the kiosk show a visual cue (toast, badge, banner) when items enter the novelty queue, or stay visually identical and let the next transition be the only signal? → A: Stay visually identical (silence). The kiosk is an unattended public display; overlays with queue counts would add visual noise and could distract from the content itself. Operator observability is provided through the admin event log and the `lastUsedAt` timestamp on the API key, not on the kiosk screen.
- Q: Should the kiosk client update `lastUsedAt` itself? → A: No. The earlier draft of FR-029 was a stale residue that contradicted the resolved Q2 answer (server-side update on 201 only). The kiosk client (browser) does not interact with the API key. FR-029 was removed and FR-015 is the single source of truth for `lastUsedAt` semantics.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload Content From An External System (Priority: P1)

An external system (a marketing tool, a mobile app, a partner integration) wants to push a new photo or video to a running kiosk without operator intervention. The external system authenticates with a previously-issued API key and uploads a file with a title. Within a few seconds, the running kiosk includes the new content in its rotation, prioritized ahead of older items that have not yet been shown since the upload.

**Why this priority**: This is the core capability the feature exists to provide. Without it there is no public API.

**Independent Test**: Authenticate with a valid API key via `Authorization: Bearer …`, POST a single image to the public endpoint, verify the response is 201 with the created content record, verify the file exists on disk, verify the open kiosk transitions to the new image within the bounded latency.

**Acceptance Scenarios**:

1. **Given** a valid active API key for the organization, **When** the client posts a JPEG with a title, **Then** the server returns 201 with the new content record, the file is written to the configured media storage path, a media reference and a content item exist in the database, and the display state endpoint now includes the new item.
2. **Given** a valid active API key, **When** the client posts a video file with a valid video MIME type, **Then** the server returns 201 and the item is appended to the top content rotation.
3. **Given** a missing or malformed `Authorization` header, **When** the client posts, **Then** the server returns 401 with a safe error message and no file is written.
4. **Given** an inactive API key, **When** the client posts, **Then** the server returns 403 with a safe error message and no file is written.
5. **Given** a file larger than the configured image or video size limit, **When** the client posts, **Then** the server returns 413 and the file is not stored.
6. **Given** a file whose declared MIME type is not supported, **When** the client posts, **Then** the server returns 415 and the file is not stored.
7. **Given** a missing or empty title, **When** the client posts, **Then** the server returns 400 with a safe validation message.
8. **Given** an authenticated client posting successfully, **When** the response is sent, **Then** the response includes the assigned `displayOrder` value so the client can confirm where the item was placed.

---

### User Story 2 - Administrator Manages API Keys From The Admin Site (Priority: P1)

An administrator of the organization needs to issue, label, and revoke API keys without involving engineering. From the admin site, the administrator creates a key with a human-readable label, sees the raw key value exactly once so they can copy it into the external system, and can later revoke or rotate the key. The administrator can also see when each key was last used for auditing.

**Why this priority**: The API is only useful if keys can be issued and revoked safely from the existing admin experience.

**Independent Test**: Sign in as an administrator, open the API keys section, create a key with a label, copy the raw value, sign the value out, sign back in, confirm the key is listed with its label and last-used timestamp; revoke the key and confirm the public endpoint now returns 403 for that key.

**Acceptance Scenarios**:

1. **Given** an authenticated administrator on the API keys section, **When** they create a new key with a label, **Then** the response includes the raw key value exactly once, the value is shown in a copy-to-clipboard dialog, and the dialog warns the value will not be shown again.
2. **Given** a created key, **When** the administrator reloads the page, **Then** the key list shows the label, prefix, creation timestamp, last-used timestamp, and active status, but never the raw value.
3. **Given** a created key, **When** the administrator rotates it, **Then** a new raw value is generated, the previous value is invalidated immediately, and the public endpoint returns 401 for the previous value and 201 for the new value on the next upload.
4. **Given** a created key, **When** the administrator revokes it, **Then** the public endpoint returns 403 for that key on all subsequent requests, and the key cannot be re-enabled.
5. **Given** a non-administrator user, **When** they attempt to access the API keys section, **Then** they cannot list, create, rotate, or revoke keys.
6. **Given** a successful upload through the public endpoint (201), **When** an administrator views the key list, **Then** the `lastUsedAt` timestamp of the key is updated to the moment the upload completed. A failed upload (400, 413, 415, 5xx) MUST NOT update `lastUsedAt`.

---

### User Story 3 - New Content Is Prioritized Over Pending Base Rotation (Priority: P1)

A kiosk is running and currently showing the third item in a four-item rotation. While that item is on screen, three new items arrive via the public API. The next transition shows the first new item, then the second, then the third, in arrival order, before the kiosk returns to the base rotation. After the novelty queue is drained, the new items continue to cycle in the regular rotation along with the original items.

**Why this priority**: Without this, new content is invisible until the operator restarts kiosk mode. The whole feature depends on the kiosk reacting visibly to new uploads.

**Independent Test**: Open kiosk mode with items A, B, C, D. While the kiosk is showing C, post three new items (E, F, G) via the public API. Observe the next transition shows E, then F, then G, then D, then continues cycling. Measure the time between the upload completing and E first appearing on screen.

**Acceptance Scenarios**:

1. **Given** the kiosk is open and showing an item from the current base rotation, **When** one or more new items are uploaded, **Then** the next transition displays the first new item, and subsequent transitions display the remaining new items in arrival order before returning to the base rotation.
2. **Given** the novelty queue is being drained, **When** additional new items arrive, **Then** the additional items are appended to the queue in arrival order and shown after the previously queued items, before the kiosk returns to the base rotation.
3. **Given** the novelty queue is empty and the kiosk is cycling through the base rotation, **When** a new item arrives, **Then** it is shown on the next transition instead of the next base item, even if the next base item has been waiting longer.
4. **Given** the novelty queue has been drained, **When** the kiosk continues the base rotation, **Then** the items that were shown as novelties now cycle as part of the regular rotation in their assigned `displayOrder` position.
5. **Given** an item is shown as a novelty, **When** the user re-opens kiosk mode, **Then** the novelty state is reset and no carryover of the previous session's queue is preserved.

---

### User Story 4 - Ordering Is Preserved Under Concurrent Uploads (Priority: P2)

Multiple external systems, or a single external system firing many requests in parallel, upload items to the same organization at the same time. The server assigns `displayOrder` values such that every item gets a unique consecutive value reflecting its arrival order, without gaps, races, or duplicate positions. The kiosko receives the items in that order and shows them in that order.

**Why this priority**: A burst of concurrent uploads is the realistic case for an external integration. Without serialization, ordering is non-deterministic and the user sees a shuffled rotation.

**Independent Test**: Fire N concurrent uploads to the public endpoint of the same organization and assert that the final `displayOrder` values form the sequence `max+1 … max+N` with no duplicates or gaps, and that the items reach the kiosk in that order.

**Acceptance Scenarios**:

1. **Given** an organization with existing items at positions 1, 2, 3, 4, **When** 20 concurrent uploads complete, **Then** the new items have `displayOrder` values 5, 6, …, 24 with no duplicates or gaps, and their order in the next display state fetch matches that sequence.
2. **Given** two organizations receiving concurrent uploads, **When** each organization gets 10 uploads in parallel, **Then** the uploads of one organization do not block or interfere with the other, and each organization's items maintain their own ordering.

---

### User Story 5 - Operator Can Observe That A New Upload Has Reached The Kiosk (Priority: P3)

When an external system uploads a new item, the operator can confirm the item has been received and is en route to display by checking the admin event log and the API key's `lastUsedAt` timestamp. The kiosk itself remains visually identical: the next transition is the only on-screen signal that new content has arrived. The kiosk does not freeze, jump, or reset its current item during the upload and poll cycle.

**Why this priority**: Helps operators trust the integration but is not strictly required for the feature to deliver value.

**Independent Test**: Upload a new item while the kiosk is open. Verify no overlay, toast, or badge appears on the kiosk. Within the bounded latency, the item appears on screen in the next transition. The currently displayed item is not interrupted. The `lastUsedAt` of the API key is updated; a `content_changed` event is recorded with `source=public_api`.

**Acceptance Scenarios**:

1. **Given** the kiosk is showing an item, **When** a poll returns updated state, **Then** the currently shown item does not change mid-display; the new state only affects the next transition, and the kiosk UI does not display any overlay, badge, or toast about the change.
2. **Given** the kiosk is in the middle of showing a video, **When** a poll returns state that does not include the video, **Then** the video continues playing until its natural end, then the next transition uses the new state.
3. **Given** an operator checks the admin event log after a successful upload, **When** they look at recent events, **Then** a `content_changed` event with `source=public_api` is present, attributed to the API key id.

---

## Edge Cases

### Authentication and authorization

- A request includes the `Authorization` header with a key that is well-formed but unknown to the server. **Expected**: 401 `invalid_api_key`, no file written, no entry in the database, no event recorded.
- A request uses a key that exists but has been marked inactive. **Expected**: 403 `inactive_api_key`, no file written, no event recorded.
- A request uses a key that belongs to a different organization than the one being targeted. **Expected**: Not applicable — keys are bound to a single organization, so the key inherently targets the right org. The server does not accept a target org from the client.
- A request omits the `Authorization` header entirely. **Expected**: 401 `missing_api_key`, no file written.
- A request includes the header but with a non-`Bearer` scheme (e.g., `Basic`). **Expected**: 401 `invalid_authorization_scheme`.

### Upload validation

- The client posts without a `file` field. **Expected**: 400 `file_required`.
- The client posts a `file` field with an empty payload. **Expected**: 400 `file_empty`.
- The client posts a `file` with a MIME type of `text/html` or any non-image, non-video type. **Expected**: 415 `unsupported_media_type`, no file written.
- The client posts a `file` whose declared MIME type is image but the actual content is not a recognized image format. **Expected**: The server applies the existing `validate_media_upload` rules. If validation fails, the file is removed and an error is returned.
- The client posts a file exactly at the configured size limit. **Expected**: 201 success.
- The client posts a file one byte over the configured size limit. **Expected**: 413 `media_too_large`, no file stored.
- The client posts without a `title` field, or with an empty string. **Expected**: 400 `title_required`, no file stored.
- The client posts with a title longer than the maximum allowed length. **Expected**: 400 `title_too_long`, no file stored.
- The client posts the same file twice in a row. **Expected**: Two distinct `TopContentItem` records with distinct `MediaFileReference` records and consecutive `displayOrder` values. No deduplication is performed.

### Concurrency

- 100 concurrent uploads hit the same organization at the same instant. **Expected**: All 100 succeed, each gets a unique consecutive `displayOrder` value, the order matches the order in which their transactions acquired the per-organization serialization lock.
- Concurrent uploads to two different organizations. **Expected**: No cross-org blocking, each org's sequence remains independent and contiguous.
- A concurrent upload and a content delete. **Expected**: Each request succeeds in isolation. If an upload's `displayOrder = max+1` is computed before a delete and committed after, the result is a gap; this is acceptable because the kiosk tolerates non-contiguous orders.

### Novelty queue behavior

- A burst of 200 uploads arrives while the kiosk is mid-display. **Expected**: All 200 are enqueued in arrival order, drained one by one in arrival order before the kiosk returns to the base rotation. No cap.
- An item in the novelty queue is deleted from the admin UI while it is waiting to be shown. **Expected**: The next poll detects the deletion, removes the item from the queue, and the kiosk transitions past it.
- An item in the novelty queue has its `availableUntil` set to the past. **Expected**: The next poll detects the item is no longer eligible, removes it from the queue, and the kiosk transitions past it.
- An item in the novelty queue is deactivated (`isActive = false`) from the admin UI. **Expected**: Same as deletion — the next poll removes it from the queue.
- The base rotation is reordered from the admin UI while the novelty queue is being drained. **Expected**: The reorder takes effect on the next base item, the queue is unaffected, and the kiosk finishes the queue before resuming the new base order.
- The currently displayed item is deleted from the admin UI. **Expected**: The next poll detects the deletion, advances the base pointer past the missing item, and the next transition uses the next eligible item.
- A poll arrives and finds no changes since the last poll. **Expected**: The kiosk does not restart the current item's timer; in-progress videos and the current display continue uninterrupted.
- The kiosk transitions to a new item, and 1.5 seconds later an upload completes. **Expected**: The pre-transition poll, scheduled 1 second before the next transition, catches the upload, the item is enqueued, and the next transition shows the new item instead of the next base item.
- The kiosk closes (Escape) and re-opens. **Expected**: The novelty queue and the base pointer are reset; the session starts fresh from the first item of the new eligible list.
- The kiosk is in novelty playback and more uploads arrive. **Expected**: The new uploads are appended to the existing queue and shown after the previously queued items, in arrival order.

### Latency and responsiveness

- The end-to-end latency from `POST /api/public/content/upload` returning 201 to the new item first appearing on the running kiosk is bounded. **Expected**: At p95, latency is no more than 6 seconds, given the configured 5-second poll interval and a 1-second pre-transition poll.

### Server errors and degraded behavior

- The database is temporarily unavailable when the kiosk polls. **Expected**: The kiosk keeps the previous state, retries on the next poll, and does not crash. The display continues with the current item.
- The disk is full and the file write fails. **Expected**: The server returns 500, no `TopContentItem` or `MediaFileReference` is committed, the partial file is removed, and the client can retry.
- The API key record is deleted from the database while a request is in flight. **Expected**: The request fails with 401 on next call; the in-flight request still validates against the snapshot it read at the start of the transaction.

### Multi-kiosk

- Two open kiosks view the same organization. A new upload arrives. **Expected**: Both kiosks detect the upload on their own poll cycles and both enqueue the new item independently. Each kiosk has its own novelty queue state.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Public upload endpoint

- **FR-001**: The system MUST expose `POST /api/public/content/upload`, accepting a `file` and a `title`, authenticated with `Authorization: Bearer <api_key>`.
- **FR-002**: The system MUST validate the API key on every request to the public endpoint before reading or writing any data.
- **FR-003**: The system MUST reject requests with a missing, malformed, or wrong-scheme `Authorization` header with 401 and a safe error code (`missing_api_key` or `invalid_authorization_scheme`).
- **FR-004**: The system MUST reject requests with an unknown or revoked key with 401 (`invalid_api_key`) or 403 (`inactive_api_key`) respectively, without exposing whether the key once existed.
- **FR-005**: The system MUST reject requests that omit the `file` field or send an empty file with 400 (`file_required` or `file_empty`).
- **FR-006**: The system MUST reject requests that omit or empty the `title` field with 400 (`title_required`).
- **FR-007**: The system MUST reject requests with a `title` longer than the configured maximum length with 400 (`title_too_long`).
- **FR-008**: The system MUST reject requests where the file's declared MIME type is not in the supported image or video set with 415 (`unsupported_media_type`).
- **FR-009**: The system MUST reject requests where the file exceeds the configured size limit for its declared type with 413 (`media_too_large`).
- **FR-010**: On a successful upload, the system MUST persist a `MediaFileReference` record and a `TopContentItem` record with `isActive = true` and `displayOrder = current_max + 1` for the organization, in a single transaction.
- **FR-011**: On a successful upload, the system MUST write the file to the configured media storage path under the organization's subdirectory, with a randomized filename to prevent collisions and path traversal.
- **FR-012**: On a successful upload, the system MUST return 201 with the created `TopContentItem` representation, including the assigned `displayOrder`.
- **FR-013**: The system MUST guarantee that concurrent uploads to the same organization produce consecutive `displayOrder` values with no gaps, duplicates, or races, by serializing the append operation per organization.
- **FR-014**: The system MUST record a display event of type `content_changed` with `source = public_api` on every successful upload, attributing the action to the API key for observability.
- **FR-015**: The system MUST update the API key's `lastUsedAt` timestamp only when the upload returns 201. Failed requests (auth failure, validation, oversized, unsupported MIME, missing title, server error) MUST NOT update `lastUsedAt`.
- **FR-016**: The system MUST NOT accept the organization as a request parameter; the organization MUST be derived solely from the API key.
- **FR-017**: The system MUST NOT expose internal paths, secrets, raw session data, or stack traces in any error response.
- **FR-017A**: The public endpoint MUST support configurable CORS via deployment configuration. The default allowlist MUST be empty (no cross-origin browser access). When non-empty, the endpoint MUST respond to CORS preflight (`OPTIONS`) with the configured origins, allow the `Authorization` and `Content-Type` headers, and allow the `POST` method. Credentials mode MUST NOT be enabled.

#### API key management (admin)

- **FR-018**: The system MUST expose admin-only endpoints to list, create, rotate, and revoke API keys, restricted to users with the administrator role.
- **FR-019**: On `POST /api/admin/api-keys`, the system MUST generate a cryptographically random key of at least 32 bytes, store a non-reversible hash of the key, store a short non-secret prefix for identification, and return the raw key value in the response **exactly once**.
- **FR-020**: On rotation, the system MUST atomically update the existing key row in place: replace `keyHash` and `keyPrefix` with newly generated values, set `lastRotatedAt` to the current time, and keep the same `id` and `label`. The previous key value MUST be invalidated on the next request. On revocation, the system MUST mark the row inactive (`isActive = false`) and set `revokedAt` to the current time; revoked keys MUST be rejected on the next request and cannot be re-enabled.
- **FR-021**: The system MUST display, in the admin UI, the key label, prefix, creation timestamp, last-rotated timestamp (when present), last-used timestamp, and active status, but never the raw key value after creation.
- **FR-022**: The system MUST support multiple active keys per organization.
- **FR-022A**: The system MUST record a `DisplayEvent` for every administrative action on an API key. Create and rotate produce `eventType=api_key_changed` with `severity=info`; revoke produces the same `eventType` with `severity=warning`. Each event MUST include `entityType=api_key`, `entityId=<api_key_id>`, `createdByUserId=<admin_user_id>`, and a non-secret payload containing the key label.

#### Kiosk live update

- **FR-023**: The kiosk client MUST poll `GET /api/display/state` at a configurable interval, defaulting to 5 seconds, while kiosk mode is active.
- **FR-024**: The kiosk client MUST detect newly added items by comparing the latest state to the previous state and enqueue them in arrival order, where "arrival order" is the order in which the items appear in the state response, sorted by `displayOrder` ascending.
- **FR-025**: The kiosk client MUST drain the novelty queue completely before returning to the base rotation.
- **FR-026**: The kiosk client MUST, 1 second before each scheduled transition, fire an additional poll to catch last-moment uploads. If the poll fails or returns late, the transition still occurs against the state in memory.
- **FR-027**: The kiosk client MUST NOT interrupt the currently displayed item when a poll returns updated state; the new state only affects the next transition.
- **FR-028**: The kiosk client MUST NOT restart the rotation timer when a poll returns state that is functionally identical to the previous state.
- **FR-030**: The kiosk client MUST reset the novelty queue and the base pointer when kiosk mode is opened or re-opened.
- **FR-031**: After the novelty queue is drained, the kiosk client MUST include the items that were shown as novelties in the regular base rotation, in their assigned `displayOrder` position.
- **FR-032**: The kiosk client MUST handle deletions, deactivations, and expirations of items in the novelty queue by removing them on the next poll and advancing to the next eligible item.
- **FR-033**: The kiosk client MUST tolerate transient network or server errors during polling by keeping the previous state and retrying on the next tick.

#### Existing endpoints preserved

- **FR-034**: The existing admin `POST /api/content/upload` endpoint MUST remain unchanged and continue to require the content management role and an explicit `displayOrder`.
- **FR-035**: The existing `GET /api/display/state` endpoint MUST remain the source of truth for kiosk display state, and the live update behavior MUST NOT require a new endpoint.
- **FR-036**: The existing `TopContentItem`, `MediaFileReference`, and `DisplayEvent` entities and their relationships MUST be preserved; only new entities and behaviors are added.

### Traceability & Quality Requirements *(mandatory)*

- **TQ-001**: Each functional requirement MUST map to at least one user story and one measurable success criterion.
- **TQ-002**: Changed behavior MUST have a testable validation method described in this specification or deferred to the implementation plan.
- **TQ-003**: Public, integration, data, and user-interface boundaries MUST list expected contracts in the corresponding contract artifact under `specs/009-public-content-api/contracts/`.
- **TQ-004**: Security, observability, and accessibility considerations MUST be captured as requirements, assumptions, or out-of-scope decisions.
- **TQ-005**: Speculative or future-scope behavior MUST be listed as out of scope rather than implemented implicitly.

### Key Entities *(include if feature involves data)*

- **ApiKey**: A long-lived credential that authenticates the public content upload endpoint on behalf of an organization. Has a label, a non-secret prefix for identification, a non-reversible hash of the full value, an active flag, a creation timestamp, a last-rotated timestamp (set whenever the key is rotated, null otherwise), a revoked timestamp (set when the key is revoked, null otherwise), and a last-used timestamp. Bound to a single organization.
- **MediaFileReference** *(existing)*: A persisted record of a file on disk. Unchanged by this feature except that the public endpoint now creates new instances of it.
- **TopContentItem** *(existing)*: A persisted record of an item in the top content rotation. Unchanged in shape; the public endpoint creates new instances with `isActive = true` and `displayOrder = max+1`.
- **DisplayEvent** *(existing)*: An operational record. The public endpoint appends events of type `content_changed` with `source = public_api` for observability.
- **Display Novelty Queue** *(client-side only, not persisted)*: A FIFO queue of items the kiosk client has not yet shown since they were detected in a poll. Exists only in the kiosk browser memory for the duration of one kiosk session. Reset on session open or re-open.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Given a running kiosk mode and a successful upload, the new item appears on screen within 6 seconds at p95, measured from the moment the upload response returns 201 to the moment the new item is first rendered.
- **SC-002**: 20 concurrent uploads to the same organization complete in under 10 seconds (wall clock) and produce `displayOrder` values that form a single contiguous sequence with no duplicates.
- **SC-003**: 100 concurrent uploads to the same organization complete with no request returning a server error and no two items sharing a `displayOrder`.
- **SC-004**: A burst of 200 sequential uploads to the same organization all appear on the running kiosk in arrival order before the base rotation resumes, with no item dropped or duplicated.
- **SC-005**: An administrator can create, list, rotate, and revoke an API key from the admin UI without page reloads and without engineering involvement, in under 60 seconds end to end.
- **SC-006**: An API key that has been revoked is rejected by the public endpoint on the very next request after revocation, with no grace period.
- **SC-007**: An attempt to upload without an `Authorization` header, with an invalid key, with an inactive key, with an oversized file, with an unsupported MIME type, or with a missing title returns the appropriate 4xx status and a safe user-facing error message, with no file stored and no database row created.
- **SC-008**: Two open kiosks viewing the same organization both show the new item within their respective poll cycles, with each kiosk maintaining an independent novelty queue.
- **SC-009**: Re-opening kiosk mode (Escape then re-enter) clears the novelty queue and the base pointer, and the kiosk starts from the first item of the new eligible list.
- **SC-010**: All existing approved kiosk behavior (admin UI, hall, login, role-based access, media serving) remains unchanged after the feature is deployed, validated by the existing test suites and manual smoke checks passing.

## Assumptions

- The target user of the public API is a trusted external system operated by the same organization or a known partner. The API key is treated as a bearer secret and rotated when needed; abuse mitigation beyond the key model is out of scope.
- The organization has exactly one kiosk display running at a time in the typical case. Multi-kiosk on the same organization is supported but is not the primary test scenario.
- The existing Postgres advisory lock infrastructure is acceptable for serializing the per-organization append operation. No additional coordination service is required.
- The existing media storage and validation path is reused. New file types and new storage backends are out of scope.
- Polling-based live update is acceptable for the kiosk experience. Lower-latency push mechanisms (SSE, WebSocket) are out of scope.
- Mobile phone layouts are not a target. The admin UI for API key management is required to be usable on desktop and tablet viewports, consistent with the rest of the admin experience.
- The existing display configuration knobs (default duration, animation, inline ad count) apply unchanged. No new display configuration fields are introduced.
- The existing test infrastructure (pytest for backend, Karma/Jasmine for frontend) is sufficient. No new testing toolchain is introduced.
- Existing local development, deployment, and CI workflows remain the baseline.
- The public endpoint is expected to be called by server-to-back systems in the typical case. Browser-based callers are supported only when the deployer explicitly opts in via the CORS allowlist.

## Out of Scope

- Per-key scopes (e.g., content-only vs ad-only). All keys for an organization are equivalent.
- API key expiry timestamps. Revocation is manual.
- Throttling or rate limiting at the application layer. Network-layer limits are acceptable.
- Per-key IP allowlists or other access controls.
- Webhooks or push notifications from the server to the client when uploads succeed.
- Uploading ads, iframes, or other content types beyond photos and videos through the public API.
- A public listing or retrieval endpoint (e.g., `GET /api/public/content`). Only the upload endpoint is exposed.
- A public delete or update endpoint. All mutations beyond create are admin-UI-only.
- Encryption of files at rest beyond the existing storage path.
- Multi-region replication or cross-organization content sharing.
- Analytics, billing, or usage dashboards for the public API.

## Superseded by

- `012-delete-revoked-api-keys` — hard-delete endpoint for revoked
  API keys.
- `016-preconfigured-iframes-and-video-end` — public endpoint never
  accepts `embedded_web`.
- `018-content-rotation-modes` — public endpoint silently ignores
  `isFixed` and `recurringEveryXIterations`; extension-based
  autodetect.

Amendment chain:
- `specs/_archive/C3-admin-shell/010-admin-polish-bundle/012-delete-revoked-api-keys/supersedes-009.md`
- `specs/016-preconfigured-iframes-and-video-end/supersedes-003.md`
  (covers the embedded_web removal)
- `specs/018-content-rotation-modes/supersedes-016.md` (covers
  silent-ignore of fixed/recurring flags and autodetect)
