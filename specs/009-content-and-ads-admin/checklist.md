# Requirements Checklist: Content and Ads Admin

## Spec quality

- [X] Spec has at least 3 user stories (3 here).
- [X] Every user story has an explicit priority.
- [X] Every user story has an independent test.
- [X] Every user story has at least 2 acceptance scenarios.
- [X] No `NEEDS CLARIFICATION` marker.

## Traceability

- [X] Every FR maps to a backend or frontend file.
- [X] Every FR maps to at least one user story.
- [X] Every success criterion is measurable.
- [X] The CHECK constraints on `display_order`, `duration`,
      `animation`, `recurring`, and `not_fixed_and_recurring` are
      documented.

## Security

- [X] Content endpoints gated by `CONTENT_MANAGEMENT_ROLES`.
- [X] Ad endpoints gated by `AD_MANAGEMENT_ROLES`.
- [X] Reorder requires the same role as the entity it
      reorders; the list MUST match the current set.

## Testing

- [X] Integration tests for CRUD, upload, reorder, exclusivity,
      RBAC.
- [X] Frontend Karma specs for the lists, the forms, and the
      drag-drop reorder.

## Out-of-scope hygiene

- [X] Out of Scope section is explicit and non-empty.
- [X] No `data-model.md` / `research.md` / `contracts/`
      directory.
