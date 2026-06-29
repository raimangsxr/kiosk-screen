---
id: CHG-023
type: change
status: draft
modifies:
  - EVENT.BRANDING
  - DISPLAY.RUNTIME
depends_on:
  - CHG-019
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
source_of_truth: false
read_by_default: true
requires_contract_update: true
oversize: false
---

# Feature Specification: Event Branding Layout

**Feature Branch**: `023-event-branding-layout`
**Created**: 2026-06-28
**Status**: Draft
**Input**: User description: "En Event (panel de administración), quiero añadir al formulario campos para controlar Logo size, Logo position (x e y), Logo transparency, Logo borders round, Event name size, Event name position, Event name transparency, Event name borders round. Debe ser dinámico: en cuanto se cambie en el panel de administración debe reflejarse en el display."

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `EVENT.BRANDING`, `DISPLAY.RUNTIME`
- Context pack: `context-pack.md` (to be created at planning time)
- Contract update required before implementation: yes (`EVENT.BRANDING`)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Admin configures organizer logo layout (Priority: P1)

From the Event administration panel, the operator can adjust five
visual properties of the organizer logo that appears in the kiosk
branding overlay: size, horizontal position, vertical position,
transparency, and border radius. The form validates the inputs, the
backend stores them, and the kiosk renders the new look without a
manual reload.

**Why this priority**: the operator today can only upload or remove
the logo; the size, position and styling are fixed in CSS. The
operator has been requesting per-event control over the logo's
visual treatment for branding consistency with their event
identity.

**Independent Test**: with default branding, the kiosk renders the
logo at the top-left of the overlay. After the operator changes the
logo size to `4vh`, the X position to `2vw`, the transparency to
`80`, and saves, the next branding refresh (≤
`remoteControlPollingSeconds` seconds, default 3s) re-renders the
logo at the new coordinates with the new opacity.

**Acceptance Scenarios**:

1. **Given** the operator is on the Event configuration form with a
   logo uploaded, **When** they set `logoSize=4`, `logoX=2`,
   `logoY=0`, `logoTransparency=80`, `logoBorderRadius=2` and
   save, **Then** the backend returns HTTP 200 with the saved
   values and the kiosk's logo (on its next branding refresh) is
   sized at 4 vh, positioned 2 vw from the overlay's left edge, at
   0 vh from the top, with `opacity: 0.8` and a 2 vh border radius.
2. **Given** the operator saves a `logoSize` outside `[1, 50]` vh,
   **When** they submit, **Then** the form rejects the value with
   a clear inline error and the PUT request is never sent.
3. **Given** the operator saves a valid `logoX=120` vw,
   **When** they submit, **Then** the backend returns HTTP 400 with
   a message identifying the field and the valid range, and the
   form displays the server error without losing the other values.

---

### User Story 2 — Admin configures event name layout (Priority: P1)

From the same Event administration panel, the operator can adjust
five visual properties of the event name pill that appears in the
kiosk branding overlay: size, horizontal position, vertical
position, transparency, and border radius. Same validation, same
dynamic reflection as the logo controls.

**Why this priority**: the event name is the most visible identity
element of the running event. Operators need the same level of
control as for the logo.

**Independent Test**: with default branding, the kiosk renders the
event name at the top-right of the overlay. After the operator
changes the event name X position to `60` vw, the next branding
refresh moves the pill to that horizontal coordinate (still
right-aligned within its element).

**Acceptance Scenarios**:

1. **Given** the operator sets `eventNameSize=2`,
   `eventNameX=60`, `eventNameY=0`, `eventNameTransparency=100`,
   `eventNameBorderRadius=0` and saves, **Then** the kiosk
   re-renders the event name with font-size driven by 2 vw, 60 vw
   from the overlay's left edge, full opacity, and zero border
   radius.
