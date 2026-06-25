# Requirements Checklist: Admin Shell and Navigation

## Spec quality

- [X] Spec has at least 3 user stories (3 here).
- [X] Every user story has an explicit priority.
- [X] Every user story has an independent test.
- [X] Every user story has at least 2 acceptance scenarios.
- [X] No `NEEDS CLARIFICATION` marker.

## Traceability

- [X] Every FR maps to a frontend file.
- [X] Every FR maps to at least one user story.
- [X] Every success criterion is measurable.
- [X] The three density classes and the two viewport thresholds
      are documented.

## Security

- [X] The session guard and the auth-root guard are the only
      auth-related surfaces.
- [X] Sign-out invalidates the session via the auth flow (spec
      001).

## Testing

- [X] Karma specs for the shell, the dashboard, the hall, the
      dirty-form guard, and the breakpoint service.

## Out-of-scope hygiene

- [X] Out of Scope section is explicit and non-empty.
- [X] No `data-model.md` / `research.md` / `contracts/`
      directory.
