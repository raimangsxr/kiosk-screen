# Contract Deltas: CHG-052 Device QR Login

**Date**: 2026-08-06

Pre-implementation deltas to merge into active contracts before coding.

---

## AUTH.RBAC

### Adds

- **Device activation flow** (RFC 8628–style): kiosk requests pairing via
  `POST /api/auth/device-activation/start` (anonymous); displays 6-letter
  `userCode` and QR to `/activate?code={userCode}`; polls
  `POST /api/auth/device-activation/poll` with opaque `deviceCode` every ~2 s.
- **Mobile authorization**: authenticated user with `can_open_display` calls
  `POST /api/auth/device-activation/authorize` with `userCode`. Users without
  `event_operator` or `administrator` role receive HTTP 403.
- **Session issuance on poll**: when authorized, poll response sets the same
  HttpOnly session cookie as `POST /auth/login` for the authorizing user
  (including `rememberMe` from mobile login). Mobile session remains independent.
- **Code policy**: `userCode` is 6 uppercase letters A–Z; TTL **15 minutes**;
  single-use; auto-rotation on kiosk when expired.
- **Rate limiting**: failed authorize attempts (invalid/expired code) throttled
  per client IP (10 failures / 15 minutes), same MVP semantics as login rate
  limiter (per process).
- **Login page coexistence**: `/login` shows device activation (QR + code) as
  **default** view; email/password login remains available via secondary toggle.
  Traditional kiosk login still redirects to `/hall`.
- **Activate route**: `/activate` is navigable without session; confirmation
  requires authentication. Success shows static confirmation without redirect.

### Preserves

- PostgreSQL `user_auth_sessions` as session store (ADR-0008).
- `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, change-password.
- Session cookie shape, TTL (24 h / 30 d remember-me), Secure in production.
- `authExpiredInterceptor` behavior on protected routes.

### Public interfaces (add)

- `POST /api/auth/device-activation/start`
- `POST /api/auth/device-activation/authorize`
- `POST /api/auth/device-activation/poll`

### Owned paths (add)

- `backend/app/auth/device_activation_service.py`
- `backend/app/auth/device_activation_store.py`
- `frontend/src/app/auth/activate.component.ts`
- `frontend/src/app/core/auth/device-activation.service.ts`

### Tests (add)

- `backend/tests/unit/test_device_activation.py`
- `backend/tests/integration/test_device_activation_flow.py`
- `frontend/src/app/core/auth/device-activation.service.spec.ts`
- `frontend/src/app/auth/activate.component.spec.ts`

---

## DISPLAY.CONFIG_SESSION

### Adds

- **Activation → display path**: after device activation, kiosk navigates
  directly to `/display` (skips `/hall`). `POST /display/open` runs with same
  semantics as hall → display, including **supersede** of prior operator sessions
  for the organization.
- **Display label timing**: pairing code does **not** bind a `display_devices`
  label; kiosk registration at `POST /api/display/kiosk/register` still occurs at
  `/display` entry as today.

### Preserves

- Hall → display path unchanged for credential login.
- Readiness blockers on `open_display`.
- Session supersede SSE `session_ended` to prior kiosks.
- Display device admin (`/admin/displays`) unchanged.

### Non-goals

- Pre-assigning display device at activation time.
- SSO / external IdP.

---

## Manifest

Add entry before implementation:

```yaml
  - id: CHG-052
    path: specs/changes/052-device-qr-login/spec.md
    status: draft
    modifies:
      - AUTH.RBAC
      - DISPLAY.CONFIG_SESSION
    depends_on: []
    consolidated_into: []
    read_by_default: true
```

---

## ADR

Create `docs/adr/0014-device-activation-flow.md` during implementation (Redis
pairing, poll cookie issuance, threat model for 6-letter codes).
