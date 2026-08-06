# ADR-0014: Device activation flow (QR / user code)

**Status**: Accepted  
**Date**: 2026-08-06  
**Change**: CHG-052

## Context

Kiosk operators need a Netflix/DAZN-style activation path: the display shows a short
code and QR, a mobile device authorizes, and the kiosk receives a session without
typing credentials on the large screen. The flow must coexist with classic
email/password login on the same `/login` page.

## Decision

1. Implement an OAuth 2.0 **Device Authorization Grant** pattern (RFC 8628 style)
   without external IdP coupling.
2. Store ephemeral pairing state in **Redis** with TTL **900 s** (15 min):
   - `device_activation:user:{userCode}` → opaque `deviceCode`
   - `device_activation:device:{deviceCode}` → JSON record (`pending` → `authorized` → consumed)
3. **API surface** (under `/api/auth/device-activation`):
   - `start` (anonymous): returns `userCode`, `deviceCode`, `expiresAt`, `pollIntervalSeconds`
   - `authorize` (authenticated, `can_open_display`): binds authorizing user to pending code
   - `poll` (anonymous, kiosk): returns `pending` or `authorized`; on `authorized`, issues the
     same HttpOnly `kiosk_session` cookie as `POST /auth/login` (honours mobile `rememberMe`)
4. Kiosk polls every **2 s**; mobile session stays independent.
5. `userCode` is **6 uppercase letters A–Z** (~308M space); single-use; kiosk auto-rotates on expiry.
6. Failed `authorize` attempts rate-limited per client IP: **10 failures / 15 min** (in-process MVP, mirrors login limiter).
7. Frontend: `/login` defaults to activation tab; credential tab unchanged → `/hall`.
   Activation success → `/display` (skips hall). `/activate` shows success screen, no redirect.

## Threat model

| Risk | Mitigation |
|------|------------|
| Brute-force `userCode` | 6-letter space + 15 min TTL + rate limit on authorize |
| Code enumeration via error text | Generic Spanish messages; distinct codes mapped to safe user copy |
| Stolen `deviceCode` | Opaque UUID; useless without physical/mobile authorize step |
| Session fixation | New server session issued only after successful poll consume |
| XSS stealing cookie | HttpOnly session cookie (existing ADR-0008) |

## Consequences

### Positive

- No credentials on kiosk; familiar consumer UX.
- Reuses PostgreSQL session store and display open/supersede semantics.
- Redis TTL gives automatic cleanup without cron.

### Negative

- Requires Redis availability for activation (same dependency as display orchestrator).
- In-process rate limiter is per backend instance (acceptable MVP per CHG-031 precedent).

## Related

- CHG-052
- Contracts: `AUTH.RBAC`, `DISPLAY.CONFIG_SESSION`
- ADR-0008 (PostgreSQL sessions)
