# Research: Public Content API with Novelty Priority

**Date**: 2026-06-18
**Spec**: [spec.md](./spec.md)

This document records the technical decisions made during the planning phase. All decisions are anchored in the approved spec and the existing repository state.

## Decision: Use FastAPI `HTTPBearer` security primitive for the public endpoint

**Rationale**: FastAPI exposes `fastapi.security.HTTPBearer` as a built-in dependency that parses the `Authorization: Bearer …` header, returns a structured `HTTPAuthorizationCredentials` object, and integrates with the existing OpenAPI generation. The codebase already uses FastAPI 0.1x+, the dependency is bundled with FastAPI, and the existing `HTTPException` + `ApplicationError` handling pattern maps cleanly onto it.

**Alternatives considered**:
- Build a custom dependency that reads the raw header and parses it manually. Rejected: redundant code, no OpenAPI surface, no consistent error envelope.
- Use OAuth2 with the full token URL flow. Rejected: massive over-engineering for a static API key. The spec explicitly says API key, not OAuth2.

## Decision: Hash the API key with `hashlib.sha256` (not bcrypt, not argon2)

**Rationale**: API keys have 256 bits of entropy by design (`secrets.token_urlsafe(32)`). Against a uniformly random 256-bit secret, brute-force is computationally infeasible regardless of hash function. SHA-256 is fast, deterministic, and constant-length, which makes the lookup strategy (prefix + hash) trivial. Bcrypt/argon2 are designed for low-entropy human passwords where work-factor matters; they would be slower for no security benefit and would complicate the per-request verification path.

**Alternatives considered**:
- bcrypt: rejected. Work factor is wasted on 256-bit random secrets.
- argon2: rejected for the same reason.
- HMAC-SHA256 with a server-side pepper: not needed given the entropy and adds operational complexity (where does the pepper live? HSM? env? rotation?).

## Decision: Store `key_prefix` plain + `key_hash` of full key

