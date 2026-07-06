# ADR-0008: Auth session persistence

## Status

Accepted (CHG-031)

## Context

Operator login sessions were stored in `app.state.auth_sessions`, an in-memory dict
per process. Backend restarts and horizontal scaling logged users out
unpredictably, and logout only removed the token from one process.

CHG-031 requires:

- Sessions verifiable on any backend instance
- Server-side TTL and logout invalidation
- `SESSION_SECRET` used for cookie integrity
- Production refusal of documented development defaults

## Decision

1. **Database-backed sessions** in `user_auth_sessions` (opaque id, `user_id`,
   `valid_until`, `revoked_at`).
2. **Signed session cookie** value `{session_id}.{hmac}` using `SESSION_SECRET` so
   clients cannot forge ids without the server secret.
3. **HTTP-only** cookies; **Secure** when `APP_ENV=production`.
4. **In-process login rate limiter** keyed by client IP (10 failures / 15 minutes).
   Complements ingress limits; not replicated across pods in MVP.
5. **Startup validation** rejects production boot when `SESSION_SECRET` or
   `BOOTSTRAP_ADMIN_PASSWORD` match documented development defaults.

## Consequences

- One-time re-login after upgrade from in-memory sessions (documented).
- Login rate limits apply per backend instance; multi-pod deployments may allow
  `N × threshold` attempts unless ingress rate limiting is added.
- No Redis dependency; PostgreSQL is the shared session store.

## Alternatives considered

- **Signed stateless JWT-only cookies**: simpler but server-side logout/TTL
  revocation requires blocklists; rejected for FR-007.
- **Redis session store**: better for rate limits and revocation at scale;
  deferred per spec assumptions.
