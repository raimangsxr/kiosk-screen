---
id: CHG-039
type: change
status: implemented
modifies:
  - CONTENT.ROTATION
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
requires_contract_update: true
read_by_default: true
---

# Feature Specification: Independent recurring content counters

**Feature Branch**: `039-independent-recurring-counters`

**Created**: 2026-07-08

**Status**: Draft

**Input**: Replace the kiosk's single shared recurring cadence counter with one
independent counter per recurring top content item. Each counter advances on
every on-screen content transition so operators can estimate appearance
frequency as `N × average slide duration` (e.g. `30 × 10 s ≈ once every five
minutes`), regardless of how many recurring items are configured. When a
recurring item is due it takes a rotation turn and delays normal content;
multiple due items show back-to-back by `displayOrder`. When no normal content
exists, recurring items rotate as filler. Pause freezes counters; spotlighting
or cadence edits reset only the affected item's counter.

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `CONTENT.ROTATION`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## User Scenarios & Testing

### User Story 1 — Predictable sponsor cadence per item (Priority: P1)

A `content_manager` marks Sponsor A as recurring every **6** iterations and
Sponsor B every **30**, with regular photos rotating between them. On the kiosk,
Sponsor A appears roughly once per minute and Sponsor B roughly once every five
minutes (assuming ~10 s per slide). Neither sponsor blocks the other's
schedule.

**Why this priority**: Operators need a simple mental model when scheduling
sponsor or reminder slots during live events.

**Independent Test**: Configure regular items R₁–R₃ plus recurring A (N=6) and
B (N=30); advance the kiosk through 35 screen transitions and verify A appears
at ticks 6, 12, 18, 24, and 30, and B appears on tick 31 immediately after A
(both become due when their counters reach 6 and 30 on transition 30; A has
lower `displayOrder` and shows first).

**Acceptance Scenarios**:

1. **Given** recurring A with N=6 and regular content in loop mode, **When**
   the kiosk completes 12 screen transitions, **Then** A has been shown
   exactly twice (after transitions 6 and 12).
2. **Given** recurring A (N=6) and B (N=30) with regular content, **When**
   transition 30 completes, **Then** A is shown first (lower `displayOrder` if
   tied on due state) and B on the very next transition, with no regular
   content between them.
3. **Given** ten recurring items each with N=30, **When** observing any single
   item over 30 transitions, **Then** that item appears approximately once
   every 30 transitions (independent of the other nine).
4. **Given** three recurring items A, B, C each with N=6 and different
   `displayOrder`, **When** all three become due on the same transition,
   **Then** they appear on three consecutive transitions in ascending
   `displayOrder` with no regular content between them.

---

### User Story 2 — Recurring items delay normal rotation (Priority: P1)

When a recurring item becomes due, it replaces the next normal rotation slot.
The regular queue cursor does not advance on that transition; normal content
resumes on the following non-due transition from the same cursor position.

**Why this priority**: Preserves the existing "interrupt" semantics operators
expect from recurring content.

**Independent Test**: Bootstrap at regular item A with queue A→B→C and recurring
X (`N=3`). Using `counter >= N`, X appears on transitions **3** and **6**.
After seven transitions the kiosk has shown
`B → C → X → A → B → X → C` (regular cursor preserved across X per acceptance 1–2).

**Acceptance Scenarios**:

1. **Given** regular queue at item B and recurring X becomes due, **When** the
   transition fires, **Then** X is shown and the regular cursor remains at B.
2. **Given** X was just shown, **When** the next transition fires and no
   recurring item is due, **Then** the kiosk advances to the next regular item
   after B (i.e. C).
3. **Given** a due recurring item is displayed, **When** that transition
   completes, **Then** only that item's counter resets to 0; other recurring
   counters keep their values (modulo the +1 applied on that transition).
