---
description: "Task list for Remote Control Admin Polish"
---

# Tasks: Remote Control Admin Polish

**Input**: Design documents from `/specs/015-remote-control-polish/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Tests are mandatory for changed behavior. Include unit tests for the rewritten component and explicit manual validation tasks for the responsive layout. Backend tests are not affected.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. The implementation is a single-component rewrite, so the user stories share one component file; tasks within a story still produce an independently testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- Frontend: `frontend/src/app/`
- Spec: `specs/015-remote-control-polish/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Verify the current state of
      `frontend/src/app/features/remote-control/remote-control.component.ts:1-156`,
      `frontend/src/app/features/remote-control/remote-control.facade.ts:1-77`,
      `frontend/src/app/features/remote-control/remote-control.models.ts:1-31`,
      and `frontend/src/app/features/remote-control/remote-control.api.ts:1-28`
      to confirm the line numbers in `specs/015-remote-control-polish/plan.md`
      are accurate. If any line numbers have drifted, update the plan before
      proceeding.

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared component changes that all user stories depend on.

The rewrite is concentrated in one file. The shared parts that US1, US2,
US3, and US4 all need are the toolbar, the page header, the status pill,
and the saving/error disabling logic. These are added in T002 so each user
story can extend the template independently.

- [ ] T002 [P] Update
      `frontend/src/app/features/remote-control/remote-control.component.ts`
      imports to add `MatToolbarModule`, `MatRadioModule`, `MatSnackBar`,
      `MatSnackBarModule`, `MatChipsModule`, and `RouterLink` (the
      existing `MatCardModule`, `MatFormFieldModule`, `MatSelectModule`,
      `MatSlideToggleModule`, `MatButtonModule`, `MatIconModule`, and
      `MatProgressBarModule` imports stay if still needed; remove the
      ones that are no longer used after the rewrite).

**Checkpoint**: Imports updated; the component file is ready to be
rewritten in US1, US2, US3, and US4 tasks.

---

## Phase 3: User Story 1 - Switch the kiosk mode from a clean, mobile-first layout (Priority: P1) 🎯 MVP

**Goal**: Replace the cramped mat-card layout with a sticky toolbar, a
status pill, and a content-mode card with a `mat-radio-group` (Rotation /
Iframe). Mobile-first, Material 3 surfaces, no horizontal scroll on a
360×640 viewport.

**Independent Test**: Sign in as administrator, open `/remote-control`,
confirm the toolbar is sticky, the page header and status pill render
below it, the Rotation/Iframe radio group is visible with the active
mode preselected, and no horizontal scroll exists on a 360×640 viewport.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T003 [P] [US1] Update
      `frontend/src/app/features/remote-control/remote-control.component.spec.ts`
      to assert: the toolbar renders, the back button is the first
      focusable element, the page header eyebrow is "Hall" and the title
      is "Remote control", the status pill renders the current mode and
      ads visibility, the Rotation and Iframe radio buttons render with
      the active mode preselected, and that on `facade.refresh()` error
      the mode/ads controls are not rendered and the
      `app-admin-state` error block is shown with a retry action
      visible.

### Implementation for User Story 1

- [ ] T004 [US1] Rewrite
      `frontend/src/app/features/remote-control/remote-control.component.ts`
      to add: a sticky `mat-toolbar` with a back `mat-icon-button`
      (`routerLink="/hall"`, `aria-label="Back to hall"`), the "Kiosk
      Screen" brand lockup, and `<app-user-menu />`; the existing
      `app-page-header`; a status pill using `mat-chip-set` (mode,
      ads visibility, display online/offline, "Updated <time>"); a
      content-mode `mat-card outlined` with a `mat-radio-group` bound
      to `facade.state()?.contentMode`; an `app-admin-state` error
      block bound to `facade.error()` with a retry action that calls
      `facade.refresh()` again (only rendered when
      `facade.error() !== null && facade.state() === null`); a saving
      progress bar bound to `facade.loading() || facade.saving()`.
      Keep the component selector, the standalone flag, and the
      `ChangeDetectionStrategy` unchanged. (depends on T002)

- [ ] T005 [US1] Add the private `relativeTime(iso: string): string`
      helper at the bottom of
      `frontend/src/app/features/remote-control/remote-control.component.ts`.
      The helper covers "just now", "N seconds ago", "N minutes ago",
      "HH:MM" same day, "Yesterday HH:MM", and "YYYY-MM-DD HH:MM"
      beyond that. (depends on T004)

