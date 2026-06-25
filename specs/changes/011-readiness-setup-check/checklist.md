# Requirements Checklist: Readiness and Setup Check

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
- [X] The four blocker rules are listed in the spec.

## Security

- [X] `GET /readiness` requires a session cookie.

## Testing

- [X] Unit tests for `evaluate_readiness(...)` covering every
      blocker and one warning.
- [X] Integration test for the endpoint.
- [X] Frontend Karma specs for the panel and the hall
      "Open kiosk" enable / disable.

## Out-of-scope hygiene

- [X] Out of Scope section is explicit and non-empty.
- [X] No `data-model.md` / `research.md` / `contracts/`
      directory.