4. **Given** X with `N=3` and bootstrap at A, **When** the kiosk completes
   transition 3, **Then** X is shown because its counter reached 3 (`>= N`), not
   on transition 4 (legacy `counter > N` semantics are superseded).

---

### User Story 3 — Recurring-only queue filler (Priority: P2)

An operator configures only recurring sponsor items (no normal top content).
Between due events the kiosk rotates through all active recurring items in
`displayOrder` as filler so the screen never stalls waiting for a regular item.

**Why this priority**: Some events may run sponsor-only top regions temporarily.

**Independent Test**: Two recurring items A (N=6) and B (N=30), no regular
content; verify filler alternation by `displayOrder` between due events and
correct due firings at transitions 6 and 30.

**Acceptance Scenarios**:

1. **Given** only recurring items and none are due, **When** transitions
   continue, **Then** the kiosk cycles recurring items in ascending
   `displayOrder` as filler content.
2. **Given** filler is showing, **When** a transition completes, **Then** all
   recurring counters increment by 1 (filler transitions count toward cadence).

---

### User Story 4 — Operator controls preserve counter state (Priority: P2)

Pause, spotlight (`jump_to`), and live cadence edits behave predictably with
per-item counters.

**Why this priority**: Remote control and admin edits must not desynchronise
sponsor schedules unexpectedly.

**Independent Test**: Pause with counters mid-cycle; resume and verify counts
continue. `jump_to` a recurring item and verify only its counter resets. Change
its N via admin poll and verify only its counter resets.

**Acceptance Scenarios**:

1. **Given** loop mode with counters at non-zero values, **When** the operator
   pauses rotation, **Then** no transitions occur and no counters change until
   resume.
2. **Given** loop mode, **When** the operator spotlights recurring item B via
   `jump_to`, **Then** B is shown and B's counter resets to 0; other recurring
   counters are unchanged.
3. **Given** recurring item A is active with counter 18 and N=30, **When** the
   operator changes A's cadence to N=10 via admin and the kiosk polls the new
   state, **Then** A's counter resets to 0 and other counters are unchanged.
4. **Given** a novelty burst is active (per CHG-027), **When** novelty slides
   are shown, **Then** recurring counters do not advance; after the burst,
   recurring logic resumes on the next eligible transition.
5. **Given** loop mode with non-zero recurring counters, **When** the operator
   switches to `iframe` or `fixed` and later returns to `loop`, **Then** the
   per-item counter map is unchanged (same values as before leaving loop).
6. **Given** an inactive recurring item with N configured, **When** transitions
   continue, **Then** that item is excluded from counter increments, due checks,
   and filler rotation.

---

### Edge Cases

- Two recurring items with the same N and different `displayOrder`: on a shared
  due transition, lower `displayOrder` shows first; the other shows on the next
  transition if still due.
- Three or more recurring items due simultaneously: resolve one per transition
  in ascending `displayOrder` until none remain due, then resume normal/filler.
- Inactive recurring items are excluded from counters, filler, and due checks.
- Fixed and iframe modes do not advance recurring counters; returning to loop
  preserves counter values (same as current cursor preservation).
- Full kiosk page reload resets all recurring counters to 0.
- Recurring items remain mutually exclusive with fixed content at admin save
  time (unchanged from CHG-007).

## Requirements

### Functional Requirements

- **FR-001**: Each active recurring top content item MUST maintain its own
  integer cadence counter in kiosk loop mode, independent of other recurring
  items.
- **FR-002**: On every on-screen content transition in loop mode (including
  transitions that display a recurring item or filler recurring item), all
  active recurring counters MUST increment by 1, except during pause or an
  active novelty burst.
- **FR-003**: After incrementing, any recurring item whose counter is greater
  than or equal to its configured `recurringEveryXIterations` (N) MUST be
  considered due on that transition.
- **FR-004**: If one or more items are due, the kiosk MUST show exactly one due
  item per transition, choosing the due item with the smallest `displayOrder`.
  The regular queue MUST NOT advance on that transition.
