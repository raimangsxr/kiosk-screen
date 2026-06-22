---
capability: C5-remote-control
supersedes: 006-remote-control-display
superseded_by:
status: draft
oversize: false
---

# Feature Specification: Display Control Canonical

**Feature Branch**: `019-display-control-canonical`
**Spec Directory**: `specs/019-display-control-canonical/`
**Created**: 2026-06-22
**Status**: Draft
**Input**: consolidate the four cross-spec amendments to
`display_control_state` (006, 015, 016, 017, 018) into a single
canonical anchor so future readers find the display-control narrative
in one place.

## Clarifications

### Session 2026-06-22

- Q1: What is the canonical content mode? → A: `loop | iframe | fixed`
  (after 018).
- Q2: What is the canonical navigation command set? → A:
  `next | previous | pause | resume` (after 018).
- Q3: What is the canonical ad-band behavior in iframe / fixed? → A:
  The ad-band keeps rotating; only the top zone is governed by the
  content mode. `adsVisible` is the only way to hide ads (FR-008b).
- Q4: What happens to the `kiosk-rotation.controller.ts` cursor on
  mode transition? → A: it pauses for iframe / fixed and resumes at
  the same index on return to `loop`. Pause state is local to `loop`
  and is discarded on exit.
- Q5: Does this spec change runtime behavior? → A: No. It is a
  documentation-only consolidation. No code change.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — One anchor for display-control rules (Priority: P1)

An engineer opening the codebase for the first time finds
`specs/019-display-control-canonical/` and reads the canonical
content-mode enum, navigation-command set, and ad-band behavior in
under 5 minutes. They do not need to walk 006, 015, 016, 017, 018 in
order to know "what can the operator do to the kiosk?".

**Why this priority**: this is the entry point for the most-touched
runtime schema in the codebase. Without it, every reader pays the
distributed-spec tax.

**Independent Test**: open `specs/019-display-control-canonical/spec.md`
and confirm it answers (a) what `contentMode` values exist, (b) what
`navigationCommand` values exist, (c) what the ad-band does in
iframe/fixed, (d) what the rotation cursor does on mode transition,
(e) which specs amend which field.

**Acceptance Scenarios**:

1. **Given** the canonical spec, **When** an engineer reads the User
   Scenarios section, **Then** they find the four canonical facts
   (contentMode, navigationCommand, ad-band, rotation cursor) without
   needing to open any other spec.
2. **Given** the canonical spec, **When** an engineer reads the
   Requirements section, **Then** every FR maps to one of the four
   amending specs (006, 016, 017, 018) with a one-line summary of
   the amendment.
3. **Given** the canonical spec, **When** an engineer reads the
   Supersedes section, **Then** the chain 006 → 016 → 017 → 018 is
   visible in one table.

### User Story 2 — Audit event taxonomy is stable (Priority: P2)

The set of `DisplayEventType` values emitted by the display-control
surface is documented in one file. New audit events (added by 018:
`display_control_paused`, `display_control_resumed`,
`display_control_fixed_changed`, `content_rotation_empty`,
`content_type_autodetected`) live next to the older ones
(`display_control_changed`, `event_configuration_changed`,
`remote_control_iframe_deleted`, `content_changed`).

**Why this priority**: observability is a constitution cross-cutting
standard. Knowing what events exist prevents ad-hoc log scraping.

**Independent Test**: open
`specs/019-display-control-canonical/contracts/audit-display-events.md`
and confirm every `DisplayEventType` referenced in any spec is listed
with its payload shape and producer spec.

**Acceptance Scenarios**:

1. **Given** the audit-events contract, **When** an engineer reads
   it, **Then** every audit event type emitted by `display_control*`
   is listed with `eventType`, `severity`, `entityType`, and the
   spec that introduced it.
2. **Given** a new audit event is added, **When** the engineer
   amends this contract, **Then** they update the source spec's
   `supersedes.md` chain (e.g. the new spec declares it supersedes
   019 in the audit-events row).

### Edge Cases

- **A spec amends 019 itself**: 019 is the canonical anchor; new
  amendments to display-control create a new spec that supersedes
  019 (not 006). The amended 019 receives a one-line footer.
- **A spec amends display-control without going through 019**: caught
  by `/speckit.analyze` (constitution Principle VI / VII). The
  `## Supersedes` block is mandatory on the new spec.
- **The contract drifts from the code**: caught by the constitution
  Principle V (Explicit Contracts). A code change without a contract
  update triggers a `validation/implementation-conflicts.md` row.

## Requirements *(mandatory)*

### Functional Requirements

#### Content mode (C1 + C5 surface)

- **FR-001**: The `contentMode` enum of `display_control_states`
  SHALL be one of `loop | iframe | fixed`. Source: 006 (initial
  `loop | iframe`), 018 (adds `fixed`).
- **FR-002**: When `contentMode='loop'`, the kiosk rotates through
  the eligible `top_content_items` queue. Source: 006.
- **FR-003**: When `contentMode='iframe'`, the kiosk pins to
  `selectedIframeId` and does not advance. Source: 006.
- **FR-004**: When `contentMode='fixed'`, the kiosk pins to
  `selectedFixedContentId` and does not advance. If the fixed item
  is a video and fires `ended`, the kiosk restarts the video in a
  loop (`currentTime = 0; play()`). Source: 018.
- **FR-005**: A `CHECK` constraint enforces
  `selectedFixedContentId IS NOT NULL ⇒ contentMode = 'fixed'`.
  Source: 018.

#### Navigation commands (C5 surface)

