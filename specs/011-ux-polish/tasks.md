---
description: "Task list for Administration UX Polish"
---

# Tasks: Administration UX Polish

**Input**: Design documents from `/specs/011-ux-polish/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by user story to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- Frontend: `frontend/src/app/`

---

## Phase 1: Setup (Shared Infrastructure)

The project is already initialized. No new infrastructure is required.

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T001 Verify the current state of
      `frontend/src/app/features/admin-shell/admin-navigation.service.ts:7-17`,
      `frontend/src/app/core/layout/admin-toolbar.component.ts:11-27`,
      `frontend/src/app/core/layout/user-menu.component.ts:39-51`,
      `frontend/src/app/core/layout/drawer-header.component.ts:1-116`,
      `frontend/src/app/features/admin-shell/admin-shell.component.ts:39-92, 192-221`,
      and `frontend/src/app/features/dashboard/dashboard.component.ts:126-212`
      to confirm the line numbers in
      `specs/011-ux-polish/plan.md` are accurate. If any line
      numbers have drifted, update the plan before proceeding.

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Discover Remote Control From the Admin Sidenav (Priority: P1) 🎯 MVP

**Goal**: Add a "Remote control" entry to the admin sidenav so the
remote-control page is reachable with one click from any admin
sub-route, not just the hall and the dashboard.

**Independent Test**: Sign in, open the admin shell, confirm the
sidenav has a "Remote control" entry, click it, land on
`/remote-control`, and confirm the entry is highlighted as active.

### Tests for User Story 1 ⚠️

- [X] T002 [P] [US1] Update assertion in
      `frontend/src/app/features/admin-shell/admin-shell.component.spec.ts`
      to require the sidenav text to contain "Remote control" and
      to contain the existing "Setup check" item.

### Implementation for User Story 1

- [X] T003 [P] [US1] Add `{ label: 'Remote control', route: '/remote-control', summary: 'Switch kiosk content mode and ad visibility' }` to
      the `items` array in
      `frontend/src/app/features/admin-shell/admin-navigation.service.ts:7-17`
      (insert after the "Setup check" entry at line 14).
- [X] T004 [P] [US1] Add a case in the `iconFor(route)` method in
      `frontend/src/app/features/admin-shell/admin-shell.component.ts:192-221`
      that returns `'cast_connected'` when `route === '/remote-control'`.

**Checkpoint**: The sidenav renders the new entry; clicking it
navigates to `/remote-control`; the entry is highlighted when
active.

---

## Phase 4: User Story 2 - See a Clean Admin Toolbar With the Brand (Priority: P2)

**Goal**: Move the "Kiosk Screen / Administration" brand from the
sidenav drawer header to the admin toolbar, and remove the user
card and the brand block from the sidenav entirely. Delete the
`DrawerHeaderComponent` file.

**Independent Test**: Sign in, open the admin shell, confirm the
toolbar shows the brand lockup on the left, the sidenav has no
user card and no brand block, and the navigation list is the only
content above the footer.

### Tests for User Story 2 ⚠️

- [X] T005 [P] [US2] Update assertion in
      `frontend/src/app/features/admin-shell/admin-shell.component.spec.ts`
      to require the toolbar text to contain "Kiosk Screen" and
      "Administration" and to NOT contain the drawer-header user
      info (the sidenav should not render an element with
      `aria-label="Signed in user"`).

### Implementation for User Story 2

- [X] T006 [US2] Add a brand lockup to the toolbar template in
      `frontend/src/app/core/layout/admin-toolbar.component.ts:11-27`:
      an `<mat-icon aria-hidden="true">television</mat-icon>` plus
      a `<div class="admin-toolbar__brand">` containing an eyebrow
      "Kiosk Screen" and a title "Administration". The lockup is
      rendered before the existing `__title` span and after the
      conditional menu button. Add styles for `.admin-toolbar__brand`,
      `.admin-toolbar__eyebrow`, and `.admin-toolbar__brand-title`
      in the `styles` block.
- [X] T007 [US2] Remove the `<app-drawer-header />` element from
      `frontend/src/app/features/admin-shell/admin-shell.component.ts:56`
      and remove the `DrawerHeaderComponent` from the `imports`
      array at line 35. Update the toolbar usage at line 39 to keep
      the existing `[title]` binding unchanged (the page title
      remains dynamic and is rendered next to the brand).
- [X] T008 [US2] Delete the file
      `frontend/src/app/core/layout/drawer-header.component.ts`
      (now empty after the sidenav user card and brand block are
      removed). Verify with `grep -r DrawerHeaderComponent frontend/src`
      that no other file imports the component.
- [X] T009 [P] [US2] If `admin-shell.component.spec.ts` references
      the drawer-header in its imports or assertions, clean up the
      references.

**Checkpoint**: The toolbar shows the brand; the sidenav has only
the navigation list; the `DrawerHeaderComponent` file is gone.

---

## Phase 5: User Story 3 - Use a Tightly-Paced Dashboard (Priority: P3)

**Goal**: Reduce the dashboard's section-summaries grid gap, the
section margin, the `mat-card` content padding, and the alerts
panel padding, so the dashboard fits more information above the
fold.

**Independent Test**: Sign in, open the dashboard, confirm the
section tiles and the quick-actions grid have tighter spacing than
before, the tile internal padding is tighter, and the alerts panel
is tighter. The grid breakpoints, tile order, and status-chip
semantics are unchanged.

### Tests for User Story 3

No new automated tests. The dashboard has no component spec file
today; the spacing change is verified by manual smoke (Step 6 of
the quickstart) and by the existing dashboard service spec.

### Implementation for User Story 3

- [X] T010 [P] [US3] In
      `frontend/src/app/features/dashboard/dashboard.component.ts`:
      change the `.dashboard__status` `gap: 12px` → `gap: 8px` and
      `margin-bottom: 16px` → `margin-bottom: 10px`.
- [X] T011 [P] [US3] In
      `frontend/src/app/features/dashboard/dashboard.component.ts`:
      change the `.dashboard__grid, .dashboard__actions-grid`
      `gap: 12px` → `gap: 8px` and `margin-bottom: 16px` →
      `margin-bottom: 10px`.
- [X] T012 [P] [US3] In
      `frontend/src/app/features/dashboard/dashboard.component.ts`:
      add a tile content padding override. Use a component-scoped
      `.dashboard__tile .mat-mdc-card-content` and
      `.dashboard__tile .mat-mdc-card-actions` rule to set
      `padding: 12px 16px` (overriding the Material default of
      16px). Apply the same to `.dashboard__action`.
- [X] T013 [P] [US3] In
      `frontend/src/app/features/dashboard/dashboard.component.ts`:
      change the `.dashboard__alerts` `margin: 16px 0; padding: 16px;`
      → `margin: 10px 0; padding: 12px;`.

**Checkpoint**: The dashboard is visibly tighter; the layout is
unchanged.

---

## Phase 6: User Story 4 - See a Centered User Avatar in the Toolbar (Priority: P3)

**Goal**: Add `line-height: 1` to the `.user-menu__avatar` rule so
the avatar sits on the toolbar's vertical center line in both the
admin toolbar and the hall toolbar (both use the same component).

**Independent Test**: Sign in, open the admin shell and the hall,
confirm the user-menu avatar is visually centered in each
toolbar's vertical axis.

### Tests for User Story 4

- [X] T014 [P] [US4] If
      `frontend/src/app/core/layout/user-menu.component.spec.ts`
      asserts on the avatar's computed style, add a `line-height`
      assertion. If no spec file exists, this task is a no-op
      (verified by manual smoke).

### Implementation for User Story 4

- [X] T015 [US4] Add `line-height: 1;` to the `.user-menu__avatar`
      rule in
      `frontend/src/app/core/layout/user-menu.component.ts:39-51`.

**Checkpoint**: The avatar is centered in both toolbars.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T016 [P] Run `npm --prefix frontend run test` and confirm all
      frontend tests pass.
- [X] T017 [P] Run `npm --prefix frontend run build` and confirm the
      production build succeeds.
- [X] T018 Run the manual smoke flow described in
      `specs/011-ux-polish/plan.md` "Quickstart" section and confirm
      every step passes.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No-op.
- **Foundational (Phase 2)**: T001 is a verification task; the
  implementation work itself does not block on T001 (the line
  numbers in the plan are advisory).
- **User Stories (Phase 3–6)**: All touch different files; each
  story can be implemented in parallel or in any order.
- **Polish (Phase 7)**: Depends on all four user stories being
  complete.

### User Story Dependencies

- **US1 (P1)**: No dependencies.
- **US2 (P2)**: Independent of US1. T008 (delete the drawer-header
  file) is independent of the other US2 tasks.
- **US3 (P3)**: No dependencies.
- **US4 (P3)**: No dependencies.

### Within Each User Story

- Tests first (where a spec file exists), then implementation.
- US2 has a 4-task implementation: the brand block (T006), the
  sidenav removal (T007), the file delete (T008), and the spec
  cleanup (T009). T006–T009 can run in any order; the cleanest
  sequence is T006 → T007 → T008 → T009.

### Parallel Opportunities

- T002, T003, T004 (US1) can run in parallel.
- T005, T006, T007, T008, T009 (US2) can run in parallel except
  T006 and T007 both touch `admin-shell.component.ts` — T007 should
  land after T006.
- T010, T011, T012, T013 (US3) all touch the same
  `dashboard.component.ts` styles array and can be batched into a
  single edit.
- T015 (US4) is a single one-line edit; T014 is a no-op unless a
  spec file already exists.
- T016, T017 can run in parallel as separate shell invocations.

---

## Parallel Example: User Story 1

```bash
# US1 test + two implementation edits, all different files:
Task: "Update assertion in admin-shell.component.spec.ts"
Task: "Add remote-control item to admin-navigation.service.ts"
Task: "Add iconFor case in admin-shell.component.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 + Phase 2 (no-op + T001 verification).
2. Complete Phase 3 (US1: remote control sidenav entry).
3. **STOP and VALIDATE**: Test US1 independently. The sidenav
   renders the new entry; clicking it navigates to
   `/remote-control`.
4. Deploy/demo if ready (US1 is a 2-line change; it can ship on
   its own).

### Incremental Delivery

1. Phase 1 + Phase 2 → no-op.
2. US1 (remote control sidenav) → test → deploy.
3. US2 (brand to toolbar + drawer removed) → test → deploy.
4. US3 (dashboard compact) → test → deploy.
5. US4 (avatar centered) → test → deploy.
6. Each story adds value without breaking previous stories.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- Each user story MUST be independently completable and testable.
- The `DrawerHeaderComponent` file is deleted in US2; if any
  spec file imports it, the import is removed at the same time.
- Verify the manual smoke after each user story lands.
- Commit after each user story (or at the end of the spec).
- Stop at any checkpoint to validate the story independently.
- Stop and explain before changing direction if implementation
  conflicts with the approved spec or plan.
- Avoid: same-file conflicts, cross-story dependencies that break
  independence.
