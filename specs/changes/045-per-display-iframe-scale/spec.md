---
id: CHG-045
type: change
status: implemented
modifies:
  - IFRAMES.VIDEO_END
  - DISPLAY.RUNTIME
  - DISPLAY.CONFIG_SESSION
depends_on:
  - CHG-044
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
source_of_truth: false
read_by_default: false
requires_contract_update: true
oversize: false
---

# Feature Specification: Per-Display Iframe Scale

**Feature Branch**: `045-per-display-iframe-scale`

**Spec Directory**: `specs/changes/045-per-display-iframe-scale/`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "actualmente tengo la feature de poder añadir iframes y escalar estos iframes, pero la realidad es que no todas las pantallas tendrán la misma resolución, por lo que el escalado de cada iframe va a ser distinto en cada pantalla. Quiero que el escalado se haga teniendo en cuenta cada pantalla, de forma que se pueda configurar escalado particular en cada una de las pantallas"

## Clarifications

### Session 2026-07-22

- Q: Where do operators configure per-display iframe scale in admin? → A: In the iframe edit form, via a per-display scale matrix; the iframe list MUST also surface each known display and its effective scale for that iframe.
- Q: Which displays appear in the iframe list and edit-form scale matrix? → A: All known display labels for the organization, whether currently connected or not.
- Q: What happens to per-display overrides when a display label is renamed? → A: Overrides remain tied to a stable display record; the label is editable metadata and renaming does not reset or duplicate overrides.
- Q: How do new display records enter the organization's known list? → A: Both auto-registration on first kiosk connection with a new label and manual admin creation for offline displays.
- Q: Is on-display scale calibration on `/display` in scope? → A: No — admin-only configuration via iframe list and edit-form matrix; no attendee-visible or operator on-screen calibration controls.
- Q: What happens when a kiosk registers without a display label? → A: Registration is rejected with a validation error; display device upsert requires a non-empty label (existing label-claim flow on `/display`).

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `IFRAMES.VIDEO_END`, `DISPLAY.RUNTIME`, `DISPLAY.CONFIG_SESSION`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Configure scale per physical display (Priority: P1)

An event operator manages several kiosk displays in the same venue (for example ultrawide 21:9, standard 16:9, and 4:3). The same preconfigured iframe is shown on all of them, but each physical screen needs a different zoom so the embedded content fits legibly without clipping or excessive empty space. From the admin area, the operator opens a preconfigured iframe and uses a per-display scale matrix in the iframe edit form to set horizontal and vertical scale values for each display. The iframe list summarizes which displays have overrides and their effective scale for each iframe. Each display keeps its own scale even when the operator reloads the browser or switches away from iframe mode and back.

**Why this priority**: This is the core pain — a single global scale per iframe cannot accommodate mixed resolutions and aspect ratios across hall screens.

**Independent Test**: Open three kiosk clients with distinct display labels, assign different scale values to each for the same iframe, activate iframe mode on all three, and verify each screen renders with its own scale without affecting the others.

**Acceptance Scenarios**:

1. **Given** three kiosk displays with different display labels showing the same pinned iframe, **When** the operator sets a different scale on each display, **Then** each display renders the iframe with its own scale without affecting the other two.
2. **Given** a display has a configured scale override, **When** the browser reloads or the display reconnects, **Then** the same scale is restored on that display.
3. **Given** a display has a configured scale override, **When** remote control switches from loop to iframe mode with the same iframe, **Then** the display applies its stored scale without requiring reconfiguration.

---

### User Story 2 — Use iframe default when no display override exists (Priority: P2)

A content manager configures default horizontal and vertical scale on each iframe record (as today). Displays without a per-display override inherit those defaults automatically, so existing events continue to work without extra setup.

**Why this priority**: Preserves backward compatibility and avoids forcing operators to configure every display before going live.

**Independent Test**: Create an iframe with default scale 1.0, show it on a display with no override, and verify scale 1.0 is applied. Add an override on one display only and verify other displays still use the default.

**Acceptance Scenarios**:

