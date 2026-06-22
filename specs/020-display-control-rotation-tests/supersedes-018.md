# Supersedes: 018-content-rotation-modes

This spec closes the deferred work that 018 listed in its
`status.md` when it archived.

## What's closed

### Behavior gaps (3 tasks)

- **T031b**: `KioskRotationController` now POSTs
  `/api/display/rotation-event` with body
  `{ "eventType": "content_rotation_empty", "payload": { "reason":
  "queue_empty" } }` on the non-empty → empty transition. Debounce
  window 60 s. Detail: 020 FR-001.
- **T031c**: `display-screen.component.ts` template renders
  `<div class="empty-queue" aria-label="No content available">Sin
  contenido</div>` when the content queue is empty. Ad-region
  continues to render if `adsVisible=true`. Detail: 020 FR-002.
- **T049**: `pickRecurringInsertion` pure helper extracted from the
  controller to `display-rotation.service.ts`. Behavior
  byte-for-byte identical. Detail: 020 FR-003.

### Test tasks (44 tasks)

All 44 deferred test/validation/polish tasks from 018 are tracked
in `specs/020-display-control-rotation-tests/tasks.md`:

- Foundational tests: T017-T022.
- US1 Karma: T023-T025, T031a.
- US2 Karma: T032, T033, T033a.
- US3 tests: T037, T038.
- US4 tests: T044-T047.
- US5 tests: T050-T054.
- US6 tests: T061-T063.
- Polish: T067-T076.

These become T004-T034 in 020 (renumbered for the new feature).

## Why a follow-up spec

018's behavior shipped before its tests. Constitution v2.0.0
Principle II requires traceability from requirements to tests;
Principle V requires tests for changed behavior. Archiving 018
without tests would leave the spec archived but unverified. 020
keeps the test thread tied to a current spec so agents opening
the codebase see "this work is in flight" rather than "018 shipped
without tests".

## Cross-references

- 018 spec directory (archived on merge): `specs/018-content-rotation-modes/`.
- 018 status file: `specs/018-content-rotation-modes/status.md`.
- 019 canonical anchor: `specs/019-display-control-canonical/`.