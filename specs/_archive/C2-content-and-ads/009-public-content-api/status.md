# Status: 009-public-content-api

**Capability**: C2-content-and-ads
**Closed on**: 2026-06-22 (commit `sdd-optimization-bundle`)
**Supersedes**: —
**Superseded by**: 016-preconfigured-iframes-and-video-end (no public iframe upload), 018-content-rotation-modes (public API silently ignores isFixed/recurring), 012-delete-revoked-api-keys (revoked key deletion)

The `POST /api/public/content/upload` endpoint, novelty-queue behavior,
API key model (`keyHash`, `keyPrefix`, `lastUsedAt`, `revokedAt`),
CORS allowlist, and audit-event emission for `content_changed` are
authoritative.

**Status file index**: this is the only file an agent needs to read for
this archived spec.

**Open tasks at closure**: 7 (hardening: CORS regression, observability).

**Size budget note**: `plan.md` is 402 lines, over the v2.0.0 budget of
300. Grandfathered. Future amendments to the public API surface land
as separate specs (e.g. autodetect in 018).