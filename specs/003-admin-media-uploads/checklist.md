# Requirements Checklist: Admin Media Uploads

## Spec quality

- [X] Spec has at least 3 user stories (2 here; spec is slim and
      each user story is end-to-end).
- [X] Every user story has an explicit priority.
- [X] Every user story has an independent test.
- [X] Every user story has at least 2 acceptance scenarios.
- [X] No `NEEDS CLARIFICATION` marker.

## Traceability

- [X] Every FR maps to a backend or frontend file.
- [X] Every FR maps to at least one user story.
- [X] Every success criterion is measurable.
- [X] The four MIME allow lists are listed in the spec.

## Security

- [X] Upload validation runs server-side; client validation is
      advisory only.
- [X] Cross-org media id → 404 (no leakage).
- [X] GET requires a session cookie or an unexpired operator
      session token.

## Testing

- [X] Integration tests for upload, GET, oversize, MIME, cross-org.
- [X] Unit tests for `resolve_effective_rotation(...)`.

## Out-of-scope hygiene

- [X] Out of Scope section is explicit and non-empty.
- [X] No `data-model.md` / `research.md` / `contracts/`
      directory.
