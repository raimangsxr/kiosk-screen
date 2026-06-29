# Tasks: Event Config Realtime Sync

**Input**: Design documents from `/specs/changes/024-event-config-realtime-sync/`

**Prerequisites**: plan.md (this file), spec.md (required for user stories), context-pack.md

**Tests**: Tests are mandatory for changed behavior. Each user story carries at least one Karma spec that asserts a measurable success criterion (SC-001..SC-005).

**Organization**: Tasks are grouped by user story to enable independent implementation and validation of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, ...)
- Include exact file paths in descriptions

## Phase 1: SDD Governance & Context

- [ ] T001 Verify the working branch and the active change artefacts at `specs/changes/024-event-config-realtime-sync/`.
- [ ] T001a Read `specs/manifest.yml` and confirm `EVENT.BRANDING` and `DISPLAY.RUNTIME` are the affected contracts.
- [ ] T001b Update `specs/contracts/event-branding/contract.md` with the live-update behavior, the auto-save debounce window, and the cross-tab channel name.
- [ ] T001c Update `specs/contracts/display-runtime/contract.md` with the new subscription to the event-config sync channel.
- [ ] T001d Update `specs/manifest.yml` to add CHG-024 and reference the new `event-config-sync.service.ts` in the `EVENT.BRANDING` and `DISPLAY.RUNTIME` owned paths.

## Phase 2: Foundational — Cross-tab sync service

- [ ] T002 [P] Create `frontend/src/app/core/event-config-sync.service.ts` modeled after `frontend/src/app/core/display-control-sync.service.ts`: channel `kiosk-event-config-sync`, storage key `kiosk-event-config-sync-event`, `changes$` observable, `notifyEventConfigChanged()` method, `OnDestroy` cleanup. Injectable in root.

## Phase 3: User Story 2 — Sliders in admin form (Priority: P1)

- [ ] T003 [US2] Import `MatSliderModule` in `frontend/src/app/features/event-config/event-config.component.ts` and replace each `<input matInput type="number">` inside the `.event-config__layout-grid` with `<mat-slider [min]="field.min" [max]="field.max" [step]="field.step" discrete><input matSliderThumb [formControlName]="field.controlName" /></mat-slider>` plus a small read-out chip showing the current value and unit.
- [ ] T004 [US2] Wrap each slider in its own block (label + slider + value + unit) so the existing grid layout stays responsive and the slider is operable on narrow widths.

## Phase 4: User Story 1 — Auto-save + cross-tab notification (Priority: P1)

- [ ] T005 [US4/US1] Add `saveLayout(layout: EventConfigLayoutValue): Observable<EventConfiguration>` to `frontend/src/app/features/event-config/event-config.facade.ts`. Internally builds the same FormData shape as `save()` but only with `logoLayout` and `eventNameLayout`, omits file/removeLogo, and on success calls `EventConfigSyncService.notifyEventConfigChanged()` and updates the `configuration` signal.
- [ ] T006 [US1] In `EventConfigComponent`, subscribe to `form.controls.layout.valueChanges`, debounce 400 ms, `distinctUntilChanged` (JSON fingerprint), skip when `form.pristine`, and call `facade.saveLayout(...)` via `takeUntilDestroyed(destroyRef)`.
- [ ] T007 [US1] Add a per-section auto-save status signal (`idle | saving | saved | error`) and render a small text indicator next to the section legend.

## Phase 5: User Story 3 — Explicit Save path stays intact (Priority: P2)

- [ ] T008 [US3] Verify that the existing `submit()` path still saves the non-layout fields and that the explicit Save button is unchanged. Auto-save MUST NOT call `submit()`.
- [ ] T009 [US3] Confirm `EventConfigFacade.save()` also calls `EventConfigSyncService.notifyEventConfigChanged()` on success (so explicit Save also refreshes the kiosk).

## Phase 6: User Story 4 — Error handling on auto-save (Priority: P2)

- [ ] T010 [US4] In the auto-save subscription, catch errors via `catchError`, set the status signal to `error`, and log to console without showing a toast. The next successful save resets the signal to `saved`.

## Phase 7: Display-side subscription

- [ ] T011 [US1] Inject `EventConfigSyncService` in `frontend/src/app/display/display-screen.component.ts`, subscribe to `changes$` via `takeUntilDestroyed(destroyRef)`, and call `eventBranding.refresh()` on each notification. Do not modify the existing polling cycle.

## Phase 8: Tests

- [ ] T012 [P] Create `frontend/src/app/features/event-config/event-config.component.spec.ts` with the following specs:
  - Renders all ten layout fields as `mat-slider` elements (SC-002).
  - Moving a slider triggers `saveLayout` after the debounce window (SC-001 / SC-003).
  - The cross-tab notification is emitted on successful save (FR-004).
  - Auto-save error surfaces in the status signal without throwing (US4).
  - Auto-save is skipped while the form is pristine (FR-003).
- [ ] T013 [P] Extend `frontend/src/app/display/display-screen.component.spec.ts` with a spec that injects a fake `EventConfigSyncService`, emits a notification, and asserts `EventBrandingService.refresh()` is called.

## Phase 9: Validation

- [ ] T014 Run `npm --prefix frontend run build` and confirm it exits zero.
- [ ] T015 Run `npm --prefix frontend run test` and confirm it exits zero with the new specs green.
- [ ] T016 Run `pytest backend/tests` and confirm backend is unaffected (FR-004 / TQ-004).

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9.
- T003 (sliders) and T005 (facade method) are independent and can run in parallel.
- T006 (auto-save) requires T003 (sliders) and T005 (facade method) to be in place.
- T011 (display subscription) requires T002 (sync service) to be in place.

## Parallel Opportunities

- T002, T003, and T005 are independent and can be landed together.
- T012 and T013 are independent (different files).
- T008 and T009 are part of the same file but different methods.

## Suggested MVP Scope

Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 7 is the smallest slice that delivers the user-visible value: the operator sees sliders and the kiosk reacts within ~1 s. Phases 5, 6, 8 are incremental hardening.