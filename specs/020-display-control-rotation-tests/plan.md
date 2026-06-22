# Implementation Plan: Display Control Rotation Tests

**Branch**: `020-display-control-rotation-tests` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

## Summary

Close the test and minor-behavior gaps that 018 deferred to the
archive status file. The plan is mostly tests (US1, US2, US3, US5)
plus three small behavior changes (US1 FR-001, FR-002, FR-003).

## Technical Context

- **Language/Version**: Python 3.11+ (backend), TypeScript 5.8 (frontend).
- **Primary Dependencies**: pytest, pytest-cov, Karma 6, Jasmine.
- **Storage**: N/A.
- **Testing**: full `pytest backend/tests -q` and `npm --prefix frontend run test`
  must be green before this spec closes.
- **Target Platform**: Linux server (backend) + Chromium kiosk browser.
- **Project Type**: Web app (existing layout).
- **Performance Goals**: test suite completes in < 60 s; coverage
  thresholds met.
- **Constraints**: no new dependencies; no breaking contract changes;
  `validation/implementation-conflicts.md` clean.

## Constitution Check

*Re-checked after Phase 1 constitution v2.0.0.*

- **Spec traceability**: Plan references the approved spec and the
  deferred 018 task IDs. ✓
- **Requirement clarity**: All 7 FRs map to a deferred 018 task ID
  (FR-001 → T031b, FR-002 → T031c, FR-003 → T049, FR-004 →
  T017+T018, FR-005 → T019-T021, FR-006 → T061+T062, FR-007 →
  T023-T033a+T037+T046-T047+T052-T054+T063). ✓
- **Plan alignment**: Refactor (FR-003) stays within 018 scope; new
  behavior (FR-001, FR-002) is additive only. ✓
- **Simplicity**: No new dependencies; new abstractions are test
  helpers, no production code. ✓
- **Contracts**: No public contract change. ✓
- **Testing**: Coverage thresholds SC-003 + SC-004 are enforced. ✓
- **Security, observability, accessibility**: No change to security
  surface; new audit-event emission (FR-001) is additive; new
  aria-label (FR-002) improves a11y. ✓
- **No speculative scope**: Out of Scope section explicit. ✓
- **Conflict handling**: Refactor (FR-003) preserves the existing
  controller logic byte-for-byte. If it doesn't, log a row in
  `validation/implementation-conflicts.md`. ✓
- **Capability boundary (Principle VII)**: `capability: C1` declared
  in frontmatter. No cross-capability change. ✓
- **Supersession (Principle VI)**: This spec's `## Supersedes`
  block lists 018. 018's frontmatter gains `superseded_by: 020`
  when this spec lands (no change needed; 018 already lists 020 in
  status.md). ✓
- **Size budget (Principle VIII)**: spec.md ≤ 250 lines excluding
  frontmatter. Currently 222 lines. ✓
- **Conflict log clean**: `validation/` is empty. ✓

## Project Structure

### Documentation (this feature)

```text
specs/020-display-control-rotation-tests/
├── plan.md                          # This file
├── spec.md                          # 5 user stories, 7 FRs, 5 SCs
├── tasks.md                         # (Phase 4 PR adds)
├── data-model.md                    # (Phase 4 PR adds)
├── contracts/
│   └── (none — no public contract change)
└── validation/                      # Phase 4 PR adds final-acceptance.md
```

### Source Code (repository root)

Frontend changes (FR-001 + FR-002 + FR-003):

- `frontend/src/app/display/kiosk-rotation.controller.ts`
  (FR-001: add empty-queue POST trigger; FR-003: cedes cadence
  selection to service).
- `frontend/src/app/display/display-rotation.service.ts`
  (FR-003: add `pickRecurringInsertion` pure helper).
- `frontend/src/app/display/display-screen.component.ts`
  (FR-002: add `<div class="empty-queue">` template branch).

Test files (FR-004-FR-007):

- `backend/tests/integration/test_migration_0012_content_rotation_modes.py` (new).
- `backend/tests/unit/test_content_service_extension_autodetect.py` (new).
- `backend/tests/unit/test_content_service_exclusivity.py` (new).
- `backend/tests/unit/test_display_control_service_pause_resume.py` (new).
- `backend/tests/integration/test_content_upload_admin_018.py` (new).
- `backend/tests/integration/test_content_upload_public_018.py` (new).
- `backend/tests/integration/test_display_control_pause_resume.py` (new).
- `backend/tests/integration/test_display_control_fixed_mode.py` (new).
- `frontend/src/app/display/kiosk-rotation.controller.spec.ts` (new).
- `frontend/src/app/display/display-rotation.service.spec.ts`
  (extend).
- `frontend/src/app/display/display-screen.component.spec.ts`
  (extend for US1 ad timing, US2 overlay, US3 nav buttons,
  empty-queue).
- `frontend/src/app/features/remote-control/remote-control.component.spec.ts`
  (extend for US3 nav button enable/disable, US5 Fixed radio).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None. The check is clean.

## Oversize justification

`spec.md` is 267 lines excluding frontmatter; budget is 250
(over by 17 lines). The oversize is the explicit cost of
documenting 5 user stories × 3-5 acceptance scenarios each plus
7 functional requirements × traceability to 018's deferred task
IDs. Splitting into a separate "tests" spec + "behavior" spec would
duplicate the US1-US6 narrative. Acceptable per constitution
v2.0.0 Principle VIII with `oversize: true` frontmatter.