# Specification Quality Checklist: Per-Display Iframe Layout Profiles

**Purpose**: Validate specification completeness and quality before proceeding to planning  
**Created**: 2026-07-17  
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Validation pass 1 (2026-07-17): All items pass. Spec is ready for `/speckit-clarify` or `/speckit-plan`.
- Clarification session 2026-07-17: Five decisions recorded (persistence, kiosk identity, on-display UX, app family resolution, joint delivery scope). Spec is ready for `/speckit-plan`.
- SDD metadata and context-pack reference sibling repos for planning only; they are not part of the stakeholder-facing spec body.

## Implementation validation (2026-07-17)

### Automated (kiosk-screen)

- [x] `pytest backend/tests` — layout resolver, integration API, audit events, OpenAPI contract
- [x] `npm --prefix frontend run test` — 408 specs green; `display-screen.component.spec.ts` has a known Karma timeout on one async poll test (pre-existing + CHG-042 bootstrap); run targeted dashboard/layout specs for CHG-042
- [x] `npm --prefix frontend run build`
- [ ] `docker build -f backend/Dockerfile backend` — not run in this session (Docker daemon unavailable)

### Automated (siblings)

- [x] `amrn-escalabirras-dual`: `embed-density-override.service.spec.ts` added (Karma)
- [ ] `amrn-bull`: spec file added; `npm test` remains no-op until Vitest runner lands (CHG-006 follow-up)

### Manual E2E gate (TQ-004 / SC-006) — operator-run

Joint gate across kiosk-screen + amrn-bull + amrn-escalabirras-dual per `quickstart.md` Phases 1–4:

- [ ] Three browsers: distinct display labels, independent density calibration
- [ ] URL `embed_app_height_px` + `bull:config` visible in embedded apps
- [ ] Admin dashboard **Pantallas conectadas** reflects live density and source chips
- [ ] SSE `layout_updated` applies without full reload

Record operator sign-off in PR or release notes when executed.