**Rationale**: The key is split into two parts at creation time: a short non-secret prefix (e.g., `ksk_live_AbCdEfGh`) that the admin sees in the list for identification, and the full key value (prefix + 24 random URL-safe characters). The server stores the prefix plain and stores `sha256(full_key)`. Verification looks up by prefix (small, indexed) and compares hash with `hmac.compare_digest`. This avoids the cost of hashing every row on every request, and supports lookups even if the prefix is changed in the future (though we don't plan to).

The raw key is shown to the admin exactly once, after which only the prefix is recoverable. Even with full database access, an attacker cannot recover the key value, only verify guesses.

**Alternatives considered**:
- Store the full key plain: rejected. A database leak would expose every active key.
- Store the full key encrypted with a server-side key: rejected. Adds a KMS dependency without clear benefit; the hash approach is the standard for static API keys.
- Store only the hash and look up by hash: rejected. Prefix-based lookup is faster (small, indexable) and gives the admin a human-readable identifier.

## Decision: Use PostgreSQL transactional advisory lock for per-organization append serialization

**Rationale**: The spec requires (FR-013) that concurrent uploads to the same organization produce consecutive `displayOrder` values with no gaps, duplicates, or races. The standard approaches in PostgreSQL are:
- `SELECT … FOR UPDATE` on a synthetic "append anchor" row: requires an extra row per org, or a `pg_try_advisory_xact_lock` pattern.
- `pg_advisory_xact_lock(hash_of_org_id)`: an in-transaction advisory lock keyed by an `int8` (or two `int4`s). Released automatically at COMMIT/ROLLBACK. No extra tables, no extra rows, blocks only the competing transactions for the same org, allows other operations on the same org to proceed.

The advisory lock is acquired at the start of the append transaction and released when the transaction commits. Concurrent appends to the same org queue; appends to different orgs run in parallel. This is the simplest, lowest-overhead mechanism that satisfies the spec.

**Alternatives considered**:
- Application-level `asyncio.Lock` per org in memory: rejected. Breaks under multiple uvicorn workers (which is the typical deploy shape) and does not survive restarts.
- `SELECT … FOR UPDATE` on a synthetic row: rejected. Requires an extra row, more code, no real advantage.
- Serializable isolation level: rejected. Higher contention, deadlocks, and would also serialize reads.
- Optimistic locking with retry: rejected. More complex client/server code; advisory lock is one line of SQL.

## Decision: Reuse the existing `MediaStorageService.save_upload` for the public path

**Rationale**: The existing `MediaStorageService.save_upload` already:
- Streams the upload to disk in 1 MB chunks.
- Computes the storage path as `<root>/<organization_id>/<media_id>-<uuid>.<ext>`.
- Validates the file against `MediaValidationLimits` (image_max_bytes, video_max_bytes) after writing.
- Creates a `MediaFileReference` row and adds it to the session.
- Rolls back the row and unlinks the file on failure.

The public endpoint reuses this path verbatim. The only difference is the caller: where `ContentService.create_uploaded` is called by the admin route, the public route calls a new `ContentService.append_via_public_api` that performs the same steps plus the advisory lock and the display event.

**Alternatives considered**:
- New `PublicMediaStorageService`: rejected. Duplicates logic and diverges over time.
- Bypass the existing service and write directly: rejected. Loses validation, breaks the unlink-on-failure invariant, and splits the storage code path.

## Decision: Reuse the existing `ContentService` and add `append_via_public_api` as a sibling of `create_uploaded`

**Rationale**: The existing `create_uploaded` does almost what we need: it validates the upload, calls `MediaStorageService.save_upload`, creates a `TopContentItem` with `is_active=True`, and commits. The differences are:
- `display_order` is provided explicitly in admin uploads, but for the public path the server computes `max+1` inside the locked transaction.
- Admin uploads take a `ContentItemRequest`; the public path takes only `file` and `title`.
- Public uploads record a different display event message and attribute to the API key id.

Adding a new method on the same service keeps business rules together. The existing `create_uploaded` keeps its explicit-`display_order` admin behavior (FR-034 in the spec).

**Alternatives considered**:
- New `PublicContentService`: rejected. The service already has a small surface; splitting it adds coordination overhead for no clear win.
- Reuse `create_uploaded` with the public endpoint computing `display_order` itself: rejected. Mixes concerns (admin caller vs public caller) and moves the lock acquisition out of the service.

## Decision: Add a single new table `api_keys` and a single new endpoint group `/api/admin/api-keys/`

**Rationale**: The data model needs one new entity (`ApiKey`). The admin needs four operations on it (list, create, rotate, revoke). Mapping them to REST resources:
- `GET /api/admin/api-keys` → list
- `POST /api/admin/api-keys` → create
- `POST /api/admin/api-keys/{id}/rotate` → rotate (in-place, per spec clarification)
- `DELETE /api/admin/api-keys/{id}` → revoke

Rotate and revoke are split into different HTTP verbs because rotate is "replace value" (POST) and revoke is "mark inactive" (DELETE). This matches typical resource lifecycle patterns.

**Alternatives considered**:
- Single endpoint `PUT /api/admin/api-keys/{id}` for all mutations with an `action` field in the body: rejected. Loses the semantic clarity of HTTP verbs; harder to map to OpenAPI; less idiomatic.
- Soft delete via `isActive` flag with a single `DELETE` that toggles: rejected. The spec says rotation is a separate action from revocation; they need different semantics and audit trails.

## Decision: Pre-transition poll uses `setTimeout` callback that fires a one-shot HTTP request, not a separate `interval` subscription

**Rationale**: The Angular RxJS pipeline for the polling loop is `interval(5000).pipe(startWith(0), switchMap(() => api.getState()))`. Adding a pre-transition poll as a second subscription is clean but adds a parallel timer that can drift. A simpler design: when the rotation `setTimeout` is scheduled, also schedule a second `setTimeout` at `duration - 1000ms` that fires a one-shot `api.getState()` and processes the result through the same `onPoll` function. The 1-second offset is recomputed every transition; if the transition is cancelled and rescheduled, the pre-transition poll is cancelled too. This avoids parallel state machines.

**Alternatives considered**:
- Second `interval` subscription with a different cadence: rejected. Two timers with their own lifecycle is harder to reason about and cancel cleanly.
- Polling faster (every 1s): rejected. Increases DB load 5x; the pre-transition poll is the only place where latency matters.

## Decision: Use `distinctUntilChanged` with a deep-equality function on `(ids, order)` only — not on `lastUsedAt` or `createdByUserId` fields on the items

**Rationale**: The kiosk cares about the *visible* state: which items are in `topContent` and in what order. Fields like `lastUsedAt` on a media reference or `updatedByUserId` on a content item do not affect rendering and should not trigger a re-render or timer reset. The deep-equality function compares the `topContent` array element-by-element on `(id, displayOrder)` and the same for `ads`. This is enough to detect "new items appeared" without false positives.

**Alternatives considered**:
- Compare full item objects: rejected. False positives on backend metadata changes would reset the rotation timer.
- Compare only the array length: rejected. Loses reorders, deletions, and deactivations.

## Decision: Frontend lives under `frontend/src/app/features/api-keys/` following the existing feature-folder pattern

**Rationale**: The existing refactor (specs/005) introduced a `features/` folder with `content/`, `users/`, `ads/`, `clients/`, etc. Each has a stable shape: `*.api.ts`, `*.facade.ts`, `*.component.ts`, `*.models.ts`, plus a facade spec. The api-keys feature follows the same shape: `api-keys.api.ts`, `api-keys.facade.ts`, `api-keys-list.component.ts`, `api-keys-create-dialog.component.ts`, `api-keys.models.ts`. Routing in `app.routes.ts` adds `/admin/api-keys` as a child of the admin shell.

**Alternatives considered**:
- Inline the api-keys section into the existing `users-roles` component: rejected. Different domain, different lifecycle, different audit needs.
- Single component with list + dialog inline: rejected. The dialog has a "show raw key once" flow with copy-to-clipboard and a confirmation warning; separating it makes both pieces easier to test.

## Decision: CORS is implemented as a FastAPI middleware applied only to the public router

**Rationale**: The spec says the public endpoint is server-to-server in the typical case, with browser cross-origin access being opt-in. Applying a CORS middleware to the *whole* app would change the behavior of every other endpoint; applying it only to the public router means the rest of the API is unaffected. The allowlist is read from a new `Settings.public_api_cors_origins` field (default empty list, meaning same-origin only). When non-empty, the middleware adds the standard `Access-Control-Allow-*` headers on preflight and on actual responses for the public routes.

**Alternatives considered**:
- Apply CORS to the whole app: rejected. Affects existing authenticated routes; potentially leaks `Authorization` reflection concerns.
- Roll a per-handler CORS hook: rejected. More code, no benefit over middleware scoped to the router.
- Use `CORSMiddleware` from `fastapi.middleware.cors`: this is what we use, with `allow_origins=settings.public_api_cors_origins`, `allow_methods=["POST"]`, `allow_headers=["Authorization", "Content-Type"]`, `allow_credentials=False`.

## Decision: No new Python dependencies. No new Node dependencies.

**Rationale**:
- Backend: `fastapi.security.HTTPBearer`, `hashlib.sha256`, `secrets.token_urlsafe`, `pg_advisory_xact_lock` (raw SQL via `text()`) are all in the standard library or already-installed dependencies.
- Frontend: the kiosk already imports `interval`, `switchMap`, `distinctUntilChanged`, `shareReplay` from `rxjs` (via existing services). The new api-keys feature uses the same patterns as `users.facade.ts`. No new packages.

This keeps the deploy footprint unchanged and avoids supply-chain risk. Every new dep must be justified by an unfulfilled current need; none of the FRs in the spec require one.

**Alternatives considered**:
- `bcrypt`: rejected (see "Hash the API key" above).
- `cachetools` or `redis` for caching the kiosk display state: rejected. The existing `get_display_state` is fast enough; caching adds invalidation complexity.
- A CORS package separate from FastAPI's built-in: rejected. `fastapi.middleware.cors.CORSMiddleware` is the canonical choice.
