# Integration Validation

Commands:

- `pytest backend/tests/contract`
- `docker build -f backend/Dockerfile backend`
- `docker build -f frontend/Dockerfile frontend`
- Smoke checklist: `scripts/smoke/kiosk_mvp.md`

Result: Contract tests pass as part of the backend suite. Backend and frontend Docker image builds pass with pinned Angular package versions. Smoke checklist is documented for local execution with running services.
