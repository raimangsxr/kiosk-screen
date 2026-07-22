---
id: CHG-042
type: change
status: implemented
modifies:
  - DISPLAY.RUNTIME
  - DISPLAY.CONFIG_SESSION
depends_on:
  - CHG-006
  - CHG-041
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
source_of_truth: false
read_by_default: false
requires_contract_update: true
oversize: false
---

# Feature Specification: Per-Display Iframe Layout Profiles

**Feature Branch**: `042-per-display-iframe-layout`

**Spec Directory**: `specs/changes/042-per-display-iframe-layout/`

**Created**: 2026-07-17

**Status**: Draft

**Input**: Dense third-party tournament apps (e.g. amrn-bull, amrn-escalabirras-dual) are embedded as iframes in the kiosk top-content region. Their internal layout can be compacted or expanded using a vertical density control. Today that density is global per embedded app, so multiple physical displays with different aspect ratios (16:9, 21:9, 4:3, etc.) cannot each keep an optimal composition. The organizer needs each display client to remember and apply its own density setting independently when the same iframe is shown on several screens at once.

## Clarifications

### Session 2026-07-17

- Q: Where should per-kiosk density calibration be stored authoritatively? → A: Backend authoritative with local kiosk cache for fast read and controlled degradation (Option C).
- Q: How should a kiosk be identified for layout profile assignment and calibration storage? → A: Stable operator-chosen display label claimed on first `/display` boot, plus admin reassignment to currently connected kiosks (Option D).
- Q: How should on-display density fine-tuning be exposed on `/display`? → A: Hidden operator gesture or shortcut; not visible to event attendees (Option B).
- Q: How should embedded app family be determined for density defaults and profile fields? → A: Auto-detect by URL host with optional admin override per iframe record (Option C).
- Q: What is the delivery scope for embedded app changes (amrn-bull, amrn-escalabirras-dual)? → A: Joint acceptance gate — kiosk-screen and embedded apps (at least bull and escalabirras) ship together before CHG-042 is complete (Option A).

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `DISPLAY.RUNTIME`, `DISPLAY.CONFIG_SESSION`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Calibrate each hall display independently (Priority: P1)

An event operator opens the kiosk display on three physical screens (ultrawide 21:9, standard 16:9, and 4:3). Each screen shows the same pinned iframe tournament app, but the operator tunes the vertical density on each screen until the content fits legibly in the top region without clipping or excessive empty space. After tuning, each screen keeps its own density even when the operator reloads the page or switches away from iframe mode and back.

**Why this priority**: This is the core pain — one global density breaks multi-screen events where viewport shape differs.

**Independent Test**: Open three kiosk clients, assign each a different density, reload all three; verify densities remain distinct and the iframe content on each screen still matches its last calibrated appearance.

**Acceptance Scenarios**:

1. **Given** three kiosk displays showing the same pinned iframe, **When** the operator sets a different vertical density on each display, **Then** each display renders the iframe with its own density without affecting the other two.
2. **Given** a display has been calibrated, **When** the browser reloads or the display reconnects to the orchestrator, **Then** the same density is restored on that display.
3. **Given** a display has been calibrated, **When** remote control switches from loop to iframe mode with the same iframe URL, **Then** the display applies its stored density without requiring re-calibration.

---

### User Story 2 — Manage named layout profiles from admin (Priority: P2)

A content manager creates named display layout profiles (e.g. "Ultrawide hall", "4:3 side screen") with a recommended vertical density per embedded app family. When provisioning a kiosk device, the operator assigns a profile once; every subsequent iframe of that family on that device uses the profile density automatically.

**Why this priority**: Manual per-device tuning does not scale across many kiosks; named profiles make setup repeatable before the event.

**Independent Test**: Create two profiles with different densities in admin, assign each to a different kiosk client, open the same iframe on both; verify each kiosk matches its assigned profile.

**Acceptance Scenarios**:

