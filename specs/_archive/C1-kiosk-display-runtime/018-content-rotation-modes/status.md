# Status: 018-content-rotation-modes (split at Phase 4)

**Capability**: C1-kiosk-display-runtime
**Closed on**: 2026-06-22 (commit `phase-4-split-018`)
**Supersedes**: 006 (US1, US3, US5), 016 (US6), 017 (US2)
**Superseded by**: 020-display-control-rotation-tests (test coverage follow-up)
**Status at archive time**: behavior shipped (37/81 tasks `[X]`); tests
deferred to 020 (44/81 tasks `[ ]`).

## What's shipped (37 implementation tasks)

### Foundational

- T004 `0012_content_rotation_modes.py` migration (idempotent).
- T005 `top_content_items.recurring_every_x_iterations`,
  `is_fixed`, both CHECK constraints.
- T006 `display_control_states.selected_fixed_content_id`,
  `content_mode` widened to `{loop, iframe, fixed}`, new CHECK.
- T008 `detect_media_type_from_extension` helper, `IMAGE_EXTENSIONS`,
  `VIDEO_EXTENSIONS`, `UnsupportedExtensionError`.
- T009-T010 schemas and mappers carry `is_fixed`,
  `recurring_every_x_iterations`; `content_type` optional.
- T011-T012 `content_service.py`: admin and public upload
  autodetect; `isFixed`/`recurringEveryXIterations` validated
  exclusivity on admin; silently ignored on public.
- T013 `display_control_service.py`: pause/resume/next/previous
  accepted in `loop` only (409 outside); fixed mode validated
  against `is_fixed=true` target; auto-fallback on target removal.
- T014 `display_service.open_display` returns
  `fixed_eligible_content_ids`.
- T015 `POST /api/display/rotation-event` endpoint (mounted in
  `display.py:261`; originally planned as a separate file but the
  router composition put it alongside the other display endpoints).
- T016 audit-service constants for the 5 new event types.

### US1 — rotation bug fixes

- T026 `KioskRotationController` (effect-based single timer).
- T027 `display-rotation.service.ts` slimmed to pure pickNext helper.
- T028 `display-screen.component.ts` consumes the controller.
- T029 `display-screen.component.css` `max-width:auto` no-op removed.
- T030 `animationDurationMs(ad)` returns a finite positive number even
  when both per-item and config durations are missing.
- T031 `.ad-region` grid layout; `min-width:120px` on figures.

### US2 — branding overlay hidden in iframe mode

- T034 `hasBranding() && !iframeUrl()` guard in the overlay `*ngIf`.
- T035 017/spec.md AS-5 obsolete note + `## Superseded by` block.
- T036 017/tasks.md T031 obsolete note.

### US3 — pause / resume

- T039 `RemoteControlNavigationCommand` union extends to
  `'next' | 'previous' | 'pause' | 'resume'`.
- T040 facade `pausedSignal` + `setPaused/setResumed` plumbing.
- T041 Pause / Resume buttons in remote-control.component.ts.
- T042 `KioskRotationController.applyNavigationCommand(command)`.
- T043 `<video>` pause/play listeners update controller `isPaused`.

### US4 — recurring content

- T048 `cadenceCounter` signal in the controller; round-robin between
  multiple recurring items; freeze on `mode ≠ 'loop'`; resume at
  the same value.

### US5 — fixed content + new `fixed` mode

- T055 `RemoteControlContentMode` union extends to
  `'loop' | 'iframe' | 'fixed'`; `selectedFixedContentId` and
  `fixedEligibleContentIds` types.
- T056 facade `setFixedMode(contentId)`.
- T057 "Fixed" radio in remote-control.component.ts; select dropdown
  populated from `fixedEligibleContentIds`.
- T058 `enterFixedMode` / `exitFixedMode` in the controller (records
  `previousContentIndex`).
- T059 Template branch for `mode='fixed'` rendering the fixed
  content's `<img>` / `<video loop>`.
- T060 Disable nav buttons when `mode='fixed'`.

### US6 — autodetect

- T064 content-form autodetect: `displayContentType` chip from the
  filename extension; `contentType` form field optional.
- T065 `isFixed` checkbox + `recurringEveryXIterations` number input;
  mutual-exclusion hint.
- T066 "Fijo" / "Recurrente cada N" badges on the content list.

## What's deferred (44 tasks → 020)

- T031b: controller does not POST `/api/display/rotation-event` on
  empty-queue transition (the endpoint exists; the trigger does not).
- T031c: empty-queue template branch (`Sin contenido`) not rendered.
- T049: `pickRecurringInsertion` helper not extracted to
  `display-rotation.service.ts` (the cadence logic lives in
  `KioskRotationController` instead; functionally equivalent but
  doesn't match the spec's code-organization request).
- All test/validation/polish tasks (T001-T003, T017-T025, T032-T033a,
  T037-T038, T044-T047, T050-T054, T061-T063, T067-T076).

These are tracked in
`specs/020-display-control-rotation-tests/tasks.md`.

## Code-organization drift

The spec asked for `pickRecurringInsertion` as a pure helper in
`display-rotation.service.ts`. The implementation kept the cadence
logic inside `KioskRotationController` (signals + `effect()`) so the
controller is the single owner of the rotation cursor. This is a
deliberate deviation from the spec's code-organization request; the
behavior is identical.

## Why this is a split, not a full close

Per constitution v2.0.0 Principle II (Clear, Testable, Traceable
Requirements), test coverage is part of "behavior shipped" for the
Spec Kit workflow. Tests are deferred to 020. 018 archives with the
behavior complete; 020 opens to land the tests and close the loop.

## Cross-references

- 018 spec directory (this): `specs/018-content-rotation-modes/`.
- 020 follow-up (open): `specs/020-display-control-rotation-tests/`.
- 019 canonical anchor: `specs/019-display-control-canonical/`.
- 006 amended: `specs/018-content-rotation-modes/supersedes-006.md`.
- 016 amended: `specs/018-content-rotation-modes/supersedes-016.md`.
- 017 amended: `specs/018-content-rotation-modes/supersedes-017.md`.