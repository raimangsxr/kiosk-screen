---
capability: C1-kiosk-display-runtime
supersedes: 018-content-rotation-modes
superseded_by:
status: draft
oversize: true
---

# Feature Specification: Display Control Rotation Tests

**Feature Branch**: `020-display-control-rotation-tests`
**Spec Directory**: `specs/020-display-control-rotation-tests/`
**Created**: 2026-06-22
**Status**: Draft
**Input**: 018-content-rotation-modes is functionally shipped but its
test coverage is incomplete. This spec closes the test gap and the
two minor behavior gaps (T031b, T031c, T049) before declaring the
rotation-modes feature fully closed.

## Clarifications

### Session 2026-06-22

- Q1: Is this a test-only spec? → A: Mostly yes, with three minor
  behavior gaps (T031b, T031c, T049) for closure.
- Q2: Does this change runtime behavior? → A: T031b and T031c add new
  behavior (controller POSTs on empty queue; template renders
  empty-state). T049 is a refactor (extract cadence helper to
  service). No other behavior change.
- Q3: Should the test files be created with `pytest.mark.skip`
  placeholders or fully written? → A: Fully written. The spec
  declares behavior shipped; tests must be green before the spec
  closes.
- Q4: Where does this spec live in the SDD timeline? → A: Active. It
  is the next feature after 018 closes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Migration idempotency (Priority: P1)

The 0012 migration runs successfully twice in a row on a fresh
SQLite-in-memory schema, with no exception and no duplicate rows,
columns, or constraints. The schema after the second run matches the
schema after the first run byte-for-byte (with respect to 018's
changes).

**Why this priority**: migration idempotency is a constitution
principle (every migration since 0010 has followed it). Without a
test, regressions are silent.

**Independent Test**: run `pytest backend/tests/integration/test_migration_0012_content_rotation_modes.py`
on a clean schema; rerun on the same schema; assert no exception
and the resulting schema matches expectations.

**Acceptance Scenarios**:

1. **Given** a fresh SQLite-in-memory schema, **When** `alembic
   upgrade head` runs, **Then** all 018 columns and CHECK
   constraints are present.
2. **Given** the same schema after a successful migration, **When**
   `alembic upgrade head` runs again, **Then** no exception is
   raised and no duplicate columns/constraints exist.

### User Story 2 — Service-level unit tests for rotation (Priority: P1)

The `KioskRotationController` and the rotation services have unit
tests that exercise the cadence counter, the autodetect helper,
and the fixed/recurring exclusivity check.

**Why this priority**: the controller is the new client-side owner
of the rotation cursor (per TD-001). Unit tests are the cheapest
way to lock its invariants.

**Independent Test**: run `npm --prefix frontend run test` and
`pytest backend/tests/unit/...`; all green.

**Acceptance Scenarios**:

1. **Given** a queue with one recurring item at cadence 3 and a
   4-item regular queue, **When** the controller advances 16
   times, **Then** the recurring item appears at advances 4, 8, 12,
   16 (5 times, ±1).
2. **Given** pause is invoked during `mode='loop'`, **When** the
   mode changes to `iframe` or `fixed`, **Then** the `isPaused`
   flag resets to `false`.
3. **Given** `mode='loop'`, **When** pause is invoked twice in
   rapid succession with the same `navigationCommandId`, **Then**
   the second invocation is a no-op (per T040 "pauseCounter").

### User Story 3 — Karma specs for kiosk rotation (Priority: P1)

The kiosk display component has Karma specs that exercise the ad
rotation timing, the Chrome/Firefox rendering parity, the video
ended handler, the branding overlay hide-on-iframe guard, and the
empty-queue placeholder.

**Why this priority**: this is the user-visible behavior the spec
promised. The display component is the only entry point to the
kiosk.

**Independent Test**: `npm --prefix frontend run test` against the
display component specs.

**Acceptance Scenarios**:

1. **Given** 3 ads and `defaultAdDurationSeconds=10`, **When** the
   test advances time by 10 s three times, **Then** the visible ad
   index moves through 0 → 1 → 2 → 0 (round-robin) and each hold
   is ≥ 9 s and ≤ 11 s.
2. **Given** branding is configured, **When** `contentMode='iframe'`,
   **Then** `document.querySelector('.branding-overlay')` returns
   `null` (overlay not in DOM).
3. **Given** the content queue is empty, **When** the kiosk
   renders, **Then** `document.querySelector('.empty-queue')` is
   present with `aria-label="No content available"` (per T031c).

### User Story 4 — Backend integration tests for pause/resume/fixed (Priority: P2)

The display-control service accepts pause, resume, and fixed-mode
PUT requests per FR-006, FR-009..FR-012, FR-019..FR-024, and emits
the correct audit events.

**Why this priority**: the backend behavior is shipped; the
integration tests are the validation gate.

**Independent Test**: `pytest backend/tests/integration/test_display_control_pause_resume.py`
and `test_display_control_fixed_mode.py`.

**Acceptance Scenarios**:

1. **Given** `content_mode='loop'`, **When** a `pause` navigation
   command is posted, **Then** the response is 200 and a
   `display_control_paused` audit event is recorded.
2. **Given** `content_mode='iframe'`, **When** a `pause` command
   is posted, **Then** the response is 409.
3. **Given** `content_mode='fixed'` pointing at a Content with
   `is_fixed=false`, **When** a `fixed` PUT is attempted,
   **Then** the response is 400 with `code: target_not_fixed`.

### User Story 5 — Coverage gates (Priority: P2)

Coverage thresholds from SC-007 are met:
- `backend/app/services/content_service.py` line coverage ≥ 80%.
- `frontend/src/app/display/display-screen.component.ts` line
  coverage ≥ 70%.

