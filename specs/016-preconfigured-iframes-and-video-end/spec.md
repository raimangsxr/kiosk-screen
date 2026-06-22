---
capability: C1-kiosk-display-runtime
supersedes:
superseded_by:
status: in-progress
oversize: false
---

# Feature Specification: Pre-configured Iframes and Video Plays To End

**Feature Branch**: `016-preconfigured-iframes-and-video-end`
**Spec Directory**: `specs/016-preconfigured-iframes-and-video-end/`
**Created**: 2026-06-20
**Status**: Draft
**Input**: User request: "Quiero cambiar cómo hemos implementado los iframes. En el display, la parte top, puede mostrar la rotación de content (photos y video) o bien un iframe permanente, que no cambia. En el panel de administración, en Content debe estar habilitado solo Photo y Video. En la sección de iframes, quiero pre-configurar una serie de iframes que en un momento dado del evento quiero poner en pantalla y que se queden fijos hasta que yo decida cambiarlos con el remote-control. El remote-control debe permitir poner en pantalla (la zona top) el Content o un iframe. Desde esta sección del panel de administración, debo poder seleccionar el iframe que quiero poner en pantalla en cada momento de los que había pre-configurado y también debo poder volver a poner el modo rotación de Content, que debería continuar en el índice que estaba antes de cambiarse a mostrar el modo iframe. Por último, con respecto a Content de tipo video, cuando la rotación de content pone un video, este debe empezar a reproducirse automáticamente y no debe pasarse al siguiente elemento de Content hasta que el video termine, es decir, en cuanto termine el video, se cuentan 2 segudos y se pasa al siguiente elemento."

## Clarifications

### Session 2026-06-20

- Q1: Where should the rotation cursor live so that switching to iframe and back resumes Content at the same index? → A: Client-side memory. The kiosk keeps the rotation cursor in the browser session; switching to iframe freezes it; switching back to loop resumes that same item with a fresh timer. The cursor is lost on kiosk page reload.
- Q2: Should the 2-second delay between a video ending and advancing to the next item be configurable? → A: Yes. Add a new `videoEndDelaySeconds` knob on the kiosk display configuration (default 2, range 0–30).
- Q3: Are iframes subject to any approval/allow-list? → A: No. The entire iframe domain-approval system is removed. Every iframe that an admin creates is valid until it is deleted. The `ApprovedEmbeddedDomain` table, its admin UI, the `/api/approved-domains` endpoints, and the "unapproved embedded domain" readiness check are all removed.
- Q4: Should iframes carry metadata (title, approval FK, display order, availability window, active flag)? → A: No. An iframe is a single `url` string, unique per organization, with audit fields. No `isActive` field: the only way to "disable" an iframe is to delete it. There is no ordering or rotation: the remote control lists all iframes; the operator picks one.
- Q5: When switching from iframe mode back to Content rotation, what happens to the timer of the anchor item that was on screen? → A: The item's display timer restarts from 0. The kiosk plays the full configured duration of that item before advancing, even if the elapsed time in iframe mode was much longer.
- Q6: What is the fallback behaviour for a video that never fires the `ended` event (load error, autoplay blocked, live stream)? → A: No fallback. The kiosk stays on that video. The operator must use the remote control to change the content or hide ads/full-reload the kiosk. There is no watchdog timer in this version.
- Q7: What happens if the iframe currently selected on the kiosk is deleted by an admin? → A: The server detects the dangling reference on the next read of the display state, clears the selection (`contentMode='loop'`, `selectedIframeId=null`) on the active `DisplayControlState`, and the kiosk resumes Content rotation on its next poll. An audit event `remote_control_iframe_deleted` is recorded.
- Q8: Which role may manage iframes? → A: The same role that manages Content (`content_manager` and `administrator`).
- Q9: Should the public content API be affected? → A: No. The public upload endpoint remains photo+video only. Only the admin/remote-control surfaces change.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pre-configure iframes from admin (Priority: P1)

