---
description: "Task list for Setup Check relabel and wire empty rules"
---

# Tasks: Setup Check Relabel and Wire Empty Rules

**Input**: Design documents from `/specs/010-setup-check-relabel-wire-rules/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/setup-check-contract.md, quickstart.md
**Tests**: Tests are mandatory for changed behavior. Unit tests for the two new
domain rules; integration tests for the HTTP surface; frontend tests for the
copy change.

**Organization**: Tasks are grouped by user story to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Backend: `backend/app/`, `backend/tests/`
- Frontend: `frontend/src/app/`
- Root docs: `README.md`, `scripts/smoke/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

The project is already initialized. No new infrastructure is required.
The two new readiness rules reuse the existing `evaluate_readiness`
domain function and the existing `MediaStorageService.absolute_path`
helper.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Verify the current state of files mentioned in the plan
and the spec so that the implementation tasks land in the right place.

- [X] T001 [P] Verify current state of `backend/app/services/readiness_service.py:12-25`,
      `backend/app/repositories/models/content.py`, `backend/app/repositories/models/ad.py`,
      `backend/app/repositories/models/approved_domain.py`, and
      `backend/app/services/media_storage_service.py:65-70` to confirm
      the line numbers in `specs/010-setup-check-relabel-wire-rules/plan.md`
      and `specs/010-setup-check-relabel-wire-rules/research.md` are
      accurate on the current branch (`010-admin-cleanup-and-polish`).
      If any line numbers have drifted, update the plan and research
      files before proceeding to Phase 3.

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Recognize What Setup Check Does (Priority: P1) 🎯 MVP

**Goal**: Rename the user-visible surface of the "Readiness" feature
to "Setup check" so the page title, the sidenav label, the dashboard
button, the display-config hint, the README, and the smoke script
all consistently describe the page as a preflight verification of the
kiosk setup.

**Independent Test**: Sign in as an administrator, open the admin
sidenav, confirm the item is labeled "Setup check" (not "Readiness"),
open the page, confirm the title and description are updated, navigate
back to the dashboard, confirm the button is "Run setup check" and the
alerts section is titled "Setup check", and toggle the kiosk off on
the display configuration page to confirm the hint copy is updated.

### Tests for User Story 1 ⚠️

> **NOTE**: Write these assertions FIRST; update the spec text in the
> tests so they FAIL until the implementation lands.

- [X] T002 [P] [US1] Update assertion in
      `frontend/src/app/features/admin-shell/admin-shell.component.spec.ts`
      to expect the sidenav nav item labeled "Setup check" with
      `route: '/admin/readiness'`.
- [X] T003 [P] [US1] Update assertion in
      `frontend/src/app/features/readiness/readiness.component.spec.ts`
      to expect the page-header title "Setup check" and the
      description "Verify all kiosk setup is complete before opening
      the display for an event."
- [X] T004 [P] [US1] Dashboard copy change: the dashboard button
      "Review readiness" and the alerts section title "Readiness" in
      `frontend/src/app/features/dashboard/dashboard.component.ts:53, 88`
      are updated to "Run setup check" and "Setup check" respectively.
      No automated test exists for the dashboard component today (no
      `dashboard.component.spec.ts`); the copy is verified by the
      manual smoke flow in Step 1 of `quickstart.md`.

### Implementation for User Story 1

- [X] T005 [P] [US1] Update sidenav nav item label and summary in
      `frontend/src/app/features/admin-shell/admin-navigation.service.ts:14`
      to `{ label: 'Setup check', route: '/admin/readiness', summary: 'Pre-flight checks for the kiosk' }`.
- [X] T006 [P] [US1] Update page header, error title, empty state, and
      `aria-label` in
      `frontend/src/app/features/readiness/readiness.component.ts:33-34, 39, 43, 87-88`
      to use "Setup check" wording per
      `specs/010-setup-check-relabel-wire-rules/contracts/setup-check-contract.md`
      "User-visible copy" table.
- [X] T007 [P] [US1] Update dashboard button label and alerts section
      title in
      `frontend/src/app/features/dashboard/dashboard.component.ts:53, 88`
      to "Run setup check" and "Setup check" respectively.
