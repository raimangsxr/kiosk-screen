# Quickstart: Device QR Login (CHG-052)

**Branch**: `052-device-qr-login`

## Prerequisites

- Local lab: `docs/dev/local-lab.md`
- Redis running (`REDIS_URL`)
- Two browsers or one desktop + one mobile (or devtools device mode)
- Operator account with `event_operator` or `administrator` role

## Contract prep (before code)

1. Merge `contracts/contract-deltas.md` into `AUTH.RBAC` and
   `DISPLAY.CONFIG_SESSION`.
2. Add CHG-052 to `specs/manifest.yml` (`status: draft`).
3. Create `docs/adr/0014-device-activation-flow.md`.

## Automated regression (after implementation)

```sh
# Narrow first
pytest backend/tests/unit/test_device_activation.py -v
pytest backend/tests/integration/test_device_activation_flow.py -v
npm --prefix frontend run test -- --include='**/device-activation**'
npm --prefix frontend run test -- --include='**/activate.component**'
npm --prefix frontend run test -- --include='**/login.component**'

# Broader
pytest backend/tests
npm --prefix frontend run test
npm --prefix frontend run build
```

## Manual: happy path QR (US1 — P1)

1. Browser A (kiosk): open `/login` logged out.
2. **Expect**: QR + 6-letter code visible as default; no hall redirect.
3. Browser B (mobile): scan QR or open `/activate?code=XXXXXX`.
4. If logged out on B: enter credentials + remember-me optional → confirm.
5. **Expect**: B shows «Pantalla activada»; no redirect to hall/admin.
6. **Expect**: A receives session within **10 s**, navigates to `/display`,
   rotation/display session starts (readiness permitting).
7. **Expect**: A did not pass through `/hall`.

## Manual: manual code entry (US2)

1. Kiosk shows code `XXXXXX`.
2. Mobile: navigate to `/activate` (no scan), type code, confirm.
3. Same expectations as happy path.

## Manual: credential login unchanged (US3)

1. Kiosk `/login` → switch to credentials tab.
2. Login with email/password.
3. **Expect**: redirect to `/hall` (not `/display`).

## Manual: code expiry (US4)

1. Kiosk on `/login` with code showing.
2. Wait 15+ min (or shorten TTL in dev config for test).
3. **Expect**: kiosk shows expired state and new code + QR.
4. Try old code on mobile → clear error; no session on kiosk.

## Manual: session supersede (clarification Q2)

1. Open display session from operator A on kiosk 1.
2. Activate kiosk 2 via device flow as operator B (or same operator).
3. **Expect**: kiosk 1 receives `session_ended` / stops as today when display
   reopened elsewhere.

## Manual: permission denied (US4-3)

1. Use user with role **without** `event_operator` / `administrator`.
2. Attempt authorize valid code.
3. **Expect**: 403 on mobile; kiosk stays waiting.

## Manual: rate limit (FR-016)

1. Submit 10+ invalid codes from same IP on `/authorize`.
2. **Expect**: HTTP 429 with generic message.

## Manual: network recovery (edge case C6)

1. Kiosk on `/login` waiting with code visible.
2. DevTools → Offline 30 s → Online.
3. **Expect**: poll resumes; if code expired during outage, new code + QR appear without manual refresh.

## Manual: inactive user (FR-015)

1. Deactivate a test user in admin (or use pre-seeded inactive account).
2. On mobile `/activate`, attempt login + authorize with valid kiosk code.
3. **Expect**: activation fails; kiosk stays waiting; no session cookie on kiosk.

## Acceptance metrics (SC-001, SC-004)

**Protocol** (record in checklist Notes):

| Metric | Method | Pass criterion |
|--------|--------|----------------|
| SC-001 latency | Stopwatch from mobile «Confirmar» tap to kiosk visible on `/display` | ≥5 runs; ≥95 % under 30 s |
| SC-004 QR usability | ≥5 operators, no instructions, QR-only path | ≥90 % succeed first attempt |

Document: date, environment, operators, timings, pass/fail per run.

## Manual: SC-006 — orphan code soak

**Release gate** (or accelerated lab proxy):

1. Leave kiosk on `/login` for **8 h** with default 15 min TTL (codes auto-rotate).
2. Optionally run second kiosk in parallel with distinct codes.
3. **Expect**: after soak, `redis-cli KEYS 'device_activation:*'` shows no stale pending keys linking wrong kiosk (or keys empty/expired).
4. **Accelerated proxy** (dev only): set TTL to 60 s, run 2 h, verify same invariant.

Record Redis key count samples at T+0, T+4 h, T+8 h in checklist Notes.

## Security checklist

- [ ] `deviceCode` never shown on kiosk UI
- [ ] Used `userCode` cannot authorize twice
- [ ] Poll without prior authorize stays `pending`
- [ ] Session cookie HttpOnly on poll only when authorized
