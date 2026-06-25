# Requirements Checklist: Display Events Audit Log

## Spec quality

- [X] Spec has at least 3 user stories (3 here).
- [X] Every user story has an explicit priority.
- [X] Every user story has an independent test.
- [X] Every user story has at least 2 acceptance scenarios.
- [X] No `NEEDS CLARIFICATION` marker.

## Traceability

- [X] Every FR maps to a backend file.
- [X] Every FR maps to at least one user story.
- [X] Every success criterion is measurable.
- [X] The 22-row catalog is part of the spec (the single source
      of truth for `event_type` strings).

## Security

- [X] `SECRET_KEYS` is a hard-coded set; the helper strips any
      value.
- [X] `entity_id` is not a FK so the audit trail outlives
      deleted rows.
- [X] No UPDATE / DELETE on `display_events`.

## Testing

- [X] Unit test for `sanitize_metadata` parametrized over each
      secret key.
- [X] Integration tests for the endpoint and the catalog-driven
      event recording.

## Out-of-scope hygiene

- [X] Out of Scope section is explicit and non-empty.
- [X] No `data-model.md` / `research.md` / `contracts/`
      directory; the catalog lives in `spec.md`.