- **FR-005**: When a due recurring item is shown, only that item's counter MUST
  reset to 0.
- **FR-006**: Recurring items MUST be excluded from the regular rotation queue;
  they appear only via the due-item rules or filler rules in FR-007.
- **FR-007**: When no regular content exists and no recurring item is due, the
  kiosk MUST advance through active recurring items in ascending `displayOrder`
  as filler; filler transitions count as FR-002 transitions.
- **FR-008**: Pause in loop mode MUST freeze all recurring counters until
  resume.
- **FR-009**: `jump_to` targeting a recurring item MUST reset only that item's
  counter to 0.
- **FR-010**: When polled display state shows a changed
  `recurringEveryXIterations` for an item (or the item newly becomes
  recurring), that item's counter MUST reset to 0 without resetting others.
- **FR-011**: When the last recurring item is removed from the active queue,
  all recurring counters MUST reset to 0.
- **FR-012**: The admin form hint for recurring cadence MUST remain accurate:
  the value represents iterations between appearances, where one iteration is
  one screen transition.

### Traceability & Quality Requirements

- **TQ-001**: The `CONTENT.ROTATION` active contract MUST be updated before
  implementation to replace the single shared cadence counter behaviour.
- **TQ-002**: Automated tests MUST cover independent counters, simultaneous
  due items, recurring-only filler, pause, `jump_to`, and hot cadence change.
- **TQ-003**: `specs/manifest.yml` MUST list CHG-039 under `CONTENT.ROTATION`
  before implementation is considered complete.

### Key Entities

- **Recurring cadence counter**: Per-content integer tracking how many screen
  transitions have elapsed since the item was last shown or reset.
- **Due recurring item**: Active recurring content whose counter ≥ N after the
  current transition increment.
- **Regular queue**: Active top content without `recurringEveryXIterations` and
  without pending novelty interception (per CHG-027).
- **Filler rotation**: Recurring-only fallback sequence ordered by
  `displayOrder` when no regular content is available and no item is due.

## Success Criteria

- **SC-001**: With default ~10 s slides, a recurring item configured at N=30
  appears approximately once every 30 screen transitions whether the event has
  1 or 10 recurring items configured.
- **SC-002**: Operators can configure two recurring items with different N values
  and observe each on its own schedule without one suppressing the other.
- **SC-003**: When multiple recurring items become due on the same transition,
  viewers see them in `displayOrder` across consecutive transitions with no
  regular content inserted between due items.
- **SC-004**: Pausing rotation for 60 s does not change recurring counter
  values; resuming continues from the preserved counts.
- **SC-005**: 100% of acceptance scenarios in this spec are covered by
  automated kiosk rotation tests or an explicit manual validation task with
  rationale.

## Assumptions

- `recurringEveryXIterations` remains the existing admin field (N ≥ 1); no
  schema or API shape changes are required.
- Cadence is measured in screen transitions, not wall-clock seconds; actual
  elapsed time varies with per-item and default durations.
- Existing mutual exclusion between fixed and recurring content is unchanged.
- Novelty burst counter freeze (CHG-027) extends to per-item recurring
  counters.
- Mode transitions (loop ↔ iframe ↔ fixed) preserve per-item counter values,
  consistent with current cursor preservation.

## Relationships

- Modifies: `CONTENT.ROTATION`
- Extends: CHG-007 (recurring content), CHG-014 (kiosk runtime), CHG-027
  (novelty burst interaction)
- Depends on: existing `recurringEveryXIterations` on top content items
- Supersedes: shared single-counter recurring selection (smallest cadence wins;
  tie-break only by `displayOrder` without per-item independence)

## Non-goals

- Wall-clock scheduling independent of slide transitions.
- Per-recurring duration overrides beyond existing effective duration fields.
- Admin UI redesign beyond keeping the cadence hint accurate.
- Changes to bottom ad-band rotation cadence.
