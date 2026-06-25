---
id: CHG-004
type: change
status: consolidated
modifies:
  - PUBLIC_CONTENT.API_KEYS
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into:
  - PUBLIC_CONTENT.API_KEYS
requires_contract_update: false
read_by_default: false
---
# Feature Specification: API Keys and Public Content Upload

**Feature Branch**: `004-api-keys-and-public-content-upload`
**Spec Directory**: `specs/changes/004-api-keys-and-public-content-upload/`
**Created**: 2026-06-23
**Status**: Approved
**Input**: the API key model (`api_keys` table, prefix `ksk_live_`,
sha256 hash), the five admin endpoints to manage keys, and the
public content upload endpoint that authenticates via bearer key.

## User Scenarios & Testing

### User Story 1 — Create an API key (Priority: P1)

An administrator opens the API keys page, clicks "New key", enters
a label, and submits. The backend generates a 32-byte random
secret, stores a sha256 hex hash, exposes only the prefix
`ksk_live_<8 chars>`, and returns the raw value **exactly once** in
the response. The new key is `is_active=True`, has no
`last_used_at`, no `last_rotated_at`, no `revoked_at`.

**Why this priority**: every other public-API capability depends on
having a key.

**Independent Test**: POST `/admin/api-keys` with `label="Acme
Uploader"` returns 201 + `ApiKeyWithRawSecretSchema` whose `rawKey`
starts with `ksk_live_`; the database row's `key_hash` is a 64-hex
string and `key_prefix` matches the first 17 chars of the raw key.

**Acceptance Scenarios**:

1. **Given** an `administrator` user and a non-empty label, **When**
   POST `/admin/api-keys` is called, **Then** the response is 201,
   `rawKey` is returned once, and an `api_key_changed` audit event
   with `action=create, severity=info` is recorded.
2. **Given** a label longer than 120 characters, **When** POST
   `/admin/api-keys` is called, **Then** the response is 400 with
   `title_too_long`.
3. **Given** an empty label, **When** POST `/admin/api-keys` is
   called, **Then** the response is 400 with `title_required`.
4. **Given** a `content_manager` user, **When** POST
   `/admin/api-keys` is called, **Then** the response is 403.
5. **Given** the newly returned `rawKey`, **When** the operator
   stores it, **Then** the value cannot be retrieved again (the
   server only stores the hash).

### User Story 2 — Rotate, revoke, delete an API key (Priority: P1)

The administrator can rotate a key (in-place: same `id`, new
secret, `last_rotated_at=now`), revoke it (`is_active=false`,
`revoked_at=now`; idempotent; emits one audit event on the
transition), or hard-delete it (only after revocation; emits
`api_key_changed` with `action=delete`).

**Why this priority**: keys leak; the admin must be able to
contain the blast radius.

**Independent Test**: POST `/admin/api-keys/{id}/rotate` returns a
new `rawKey`; subsequent `GET /admin/api-keys` shows the same `id`
with a new `last_rotated_at`.

**Acceptance Scenarios**:

1. **Given** an active key, **When** POST
   `/admin/api-keys/{id}/rotate` is called, **Then** the response is
   200 with a fresh `rawKey` and an `api_key_changed` event with
   `action=rotate, severity=info`.
2. **Given** an active key, **When** DELETE
   `/admin/api-keys/{id}` is called, **Then** the response is 204,
   `is_active=false`, `revoked_at=now`, and one
   `api_key_changed` event with `action=revoke, severity=warning`.
3. **Given** an already-revoked key, **When** DELETE
   `/admin/api-keys/{id}` is called a second time, **Then** the
   response is 204 and no second audit event is recorded.
4. **Given** an active key, **When** POST
   `/admin/api-keys/{id}/delete` is called, **Then** the response
   is 409 with `api_key_not_revoked`.
5. **Given** a revoked key, **When** POST
   `/admin/api-keys/{id}/delete` is called, **Then** the response
   is 204, the row is hard-deleted, and an `api_key_changed` event
   with `action=delete, severity=warning` is recorded (the audit
   trail outlives the row because `display_events.entity_id` is not
   a FK).

### User Story 3 — Public content upload (Priority: P1)

A third-party system (e.g. an event photo booth) uploads a content
item to the kiosk by POSTing to
`/api/public/content/upload` with a multipart body
(`file`, `title`) and `Authorization: Bearer ksk_live_<8 chars><32
bytes>`. The backend validates the key, creates a
`top_content_items` row (silently ignoring `isFixed` /
`recurringEveryXIterations` per spec 007), updates the key's
`last_used_at` on 201, and does NOT update it on 4xx.

