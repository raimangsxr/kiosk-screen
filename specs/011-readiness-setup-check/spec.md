# Feature Specification: Readiness and Setup Check

**Feature Branch**: `011-readiness-setup-check`
**Spec Directory**: `specs/011-readiness-setup-check/`
**Created**: 2026-06-23
**Status**: Approved
**Input**: the preflight check that warns an operator before
opening a kiosk display, the `ReadinessInput` /
`ReadinessResult` domain, and the `/readiness` endpoint.

## User Scenarios & Testing

### User Story 1 — Setup check on the admin dashboard (Priority: P1)

An administrator (or any logged-in user) opens `/admin` (or
`/admin/readiness`) and sees a status panel that lists
"blockers" (red, prevents opening) and "warnings" (yellow, allows
opening but flags something). The four blockers are:
configuration disabled, no event duration set, no active top
content, no active ad.

**Why this priority**: a kiosk opened without a single active
content item or ad would be embarrassing in front of an audience;
the check is the operator's last chance to catch it.

**Independent Test**: with no active content and no active ad,
GET `/readiness` returns 200 with `ready=false` and two blockers.

**Acceptance Scenarios**:

1. **Given** a configuration with `is_enabled=false`, **When** GET
   `/readiness` is called, **Then** the response is 200 with
   `ready=false` and "Display configuration is disabled." in
   `blockers`.
2. **Given** no `event_configurations.event_duration_minutes` is
   set, **When** GET `/readiness` is called, **Then** the
   response is 200 with "Configured event duration is required."
   in `blockers`.
3. **Given** no active top content items, **When** GET
   `/readiness` is called, **Then** the response is 200 with "At
   least one active top content item is required." in
   `blockers`.
4. **Given** no active ad items, **When** GET `/readiness` is
   called, **Then** the response is 200 with "At least one active
   ad item is required." in `blockers`.
5. **Given** a content item with a missing media file, **When**
   GET `/readiness` is called, **Then** the response is 200 with
   `ready=true` (or `ready=false` if any of the above blockers
   apply) and a "Source may be unavailable: ..." warning.

### User Story 2 — Open is blocked when readiness is red (Priority: P1)

When the operator clicks "Open kiosk" on the hall page while
`/readiness` returns `ready=false`, the frontend shows the
blockers list and disables the "Open" button. The operator must
resolve the blockers (or an admin must) before opening.

**Why this priority**: the dashboard is the only place the
operator learns the kiosk is not safe to open.

**Independent Test**: with `ready=false`, the "Open kiosk" button
is disabled; the operators sees the blockers list.

**Acceptance Scenarios**:

1. **Given** `ready=false`, **When** the operator views the hall
   page, **Then** the "Open kiosk" button is disabled and a
   "Resolve setup blockers" hint is shown.
2. **Given** `ready=true` with warnings, **When** the operator
   views the hall page, **Then** the "Open kiosk" button is
   enabled and the warnings are listed.
3. **Given** `ready=true` with no warnings, **When** the
   operator views the hall page, **Then** the "Open kiosk"
   button is enabled with a green "Ready" chip.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST expose
  `evaluate_readiness(ReadinessInput) -> ReadinessResult` in
  `domain/readiness.py` with the four blocker rules and the
  per-item `invalid_sources` warnings.
- **FR-002**: The system MUST expose `GET /readiness` returning a
  `ReadinessReportSchema` (ready, blockers, warnings) for the
  current organization; 200 even when `ready=false`.
- **FR-003**: The frontend MUST expose `/admin/readiness` with
  a status panel listing the blockers in red and the warnings in
  yellow; the panel MUST also be visible on `/admin` (dashboard).
- **FR-004**: The "Open kiosk" button on the hall page MUST be
  disabled while `ready=false`; the button MUST be enabled when
  `ready=true` regardless of the warnings.
- **FR-005**: The readiness evaluation MUST consider the active
  configuration (`is_enabled`), the configured event duration
  (> 0), the count of active top content items (≥ 1), and the
  count of active ad items (≥ 1).

### Key Entities

- **ReadinessInput**: `configuration_enabled: bool`,
  `event_duration_minutes: int | None`,
  `active_top_content_count: int`, `active_ad_count: int`,
  `invalid_sources: list[str]`.
- **ReadinessResult**: `ready: bool`, `blockers: list[str]`,
  `warnings: list[str]`.

## Success Criteria

- **SC-001**: The dashboard refreshes the readiness panel on
  every navigation; the panel is up-to-date within 1 s of the
  page becoming interactive.
- **SC-002**: An operator who tries to open a kiosk with a
  blocker cannot succeed; the backend returns 409 with a clear
  "setup incomplete" detail (per spec 002 US1 AS-3).
- **SC-003**: Adding a single active content item and a single
  active ad clears all blockers and the "Open kiosk" button
  becomes enabled.

## Assumptions

- The readiness check is a derived view, not a separate table;
  the source of truth is the underlying counts and the
  configuration.
- Warnings do not block opening; only blockers do.

## Supersedes

None.

## Superseded by

None yet.
