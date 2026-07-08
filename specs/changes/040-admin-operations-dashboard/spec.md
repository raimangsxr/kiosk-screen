---
id: CHG-040
type: change
status: implemented
modifies:
  - ADMIN.SHELL.NAVIGATION
  - READINESS.SETUP
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
requires_contract_update: true
read_by_default: true
---

# Feature Specification: Admin Operations Dashboard

**Feature Branch**: `040-admin-operations-dashboard`

**Created**: 2026-07-08

**Status**: Implemented

**Input**: Refactor the admin dashboard (`/admin`) from a redundant section-navigation grid into an operations center that answers "Is the kiosk ready?", "What is live right now?", "What needs attention?", and "What happened recently?" — based on prior product iteration on dashboard usefulness, live display context, and content rotation awareness.

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `ADMIN.SHELL.NAVIGATION`, `READINESS.SETUP` (dashboard surfaces readiness); `DISPLAY.CONTROL` and `DISPLAY.EVENTS.AUDIT` are read-only dependencies for live status and activity feed
- Context pack: `context-pack.md`
- Contract update required before implementation: yes (`ADMIN.SHELL.NAVIGATION` at minimum)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Operational status at a glance (Priority: P1)

An authenticated operator opens `/admin` during event setup or live operation. The dashboard shows a prominent operations summary: overall readiness (ready / blocked / action required), whether a display session appears active, the current remote-control content mode (rotation, iframe, or fixed), whether ads are visible, and when that live state was last updated. Primary actions to open the kiosk display and remote control are available from this summary without hunting through the sidenav.

**Why this priority**: This is the core reason to land on `/admin` during an event; it replaces duplicated navigation with actionable live context.

**Independent Test**: With readiness ready and an active display session in rotation mode with ads visible, visiting `/admin` shows all of the above in one summary card without loading the full remote-control page.

**Acceptance Scenarios**:

1. **Given** readiness reports `ready`, **When** the operator opens `/admin`, **Then** the dashboard shows a ready status and does not require visiting `/admin/readiness` to understand overall setup health.
2. **Given** a display session is active and remote control reports rotation mode with ads visible, **When** the operator opens `/admin`, **Then** the dashboard shows display online, rotation mode, and ads visible with a human-readable last-updated time.
3. **Given** no active display session, **When** the operator opens `/admin`, **Then** the dashboard shows display offline (or equivalent unavailable state) and offers a clear action to open the kiosk display.
4. **Given** remote control reports fixed mode with a pinned content target, **When** the operator opens `/admin`, **Then** the dashboard shows fixed mode and the pinned item title (or a clear unavailable label if the target cannot be resolved).

---

### User Story 2 — Actionable readiness blockers (Priority: P1)

An operator opens `/admin` while setup is incomplete. The dashboard lists blockers and warnings with the same actionable intent as the readiness page: each blocker links directly to the screen where it can be resolved. The dashboard does not duplicate the full readiness checklist UI; it summarizes what blocks the kiosk and how to fix it.

**Why this priority**: Operators currently see blockers twice (dashboard + readiness page) without resolve links on the dashboard; fixing this removes friction before opening the kiosk.

**Independent Test**: With a known blocker such as missing active content, `/admin` shows the blocker message and a control that navigates to the correct admin route to resolve it.

**Acceptance Scenarios**:

1. **Given** readiness returns one or more blockers, **When** the operator opens `/admin`, **Then** each blocker is listed with a direct navigation action to resolve it.
2. **Given** readiness returns warnings only (no blockers), **When** the operator opens `/admin`, **Then** warnings are shown distinctly from blockers and do not present as kiosk-blocking errors.
3. **Given** readiness cannot be loaded, **When** the operator opens `/admin`, **Then** a recoverable error state is shown for readiness without blanking the entire dashboard if other operational data can still load.

---

### User Story 3 — Recent operational activity (Priority: P2)

An operator wants a quick sense of what changed on the floor without opening multiple admin modules. The dashboard shows a compact feed of recent operational events (for example remote-control changes, display opened, configuration changes, and rotation-empty alerts), ordered newest first, with severity indicated and messages in operator-friendly language.

**Why this priority**: Audit data already exists; surfacing a short recent feed on the dashboard makes `/admin` useful during live events, not only at setup time.

**Independent Test**: After a remote-control mode change, the dashboard feed includes that event within the recent list on next load or refresh.