- [ ] T006 [US1] Add a `computed()` signal in
      `frontend/src/app/features/remote-control/remote-control.component.ts`
      that returns a derived `updatedLabel` string for the status pill
      by calling `relativeTime(facade.state()?.updatedAt)`. The status
      pill in the template reads from this signal. (depends on T005)

- [ ] T007 [US1] Add the styles for the new layout in
      `frontend/src/app/features/remote-control/remote-control.component.ts`:
      the toolbar sticky styles, the page spacing, the status pill
      layout, the radio group spacing, the mobile-first single-column
      layout at ≤ 599.98 px, the `@media (min-width: 600px)` rule for
      desktop, the touch-target minimums, and the
      `aria-live="polite"` region for the status pill. (depends on T004)

- [ ] T008 [US1] Verify the toolbar + page header + status pill +
      radio group render on viewports 360×640 and 1280×800 in
      Chrome DevTools. Verify the back button is the first focusable
      element (Tab from a fresh page load lands on the back button).
      (depends on T007)

**Checkpoint**: US1 is fully testable; the page renders the new
layout with the mode radio group, but the iframe list and the
snackbar are not wired up yet.

---

## Phase 4: User Story 2 - Pick the iframe from a visible list of configured iframes (Priority: P1)

**Goal**: When the Iframe radio is selected, render the configured
iframes as a nested list of radio items, each with title and a
shortened source URL. When the list is empty, disable the Iframe
radio and show a CTA to add one in the admin content section.

**Independent Test**: Configure at least one iframe in the admin
content section, open `/remote-control`, pick the Iframe radio, and
confirm the iframe list renders with one card per configured iframe.
Deactivate all iframes and confirm the Iframe radio is disabled and
the helper text + CTA are visible.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T009 [P] [US2] Update
      `frontend/src/app/features/remote-control/remote-control.component.spec.ts`
      to assert: when `facade.iframeOptions()` has items and the mode
      is "iframe", one radio item per iframe is rendered with the
      title and a shortened source URL; when `facade.iframeOptions()`
      is empty, the Iframe radio is disabled, the helper text
      "No iframes configured." is visible, and a primary action
      linking to `/admin/content/new` is rendered.

### Implementation for User Story 2

- [ ] T010 [US2] Update the content-mode card template in
      `frontend/src/app/features/remote-control/remote-control.component.ts`
      to render the iframe list as a nested `mat-radio-group` of
      `mat-radio-button` items when `facade.state()?.contentMode === 'iframe'`
      and `facade.iframeOptions().length > 0`. Each item shows the
      title and a shortened source URL (`sourceReference` truncated
      to 48 characters with an ellipsis when needed). The selected
      item is the one matching `facade.state()?.selectedContentId`.
      (depends on T004)

- [ ] T011 [US2] Update the content-mode card template in
      `frontend/src/app/features/remote-control/remote-control.component.ts`
      to render the empty state when `facade.iframeOptions().length === 0`:
      the Iframe radio is disabled (`[disabled]="true"`), the helper
      text "No iframes configured. Add one in the admin content
      section." is visible, and a primary action linking to
      `/admin/content/new` is rendered (use `routerLink` and a
      `mat-flat-button color="primary"`). (depends on T004)

- [ ] T012 [US2] Add a `selectMode(mode)` and a `selectIframe(id)`
      method in
      `frontend/src/app/features/remote-control/remote-control.component.ts`
      that call `facade.setLoopMode()` or `facade.setIframeMode(id)`
      respectively. The radio group's `(change)` event binds to
      `selectMode($event.value)`. The iframe list's `(change)` event
      binds to `selectIframe($event.value)`. Disable both groups
      when `facade.saving()` is true. (depends on T010, T011)

- [ ] T013 [US2] Verify the iframe list renders on `/remote-control`
      with one card per configured iframe, that picking a card fires
      `facade.setIframeMode(id)`, that the empty state renders when
      no iframes are configured, and that both views are reachable
      on a 360×640 viewport without horizontal scroll. (depends on
      T012)

