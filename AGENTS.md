# AGENTS.md

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

## Technology stack

This is a greenfield full-stack application.

### Frontend
- Use Angular for the frontend.
- Use TypeScript.
- Prefer standalone components unless the project structure requires modules.
- Keep UI logic separate from domain/application logic.
- Use Angular services for API communication.
- Do not introduce a different frontend framework.

### Backend
- Use Python with FastAPI.
- Use SQLAlchemy as the ORM/data access layer.
- Use Alembic for database migrations.
- Use PostgreSQL as the relational database.
- Do not use another backend framework unless explicitly approved.
- Do not access the database outside SQLAlchemy-managed patterns.
- Every schema change must include an Alembic migration.

### API
- Backend APIs must be exposed through FastAPI.
- API contracts must be documented through OpenAPI.
- Frontend/backend integration must respect the API contract.
- Validation must happen at API boundaries.

### Database
- PostgreSQL is the source of truth for persisted application data.
- Use migrations for all structural database changes.
- Do not rely on automatic schema creation in production-like flows.

### Testing
- Backend behavior must be covered with pytest or an explicitly approved Python test framework.
- Frontend behavior must be covered with Angular-compatible tests.
- API behavior should have contract or integration tests where relevant.
