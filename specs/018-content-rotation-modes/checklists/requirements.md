# Specification Quality Checklist: Content Rotation Modes

**Purpose**: Validate specification completeness and quality before proceeding to planning.
**Created**: 2026-06-22
**Updated**: 2026-06-22 (post-clarify)
**Feature**: [spec.md](./spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — *no mention of Angular, FastAPI, SQLAlchemy, Alembic; contracts are abstract where possible*
- [x] Focused on user value and business needs — *each US explains operator/admin/integrator outcome*
- [x] Written for non-technical stakeholders — *acceptance scenarios use Given/When/Then plain language*
- [x] All mandatory sections completed — *User Scenarios, Requirements, Key Entities, Success Criteria, Assumptions all filled*

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — *no markers were introduced; user answered all clarifications upfront*
- [x] Requirements are testable and unambiguous — *each FR has a measurable assertion (HTTP code, DOM state, log entry, percentage)*
- [x] Success criteria are measurable — *SC-001..SC-007 each have numeric thresholds or DOM/state assertions*
- [x] Success criteria are technology-agnostic (no implementation details) — *no "API response time", no framework names; only outcomes*
- [x] All acceptance scenarios are defined — *5 scenarios per US, except US3 which has 5, US4 has 5, US5 has 5, US6 has 5*
- [x] Edge cases are identified — *9 edge cases listed, covering empty queues, race conditions, multi-operator, regression*
- [x] Scope is clearly bounded — *Out of Scope section explicit; conflict with 017 documented*
- [x] Dependencies and assumptions identified — *Assumptions A-001..A-008 + conflict section with 017*

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria — *FR-001..FR-029 each traced to one or more US*
- [x] User scenarios cover primary flows — *operator pause/resume, fixed selection, recurring cadence, autodetection, overlay hide*
- [x] Feature meets measurable outcomes defined in Success Criteria — *SC-001..SC-007 verifiable manually or via tests*
- [x] No implementation details leak into specification — *verified; the only concrete names are HTTP status codes, DOM selectors, MIME types and extensions — all contract-level, not implementation*

## Notes

- The conflict with `017 US2 AS-5 / T031` is documented at the top of the spec and in `A-008` and the `Out of Scope` section. The plan/tasks phase must explicitly mark T031 of 017 as superseded.
- FR-028 (extension wins over explicit `contentType`) is a deliberate product decision that contradicts current admin behaviour. It must be reflected in the API contract for `/api/content/upload`.
- US6 (autodetection) accepts backwards compatibility (FR-029 / Acceptance Scenario 5): if the integrator keeps sending `contentType`, behaviour is unchanged. This avoids breaking existing clients.
- The spec explicitly assumes (A-006) that rotation logic lives in the client. If the planning phase decides to push the cadence counter to the backend, A-006 must be revisited and the spec amended before `/speckit-plan` finishes.
- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`.

## Clarification Log (2026-06-22)

7/7 questions answered. Spec updated; no further questions planned.

| # | Topic | Answer | Sections touched |
|---|-------|--------|------------------|
| Q1 | Fixed video `ended` behavior | Loop (`currentTime=0; play()`) | FR-020, Clarifications |
| Q2 | Mode transition while video plays | Interrupt immediately | FR-008a, Clarifications |
| Q3 | Cadence counter outside `loop` | Pauses; resumes at same count | FR-015, Clarifications |
| Q4 | Pause state across modes | Discarded on exit; loop starts active | FR-012a, Clarifications |
| Q5 | Exclusivity check coverage | ~~Both admin and public, same message~~ **SUPERSEDED by Q6** | (none — see Q6) |
| Q6 | Public API allows `isFixed` / `recurring`? | No. Public API never accepts these flags | FR-014, FR-016, FR-019, KeyEntities, Clarifications |
| Q7 | Ad-region behavior in `iframe` / `fixed` | Ads keep rotating regardless of Content mode | FR-008b, Clarifications |