1. **Given** an iframe with default scale values and a display with no per-display override, **When** iframe mode is activated on that display, **Then** the iframe default scale is applied.
2. **Given** an iframe default scale is updated in admin, **When** a display has no per-display override, **Then** that display adopts the updated default on the next iframe activation or live refresh.
3. **Given** one display has a per-display override and another does not, **When** both show the same iframe, **Then** each display uses its resolved scale (override vs default) independently.

---

### User Story 3 — See and manage scale from the iframe admin area (Priority: P3)

An operations user opens the iframe list and sees, for each preconfigured iframe, which displays have scale overrides and what effective scale each display uses (override or iframe default). They open the iframe edit form to adjust the per-display scale matrix, create or clear overrides, and confirm changes without visiting each physical screen. When a display is connected and showing that iframe, live updates apply without a full kiosk reload.

**Why this priority**: Operators manage iframes as content assets; surfacing per-display scale in the iframe list and edit form keeps configuration discoverable and avoids hunting through unrelated admin screens.

**Independent Test**: With two displays (one with an override, one on default), open the iframe list and verify each display and effective scale appear for that iframe; edit the matrix in the iframe form, save, and verify the list and connected kiosk update accordingly.

**Acceptance Scenarios**:

1. **Given** an authenticated operator viewing the iframe list, **When** the organization has known display labels (connected or not), **Then** each iframe row or detail shows every known display label with effective scale, source (override or default), and connection status.
2. **Given** a connected display and a preconfigured iframe, **When** the operator saves a per-display scale override in the iframe edit matrix, **Then** that display updates its iframe rendering without a full page reload when iframe mode is active.
3. **Given** a per-display override exists, **When** the operator clears it in the iframe edit matrix, **Then** the iframe list reflects the reverted default and the display adopts the iframe default scale on the next activation or live refresh.

---

### Edge Cases

- A display label is renamed in admin: per-display overrides remain on the same stable display record; only the visible label changes in iframe list and matrix views.
- A display connects for the first time with a new label: the system auto-creates a stable display record, adds it to the organization's known displays, and uses the iframe default scale until an operator configures an override.
- An operator pre-creates a display record in admin before any kiosk connects: the new record appears in iframe list and matrix views immediately with iframe default scale until overridden.
- A known display label is offline: it remains visible in the iframe list and edit-form matrix with its stored override or default; changes apply on the next connection.
- An iframe is deleted while per-display overrides reference it: orphaned overrides are removed or ignored safely without breaking other displays.
- Scale values outside the allowed range are rejected with a clear validation message in admin.
- Two operators edit the same display override concurrently: the last saved change wins; no optimistic locking. Connected displays receive the latest effective scale via `iframe_scale_updated` or the next iframe activation.
- A kiosk registers without a display label: registration is rejected; the operator must claim a label on `/display` before the device record can be created or linked.
- A display disconnects during an override edit: the saved override applies on the next connection from that display label; no partial or in-flight override state is persisted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow authorized operators to configure horizontal and vertical scale per stable display record and per preconfigured iframe.
- **FR-002**: Per-display scale values MUST use the same validated range as iframe default scale (0.1 to 5.0, default 1.0 when unspecified).
- **FR-003**: When a display has no per-display override for the active iframe, the system MUST apply that iframe's default scale values.
- **FR-004**: When a display has a per-display override for the active iframe, the system MUST apply the override values instead of the iframe defaults.
- **FR-005**: Each kiosk display MUST resolve and apply scale based on its own stable display record, independent of other displays showing the same iframe.
- **FR-005a**: Renaming a display label MUST NOT create, duplicate, or clear per-display iframe scale overrides.
- **FR-006**: Per-display scale overrides MUST persist across browser reload, reconnection, iframe mode switches, and display label renames for the same stable display record.
- **FR-007**: Authorized operators MUST be able to create, update, and clear per-display scale overrides from the iframe edit form via a per-display scale matrix, without physical access to each screen.
- **FR-007a**: The iframe list MUST show, for each preconfigured iframe, every known organization display label with effective scale, source (`override` | `default`), and connection status (`connected` when the display has an active kiosk registration).
- **FR-007b**: The iframe edit-form scale matrix MUST include every known organization display record, whether currently connected or not.
- **FR-007c**: Authorized operators MUST be able to create display records manually in admin before a kiosk connects; the system MUST also auto-create a display record when a kiosk registers with a new non-empty label.
- **FR-008**: When a per-display override changes while a display is showing that iframe, the display MUST refresh to the new scale without requiring a full kiosk page reload.
- **FR-009**: When an iframe's default scale changes, displays without a per-display override for that iframe MUST adopt the updated default on the next iframe activation or live refresh.
- **FR-010**: The iframe edit-form scale matrix MUST show each display label with effective scale, source (`override` | `default`), and connection status, matching the same resolution rules as the iframe list (FR-007a).
- **FR-011**: Deleting a preconfigured iframe MUST clean up associated per-display overrides without affecting unrelated displays or iframes.
- **FR-012**: Per-display scale configuration MUST be scoped to the operator's organization; displays and overrides from other organizations MUST NOT be visible or editable.
- **FR-013**: The system MUST NOT expose iframe scale calibration controls on the kiosk `/display` runtime; all per-display scale changes MUST originate from the iframe admin area.