- **FR-006**: The `navigationCommand` enum SHALL be one of
  `next | previous | pause | resume`. Source: 006 (initial
  `next | previous`), 018 (adds `pause | resume`).
- **FR-007**: `next` / `previous` are valid in `loop` only. Source:
  006, 018.
- **FR-008**: `pause` / `resume` are valid in `loop` only. They
  cancel / re-arm the local timer in the
  `KioskRotationController`. Source: 018.
- **FR-009**: `pause` state is local to `loop` and is discarded on
  exit. The backend does not persist the flag. Source: 018.

#### Ad-band behavior (C1 + C5 cross-capability)

- **FR-010**: The ad-band keeps rotating in `loop`, `iframe`, and
  `fixed`. The ad-band is orthogonal to the content mode. The only
  way to hide ads is `adsVisible=false` from the remote control.
  Source: 018.
- **FR-011**: Pause cancels the ad-band timer too; resume re-arms
  it. Source: 018.

#### Rotation cursor (C1 client-side)

- **FR-012**: The rotation cursor is client-side. Switching to
  `iframe` or `fixed` pauses the cursor; switching back to `loop`
  resumes at the same index with a fresh timer. Source: 016
  (initial), 018 (extends for `fixed`).
- **FR-013**: The rotation cursor is lost on kiosk page reload.
  Source: 016.
- **FR-014**: The recurring-content cadence counter is paused while
  the kiosk is in `iframe` or `fixed`, and resumes at the same
  count on return to `loop`. Source: 018.

#### Audit events

- **FR-015**: Every successful state change emits a
  `display_control_changed` audit event. Source: 006.
- **FR-016**: Pause emits `display_control_paused`; resume emits
  `display_control_resumed`. Source: 018.
- **FR-017**: Transitioning into `fixed` (or changing the target)
  emits `display_control_fixed_changed`. Source: 018.
- **FR-018**: A content rotation with empty queue emits
  `content_rotation_empty`. Source: 018.
- **FR-019**: An upload where extension overrode the explicit
  `contentType` emits `content_type_autodetected`. Source: 018.
- **FR-020**: Deleting the iframe currently selected on the kiosk
  emits `remote_control_iframe_deleted`. Source: 016.

### Traceability & Quality Requirements *(mandatory)*

- **TQ-001**: Every functional requirement maps to one of the four
  amending specs (006, 016, 017, 018). The mapping is in the
  requirement's "Source:" line.
- **TQ-002**: Every audit-event type emitted by the display-control
  surface is listed in
  `contracts/audit-display-events.md` with payload shape.
- **TQ-003**: A change to `display_control_state` or
  `navigation_command` that is not declared in this canonical spec
  is a constitution violation (Principle VI / VII) and triggers a
  `validation/implementation-conflicts.md` row.

### Key Entities

- **`display_control_states`** — the per-display-session state.
  Columns: `id`, `organization_id`, `display_session_id`,
  `content_mode`, `selectedIframeId` (nullable, FK `iframes.id`),
  `selectedFixedContentId` (nullable, FK `top_content_items.id`),
  `adsVisible`, `lastNavigationCommandId`, audit fields. Source: 006,
  016 (`selectedContentId` → `selectedIframeId`), 018
  (`content_mode` widened; `selectedFixedContentId` added).
- **`RemoteControlNavigationCommand`** (frontend + backend enum) —
  `next | previous | pause | resume`. Source: 006, 018.
- **`KioskRotationController`** (frontend) — owns the rotation
  cursor, the cadence counter, the pause state, and the single
  effect-based timer. Source: 018.

## Success Criteria *(mandatory)*

- **SC-001**: An engineer reading `specs/019-display-control-canonical/spec.md`
  answers the four canonical questions
  (contentMode, navigationCommand, ad-band, rotation cursor) in
  under 5 minutes without opening any other spec.
- **SC-002**: `/speckit.analyze` reports no contradictions between
  019 and the archived 006/016/017/018 specs.
- **SC-003**: Every `DisplayEventType` referenced in any spec is
  listed in `contracts/audit-display-events.md`.

## Assumptions

- 019 is documentation-only; no runtime change.
- 015 (Material 3 remote-control page rewrite) is a design source,
  not a behavior source. It does not amend 006/016/017/018
  contracts; the contracts are the same.
- Future amendments to display-control create a new spec that
  supersedes 019 (not 006) per Principle VI.

## Out of Scope

- Adding new content modes (e.g. `playlist`).
- Adding new navigation commands (e.g. `shuffle`).
- Persisting the `pause` flag in the backend.
- Re-introducing `selectedContentId` for the legacy `embedded_web`
  content type.

## Supersedes

- `006-remote-control-display` — initial canonical
  `contentMode ∈ {loop, iframe}` and
  `navigationCommand ∈ {next, previous}`.
- `016-preconfigured-iframes-and-video-end` — `selectedIframeId`
  replaces `selectedContentId`; `videoEndDelaySeconds` is a
  display-configuration knob (out of 019's scope but referenced).
- `017-event-branding` — branding overlay integration is a display
  concern; 019 documents the `contentMode='iframe'` rule that hides
  the overlay (per 018's supersession).
- `018-content-rotation-modes` — `fixed` mode; `pause`/`resume`
  commands; `selectedFixedContentId`; five new audit events;
  ad-band orthogonal to content mode.
- `015-remote-control-polish` — Material 3 page rewrite (design
  source only; no contract amendment).

## Superseded by

- None yet. Future amendments to display-control create a new spec
  that supersedes 019 per Principle VI.