1. **Given** an authenticated content manager, **When** they create or edit a layout profile with a density value for a supported embedded app type, **Then** the profile is saved and listed for the organization.
2. **Given** a kiosk client assigned to profile "Ultrawide hall", **When** iframe mode is activated, **Then** the embedded content receives the profile density for that app type.
3. **Given** a profile assignment changes in admin for a connected kiosk, **When** that kiosk next receives iframe content, **Then** it adopts the updated profile density. **Given** a display label without an active session, **When** a profile is assigned in admin, **Then** the assignment applies on the next `/display` connection from that label.

---

### User Story 3 — Local on-display fine tuning without breaking others (Priority: P2)

During live operation, an operator notices one screen still needs a small density tweak. They adjust density directly on that kiosk (without opening the embedded app's own admin console). The change applies only to that display and persists for future sessions on that device.

**Why this priority**: Final calibration often happens on-site after mounts and bezels are installed; it must not overwrite other screens or the organization's default profile.

**Independent Test**: From one kiosk, nudge density via the on-display control; confirm other kiosks and the admin default profile remain unchanged.

**Acceptance Scenarios**:

1. **Given** a kiosk showing an embedded tournament app, **When** the operator invokes the hidden on-display density control, **Then** only that kiosk's rendering density changes and no public UI chrome is shown to attendees during normal operation.
2. **Given** an on-display tweak was saved, **When** the embedded app's global density is changed elsewhere (e.g. that app's own operator console), **Then** this kiosk keeps its local calibration unless the organizer explicitly resets it.
3. **Given** a kiosk with a local tweak, **When** the organizer resets layout calibration for that device, **Then** the kiosk falls back to its assigned profile density or the organization default.

---

### Edge Cases

- A kiosk opens iframe mode before any profile or local calibration exists → use organization default density for that embedded app type.
- The same browser profile is duplicated on two physical machines → each machine MUST claim a distinct display label on first open; admin can reassign profiles to the correct online kiosk if labels were misconfigured.
- Embedded app URL changes (new iframe record, same app family) → existing per-display density for that app family still applies. If admin set a family override on the iframe record, the override takes precedence over host auto-detection.
- Unknown iframe host with no family override → treat as unsupported for density controls; kiosk shows iframe normally with organization-wide generic default or no density injection.
- Embedded app URL points to an app that does not support density overrides → kiosk shows iframe normally; density controls are hidden or disabled with a clear message.
- Storage unavailable (private mode, cleared site data) → kiosk uses backend authoritative values when online; if the local cache is cleared but the backend is reachable, density is restored on reconnect without re-calibration. If both cache and backend are unreachable, fall back to organization default for the session and show a non-blocking warning that calibration is not persisted locally.
- Top-content region ratio changes (e.g. ads hidden) → density preference is preserved; optional live refresh without full page reload is acceptable if it improves fit.
- Attendee accidentally discovers density UI → density controls MUST NOT be visible during normal operation; only the hidden operator gesture or shortcut reveals the tuning panel.
- Organizer deletes a layout profile still assigned to kiosks → kiosks fall back to organization default and surface a non-blocking readiness warning in admin.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support a vertical density setting per kiosk display client, independent of other display clients showing the same iframe URL.
- **FR-002**: The system MUST persist per-display density in the kiosk-screen backend across reloads and iframe mode re-entry; each kiosk MAY cache the last known effective density locally for fast startup, but the backend record is authoritative when reachable.
- **FR-003**: The system MUST pass the effective density to supported embedded iframe apps when iframe mode is active.
- **FR-004**: The system MUST provide organization-level default density values per embedded app family, resolved by URL host auto-detection with optional per-iframe admin override.
- **FR-005**: The system MUST allow content managers to define named display layout profiles that include density per embedded app family (using the same family resolution rules).
- **FR-006**: The system MUST allow assigning a layout profile to a kiosk display using a stable display label claimed on first `/display` open, and MUST allow content managers to reassign profiles to currently connected kiosks from admin.
- **FR-007**: The system MUST allow on-display fine tuning of density via a hidden operator gesture or keyboard shortcut (not visible to attendees) that overrides the assigned profile for that kiosk only until reset.
- **FR-008**: Per-display density MUST take precedence over global density changes originating inside the embedded app when the kiosk is in embed mode.
- **FR-009**: The system MUST expose admin visibility of which profile (if any) and effective density each connected kiosk is using.
- **FR-010**: The system MUST support at least the embedded app families used for live tournament displays (bull-style and dual-ladder-style apps) without requiring separate kiosk builds per app.