An administrator opens the admin site, navigates to the new "Iframes" section, and pre-configures one or more iframes by entering a URL. The list grows over the life of the event; the administrator can edit a URL or delete an iframe at any time. An iframe is not approved, scheduled, or ordered — it is a flat list of available URLs that the operator may pin to the kiosk at runtime.

**Why this priority**: Without a list of pre-configured iframes, the rest of the feature has nothing to select from. This is the foundation of the new model.

**Independent Test**: Sign in as `content_manager`. Navigate to `/admin/iframes`. Create an iframe `https://example.com/stream-a`. Verify it appears in the list. Edit it to `https://example.com/stream-b`. Delete it. Verify the list updates and the deletion is reflected in the API.

**Acceptance Scenarios**:

1. **Given** an authenticated `content_manager` on `/admin/iframes`, **When** they submit a new iframe URL through the form, **Then** the iframe appears in the list and is available to remote control within the same session.
2. **Given** an existing iframe, **When** the administrator updates its URL, **Then** the next list view shows the new URL and the next remote-control options list also reflects it.
3. **Given** an existing iframe, **When** the administrator deletes it, **Then** the iframe is removed from the admin list and from the remote-control options. If it was the active iframe on the kiosk, the kiosk returns to Content rotation on its next state poll.
4. **Given** two iframes with the same URL in the same organization, **When** the administrator attempts to save the second, **Then** the form rejects the submission with a clear "URL already exists" message.
5. **Given** a `display_viewer` or `event_operator` role, **When** the user navigates to `/admin/iframes`, **Then** the page is not accessible.

---

### User Story 2 - Display only Photo and Video in Content admin (Priority: P1)

The Content section of the admin site must support only photos and videos. The previous "Embedded web (iframe)" content type is removed entirely; iframes are no longer managed from the Content section.

**Why this priority**: The separation between Content (rotating media) and Iframes (a fixed URL pin) is the conceptual split this feature introduces. Without removing the iframe content type, the operator would have two ways to add the same thing, which is exactly the confusion the user wants to fix.

**Independent Test**: Sign in as `content_manager`. Open the Content list. Verify there is no "Iframe" type filter and no iframe rows. Open the new/edit Content form. Verify the "Type" dropdown contains only `Photo` and `Video`. Verify a form submission for an `embedded_web` (legacy) type is rejected by the API.

**Acceptance Scenarios**:

1. **Given** the Content list, **When** an administrator filters by type, **Then** the available types are `Photo` and `Video` only.
2. **Given** the Content form, **When** the administrator opens the "Type" dropdown, **Then** the only options are `Photo` and `Video`.
3. **Given** the Content form, **When** the administrator submits a photo or video, **Then** the API accepts the request and the item appears in the list.
4. **Given** an external caller attempts to create a Content item with `contentType='embedded_web'`, **When** the API processes the request, **Then** the request is rejected with HTTP 400 and a clear error message.

---

### User Story 3 - Switch the kiosk top zone between Content rotation and a fixed iframe (Priority: P1)

The remote control panel must allow an operator to choose what the kiosk shows in the top zone: the normal Content rotation, or one of the pre-configured iframes pinned until further notice. The top zone is mutually exclusive — it never shows both at the same time, and a pinned iframe does not advance, rotate, or time out.

**Why this priority**: This is the operator-facing value: during the event, the operator can swap the rotating content for a live stream, a sponsor page, or any other URL without touching the kiosk device.

**Independent Test**: With the kiosk running on `/display` and a remote control on `/admin/remote-control`, pick a pre-configured iframe from the list. Within the configured polling interval (1–60s) the kiosk top zone must switch to that iframe. Verify the iframe stays on screen until the operator picks a different iframe or returns the kiosk to Content mode. Pick "Rotation"; the kiosk returns to Content rotation.

**Acceptance Scenarios**:

1. **Given** the kiosk is in Content rotation mode, **When** the operator selects an iframe in remote control, **Then** the kiosk top zone switches to the selected iframe within one polling interval and stays there.
2. **Given** the kiosk is in iframe mode, **When** the operator selects a different iframe, **Then** the kiosk top zone switches to the new iframe on the next poll.
3. **Given** the kiosk is in iframe mode, **When** the operator selects "Rotation", **Then** the kiosk returns to Content rotation and continues at the same index where it left off, with a fresh timer for the anchor item.
4. **Given** the kiosk is in iframe mode, **When** the operator refreshes the remote control page, **Then** the current mode and selected iframe are shown in the UI.
5. **Given** the kiosk is in iframe mode, **When** the operator hides ads, **Then** the top zone expands to full height (existing behaviour) and the iframe continues to fill the full top zone.

---

### User Story 4 - Videos play to end before advancing (Priority: P1)

When the Content rotation is showing a video, the video must auto-play, and the kiosk must not advance to the next Content item until the video finishes. After the video ends, the kiosk waits a configurable number of seconds (default 2) and then advances to the next item.

**Why this priority**: This is what makes videos legible in a live setting. The current implementation truncates videos at a fixed timer, which can cut a 30-second sponsor message mid-sentence. The new behaviour respects the media's own end signal.

**Independent Test**: Add a 30-second video to the Content rotation. Set `videoEndDelaySeconds=2`. Watch the kiosk. The video must play in full, the kiosk must wait 2 seconds after the video's natural end, and then advance to the next item.

**Acceptance Scenarios**:

1. **Given** a Content item of type `video` is being shown, **When** the rotation picks it up, **Then** the video auto-plays muted, fills the top zone, and does not loop.
2. **Given** the video is playing, **When** the video reaches its natural end, **Then** the kiosk waits `videoEndDelaySeconds` (default 2) and then advances to the next Content item.
3. **Given** the video is playing, **When** the operator changes the remote control mode, **Then** the video is replaced by the new content per the remote control.
4. **Given** `videoEndDelaySeconds=0`, **When** the video ends, **Then** the kiosk advances to the next Content item immediately (no wait).
5. **Given** `videoEndDelaySeconds=30` (the documented maximum), **When** the video ends, **Then** the kiosk waits 30 seconds and then advances.

---

### User Story 5 - Resume Content rotation at the same index after iframe (Priority: P2)

When the operator returns the kiosk from iframe mode to Content rotation, the rotation must continue at the same index where it was before the switch. The item that was on screen when the operator first switched to iframe is the first item the kiosk shows again on return, and its full display duration is replayed before advancing.

**Why this priority**: This is the operator's expectation: "continue at the index it was before switching to iframe mode". Without it, returning from iframe would jump the rotation unpredictably.

**Independent Test**: Add three photos with 10-second display durations each. With the kiosk in Content rotation, let it show photo #2 for 4 seconds. Switch to iframe mode for 30 seconds. Switch back to Content mode. The kiosk must resume on photo #2 and play it for 10 full seconds before advancing to photo #3.

**Acceptance Scenarios**:

1. **Given** the kiosk was on photo #2 when switched to iframe mode, **When** the operator switches back to Content mode, **Then** photo #2 is shown again, and its display timer restarts from 0 (full duration).
2. **Given** the kiosk was on photo #2 when switched to iframe mode, **When** photo #2 has been deleted from the Content list while the kiosk was in iframe mode, **Then** the kiosk advances to the next available Content item per the existing novelty-queue rules.
3. **Given** a new Content item was added while the kiosk was in iframe mode, **When** the operator switches back to Content mode, **Then** the novelty item is shown next per the existing novelty-queue rules.

---

### User Story 6 - Configure the video end delay from display configuration (Priority: P2)

The display configuration form gains a new field `Video end delay (seconds)` that controls how long the kiosk waits after a video's natural end before advancing. The value applies hot — the kiosk picks up changes on its next poll.

**Why this priority**: The default of 2 seconds is sensible, but operators of long-form events (talks, performances) may want a longer pause, while operators of fast-paced content (sponsor reels) may want zero.

**Independent Test**: In `/admin/display-config`, change `Video end delay (s)` from 2 to 10. Play a video on the kiosk. After the video's natural end, the kiosk must wait 10 seconds before advancing.