2. **Given** no event name is configured (empty string),
   **When** the operator opens the form, **Then** the event name
   layout fields are still editable but the kiosk renders no event
   name pill (current behavior preserved).

---

### User Story 3 — Kiosk reflects layout changes dynamically (Priority: P1)

After the operator saves a change in the admin form, the kiosk
running in a separate browser tab must reflect the new layout
without a manual reload, and within a bounded latency.

**Why this priority**: the operator manages the kiosk during a live
event; asking the operator to manually reload the kiosk to see a
change defeats the purpose of having a remote control panel.

**Independent Test**: with the kiosk open at 1920×1080 and the
operator changing `logoSize` from `6` to `12`, the logo's rendered
height becomes `12vh` within at most `remoteControlPollingSeconds`
seconds (default 3s) and never requires an F5 or a navigation
event.

**Acceptance Scenarios**:

1. **Given** the kiosk is open in tab A and the admin form in tab B,
   **When** the operator saves a new layout in tab B,
   **Then** tab A's overlay re-renders with the new values within
   at most `remoteControlPollingSeconds` seconds.
2. **Given** the kiosk is in portrait mode, **When** the operator
   saves a new layout, **Then** the layout is fetched and stored in
   the kiosk's state, but the overlay is not rendered until the
   device rotates back to landscape (current portrait behavior
   preserved).
3. **Given** the kiosk is in iframe mode, **When** the operator
   saves a new layout, **Then** the layout is fetched but the
   overlay is not rendered (current iframe-mode behavior preserved).

---

### User Story 4 — Backend rejects invalid values with HTTP 400 (Priority: P2)

When the admin submits out-of-range values (either via direct API
call or via the form), the backend returns a clear HTTP 400 with
a field-keyed error message identifying which field failed and the
valid range.

**Why this priority**: silent clamping produces surprising visual
results; explicit errors give the operator a chance to fix the
input. This is a quality gate that prevents data corruption.

**Independent Test**: with a logged-in operator, `PUT
/api/event-configuration` with `logoX=200` returns HTTP 400 with
a body whose `detail` mentions `logoX` and the range `[0, 100]`.

**Acceptance Scenarios**:

1. **Given** the operator sends `logoSize=0`, **When** the backend
   validates, **Then** the response is HTTP 400 with
   `detail="logoSize must be between 1 and 50 (vh)."`
2. **Given** the operator sends `logoTransparency=150`,
   **When** the backend validates, **Then** the response is HTTP
   400 with `detail="logoTransparency must be between 0 and 100."`.
3. **Given** the operator sends a malformed `logoLayout` (e.g.,
   missing required subfield `size`), **When** the backend
   validates, **Then** the response is HTTP 422 with Pydantic's
   standard validation error envelope.

---

### User Story 5 — Existing events preserve the current visual default (Priority: P2)

Events created before this change (with no layout fields stored)
must continue to render exactly as today: logo at top-left with
the current clamp() defaults, event name at top-right with the
current pill style.

**Why this priority**: silent visual changes during deployment
generate support tickets. The contract guarantee here is that
existing operators see no change until they touch the form.

**Independent Test**: an event with no `logoLayout` and no
`eventNameLayout` stored renders the same DOM and computed styles
as before this change at 1280×720, 1920×1080, and 3840×2160.

**Acceptance Scenarios**:

1. **Given** an existing event row with `logo_layout IS NULL` and
   `event_name_layout IS NULL`, **When** the kiosk polls
   `/api/event-branding`, **Then** the response omits the
   `logoLayout` and `eventNameLayout` fields, the kiosk's CSS
   custom properties fall back to the same defaults as before, and
   the rendered DOM and computed styles match the pre-change
   baseline.
2. **Given** an existing event, **When** the operator opens the
   admin form, **Then** the form shows the current visual default
   values pre-populated (e.g., `logoSize=6`, `eventNameX=80`)
   so the operator sees the current state and can adjust from
   there.

---

### Edge Cases