- [X] T008 [P] [US1] Update kiosk-disabled hint in
      `frontend/src/app/features/display-config/display-config.component.ts:199`
      to "When disabled, the kiosk will not run and the setup check
      will report a blocker."
- [X] T009 [P] [US1] Update README references at `README.md:21, 35, 154`
      to use "Setup check" wording.
- [X] T010 [P] [US1] Update smoke script reference at
      `scripts/smoke/kiosk_mvp.md:9` to use "setup check" wording.
- [X] T011 [P] [US1] Add assertion in
      `frontend/src/app/features/display-config/display-config.component.spec.ts`
      that when `isEnabled` is `false` the rendered hint does not
      contain the substring "readiness" (locks in the FR-004 copy).

**Checkpoint**: At this point, User Story 1 MUST be fully functional
and testable independently. The page title, sidenav label, dashboard
button, dashboard alerts section, display-config hint, README, and
smoke script all use the new wording.

---

## Phase 4: User Story 2 - Catch Iframe Content Using Unapproved Domains (Priority: P2)

**Goal**: Wire the `unapproved_embedded_domains` rule so that any
active iframe content item whose URL host is not in the organization's
approved-domains list produces a `Embedded domain is not approved: <host>`
blocker on the setup-check page and the dashboard alerts list.

**Independent Test**: With the organization seeded with one approved
domain and one iframe content item whose URL host matches the
approved domain, the setup-check page must show zero
unapproved-embedded-domain blockers. With one additional iframe
content item whose URL host is not on the approved list, the
setup-check page must show exactly one
`Embedded domain is not approved: <host>` blocker, and the "Resolve"
button on the blocker must deep-link to `/admin/domains`.

### Tests for User Story 2 ⚠️

> **NOTE**: Write these tests FIRST; ensure they FAIL before
> implementation.

- [X] T012 [P] [US2] Add unit test `test_readiness_reports_unapproved_domain`
      to `backend/tests/unit/test_readiness.py` covering the case where
      `ReadinessInput.unapproved_embedded_domains=['unapproved.example.org']`
      produces a blocker of the form
      `Embedded domain is not approved: unapproved.example.org`.
- [X] T013 [P] [US2] Add unit test `test_readiness_ignores_inactive_items`
      to `backend/tests/unit/test_readiness.py` covering the case where
      an item is inactive and therefore not reported (this is the
      shared contract used by both new rules; placement in US2 is
      intentional because the service-level behavior is the same).
- [X] T014 [P] [US2] Add service test
      `test_readiness_service_reports_unapproved_iframe` to
      `backend/tests/unit/test_admin_readiness_services.py` that
      bootstraps the database, creates one iframe content item with a
      non-approved host, and asserts the readiness report contains the
      expected blocker.
- [X] T015 [P] [US2] Add integration test
      `test_get_readiness_includes_unapproved_domain_blocker` to
      `backend/tests/integration/test_admin_readiness_api.py` that
      issues a `GET /api/readiness` HTTP request and asserts the
      response body contains the expected blocker.

### Implementation for User Story 2

- [X] T016 [US2] Add private helper `_unapproved_embedded_domains(session,
      organization_id) -> list[str]` to
      `backend/app/services/readiness_service.py` that walks active
      `TopContentItem` rows with `content_type='embedded_web'`, parses
      each `source_reference` with `urllib.parse.urlparse`, and
      returns the set of `host` values that are not in the
      organization's active `ApprovedEmbeddedDomain.domain` set
      (case-insensitive). For unparseable URLs, the literal
      `<unparseable-url>` placeholder is returned.
- [X] T017 [US2] Update `ReadinessService.evaluate` in
      `backend/app/services/readiness_service.py:12-25` to call
      `_unapproved_embedded_domains` and pass the result as the
      `unapproved_embedded_domains` argument to `evaluate_readiness`
      (replacing the current empty list).

**Checkpoint**: At this point, User Stories 1 AND 2 MUST both work
independently. The relabel is in place and the unapproved-embedded-
domains rule fires on demand.

---

## Phase 5: User Story 3 - Notice When Uploaded Media Has Gone Missing (Priority: P3)