**Acceptance Scenarios**:

1. **Given** a `content_manager` on `/admin/display-config`, **When** they save `videoEndDelaySeconds=5`, **Then** the kiosk's next video plays fully and waits 5 seconds after `ended` before advancing.
2. **Given** an attempt to save `videoEndDelaySeconds=-1` or any value outside the 0–30 range, **When** the form is submitted, **Then** the API rejects the request with HTTP 400 and the form shows a clear validation error.
3. **Given** a new deployment with no configuration yet, **When** the kiosk starts, **Then** `videoEndDelaySeconds` defaults to 2.

---

### Edge Cases

- **Kiosk reloads while in iframe mode**: the kiosk loses its client-side rotation cursor. After reload, the kiosk still shows the iframe (the server-pinned state is the source of truth for iframe mode). When the operator later returns to Content mode, the kiosk starts at the first item in `topContent`. (This is the documented trade-off of the chosen "client-side cursor" model.)
- **Same URL added twice**: rejected with a clear "URL already exists" message; the form does not allow the duplicate.
- **Iframe selected and then deleted**: server clears the kiosk state on the next read and the kiosk returns to Content rotation; an audit event is recorded.
- **Video is unplayable (codec error, autoplay blocked, 404)**: the kiosk stays on the broken video (no fallback per Q6). The operator must use the remote control to change the content.
- **Two operators change the remote control at nearly the same time**: the server applies "last valid change wins", consistent with the existing remote-control contract from spec 006.
- **Top content list is empty but the kiosk is in Content rotation mode**: the kiosk shows an empty top zone; the bottom ad region continues to cycle (existing behaviour, unchanged).
- **Kiosk has no iframes configured and the operator opens remote control**: the iframe selector shows an empty-state CTA linking to `/admin/iframes/new` (the operator can still pick "Rotation").

## Requirements *(mandatory)*

### Functional Requirements

#### Iframe pre-configuration

- **FR-001**: System MUST provide an admin section to manage a flat list of pre-configured iframes, accessible to roles `content_manager` and `administrator`.
- **FR-002**: Each iframe MUST be identified by a stable ID, belong to one organization, and store exactly one `url` (string, up to 1024 characters) plus audit metadata (created/updated timestamps and user IDs).
- **FR-003**: The `url` value MUST be unique per organization.
- **FR-004**: System MUST validate the URL format on create and update. Validation MUST reject empty strings, malformed URLs, and non-`http(s)` schemes.
- **FR-005**: System MUST NOT require any approval, allow-list, scheduled window, ordering, or active/inactive flag for an iframe. Any URL that passes FR-004 is valid until the iframe is deleted.
- **FR-006**: System MUST allow the administrator to edit the URL of an existing iframe and to delete an iframe.
- **FR-007**: On iframe deletion, if any active display session currently has that iframe selected, the system MUST clear the selection (`contentMode='loop'`, `selectedIframeId=null`) on the active `DisplayControlState` and record a `remote_control_iframe_deleted` audit event.

#### Content: drop iframe content type

- **FR-008**: System MUST remove `embedded_web` (iframe) as a content type from the admin Content section. The remaining content types are `photo` and `video`.
- **FR-009**: The Content form MUST offer only `Photo` and `Video` as type options.
- **FR-010**: The Content list filter MUST expose only `Photo` and `Video`.
- **FR-011**: System MUST reject any attempt to create or update a Content item with `contentType='embedded_web'` (admin and public API) with HTTP 400 and a clear error message.

#### Remote control: pick Content or iframe

- **FR-012**: The remote control MUST offer the operator a mutually exclusive choice between "Rotation" (Content) and any of the pre-configured iframes.
- **FR-013**: When the operator selects an iframe, the kiosk top zone MUST show that iframe and MUST NOT advance, rotate, or apply a display timer to it.
- **FR-014**: When the operator selects "Rotation", the kiosk MUST return to Content rotation and resume at the same index where the rotation was when the operator previously switched to iframe mode. The anchor item's display timer MUST restart from 0.
- **FR-015**: The remote control MUST display the current mode and (when applicable) the currently selected iframe to the operator, refreshing from the server on poll.
- **FR-016**: The remote control MUST offer an empty-state action linking to `/admin/iframes/new` when no iframes exist.

