# AGENTS.md

<!-- SPECKIT START -->
Read feature context only when implementing, reviewing, or validating that
feature. The active feature is at `.specify/feature.json` (currently
`specs/018-content-rotation-modes/`).

Start with the capability overview for the feature's capability
(`specs/_capabilities/<cap>/overview.md`), then the active feature's
`specs/<NNN>-<name>/tasks.md`. Open `plan.md`, `spec.md`, `research.md`,
`data-model.md`, or `contracts/` as needed for the active task. For
display-control questions, read `specs/019-display-control-canonical/`
first.
<!-- SPECKIT END -->

## Operating mode

Use a concise, low-token style.

- Prefer brief status updates only for long-running work or meaningful blockers.
- Do not restate large specs, plans, diffs, or command output unless asked.
- Read the smallest relevant files or sections first; expand context on demand.
- In final replies, summarize changed files and validation in a few bullets.

This project follows Spec-Driven Development. Do not implement non-trivial
functionality unless it is traceable to a spec, plan, task, and validation
step. The constitution at `.specify/memory/constitution.md` v2.0.0
governs spec structure (size budget, supersession, capability boundary).

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
- Each spec names exactly one capability (`capability:` frontmatter in
  `spec.md`). Cross-capability changes need two specs or a `bridge.md`.

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
- If implementation diverges, log a row in
  `<active-spec>/validation/implementation-conflicts.md` (create the
  file if needed) before continuing the work.
- Closed features live under `specs/_archive/<capability>/<NNN>/`; the
  canonical anchor for display-control rules is
  `specs/019-display-control-canonical/`.

## Governance

The constitution at `.specify/memory/constitution.md` v2.0.0 governs
spec structure (supersession, capability boundary, size budget, no
bundles, validation artefacts). See
`sdd-optimization/10-future-speckit-governance.md` for the full set.
