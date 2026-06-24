# Requirements Checklist: Content Rotation Modes

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
- [X] The two CHECK constraints
      (`ck_top_content_not_fixed_and_recurring` and
      `ck_display_control_fixed_has_target`) are documented.

## Security

- [X] `POST /api/display/rotation-event` is authenticated.
- [X] The kiosk-initiated event is rate-limited client-side
      (60 s debounce).

## Testing

- [X] Integration tests for the migrations, the mutual-exclusion
      validator, the kiosk behaviour (Karma).
- [X] Frontend Karma spec for the controller.

## Out-of-scope hygiene

- [X] Out of Scope section is explicit and non-empty.
- [X] No `data-model.md` / `research.md` / `contracts/`
      directory.
