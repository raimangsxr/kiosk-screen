# Tasks: Readiness and Setup Check

**Input**: Design documents from
`specs/011-readiness-setup-check/`.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Verify working branch and the four artefacts.

## Phase 2: Foundational

- [X] T002 [P] `ReadinessInput`, `ReadinessResult`,
      `evaluate_readiness(...)` at
      `backend/app/domain/readiness.py`.

## Phase 3: User Story 1 — Setup check on the admin dashboard

- [X] T003 `ReadinessService.build_report(organization_id)` at
      `backend/app/services/readiness_service.py`.
- [X] T004 `GET /readiness` at
      `backend/app/api/readiness.py:12`.
- [X] T005 [P] `ReadinessReportSchema` at
      `backend/app/api/schemas.py`.

### Tests for User Story 1

- [X] T006 [P] [US1] Unit test for `evaluate_readiness(...)` at
      `backend/tests/unit/test_readiness_domain.py`
      (parametrized over the four blockers and one warning).
- [X] T007 [P] [US1] Integration test: `GET /readiness` returns
      the expected blockers and warnings at
      `backend/tests/integration/test_readiness_endpoint.py`.

## Phase 4: User Story 2 — Open is blocked when readiness is red

- [X] T008 [P] `ReadinessApi` at
      `frontend/src/app/core/api/readiness.api.ts`.
- [X] T009 [P] `ReadinessFacade` at
      `frontend/src/app/features/readiness/readiness.facade.ts`.
- [X] T010 `ReadinessComponent` at
      `frontend/src/app/features/readiness/readiness.component.ts`
      with the status panel.
- [X] T011 [P] Embed the readiness summary on the dashboard at
      `frontend/src/app/features/dashboard/dashboard.component.ts`.
- [X] T012 [P] Disable "Open kiosk" on the hall page when
      `ready=false` at
      `frontend/src/app/features/hall/hall.component.ts`.

### Tests for User Story 2

- [X] T013 [P] [US2] Karma spec for the readiness panel at
      `frontend/src/app/features/readiness/readiness.component.spec.ts`.
- [X] T014 [P] [US2] Karma spec for the hall "Open kiosk"
      enable / disable at
      `frontend/src/app/features/hall/hall.component.spec.ts`.

## Dependencies & Execution Order

- Phase 2 → Phase 3 → Phase 4.

## Implementation Strategy

Single-contributor path:

1. Phase 1 + 2: 10 min.
2. Phase 3: 30 min (endpoint + tests).
3. Phase 4: 1 h (panel + dashboard + hall + tests).
