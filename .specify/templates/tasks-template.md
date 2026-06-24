---
description: "Task list template for token-aware SDD feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/changes/[###-feature-name]/`  
**Prerequisites**: `spec.md`, `context-pack.md`, `plan.md`, affected active contracts, optional `research.md`, `data-model.md`, `quickstart.md`

**Tests**: Tests are mandatory for changed behavior. Include unit tests for business logic and integration, contract, or frontend tests for external boundaries. If a change cannot be automated, include an explicit manual validation task with rationale.

## Phase 1: SDD Governance & Context

- [ ] T001 Read `specs/manifest.yml` and identify affected active contracts
- [ ] T002 Read or create `context-pack.md` for this change
- [ ] T003 Update affected active contract(s) if observable behavior changes
- [ ] T004 Update `specs/manifest.yml` for the change status and related contracts
- [ ] T005 Create or update ADRs for durable technical decisions

## Phase 2: Tests First

- [ ] T006 [P] Add or update backend tests for changed backend behavior
- [ ] T007 [P] Add or update frontend tests for changed UI/runtime behavior
- [ ] T008 [P] Add or update contract tests for changed API/schema behavior

## Phase 3: Implementation

- [ ] T009 Implement backend changes in the files listed by the context pack
- [ ] T010 Implement frontend changes in the files listed by the context pack
- [ ] T011 Update user-facing errors, loading states, accessibility, and observability as required

## Phase 4: Validation & Consolidation

- [ ] T012 Run narrow tests listed in `context-pack.md`
- [ ] T013 Run broader validation commands relevant to the changed area
- [ ] T014 Consolidate accepted behavior into active contract(s)
- [ ] T015 Mark this change as `implemented` or `consolidated` in `spec.md` and `specs/manifest.yml`
- [ ] T016 Record validation evidence in the checklist or quickstart

## Dependencies & Execution Order

- Phase 1 blocks implementation.
- Tests should be added before or alongside implementation.
- Contract consolidation happens only after validation.

## Notes

- Do not read archived or consolidated specs unless justified.
- Do not leave durable rationale only in `plan.md`; move it to ADRs.
- Each task must include exact file paths when generated for a real feature.