**Why this priority**: coverage gates make regressions visible.

**Independent Test**: `pytest backend/tests --cov=app.services.content_service`
and `npm --prefix frontend run test:ci`.

**Acceptance Scenarios**:

1. **Given** the full test suite, **When** the coverage report is
   generated, **Then** `content_service.py` line coverage is
   ≥ 80%.
2. **Given** the full Karma suite, **When** the coverage report
   is generated, **Then** `display-screen.component.ts` line
   coverage is ≥ 70%.

### Edge Cases

- **Empty-queue audit-event spam**: T031b's debounce window (60 s)
  must hold under fast mode transitions (rapid toggle between
  `loop` and `iframe`).
- **Pause during `ended` of a video**: pause must interrupt the
  `onVideoEnded` handler; the next item must NOT be scheduled.
- **Fixed-mode selection cleared externally**: when the admin
  un-flags a Content that is the current `selectedFixedContentId`,
  the next read of `GET /api/display/state` must auto-revert to
  `mode='loop'` (per FR-024 / TD-005). A test pins this behavior.

## Requirements *(mandatory)*

### Behavior gaps closed in this spec

- **FR-001**: The `KioskRotationController` SHALL POST
  `POST /api/display/rotation-event` with body
  `{"eventType": "content_rotation_empty", "payload": {"reason":
  "queue_empty"}}` when the content queue transitions from
  non-empty to empty. Debounce: 60 s per FR-017. Closes 018 T031b.
- **FR-002**: The kiosk template SHALL render
  `<div class="empty-queue" aria-label="No content available">Sin
  contenido</div>` when the content queue is empty. The
  ad-region continues to render if `adsVisible=true`. Closes 018
  T031c.
- **FR-003**: The cadence-selection logic SHALL be extracted to
  `display-rotation.service.ts` as `pickRecurringInsertion(regularQueue,
  recurringItems, cadenceCounter) -> { regularNext, recurringNext }`
  per 018 T049. Behavior is identical to the controller's current
  in-line logic. Refactor only; no behavior change.

### Test requirements

- **FR-004**: The migration idempotency test SHALL run on a fresh
  SQLite-in-memory schema and assert that the 0012 migration is
  idempotent (closes 018 T017, T018).
- **FR-005**: Service-level unit tests SHALL cover
  `detect_media_type_from_extension` (018 T019), the fixed/recurring
  exclusivity validator (018 T020), and the pause/resume/fixed
  service methods (018 T021).
- **FR-006**: Backend integration tests SHALL cover the
  autodetect contract for the admin and public upload endpoints
  (018 T061, T062).
- **FR-007**: Karma specs SHALL cover the kiosk rotation behavior
  per 018 T023-T025, T031a, T032-T033a, T046-T047, T052-T054, T063.

### Traceability & Quality Requirements *(mandatory)*

- **TQ-001**: Each functional requirement maps to a deferred 018
  task ID. The mapping is in the requirement's "Closes 018 …" or
  "Covers 018 …" annotation.
- **TQ-002**: Coverage thresholds from 018 SC-007 are met before
  this spec closes (FR-005 in US5).
- **TQ-003**: This spec's `validation/` directory carries a
  `final-acceptance.md` with a pass/fail row for each FR-001..FR-007
  and a row for each US acceptance scenario.

### Key Entities

- **`0012_content_rotation_modes` migration** — already shipped
  (018 T004); this spec adds the idempotency test (FR-004).
- **`KioskRotationController`** — already shipped (018 T026);
  this spec adds the empty-queue POST trigger (FR-001) and
  cedes the cadence-selection logic to the service (FR-003).
- **`display-rotation.service.ts`** — already shipped as a slim
  helper (018 T027); this spec adds `pickRecurringInsertion`
  (FR-003).
- **`display-screen.component.ts` template** — already shipped
  (018 T028); this spec adds the empty-queue branch (FR-002).

## Success Criteria *(mandatory)*

- **SC-001**: `pytest backend/tests -q` is green. All 018-deferred
  tests (T017-T022, T037, T050-T051, T061-T062) plus the new
  020 tests pass.
- **SC-002**: `npm --prefix frontend run test` is green. All
  018-deferred Karma specs (T023-T025, T031a, T032-T033a, T037,
  T046-T047, T052-T054, T063) plus the new 020 specs pass.
- **SC-003**: `npm --prefix frontend run test:ci` reports ≥ 70% line
  coverage for `display-screen.component.ts`.
- **SC-004**: `pytest backend/tests --cov=app.services.content_service`
  reports ≥ 80% line coverage for `content_service.py`.
- **SC-005**: `alembic upgrade head` runs twice in a row without
  raising (idempotency).

## Assumptions

- 018 ships as planned with the three behavior gaps (T031b, T031c,
  T049) deferred to this spec.
- The existing 018 implementation is the source of truth for
  behavior; this spec only adds tests, the empty-queue trigger,
  the empty-queue template branch, and the cadence-helper
  extraction.
- The next active feature (this spec) keeps the same branch
  number (`020-display-control-rotation-tests`).

## Out of Scope

- Re-architecting the rotation timer (TD-001 effect-based
  controller is the final design).
- Adding new content modes beyond `loop | iframe | fixed`.
- Adding a push channel (WebSocket / SSE) to replace polling.
- Multi-recurring ordering UI (round-robin is server-side only).

## Supersedes

- `018-content-rotation-modes` — closes the deferred tasks (T031b,
  T031c, T049) and all test/validation tasks that 018 listed but
  did not execute.

## Superseded by

- None yet.