- The operator submits the form with the layout fields empty /
  blank; the backend accepts an empty / null layout and the kiosk
  falls back to the current default visual look.
- The operator uploads a new logo while the kiosk is mid-poll;
  the next branding refresh picks up both the new logo URL and
  the existing layout (the two are independent).
- The operator clears the layout fields after setting them; the
  backend stores NULL and the kiosk reverts to defaults.
- The kiosk is offline / unreachable when the operator saves; the
  PUT succeeds server-side and the kiosk picks up the change on
  its next successful poll cycle.
- The layout fields are introduced in the database while a long
  PUT request is in flight; Alembic adds the columns with
  `NULL` default and existing rows are not blocked.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `event_configurations` table MUST add two new
  nullable JSON columns: `logo_layout` and `event_name_layout`,
  each defaulting to `NULL` (meaning "use visual defaults").
- **FR-002**: The backend MUST expose a Pydantic model
  `BrandingLayout` with five optional numeric fields: `size`,
  `x`, `y`, `transparency`, `borderRadius`. Each field MUST have
  an explicit range constraint enforced at the API boundary.
- **FR-003**: The backend MUST reject PUT requests whose layout
  fields fall outside the allowed ranges with HTTP 400 and a
  field-keyed `detail` message; it MUST NOT silently clamp.
- **FR-004**: The backend MUST include `logoLayout` and
  `eventNameLayout` in the response of `GET /event-configuration`
  and `GET /event-branding`, omitting the fields when the
  corresponding column is NULL.
- **FR-005**: The backend MUST accept `logoLayout` and
  `eventNameLayout` in the PUT request payload (multipart
  FormData fields, serialized as JSON strings, to remain
  consistent with the current PUT shape).
- **FR-006**: The admin form (`EventConfigComponent`) MUST add ten
  new controls: `logoSize`, `logoX`, `logoY`, `logoTransparency`,
  `logoBorderRadius`, `eventNameSize`, `eventNameX`,
  `eventNameY`, `eventNameTransparency`, `eventNameBorderRadius`,
  each with client-side range validators matching the backend
  ranges and inline error messages on violation.
- **FR-007**: The admin form MUST pre-populate the controls with
  the current visual default values when the API returns NULL
  layout, so the operator sees a stable starting point.
- **FR-008**: The kiosk overlay component MUST read the layout
  values from the polled `EventBranding` snapshot and bind them
  as CSS custom properties on the overlay container, so the
  overlay's logo and event-name re-render without template or
  controller changes.
- **FR-009**: The kiosko's branding refresh cadence MUST remain
  the same as today (one refresh per `remoteControlPollingSeconds`
  cycle); no new polling endpoint or websocket is introduced.
- **FR-010**: The new layout fields MUST NOT regress the existing
  iframe-mode hiding, the existing portrait-prompt hiding, or the
  existing broken-logo self-hide behavior of the overlay.
- **FR-011**: The kiosk's CSS for the overlay MUST apply the
  layout values as `calc(var(--*) * 1vh)` / `1vw` expressions so
  the new layout scales identically to the existing fluid CSS.
- **FR-012**: When the API returns no layout fields (NULL), the
  kiosko's CSS MUST use the current visual defaults as the CSS
  custom property values, so existing events render identically
  to today.

### Traceability & Quality Requirements *(mandatory)*

- **TQ-001**: The `EVENT.BRANDING` active contract MUST be
  updated before implementation begins to record the new public
  surface (`BrandingLayout`, the expanded `EventConfigurationSchema`,
  the expanded `EventBrandingSchema`, the new PUT fields).
- **TQ-002**: An Alembic migration MUST add the two JSON columns
  with `NULL` default; the migration MUST be safe to run while
  the backend is serving traffic.
- **TQ-003**: The change MUST include automated tests covering:
  the new field round-trips, the range validation, the kiosk
  CSS custom property binding, the default-look preservation, and
  the existing overlay behavior regressions (iframe / portrait /
  broken-logo).
