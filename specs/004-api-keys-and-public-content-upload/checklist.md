# Requirements Checklist: API Keys and Public Content Upload

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
- [X] The two CHECK constraints on `key_hash` and `key_prefix` are
      documented.

## Security

- [X] Raw key value is never persisted; only sha256 hex.
- [X] Raw key is returned once on create / rotate.
- [X] Bearer auth returns 401 with distinct codes for missing /
      wrong-scheme / unknown-prefix / inactive keys.
- [X] Hard-delete only after revoke; audit trail outlives the row.

## Testing

- [X] Integration tests for create, rotate, revoke, delete,
      public upload, error matrix.
- [X] Frontend Karma specs for the list and the create dialog.

## Out-of-scope hygiene

- [X] Out of Scope section is explicit and non-empty.
- [X] No `data-model.md` / `research.md` / `contracts/`
      directory.