**Checkpoint**: US2 is fully testable; the iframe list and the
empty state render correctly and the mode/iframe change is wired
through the facade. The snackbar is not wired up yet (US3).

---

## Phase 5: User Story 3 - See a confirmation snackbar after every successful action (Priority: P2)

**Goal**: Emit a `MatSnackBar` (3 s, "Dismiss" action) immediately
after the backend confirms any of: switch to Rotation, switch to a
specific iframe, ads visible, ads hidden. No snackbar on error.

**Independent Test**: Sign in, open `/remote-control`, perform each
of the four actions, and confirm a snackbar appears with the
expected text and disappears after 3 seconds. Trigger an action
that fails (e.g. invalid iframe id) and confirm no snackbar is
shown and the inline error block is rendered instead.

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T014 [P] [US3] Update
      `frontend/src/app/features/remote-control/remote-control.component.spec.ts`
      to assert: a snackbar is shown with the text "Switched to
      rotation mode." and `duration: 3000` after a successful
      `setLoopMode`; with "Now showing: <title>." after a
      successful `setIframeMode`; with "Ads are now visible." after
      a successful `setAdsVisible(true)`; with "Ads are now hidden."
      after a successful `setAdsVisible(false)`; no snackbar is
      shown when the action errors.

### Implementation for User Story 3

- [ ] T015 [US3] Inject `MatSnackBar` into
      `frontend/src/app/features/remote-control/remote-control.component.ts`
      (constructor-level or field-level with `inject()`). Add a
      private `notify(message: string): void` helper that calls
      `this.snackBar.open(message, 'Dismiss', { duration: 3000 })`.
      (depends on T012)

- [ ] T016 [US3] Wire the snackbar emission in
      `frontend/src/app/features/remote-control/remote-control.component.ts`:
      `selectMode('rotation')` calls `facade.setLoopMode().subscribe({
      next: () => this.notify('Switched to rotation mode.'),
      error: () => undefined })`; `selectMode('iframe')` is not
      triggered by the mode radio alone (the iframe radio inside
      the list is what fires `selectIframe`); `selectIframe(id)`
      calls `facade.setIframeMode(id).subscribe({ next: () => {
        const title = this.facade.iframeOptions().find(o => o.id === id)?.title ?? '';
        this.notify('Now showing: ' + title + '.');
      }, error: () => undefined })` (the title is resolved from
      `iframeOptions()` because the facade's `setIframeMode` response
      does not always populate `selectedIframe`); the ads toggle's
      `(change)` handler calls
      `facade.setAdsVisible(visible).subscribe({ next: () =>
      this.notify(visible ? 'Ads are now visible.' : 'Ads are now
      hidden.'), error: () => undefined })`. (depends on T015)

- [ ] T017 [US3] Verify the snackbar text and timing for each of
      the four actions on viewports 360×640 and 1280×800. Verify
      that no snackbar is shown when an action errors. Verify that
      two actions in quick succession replace the first snackbar
      with the second. (depends on T016)

**Checkpoint**: US3 is fully testable; every successful action
emits a snackbar, and no snackbar is shown on error.

---

## Phase 6: User Story 4 - Return to the hall from the remote-control page (Priority: P2)

**Goal**: A back button in the top toolbar navigates to `/hall` on
every viewport, is the first focusable element on the page, and has
an accessible label "Back to hall".

**Independent Test**: Sign in, open `/remote-control`, press Tab
from a fresh page load, and confirm the focus ring lands on the
back button. Activate the back button (click, tap, or Enter key) and
confirm the URL is `/hall`.

### Tests for User Story 4 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T018 [P] [US4] Update
      `frontend/src/app/features/remote-control/remote-control.component.spec.ts`
      to assert: the back button is rendered with `aria-label="Back
      to hall"`; the back button is the first focusable element on
      the page (verified by querying for the first `mat-icon-button`
      in the toolbar); the back button has `routerLink="/hall"`.

### Implementation for User Story 4

- [ ] T019 [US4] Verify the back button implementation added in
      T004 satisfies US4: rendered as the first `mat-icon-button`
      inside the `mat-toolbar`, with `aria-label="Back to hall"`
      and `routerLink="/hall"`. If any of those is missing in T004,
      add the missing piece here. (depends on T004)