- **TQ-004**: The manifest entry MUST list `CHG-023` as
  `in-progress` while the change is open and must move to
  `consolidated` once the change is accepted and the contract is
  updated.
- **TQ-005**: Durable technical rationale (e.g., the choice of
  vh/vw units and the polling-based propagation) MUST be added to
  `docs/adr/` if it is not already covered by an existing ADR.

### Key Entities *(include if feature involves data)*

- **`BrandingLayout`** (new, in `backend/app/api/schemas.py`): a
  Pydantic model with five optional numeric fields.
  - `size`: number, range `1..50` (interpreted as `vh` for the
    logo, `vw` for the event name).
  - `x`: number, range `0..100` (interpreted as `vw` from the
    overlay's left edge for both elements).
  - `y`: number, range `0..100` (interpreted as `vh` from the
    overlay's top edge).
  - `transparency`: integer, range `0..100` (percent, applied as
    `opacity: transparency / 100`).
  - `borderRadius`: number, range `0..50` (interpreted as `vh`).
  - All fields are optional; a fully-empty object is valid and
    means "use visual defaults".
- **`EventConfiguration.logoLayout`** (new column): nullable
  JSON, stores the `BrandingLayout` for the organizer logo.
- **`EventConfiguration.eventNameLayout`** (new column): nullable
  JSON, stores the `BrandingLayout` for the event name pill.
- **`EventBranding.logoLayout`** / **`EventBranding.eventNameLayout`**
  (new fields in the kiosk-facing schema): mirror of the above,
  exposed by `GET /event-branding`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The operator can change every one of the ten layout
  fields from the Event admin form, save, and observe the new
  values rendered in the kiosk within
  `remoteControlPollingSeconds` seconds (default 3s, min 1s) at
  1280×720, 1920×1080, and 3840×2160.
- **SC-002**: A PUT request with any field outside its valid
  range returns HTTP 400 (or HTTP 422 for schema errors) with a
  field-keyed message; the corresponding database row is not
  mutated.
- **SC-003**: An event with NULL `logoLayout` and NULL
  `eventNameLayout` renders byte-identical DOM (modulo animations)
  and equivalent computed styles to the pre-change baseline at
  1280×720, 1920×1080, and 3840×2160.
- **SC-004**: The new form controls surface client-side validation
  errors before the PUT request is sent; the server-side validation
  is reached only when client-side validation passes.
- **SC-005**: All 343+ existing frontend specs and 200+ existing
  backend specs continue to pass after the change; the new specs
  cover the ten layout fields, the validation paths, the polling
  propagation, and the default-look preservation.

## Assumptions

- The kiosko's existing polling loop (every
  `remoteControlPollingSeconds`, default 3s) is fast enough for
  "dynamic" reflection. If sub-second latency is required, a
  separate faster poll or a websocket would be a follow-up change.
- The existing flex layout of the overlay
  (`position: absolute; top: 10px; left: 10px; right: 10px;
  display: flex; justify-content: space-between;`) established by
  CHG-019 will be replaced by absolute positioning for both
  children, with the current visual look replicated through the
  default layout values (logo X=0 Y=0, event name X=80 Y=0 with
  `text-align: right`).
- The default values chosen to preserve the current look are:
  - Logo: `size=6` (vh), `x=0`, `y=0`, `transparency=100`,
    `borderRadius=0`.
  - Event name: `size=1.6` (vw), `x=80`, `y=0`,
    `transparency=100`, `borderRadius=6`.
- The kiosko's portrait prompt and iframe-mode hiding continue to
  apply regardless of the layout values.
- The form labels and help text are localized via the existing
  `$localize` machinery; this change does not add new copy that
  requires translation.
- No new dependencies are introduced in either backend or frontend.

## Supersedes

- None.

## Superseded by

- None yet.