### Traceability & Quality Requirements

- **TQ-001**: The affected active contracts MUST be updated if observable behavior changes.
- **TQ-002**: The change MUST include automated tests or an explicit manual validation task with rationale, including end-to-end validation across kiosk-screen and at least the bull-style and dual-ladder-style embedded apps.
- **TQ-003**: The manifest entry MUST be updated before implementation is considered complete.
- **TQ-004**: CHG-042 MUST NOT be marked complete until per-display density works end-to-end in kiosk-screen and in the supported sibling embedded app repositories (at least amrn-bull and amrn-escalabirras-dual).

### Key Entities

- **Display layout profile**: A named, organization-scoped preset bundling vertical density per supported embedded app family (e.g. default density for bull apps vs ladder apps).
- **Display label**: A stable, operator-chosen name for a physical screen (e.g. "Sala ultrawide"), claimed once when `/display` first opens on a device and stored authoritatively in the backend. Links calibration and profile assignment across browser sessions on that device.
- **Kiosk layout assignment**: The link between a display label (and its active kiosk session when online) and a layout profile, plus optional local override. Backend holds the authoritative assignment and calibration; the kiosk browser may cache a copy for read performance.
- **Kiosk layout cache**: A non-authoritative copy of effective density and profile metadata on the kiosk device, refreshed from the backend when connected.
- **Embedded app family**: A classification of iframe origins that share the same density protocol. Resolved primarily by URL host auto-detection against known AMRN app hosts; admins MAY override the detected family on each iframe record.
- **Effective density**: The resolved density value for one kiosk and one active iframe, computed from local override → assigned profile → organization default.

## Success Criteria *(mandatory)*

- **SC-001**: An operator can calibrate three simultaneous kiosk displays to visibly different densities, and after reload all three retain their distinct appearance within 30 seconds of reconnecting.
- **SC-002**: Changing density in the embedded app's own global admin console does not alter already-calibrated kiosk displays unless the organizer resets calibration on those kiosks.
- **SC-003**: A content manager can create two layout profiles and assign them to two kiosks; each kiosk matches its profile on first iframe load without manual per-device slider use.
- **SC-004**: In user acceptance testing across at least three aspect ratios (16:9, 21:9, 4:3), operators report the tournament iframe content is legible without internal scrollbars in the top region for 90% of calibration attempts.
- **SC-005**: Admin can identify the effective density source (default, profile, or local override) for each connected kiosk within one operations view.
- **SC-006**: End-to-end acceptance on at least one kiosk-screen display with each supported embedded app family (bull-style and dual-ladder-style) passes manual validation in a single release gate before CHG-042 is marked complete.

## Assumptions

- Embedded tournament apps already expose a vertical density control meant for iframe deployments; kiosk-screen only needs to supply a per-display value, not reimplement their internal layout.
- Kiosk display clients are already uniquely identifiable for orchestration purposes; this feature extends that identity with layout preferences.
- Density is the primary per-display variable needed for v1; horizontal scaling and top-region ratio per display remain out of scope unless required for acceptance.
- Coordinating changes in sibling embedded app repositories is required for acceptance; kiosk-screen owns profile storage and passing effective density at embed time, while sibling apps MUST honor per-display density overrides in embed mode.
- Spanish-only operator UI copy follows existing kiosk-screen conventions.

## Relationships

- Modifies: `DISPLAY.RUNTIME`, `DISPLAY.CONFIG_SESSION`
- Extends: iframe pinning behavior from `IFRAMES.VIDEO_END` / display control
- Depends on: `CHG-006` (preconfigured iframes), `CHG-041` (SSE-driven iframe mode)
- Co-delivered with: per-display density override support in amrn-bull and amrn-escalabirras-dual (joint acceptance gate)
- Supersedes: —
- Superseded by: —