**Why this priority**: enables the kiosk to ingest content from
external systems without exposing the admin surface.

**Independent Test**: a 201 round-trip with a 1 KB JPEG and a
valid key sets `last_used_at`; the same call with an invalid key
returns 401 and does not touch `last_used_at`.

**Acceptance Scenarios**:

1. **Given** a valid `Authorization: Bearer <key>` and a JPEG
   under 25 MB, **When** POST `/api/public/content/upload` is
   called, **Then** the response is 201 + `ContentItemSchema` and
   `last_used_at` is updated.
2. **Given** no `Authorization` header, **When** POST
   `/api/public/content/upload` is called, **Then** the response is
   401 with `missing_api_key`.
3. **Given** an `Authorization: Basic <...>` header, **When** POST
   `/api/public/content/upload` is called, **Then** the response is
   401 with `invalid_authorization_scheme`.
4. **Given** a key with unknown prefix, **When** POST
   `/api/public/content/upload` is called, **Then** the response is
   401 with `invalid_api_key`.
5. **Given** a key with `is_active=false`, **When** POST
   `/api/public/content/upload` is called, **Then** the response is
   403 with `inactive_api_key`.
6. **Given** a 30 MB JPEG, **When** POST is called, **Then** the
   response is 413 with `media_too_large`.
7. **Given** a `text/plain` upload, **When** POST is called,
   **Then** the response is 415 with `unsupported_media_type`.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST persist API keys in `api_keys` with
  the documented columns and two CHECK constraints on
  `key_hash` (sha256 hex) and `key_prefix` (`^ksk_live_[A-Za-z0-9_-]{8}$`).
- **FR-002**: The system MUST generate keys with a 32-byte random
  secret, store only the hash, and return the raw value once on
  create / rotate.
- **FR-003**: The system MUST expose `GET /admin/api-keys`,
  `POST /admin/api-keys`, `POST /admin/api-keys/{id}/rotate`,
  `DELETE /admin/api-keys/{id}` (revoke), and
  `POST /admin/api-keys/{id}/delete` (hard-delete), all gated by
  `ADMIN_ROLES`.
- **FR-004**: Every mutation on an API key MUST record an
  `api_key_changed` audit event with the action
  (`create` / `rotate` / `revoke` / `delete`) and the key label;
  the revoke call MUST be idempotent (no second event).
- **FR-005**: The system MUST authenticate
  `POST /api/public/content/upload` via
  `Authorization: Bearer <key>` and return 401 with
  `missing_api_key` / `invalid_authorization_scheme` /
  `invalid_api_key` (each a distinct code).
- **FR-006**: The public upload endpoint MUST update
  `last_used_at` on 201 and MUST NOT update it on 4xx.
- **FR-007**: The public upload endpoint MUST silently ignore
  `isFixed` and `recurringEveryXIterations` (per spec 007): the
  resulting row has `is_fixed=false, recurring_every_x_iterations=null`
  regardless of input.
- **FR-008**: The public upload endpoint MUST return 413 on
  `media_too_large`, 415 on `unsupported_media_type`, 400 on
  `file_required` / `file_empty` / `title_required` /
  `title_too_long`.
- **FR-009**: The frontend MUST expose the API keys admin page at
  `/admin/api-keys` with a list, a "New key" dialog (one-shot raw
  reveal), rotate, revoke, and delete actions.
- **FR-010**: The "New key" dialog MUST block Escape and
  click-outside while the raw key is on screen; copy + done
  actions.

### Key Entities

- **ApiKey**: `id`, `organization_id`, `label`, `key_prefix`
  (UNIQUE), `key_hash` (sha256 hex), `is_active`, `last_used_at`,
  `last_rotated_at`, `revoked_at`, `created_by_user_id`, timestamps.

## Success Criteria

- **SC-001**: An admin can create, rotate, revoke, and delete a
  key with the documented audit trail in under 5 interactions.
- **SC-002**: The public upload endpoint handles 10 RPS per
  organization with p95 < 250 ms on the local lab.
- **SC-003**: The raw key value is never persisted server-side;
  the only artefact is the sha256 hash.

## Assumptions

- API keys are scoped to one organization; cross-org access is
  impossible because the `key_prefix` lookup is org-bound.
- The bearer key never expires on its own; rotation or revoke are
  the only deactivation paths.

## Supersedes

None.

## Superseded by

None yet.
