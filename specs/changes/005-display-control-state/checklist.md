# Requirements Checklist: Display Control State

## Spec quality

- [X] Spec has at least 3 user stories (4 here).
- [X] Every user story has an explicit priority.
- [X] Every user story has an independent test.
- [X] Every user story has at least 2 acceptance scenarios.
- [X] No `NEEDS CLARIFICATION` marker.

## Traceability

- [X] Every FR maps to a backend or frontend file.
- [X] Every FR maps to at least one user story.
- [X] Every success criterion is measurable.
- [X] The two CHECK constraints are documented in the spec and the
      model.

## Security

- [X] The four remote control endpoints are gated by
      `REMOTE_CONTROL_ROLES`.
- [X] Forbidden access records
      `remote_control_access_denied` before the 403 is raised.

## Testing

- [X] Integration tests for state PUT, navigation POST, ads
      visibility, fullscreen, auto-fallback, access-denied.
- [X] Frontend Karma spec for the remote control page.

## Out-of-scope hygiene

- [X] Out of Scope section is explicit and non-empty.
- [X] No `data-model.md` / `research.md` / `contracts/`
      directory.
