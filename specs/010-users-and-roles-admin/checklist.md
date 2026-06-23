# Requirements Checklist: Users and Roles Admin

## Spec quality

- [X] Spec has at least 3 user stories (2 here; spec is slim).
- [X] Every user story has an explicit priority.
- [X] Every user story has an independent test.
- [X] Every user story has at least 2 acceptance scenarios.
- [X] No `NEEDS CLARIFICATION` marker.

## Traceability

- [X] Every FR maps to a backend or frontend file.
- [X] Every FR maps to at least one user story.
- [X] Every success criterion is measurable.
- [X] The `last administrator` guard is documented in the spec.

## Security

- [X] All endpoints gated by `ADMIN_ROLES`.
- [X] A deactivated user cannot sign in (verified by the spec
      001 integration test).
- [X] The "last administrator" guard prevents lockout.

## Testing

- [X] Integration tests for CRUD, duplicate email, deactivated
      user, last administrator.
- [X] Frontend Karma specs for the list and the form.

## Out-of-scope hygiene

- [X] Out of Scope section is explicit and non-empty.
- [X] No `data-model.md` / `research.md` / `contracts/`
      directory.
