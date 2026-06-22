# Tasks: Display Control Canonical

**Input**: Design documents from `specs/019-display-control-canonical/`
- `spec.md` (required) — 5 user stories, 20 FRs, 3 SCs
- `plan.md` (required) — implementation plan
- `data-model.md` — canonical schema
- `contracts/audit-display-events.md` — audit-event taxonomy

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/

**Tests**: This is a documentation-only feature. The validation gate
is `/speckit.analyze` reporting no contradictions between 019 and
the four amending specs (006, 016, 017, 018).

**Organization**: Tasks are organized by user story. The first
story produces the canonical anchor that the rest build on.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- Spec: `specs/019-display-control-canonical/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: confirm branch and prepare the spec directory.

- [X] T001 Verify the working branch is `019-display-control-canonical` and
      that `specs/019-display-control-canonical/` exists.
- [X] T002 [P] Create `specs/019-display-control-canonical/contracts/`
      and `specs/019-display-control-canonical/validation/`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: write the canonical spec, plan, and data-model so
subsequent stories can reference them.

**⚠️ CRITICAL**: US1's validation depends on the spec being committed.

- [X] T003 Write `specs/019-display-control-canonical/spec.md` with the
      five user stories, the twenty FRs, the three SCs, the
      `## Supersedes` block listing 006/016/017/018, and the
      `oversize: true` frontmatter justification.
- [X] T004 [P] Write `specs/019-display-control-canonical/plan.md` with
      the Constitution Check, the size-budget oversize justification,
      and the project structure.
- [X] T005 [P] Write `specs/019-display-control-canonical/data-model.md`
      with the canonical `display_control_state` shape, the
      `RemoteControlNavigationCommand` enum, and the
      `KioskRotationController` responsibilities.

**Checkpoint**: spec + plan + data-model are committed; US1 is
ready to run.

---

## Phase 3: User Story 1 — One anchor for display-control rules

**Goal**: the canonical spec is reviewable end-to-end; an engineer
reading `spec.md` answers the four canonical questions in under 5
minutes.

**Independent Test**: open `specs/019-display-control-canonical/spec.md`
and confirm it answers (a) what `contentMode` values exist, (b) what
`navigationCommand` values exist, (c) what the ad-band does in
iframe/fixed, (d) what the rotation cursor does on mode transition,
(e) which specs amend which field.

### Tests for User Story 1

- [X] T006 [P] [US1] Self-review of `spec.md`: read the file end-to-end
      and confirm SC-001 holds (four canonical questions answered
      in < 5 min, no other spec opened).
- [X] T007 [P] [US1] Run `/speckit.analyze` on `019-display-control-canonical`
      and confirm no contradictions with archived 006/016/017/018.
- [X] T008 [P] [US1] `git grep "FR-001" specs/019-display-control-canonical/spec.md`
      returns one line; every FR has a `Source:` line that names
      one of 006/016/017/018.

**Checkpoint**: SC-001, SC-002 met.

---

## Phase 4: User Story 2 — Audit event taxonomy is stable

**Goal**: every `DisplayEventType` referenced in any spec is listed
in `contracts/audit-display-events.md` with payload shape.

**Independent Test**: open
`specs/019-display-control-canonical/contracts/audit-display-events.md`
and confirm every `DisplayEventType` referenced in any spec is listed.

### Tests for User Story 2

- [X] T009 [P] [US2] `git grep "DisplayEventType\|create_display_event\|api_key_changed" specs/*/spec.md specs/*/contracts/*.md backend/app/domain/display_events.py | sort -u`
      produces a unique set of event types; every type appears in
      `audit-display-events.md`.
- [X] T010 [P] [US2] Self-review of `contracts/audit-display-events.md`:
      every event type has `eventType`, `severity`, `entityType`,
      and producer spec.

**Checkpoint**: SC-003 met.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T011 [P] Update `specs/_capabilities/C5-remote-control/index.specs.md`
      to mention 019 as the canonical anchor.
- [X] T012 [P] Update `specs/_capabilities/C5-remote-control/overview.md`
      to point new readers at `019-display-control-canonical/`.
- [X] T013 [P] Update `specs/_capabilities/C1-kiosk-display-runtime/overview.md`
      to point new readers at `019-display-control-canonical/`.

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): no dependencies.
- Foundational (Phase 2): depends on Setup.
- US1 (Phase 3): depends on Foundational.
- US2 (Phase 4): depends on Foundational; can run in parallel with US1.
- Polish (Phase 5): depends on US1 + US2.

### Within Each Phase

- US1 tasks T006, T007, T008 are parallel.
- US2 tasks T009, T010 are parallel.
- Polish tasks T011, T012, T013 are parallel.

---

## Implementation Strategy

### Single-Contributor Path

1. Phase 1: 5 min (branch + dirs).
2. Phase 2: 30 min (spec + plan + data-model).
3. Phase 3: 15 min (self-review + analyze).
4. Phase 4: 15 min (audit-events contract).
5. Phase 5: 10 min (capability overview updates).

Total: ~75 min for one engineer. No code change; no test run;
no `pytest` / `npm test` invocation.