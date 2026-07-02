# Context Pack: CHG-026 Cross-repo platform standardization

## Mandatory Context

- `specs/manifest.yml`
- `specs/contracts/ops-platform/contract.md`
- `.github/workflows/release-images.yml`
- `.github/workflows/bump-app.yml`
- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`

## Constraints

- Do not add a backend Dockerfile or compose healthcheck.
- Keep `release-tag` upload intact for the bump workflow.
- Prefer the same shape as `amrn-bull` and `amrn-escalabirras-dual`
  unless app-specific environment variables require a narrow difference.

