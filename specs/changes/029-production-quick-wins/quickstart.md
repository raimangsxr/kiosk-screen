# Quickstart: Production Quick Wins

**Date**: 2026-07-06  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Prerequisites

- Python 3.12, Docker/OrbStack for Postgres
- Node.js **24** (`nvm use` from repo root after `.nvmrc` lands)
- Backend + frontend lab per `docs/dev/local-lab.md`

## Validation checklist

### 1. Public upload path (US-1)

```sh
# Start backend lab, create API key via admin UI or test fixture

# Must succeed (documented path)
curl -X POST http://localhost:8000/api/public/content/upload \
  -H "Authorization: Bearer ksk_live_…" \
  -F "file=@photo.jpg" -F "title=Test"

# Must NOT succeed with API key only (regression)
curl -X POST http://localhost:8000/api/content/upload \
  -H "Authorization: Bearer ksk_live_…" \
  -F "file=@photo.jpg" -F "title=Test"
# Expect 401 or 404 — not 201
```

### 2. Media fingerprint (US-2)

1. Open kiosk `/display` with content item on screen.
2. In admin, replace image on **same content id** (re-upload media).
3. Within one poll interval (~5s), kiosk shows new image without reload.

Automated:

```sh
npm --prefix frontend run test -- --include='**/display-fingerprint.spec.ts'
npm --prefix frontend run test -- --include='**/display-screen.component.spec.ts'
```

### 3. Empty queue audit (US-3)

1. Deactivate all top content.
2. Open kiosk in loop mode.
3. Check `GET /api/events` for `content_rotation_empty` within ~60s.

### 4. Minor fixes (US-4)

- **Logo**: Break logo URL → fix URL in event config → logo reappears on refresh.
- **403**: Revoke role / use forbidden endpoint → redirect to login.
- **Admin shell**: Navigate admin routes, leave shell — no console errors from stale router sub.

### 5. Node pin (US-5)

```sh
cat .nvmrc   # expect 24
node -v      # v24.x after nvm use
```

## Full test suite

```sh
pytest backend/tests
npm --prefix frontend run test
npm --prefix frontend run build
```

All must pass before merge.

## Contract updates (pre-merge gate)

Verify these files updated:

- `specs/contracts/public-content-api-keys/contract.md`
- `specs/contracts/display-runtime/contract.md`
- `specs/contracts/display-events-audit/contract.md`
- `specs/contracts/auth-rbac/contract.md`
- `specs/contracts/ops-platform/contract.md`

## Rollback

Revert single commit; no migrations. Re-add v1 public router only if emergency hotfix for misconfigured clients (not recommended).
