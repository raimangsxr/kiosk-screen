# AGENTS.md

<!-- SPECKIT START -->
For current feature context, read `specs/005-admin-refactor/plan.md`.
<!-- SPECKIT END -->

## Project operating model

This project follows Spec-Driven Development using GitHub Spec Kit and Codex CLI.

Codex must not implement non-trivial functionality unless it is traceable to:
1. A Spec Kit specification
2. An implementation plan
3. A task
4. A validation step or test

## SDD workflow

For new features, follow:

1. $speckit-specify
2. $speckit-clarify
3. $speckit-checklist
4. $speckit-plan
5. $speckit-tasks
6. $speckit-analyze
7. implementation by explicit task range only

Do not jump directly from idea to code.

## Architecture

- Prefer simple, modular architecture.
- Keep business logic isolated from delivery mechanisms.
- Avoid premature abstractions.
- Do not introduce production dependencies without justification.
- Public contracts must be documented and tested.

## Testing

- Tests are required for changed behavior.
- Prefer unit tests for business logic.
- Add integration or contract tests for external boundaries.
- Do not mark a task complete until relevant tests pass.

### Frontend test scripts

- `npm --prefix frontend run test`: headless (`ChromeHeadlessNoSandbox`),
  single run. Use as the default local validation command; does not open a
  browser window.
- `npm --prefix frontend run test:watch`: headed `Chrome` with autoWatch for
  TDD; opens a real browser window.
- `npm --prefix frontend run test:ci`: headless + code coverage, suitable for
  pipelines. Reports land in `frontend/coverage/kiosk-screen/`.

All three resolve through `frontend/karma.conf.js`.

## Security

- Do not hardcode secrets, tokens, passwords or internal URLs.
- Validate input at system boundaries.
- Preserve least privilege.
- Document authentication and authorization decisions.

## Delivery

- Keep changes small and reviewable.
- Report changed files after implementation.
- Report tests and validation commands executed.
- Stop if the implementation requires changing the approved spec or plan.