- [ ] T020 [US4] Verify the back button is reachable by keyboard on
      viewports 360×640 and 1280×800, that the focus ring is visible,
      that activating the button navigates to `/hall`, and that the
      remote-control page is no longer rendered. (depends on T019)

**Checkpoint**: US4 is fully testable; the back button is the
first focusable element and navigates to `/hall`.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories.

- [ ] T021 [P] Run `npm --prefix frontend run test` and confirm all
      remote-control tests pass plus the full frontend suite stays
      green. Fix any regression introduced by the rewrite.

- [ ] T022 [P] Run `npm --prefix frontend run build` and confirm the
      production build succeeds with no new warnings introduced by
      the rewrite.

- [ ] T023 [P] Run `git diff main -- frontend/src/app/features/remote-control/`
      and confirm the diff contains no new color, no new font, and
      no new icon font registration. The only new imports are
      `MatSnackBar`, `MatSnackBarModule`, `MatToolbarModule`,
      `MatRadioModule`, and `MatChipsModule`.

- [ ] T024 Run the validation matrix from
      `specs/015-remote-control-polish/quickstart.md` manually in
      Chrome DevTools (viewports 360×640 and 1280×800). Capture a
      short note in the PR description with the results.

- [ ] T025 Re-read
      `specs/015-remote-control-polish/spec.md` and confirm every
      acceptance scenario in US1, US2, US3, and US4 is implemented.
      Update the spec to mark acceptance scenarios as "verified" if
      a checklist field is added in a future amend.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS
  all user stories.
- **User Stories (Phase 3-6)**: All depend on Foundational phase
  completion. User stories can then proceed in priority order
  (US1 → US2 → US3 → US4) or in parallel (different parts of the
  same component file; coordination recommended).
- **Polish (Phase 7)**: Depends on all user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) —
  No dependencies on other stories.
- **User Story 2 (P1)**: Can start after US1 (Phase 3) — adds the
  iframe list and empty state on top of the radio group rendered
  by US1.
- **User Story 3 (P2)**: Can start after US2 (Phase 4) — wires the
  snackbar on the actions defined by US1 and US2.
- **User Story 4 (P2)**: Can start after US1 (Phase 3) — verifies
  the back button that was added as part of US1. The implementation
  of the back button lives in US1 (T004); US4 is a verification
  phase plus any small fix.

### Within Each User Story

- Tests MUST be written and fail before implementation where
  automated testing is feasible.
- Tests and implementation of the same story MUST live in the
  same phase.
- Story complete before moving to the next priority.

### Parallel Opportunities

- All test tasks in a user story phase (T003, T009, T014, T018) are
  marked [P] and can run in parallel.
- All Polish tasks marked [P] (T021, T022, T023) can run in parallel
  after all user stories are complete.
- T001 in Phase 1 is independent of any other task and can be run
  in parallel with the existing main branch.

---

## Implementation Strategy

### MVP First (User Story 1 + US4)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1 (layout + radio group).
4. Complete Phase 6: User Story 4 (back button verification).
5. **STOP and VALIDATE**: Test the layout on 360×640 and 1280×800.
   The page is functional enough to navigate the kiosk mode.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready.
2. Add US1 (layout + radio group) → Test independently → Demo.
3. Add US2 (iframe list + empty state) → Test independently → Demo.
4. Add US3 (snackbar) → Test independently → Demo.
5. Add US4 (back button verification) → Test independently → Demo.
6. Polish (Phase 7) → Final validation.

### Parallel Team Strategy

With a single developer (the case for this small feature):

1. Run T001 in parallel with reading the plan.
2. Run T003 (US1 test) in parallel with T002 (imports).
3. Once T004 is in progress, T005, T006, T007 can be drafted but
   must be applied to the same file sequentially.
4. After US1 lands, US2, US3, and US4 can be sequenced by
   priority.

---

## Notes

- [P] tasks = different files or independent test scopes.
- [Story] label maps task to specific user story for traceability.
- Each user story MUST be independently completable and testable.
- Verify tests fail before implementing (where feasible).
- Commit after each user story phase.
- Stop at any checkpoint to validate the story independently.
- Stop and explain before changing direction if implementation
  conflicts with the approved spec or plan.
- Avoid: vague tasks, same-file parallel edits, cross-story
  dependencies that break independence.
- The component file is the only file rewritten. The spec file
  is the only documentation rewritten beyond the plan artifacts.