**Acceptance Scenarios**:

1. **Given** operational events exist for the organization, **When** the operator opens `/admin`, **Then** the dashboard shows the most recent events (bounded list of 15) with timestamp and severity.
2. **Given** no recent events exist, **When** the operator opens `/admin`, **Then** the activity section shows an empty state instead of failing the page.
3. **Given** the events feed fails to load, **When** the operator opens `/admin`, **Then** the rest of the dashboard still renders and the activity section shows a non-blocking error.

---

### User Story 4 — Content rotation queue context (Priority: P2)

An operator wants to understand how top content is ordered for rotation without opening the full content list. The dashboard shows the active top-content queue in `displayOrder`, distinguishing regular items, recurring-cadence items, and fixed-eligible items. When remote control is in fixed mode, the dashboard highlights the pinned item. The dashboard does not claim to show the exact live slide index across all kiosk clients unless that data is explicitly available from existing operational interfaces.

**Why this priority**: Rotation order is a common operator question during events; showing the programmed queue adds context even before live playback telemetry exists.

**Independent Test**: With three active regular content items in known display order, `/admin` lists them in that order with position labels.

**Acceptance Scenarios**:

1. **Given** multiple active top-content items, **When** the operator opens `/admin`, **Then** the dashboard lists them sorted by `displayOrder` with title and order index.
2. **Given** items with recurring cadence configured, **When** the operator opens `/admin`, **Then** those items are labeled as recurring with their cadence value visible to the operator.
3. **Given** remote control is in fixed mode, **When** the operator opens `/admin`, **Then** the pinned item is highlighted in the queue context (or shown as "en pantalla" in the operations summary per User Story 1).
4. **Given** no eligible active top content, **When** the operator opens `/admin`, **Then** the queue section shows an empty state aligned with readiness messaging.

---

### User Story 5 — Remove redundant navigation chrome (Priority: P1)

The operator no longer sees a grid of section summary cards (Content, Ads, Event, Iframes, Display, Users) that merely repeat sidenav destinations with shallow counts. Static "quick action" cards that duplicate sidenav routes are replaced by contextual actions driven by current state (for example "Resolve first blocker", "Open display", "Go to remote control", "Add content" when the queue is empty).

**Why this priority**: The current dashboard's main failure mode is duplicating navigation; removing it is required for the refactor to deliver net value.

**Independent Test**: `/admin` no longer renders the six section-summary tiles; primary navigation remains available only via the sidenav and contextual CTAs.

**Acceptance Scenarios**:

1. **Given** a healthy system, **When** the operator opens `/admin`, **Then** the legacy per-section summary card grid is not shown.
2. **Given** readiness is blocked, **When** the operator opens `/admin`, **Then** a contextual primary action targets the first unresolved blocker.
3. **Given** any viewport supported by the admin shell, **When** the operator opens `/admin`, **Then** the new layout does not introduce horizontal page scroll.

---

### Edge Cases

- Readiness loads but remote-control state fails: show readiness and queue context; operations hero shows degraded/unavailable live status with a section-level retry control (re-loads live slice without full page refresh).
- Remote control loads but readiness fails: show live status; readiness area shows error without blocking live summary.
- Display session inactive while browser tabs still show `/display`: dashboard reflects server-side session state, not local browser assumptions.
- Fixed-mode target deleted after pin: dashboard shows fixed mode with pinned label **«Contenido no disponible»** (or equivalent) in the operations hero and queue context.
- Very long event or content titles: truncate with ellipsis in list rows; hero title wraps up to two lines without horizontal scroll on compact viewports.
- Large event history: activity feed remains bounded; no unbounded list on the dashboard.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard at `/admin` MUST present an operations summary as the primary above-the-fold content, including readiness status, display session availability, remote-control content mode, ads visibility, and last-updated time when live data is available.
- **FR-002**: The dashboard MUST offer primary actions to open the kiosk display and open remote control from the operations summary.
- **FR-003**: When readiness reports blockers, the dashboard MUST list them with a direct navigation action to the appropriate resolution screen for each blocker (same resolution routing semantics as the readiness page).
- **FR-004**: When readiness reports warnings without blockers, the dashboard MUST show warnings separately from blockers.
- **FR-005**: The dashboard MUST show a bounded recent operational activity list (15 items maximum) sourced from existing display/audit events, newest first, with severity and timestamp.
- **FR-006**: The dashboard MUST show active top content in `displayOrder` with labels for recurring cadence and fixed eligibility where applicable.
- **FR-007**: When remote control is in fixed mode, the dashboard MUST identify the pinned content item in the operations summary and/or queue context.
- **FR-008**: The dashboard MUST NOT show the legacy section-summary card grid (Content, Ads, Event, Iframes, Display, Users counts) as the primary navigation pattern.
- **FR-009**: The dashboard MUST replace static quick-action cards with contextual actions based on current readiness and live state.
- **FR-010**: Partial data failures MUST degrade per section: a failed source marks only that section unavailable while other sections continue to render.
- **FR-011**: All new operator-facing copy on the dashboard MUST be Spanish, consistent with the admin shell.
- **FR-012**: The dashboard MUST remain usable on compact and expanded admin viewports without horizontal page scroll.