#### Video playback: play to end + configurable delay

- **FR-017**: When a Content item of type `video` enters the rotation, the kiosk MUST auto-play the video (muted), fill the top zone with it, and MUST NOT loop the video.
- **FR-018**: The kiosk MUST NOT advance from a video Content item until the video emits its natural `ended` event. The kiosk MUST then wait `videoEndDelaySeconds` (default 2, range 0–30) before advancing to the next Content item.
- **FR-019**: System MUST expose `videoEndDelaySeconds` on the kiosk display configuration form (`/admin/display-config`). The value MUST be an integer in the inclusive range 0–30.
- **FR-020**: The kiosk MUST pick up changes to `videoEndDelaySeconds` on its next state poll, with no kiosk restart required.

#### Removal of the iframe approval system

- **FR-021**: System MUST remove the `ApprovedEmbeddedDomain` table, its model, its admin CRUD endpoints, the `/admin/domains` admin UI, the "Iframe domains" admin sidenav entry, and the "unapproved embedded domain" readiness check.
- **FR-022**: No code path MUST attempt to validate an iframe URL against an `ApprovedEmbeddedDomain` after this feature ships.

#### Authorisation

- **FR-023**: All iframe admin endpoints MUST require the `content_manager` or `administrator` role. Other authenticated roles MUST receive HTTP 403.
- **FR-024**: The remote control iframe selection MUST remain restricted to roles that already have remote-control access (`event_operator` and `administrator` per spec 006).
- **FR-025**: The remote-control page MUST allow an operator to request fullscreen on the running display and clear that request. The display MUST attempt to apply the request on its next state update while tolerating browser-level Fullscreen API rejection.

### Traceability & Quality Requirements *(mandatory)*

- **TQ-001**: Each functional requirement MUST map to at least one user story and one measurable success criterion in this specification.
- **TQ-002**: Changed behaviour MUST have a testable validation method (unit test, integration test, or documented manual smoke) called out in the implementation plan.
- **TQ-003**: Public and integration boundaries (admin API, public content API, kiosk polling API, remote-control API) MUST be documented in the implementation plan and tested at the boundary.
- **TQ-004**: Security, observability, and accessibility considerations MUST be captured as requirements, assumptions, or out-of-scope decisions. The only security-relevant change is the removal of the iframe domain allow-list (see FR-021, FR-022, and the Assumptions section). Observability is satisfied by the `remote_control_iframe_deleted` audit event.
- **TQ-005**: Speculative or future-scope behaviour (e.g., iframe scheduling, iframe ordering, iframe re-approval, watchdog timer for stuck videos) MUST be listed as out of scope rather than implemented implicitly.

### Key Entities *(include if feature involves data)*

- **Iframe**: A pre-configured URL the operator can pin to the kiosk top zone.
  - Attributes: `id` (UUID), `organizationId` (UUID), `url` (string, ≤1024, unique per organization), `createdAt` (timestamp), `updatedAt` (timestamp), `createdByUserId` (UUID), `updatedByUserId` (UUID).
  - Relationships: An Iframe may be referenced by zero or one active `DisplayControlState` at a time.
  - No `title`, no `isActive`, no `approvedDomainId`, no `displayOrder`, no `availableFrom`/`availableUntil`.

- **DisplayControlState (existing, modified)**: The per-display-session state of the remote control.
  - New attribute: `selectedIframeId` (UUID, nullable, FK to `Iframe.id`, `ON DELETE SET NULL`).
  - Existing attribute `selectedContentId` is removed.
  - The state is one of: `contentMode='loop'` (Content rotation, no iframe pinned) or `contentMode='iframe'` (an iframe is pinned, `selectedIframeId` is non-null).

