# Requirements Checklist: Foundation, Auth and RBAC

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
- [X] `Role` enum and the six role sets are the single source of
      truth for authorization (no spec re-declares role strings).

## Security

- [X] Passwords hashed with a non-reversible algorithm; never
      logged.
- [X] Session cookie `httponly` + `samesite=lax`.
- [X] Identical 401 body for invalid email and invalid password.
- [X] Bootstrap admin only runs when the `users` table is empty.

## Testing

- [X] Integration tests for login, logout, me, RBAC matrix,
      bootstrap.
- [X] Frontend Karma specs for `LoginComponent` and the two
      guards.

## Out-of-scope hygiene

- [X] Out of Scope section is explicit and non-empty.
- [X] No `data-model.md` / `research.md` / `contracts/`
      directory; all content is in `spec.md` or `plan.md`.