### Traceability & Quality Requirements

- **TQ-001**: `ADMIN.SHELL.NAVIGATION` MUST be updated before implementation to describe the new dashboard purpose and sections.
- **TQ-002**: `READINESS.SETUP` SHOULD be updated if dashboard readiness surfacing behavior changes materially from the current contract.
- **TQ-003**: Automated tests or explicit manual validation tasks MUST cover operations summary, blocker actions, activity feed empty/error states, and removal of legacy section grid.
- **TQ-004**: The manifest entry for CHG-040 MUST be added before implementation is considered complete.

### Key Entities

View-model names align with `data-model.md` (`OperationsDashboardState` root):

- **LiveStatusSlice** (operations summary): readiness chip input, display availability, content mode, ads visibility, last updated, pinned content title (or unresolved label).
- **ReadinessAlert**: Blocker or warning message plus target resolution route.
- **ActivityFeedItem**: Event message, severity, timestamp (max 15 on dashboard).
- **ContentQueueEntry**: Content title, display order, flags for recurring cadence and fixed eligibility, optional "pinned now" marker.
- **ContextualAction**: State-driven action distinct from persistent hero CTAs (see plan UX note).

## Success Criteria *(mandatory)*

- **SC-001**: An operator can determine readiness status, display availability, and remote-control mode within 10 seconds of opening `/admin` without visiting another admin page.
- **SC-002**: When setup is blocked, an operator can reach the correct resolution screen for the first blocker in one click from `/admin`.
- **SC-003**: At least 90% of operators in usability review (or structured walkthrough) report the new dashboard as more useful than the legacy section-card grid for live event operation.
- **SC-004**: The dashboard renders meaningful content when any single upstream data source fails (no full-page blank state except total auth/session failure).
- **SC-005**: On a 375px-wide viewport, the dashboard remains readable and free of horizontal scroll.

## Assumptions

- The hall page (`/hall`) remains the post-login destination; this change does not alter hall routing.
- Live playback position (exact slide index across kiosk clients) is out of scope; only programmed queue order and fixed-mode pin are shown unless a future change adds playback telemetry.
- Multi-kiosk novelty broadcast behavior is out of scope; pending-novelty summary widgets are not required for this change.
- No new aggregated backend endpoint is required for v1; the dashboard may compose existing readiness, remote-control, content, and events interfaces with partial-degradation semantics matching current dashboard service patterns.
- Sidenav grouped navigation from CHG-035 remains the canonical way to browse all admin modules.

## Relationships

- Modifies: `ADMIN.SHELL.NAVIGATION`, `READINESS.SETUP` (dashboard surfacing only)
- Extends: CHG-013 (admin shell dashboard intent), CHG-035 (mobile admin primitives)
- Depends on: `DISPLAY.CONTROL` (live mode state), `DISPLAY.EVENTS.AUDIT` (activity feed), `CONTENT.ROTATION` (queue ordering semantics), `READINESS.SETUP`
- Supersedes: none
- Superseded by: blank until replaced

## Non-goals

- Changing novelty consumption semantics or multi-kiosk novelty broadcast (separate future change).
- Kiosk playback heartbeat / "now playing" telemetry for loop mode across clients.
- New `/admin/events` full-page audit browser (only a dashboard excerpt feed).
- Backend aggregated `operations-summary` endpoint (optional future optimization).
- Hall, login, or kiosk runtime behavior changes beyond read-only consumption of existing state.
- Replacing the dedicated `/admin/readiness` page.
