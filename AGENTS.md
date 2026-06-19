# AGENTS.md

<!-- SPECKIT START -->
Read feature context only when implementing, reviewing, or validating that
feature. For feature 009, start with `specs/009-public-content-api/tasks.md`
and open `plan.md`, `spec.md`, or contracts only as needed for the active task.
<!-- SPECKIT END -->

## Operating mode

Use a concise, low-token style.

- Prefer brief status updates only for long-running work or meaningful blockers.
- Do not restate large specs, plans, diffs, or command output unless asked.
- Read the smallest relevant files or sections first; expand context on demand.
- In final replies, summarize changed files and validation in a few bullets.

This project follows Spec-Driven Development. Do not implement non-trivial
functionality unless it is traceable to a spec, plan, task, and validation step.

## SDD workflow

For new features, follow the Spec Kit flow:

1. $speckit-specify
2. $speckit-clarify
3. $speckit-checklist
4. $speckit-plan
5. $speckit-tasks
6. $speckit-analyze
7. implementation by explicit task range only

Do not jump directly from idea to code.

## Architecture

- Prefer simple, modular changes.
- Keep business logic isolated from delivery mechanisms.
- Avoid premature abstractions.
- Do not introduce production dependencies without justification.
- Public contracts must be documented and tested.

## Testing

- Run the narrowest relevant tests for changed behavior.
- Prefer unit tests for business logic.
- Add integration or contract tests only for external boundaries.
- Do not run broad suites unless the change risk justifies it or the user asks.

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
- Document authentication and authorization decisions when they change.

## Delivery

- Keep changes small and reviewable.
- Report changed files and validation commands executed.
- Stop if the implementation requires changing the approved spec or plan.