**Goal**: Wire the `invalid_sources` rule so that any active content
or ad item whose `media_file_id` references a file that is no longer
present on disk produces a `Source may be unavailable: <title>`
warning on the setup-check page and the dashboard alerts list.
Filesystem errors raised while resolving a single path are caught
and reported as `Source for "<title>" could not be verified.` (a
warning) so the rest of the readiness report is unaffected.

**Independent Test**: With the organization seeded with one active
content item that has an uploaded image, confirm zero missing-media
warnings appear on the setup-check page. Move the file aside on disk
and refresh the page; the warning
`Source may be unavailable: <title>` must appear. Restore the file
and confirm the warning disappears.

### Tests for User Story 3 ⚠️

> **NOTE**: Write these tests FIRST; ensure they FAIL before
> implementation.

- [X] T018 [P] [US3] Add unit test `test_readiness_reports_missing_media`
      to `backend/tests/unit/test_readiness.py` covering the case where
      `ReadinessInput.invalid_sources=['<title>']` produces a warning
      of the form `Source may be unavailable: <title>`. (The
      `evaluate_readiness` domain function is unchanged; this test
      pins the contract the service must satisfy.)
- [X] T019 [P] [US3] Add unit test `test_readiness_swallows_filesystem_errors`
      to `backend/tests/unit/test_admin_readiness_services.py` that
      monkeypatches `Path.exists` to raise `PermissionError` and
      asserts the readiness report still completes and contains a
      warning of the form `Source for "<title>" could not be verified.`
- [X] T020 [P] [US3] Add service test
      `test_readiness_service_reports_missing_media` to
      `backend/tests/unit/test_admin_readiness_services.py` that
      bootstraps the database, deletes the seed image file from
      disk, and asserts the readiness report contains the expected
      warning.
- [X] T021 [P] [US3] Add integration test
      `test_get_readiness_includes_missing_media_warning` to
      `backend/tests/integration/test_admin_readiness_api.py` that
      issues a `GET /api/readiness` HTTP request after the seed
      file has been deleted and asserts the response body contains
      the expected warning.

### Implementation for User Story 3

- [X] T022 [US3] Add private helper `_missing_media_sources(session,
      organization_id) -> list[str]` to
      `backend/app/services/readiness_service.py` that walks active
      `TopContentItem` and `ClientAdItem` rows with a non-null
      `media_file_id`, joins to `MediaFileReference`, resolves the
      path with `MediaStorageService(session).absolute_path(media)`,
      and returns the `title` (or `Ad #<displayOrder>` for ads) of
      each item whose `Path.exists()` returns `False`. For each item,
      a `try/except (PermissionError, OSError)` is in place: on
      failure, the literal `Source for "<title>" could not be
      verified.` string is added to the result and the loop
      continues with the next item.
- [X] T023 [US3] Update `ReadinessService.evaluate` in
      `backend/app/services/readiness_service.py:12-25` to call
      `_missing_media_sources` and pass the result as the
      `invalid_sources` argument to `evaluate_readiness` (replacing
      the current empty list).

**Checkpoint**: All three user stories MUST now be independently
functional. The relabel is in place, the unapproved-embedded-domains
rule fires, and the missing-media rule fires.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Run the full validation suite and the manual smoke flow
to confirm the change is complete.

- [X] T024 [P] Run `pytest backend/tests` from the repository root and
      confirm 100% of unit, integration, and contract tests pass.
- [X] T025 [P] Run `npm --prefix frontend run test` from the
      repository root and confirm 100% of frontend tests pass.
- [X] T026 [P] Run `npm --prefix frontend run build` from the
      repository root and confirm the production build succeeds.
- [X] T027 Run the manual smoke flow in
      `specs/010-setup-check-relabel-wire-rules/quickstart.md` Steps
      1–4 and confirm every checkbox passes.
- [X] T028 Update the spec folder's
      `checklists/requirements.md` to mark any item that was not
      previously checked and is now complete.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Phase 1 (no-op). BLOCKS all
  user stories only in the sense that T001 must confirm the current
  state of the files; the implementation work itself does not block
  on T001.
