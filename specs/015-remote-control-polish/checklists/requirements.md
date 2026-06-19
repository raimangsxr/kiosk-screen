# Specification Quality Checklist: Remote Control Admin Polish

**Purpose**: Validate specification completeness and quality before
proceeding to planning.
**Created**: 2026-06-19
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs).
  - Note: the spec mentions Angular Material components by name to
    pin the visual contract (the user asked for Material guidelines).
    This is intentional and called out in the spec. No CSS classes,
    no HTTP paths, no internal methods are mentioned.
- [x] Focused on user value and business needs.
- [x] Written for non-technical stakeholders.
  - User stories and acceptance scenarios are in plain language.
  - Functional requirements are testable and stay at the contract
    level.
- [x] All mandatory sections completed.

## Requirement Completeness

- [x] No `[NEEDS CLARIFICATION]` markers remain.
  - The four `Clarifications` answers at the top of the spec cover
    the only areas where the input was ambiguous: empty iframe list,
    confirm dialog for hide-ads (no), load error rendering, and
    snackbar timing.
- [x] Requirements are testable and unambiguous.
  - Every FR has a single, observable behavior and is referenced by
    a user story and a success criterion.
- [x] Success criteria are measurable.
  - SC-001 to SC-008 each have a number, a threshold, or a verifiable
    condition.
- [x] Success criteria are technology-agnostic (no implementation
  details).
  - SC-007 (build succeeds) and SC-008 (no new tokens/icons) are the
    only ones that touch implementation, and they are explicit
    guardrails from the user ("sigue las guidelines de Angular
    Material"). The rest describe user-visible outcomes.
- [x] All acceptance scenarios are defined.
  - US1 has 5, US2 has 4, US3 has 4, US4 has 3.
- [x] Edge cases are identified.
  - 8 edge cases listed, covering empty iframes, stale iframes,
    offline display, load error, optimistic feedback, concurrent
    saves, navigation, and time format.
- [x] Scope is clearly bounded.
  - "Out of Scope" lists 10 items, including the endpoints, the
    route path, the sidenav, the hall page, and confirm dialogs.
- [x] Dependencies and assumptions identified.
  - Assumptions cover the facade, the API, the Angular Material
    version, the shared components, the relative time helper, the
    snackbar provider, the brand lockup, the toolbar location, the
    user menu, and the i18n story.

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria.
  - Every FR is referenced by at least one acceptance scenario
    (e.g. FR-001 → US1.1, FR-003 → US1.2, FR-005 → US2.1, etc.).
- [x] User scenarios cover primary flows.
  - US1 covers layout, US2 covers iframe selection, US3 covers
    snackbars, US4 covers navigation. All four are needed to deliver
    the user's reported experience.
- [x] Feature meets measurable outcomes defined in Success Criteria.
  - SC-001 covers US3 (snackbars). SC-002 covers US1 (mobile).
    SC-003 covers US4 (back button). SC-004 covers US1+US2
    (empty iframes). SC-005 covers US1 (load error). SC-006/007/008
    are quality guardrails.
- [x] No implementation details leak into specification.
  - The only material references are the Material component names,
    the existing CSS tokens, and the existing API endpoint paths
    (which the user explicitly cares about). All are used as
    contracts, not as implementation steps.

## Notes

- The spec is ready for `/speckit-plan`. No clarifications are
  pending.
- The plan will need to walk through:
  1. The toolbar structure (back button, brand, user menu) and how
     it differs from the existing `admin-toolbar.component.ts` (which
     is admin-shell-only and includes a sidenav menu button).
  2. The status pill (Material 3 chips + icons) and the relative
     time helper.
  3. The radio group pattern (`mat-radio-group` with two top-level
     options and a nested `mat-radio-button` per iframe).
  4. The snackbar pattern (`MatSnackBar.open(message, 'Dismiss', {
     duration: 3000 })`) consistent with the rest of the app
     (`display-config`, `content-list`, `api-keys-list`).
  5. The tests to add to `remote-control.component.spec.ts`.
- The plan must NOT touch the backend, the facade, the API, or the
  routes. Any drift in those is a reason to stop and re-spec.
