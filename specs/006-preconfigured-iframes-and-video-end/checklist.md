# Requirements Checklist: Preconfigured Iframes and Video End Delay

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
- [X] The `UNIQUE (organization_id, url)` constraint and the
      `video_end_delay_seconds` CHECK constraint are documented.

## Security

- [X] All iframe endpoints gated by `CONTENT_MANAGEMENT_ROLES`.
- [X] Duplicate URL within the same org returns 409 with a
      specific code (no leak).

## Testing

- [X] Integration tests for CRUD, duplicate URL, video end delay
      bounds, auto-revert on deletion.
- [X] Frontend Karma specs for the iframe admin list and form.

## Out-of-scope hygiene

- [X] Out of Scope section is explicit and non-empty.
- [X] No `data-model.md` / `research.md` / `contracts/`
      directory.