- **TopContentItem (existing, modified)**: A rotating media item shown in the top zone.
  - The `contentType` enum is reduced to `photo` and `video` only. `embedded_web` is no longer a valid value.

- **KioskDisplayConfiguration (existing, modified)**: The kiosk's display preferences.
  - New attribute: `videoEndDelaySeconds` (integer, 0–30, default 2).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can create, edit, and delete an iframe from `/admin/iframes` in three or fewer clicks from the admin landing page.
- **SC-002**: An operator can switch the kiosk from Content rotation to a pre-configured iframe, and back, and the kiosk reflects the new mode within one polling interval (≤ 60 seconds, configured by the operator).
- **SC-003**: After switching the kiosk to iframe mode and back, the kiosk resumes the rotation on the same Content item that was on screen at the moment of the switch, and that item plays for its full configured duration before advancing.
- **SC-004**: A video Content item always plays to its natural end before the kiosk advances, with a post-end pause of exactly `videoEndDelaySeconds` seconds (verified by manual timing against the video's actual duration ± 1 second).
- **SC-005**: The Content admin section exposes only `Photo` and `Video`. A request to create a `Content` of type `embedded_web` is rejected with HTTP 400, regardless of source (admin or public API).
- **SC-006**: After this feature ships, no code path, route, UI page, or migration references the `ApprovedEmbeddedDomain` table, the `/admin/domains` route, or the `/api/approved-domains` endpoints (verified by an automated search of the codebase returning zero results).
- **SC-007**: Deleting an iframe that is currently selected on the kiosk causes the kiosk to return to Content rotation within one polling interval; an audit event `remote_control_iframe_deleted` is recorded with the iframe's `id`, the kiosk's `displaySessionId`, and the deleting administrator's `userId`.

## Assumptions

- The kiosk polls `GET /api/display/state` on a configurable interval (1–60 seconds, default 3, per spec 006). That polling cadence is the freshness bound for SC-002. No real-time push channel is introduced.
- The kiosk's client-side rotation cursor survives an iframe toggle but not a kiosk page reload (Q1). This is the documented trade-off; if the operator reloads the kiosk during the event, the rotation restarts at the first item in `topContent` when they return to Content mode.
- The existing novelty-queue rules from spec 009 (a fresh upload is shown next; after the queue is drained, the base rotation resumes) apply unchanged to Content items that are added or removed while the kiosk is in iframe mode. SC-003 and the relevant acceptance scenarios above are the explicit guarantees.
- Videos are played by the kiosk's browser using the standard HTML5 video element (auto-play, muted, no looping). The browser is responsible for emitting the `ended` event when the video finishes playing. The kiosk does not attempt to parse the video duration server-side; the contract is "advance when the browser says the video is done."
- Iframes are rendered in the kiosk's top zone inside an `<iframe>` element. The kiosk applies standard URL sanitisation to satisfy the browser's same-origin policy, but no further policy is enforced: there is no domain allow-list, no sandboxing policy, and no referrer restriction in this version. The decision to remove domain approval (Q3) is the explicit product choice; the security and content-trust trade-off is owned by the event operator.
- The kiosk must be reachable from the iframe's source domain in order to render that iframe (cross-origin framing). This is the operator's responsibility; the system does not detect or report cross-origin framing failures.
- The polling interval, top-zone default duration, ad-zone default duration, and other display configuration knobs from spec 006 and its successors continue to apply unchanged, except for the new `videoEndDelaySeconds` field added by this feature.
- The existing public content API (spec 009) is unaffected by this feature. The public upload endpoint remains `photo` and `video` only. The novelty-queue and live-update contract remain as written.
- The `videoEndDelaySeconds` value applies to all videos on the kiosk uniformly; per-video overrides are explicitly out of scope (TQ-005).
- Future-scope items (TBD, not implemented): iframe scheduling (showing an iframe at a specific time of day), iframe ordering (a defined rotation among iframes), iframe re-approval workflow, watchdog timer for stuck videos, iframe sandboxing, sandbox/allow attribute policy, and referrer policy.