### Traceability & Quality Requirements

- **TQ-001**: The affected active contracts (`IFRAMES.VIDEO_END`, `DISPLAY.RUNTIME`, `DISPLAY.CONFIG_SESSION`) MUST be updated before implementation is considered complete.
- **TQ-002**: The change MUST include automated tests or an explicit manual validation task with rationale.
- **TQ-003**: The manifest entry MUST be updated before implementation is considered complete.

### Key Entities

- **Preconfigured iframe**: A saved embed URL with organization-wide default horizontal and vertical scale values.
- **Display record**: A stable organization-scoped identity for a physical kiosk screen. Created automatically on first kiosk registration with a new label or manually by an operator in admin. Overrides are stored against this record; the display label is editable metadata shown in admin and kiosk views.
- **Display label**: The operator-visible name for a display record, chosen or updated by operators and shown in iframe list and matrix views.
- **Per-display iframe scale override**: Optional horizontal and vertical scale values tied to a specific display record and iframe, taking precedence over the iframe default on that display only.
- **Effective scale**: The scale actually applied on a display — override when present, otherwise iframe default.

## Success Criteria *(mandatory)*

- **SC-001**: Operators can configure distinct scale values for at least three displays showing the same iframe, and each display renders with its own scale within 5 seconds of saving the override.
- **SC-002**: 100% of displays without a per-display override continue to use iframe default scale with no additional operator setup required.
- **SC-003**: After a browser reload or reconnection, 100% of displays restore their last effective scale for the active iframe without manual reconfiguration.
- **SC-004**: Operators can identify the effective scale and source (override vs default) for every display associated with an iframe from the iframe list or edit form in under 30 seconds.
- **SC-005**: At mixed-resolution events (at least two different aspect ratios), operators report acceptable legibility on all configured displays without needing to change the iframe URL or content source.

## Assumptions

- "Pantalla" maps to a stable display record in the organization; the display label is the operator-visible name for that record.
- Per-display configuration is managed exclusively from the iframe admin area (list summary + edit-form matrix). On-display calibration controls on `/display` are explicitly out of scope, including hidden operator gestures.
- Iframe default scale remains the organization-wide baseline; per-display overrides are optional and scoped to one stable display record plus one iframe.
- The same validation range and live-refresh expectation established for iframe default scale (CHG-044) applies to per-display overrides.
- Known display records include both auto-registered kiosks and manually pre-created offline displays.
- Display label rename or reassignment updates metadata only; override association remains on the stable display record.
- Kiosk register without a label is invalid; operators must claim a label before device upsert.

## Relationships

- Modifies: `IFRAMES.VIDEO_END`, `DISPLAY.RUNTIME`, `DISPLAY.CONFIG_SESSION`
- Extends: —
- Depends on: `CHG-044` (per-iframe default scale and CSS transform rendering model)
- Supersedes: —
- Superseded by: —
