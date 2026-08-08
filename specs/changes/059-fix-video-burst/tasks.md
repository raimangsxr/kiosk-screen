# Tasks: Video Burst Recovery

**Input**: Design documents from `specs/changes/059-fix-video-burst/`
**Tests**: Required by the specification and constitution; follow TDD within each story.

## Phase 1: Setup and contract grounding

- [x] T001 Verify CHG-059 manifest, context pack, and active contract updates in `specs/manifest.yml`, `specs/contracts/display-runtime/contract.md`, and `specs/contracts/content-rotation/contract.md`
- [x] T002 Review scheduler, retention, retry, and command-lifecycle decisions in `specs/changes/059-fix-video-burst/research.md` and `specs/changes/059-fix-video-burst/contracts/runtime-contract.md`

## Phase 2: Foundational tests

- [x] T003 Add integrated FIFO/global-concurrency and non-retained completion tests in `frontend/src/app/display/display-media-cache.service.spec.ts`
- [x] T004 Add failure cooldown/retry and lifecycle cleanup tests in `frontend/src/app/display/display-media-cache.service.spec.ts`

## Phase 3: User Story 1 — Stable playback during a burst (P1)

**Goal**: Keep preparation concurrency and presentation memory bounded while ensuring every committed command has a valid source.

**Independent Test**: Ten mixed preparations never exceed three active HTTP requests; non-retained completions are revoked; a later selected novelty is prepared before commit.

- [x] T005 [US1] Refactor all preparation requests through one deduplicated FIFO scheduler in `frontend/src/app/display/display-media-cache.service.ts`
- [x] T006 [US1] Separate logical readiness from retained presentation Blob ownership in `frontend/src/app/display/display-media-cache.service.ts`
- [x] T007 [US1] Revalidate novelty presentation sources through the content gate in `frontend/src/app/display/display-content-gate.service.ts`
- [x] T008 [US1] Add novelty revalidation coverage in `frontend/src/app/display/display-content-gate.service.spec.ts`
- [x] T009 [US1] Include command identity in top-content render keys and add repeated-video remount coverage in `frontend/src/app/display/display-screen.component.ts` and `frontend/src/app/display/display-screen.component.spec.ts`

## Phase 4: User Story 2 — Automatic transient recovery (P2)

**Goal**: Retry transient preparation failures safely and report visible video errors once against the originating command.

**Independent Test**: A failed URL retries after cooldown; duplicate current-video errors produce one report; a stale video error produces none for the replacement command.

- [x] T010 [US2] Implement bounded failure cooldown and successful retry reset in `frontend/src/app/display/display-media-cache.service.ts`
- [x] T011 [US2] Add command-scoped visible-video error reporting in `frontend/src/app/display/display-viewer.controller.ts`
- [x] T012 [US2] Bind video error events to the originating command in `frontend/src/app/display/display-screen.component.ts`
- [x] T013 [P] [US2] Add error deduplication and stale-command tests in `frontend/src/app/display/display-viewer.controller.spec.ts`
- [x] T014 [P] [US2] Add visible-video error binding tests in `frontend/src/app/display/display-screen.component.spec.ts`

## Phase 5: Polish and validation

- [x] T015 Run focused CHG-059 Angular tests listed in `specs/changes/059-fix-video-burst/quickstart.md`
- [x] T016 Run all display runtime specs with `npm --prefix frontend run test -- --watch=false --include='src/app/display/**/*.spec.ts'`
- [x] T017 Run production build with `npm --prefix frontend run build`
- [x] T018 Update CHG-059 status and completion evidence in `specs/changes/059-fix-video-burst/spec.md`, `specs/changes/059-fix-video-burst/quickstart.md`, and `specs/manifest.yml`

## Dependencies

- Phase 1 is complete before code changes.
- T003–T004 establish failing tests before T005–T010.
- US1 is the MVP and must complete before US2 integration.
- T013 and T014 may proceed in parallel after T011/T012 interfaces are defined.
- Validation tasks run sequentially after both stories.

## Parallel Example

After the viewer and component interfaces are implemented, T013 and T014 touch separate spec files and may run in parallel.

## Implementation Strategy

1. Establish red tests for the diagnosed burst and sticky-failure regressions.
2. Deliver US1 as the smallest safe resource-bound fix.
3. Add US2 recovery and command-scoped reporting.
4. Run narrow tests, the complete display suite, then the production build.