- **User Stories (Phase 3–5)**: All depend on the existing
  `evaluate_readiness` domain function and the existing
  `MediaStorageService.absolute_path` helper. The user stories do
  not depend on each other and can be implemented in any order
  (priority order recommended).
- **Polish (Phase 6)**: Depends on all three user stories being
  complete.

### User Story Dependencies

- **User Story 1 (P1, relabel)**: No dependencies on other stories.
- **User Story 2 (P2, unapproved-domains)**: No dependencies on other
  stories.
- **User Story 3 (P3, missing-media)**: No dependencies on other
  stories.

### Within Each User Story

- Tests MUST be written and fail before implementation where
  automated testing is feasible.
- The two US2 service-layer changes (`_unapproved_embedded_domains`
  and the call site in `ReadinessService.evaluate`) MUST land in
  the same PR.
- The two US3 service-layer changes (`_missing_media_sources` and
  the call site in `ReadinessService.evaluate`) MUST land in the
  same PR.

### Parallel Opportunities

- T002, T003, T004 (frontend test updates) can run in parallel —
  they touch different files.
- T005, T006, T007, T008, T009, T010 (US1 implementation) can run in
  parallel — they touch different files.
- T011, T012, T013, T014 (US2 test additions) can run in parallel —
  they touch different files.
- T017, T018, T019, T020 (US3 test additions) can run in parallel —
  they touch different files.
- T023, T024, T025 (the three test/build commands) can run in
  parallel as separate shell invocations.

---

## Parallel Example: User Story 1

```bash
# Launch all US1 frontend test updates together:
Task: "Update assertion in frontend/src/app/features/admin-shell/admin-shell.component.spec.ts"
Task: "Update assertion in frontend/src/app/features/readiness/readiness.component.spec.ts"
Task: "Update assertion in frontend/src/app/features/dashboard/dashboard.component.spec.ts"

# Launch all US1 implementation edits together (different files):
Task: "Update sidenav nav item in frontend/src/app/features/admin-shell/admin-navigation.service.ts"
Task: "Update page header in frontend/src/app/features/readiness/readiness.component.ts"
Task: "Update dashboard button in frontend/src/app/features/dashboard/dashboard.component.ts"
Task: "Update display-config hint in frontend/src/app/features/display-config/display-config.component.ts"
Task: "Update README references"
Task: "Update smoke script"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (no-op).
2. Complete Phase 2: Foundational (T001 only — verify current state).
3. Complete Phase 3: User Story 1 (relabel only).
4. **STOP and VALIDATE**: Test User Story 1 independently. The page
   title, sidenav label, dashboard button, dashboard alerts section,
   display-config hint, README, and smoke script all use the new
   wording. Backend tests are unaffected.
5. Deploy/demo if ready (US1 is a copy change; it can ship on its
   own).

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready.
2. Add User Story 1 (relabel) → Test independently → Deploy/Demo
   (MVP! — copy change only, no backend change).
3. Add User Story 2 (unapproved-domains) → Test independently →
   Deploy/Demo.
4. Add User Story 3 (missing-media) → Test independently →
   Deploy/Demo.
5. Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Phase 1 + Phase 2 together.
2. Once Foundational is done:
   - Developer A: User Story 1 (frontend copy edits + frontend test
     updates).
   - Developer B: User Story 2 (backend service + tests).
   - Developer C: User Story 3 (backend service + tests).
3. Stories complete and integrate independently; US1 is frontend-only
   and can merge first.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- Each user story MUST be independently completable and testable.
- US2 and US3 each add code to
  `backend/app/services/readiness_service.py`. Within a single user
  story the two related tasks (helper + call site) MUST be done in
  the same PR but in the listed order. US2 and US3 could in principle
  be done in parallel by different developers on different branches,
  but on the same branch the second developer should rebase onto the
  first to avoid merge conflicts on `readiness_service.py:12-25`.
- Verify tests fail before implementing.
- Commit after each user story or logical group.
- Stop at any checkpoint to validate the story independently.
- Stop and explain before changing direction if implementation
  conflicts with the approved spec or plan.
- Avoid: vague tasks, same-file conflicts, cross-story dependencies
  that break independence.
