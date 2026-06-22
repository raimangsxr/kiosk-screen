# Capability: C6-public-api-and-keys

The public REST API for content upload and the API key model that
authenticates it. Browser cross-origin access is opt-in per deploy.

## What this capability is

Owns the integration surface that lets external systems push content
to a kiosk without operator intervention. Includes the API key model
(`keyHash`, `keyPrefix`, `lastUsedAt`, `revokedAt`, `lastRotatedAt`),
the admin-side key management UI, and the public upload endpoint.

## Owning code

- `backend/app/api/v1/api_keys/`
- `backend/app/api/v1/public_content/`
- `backend/app/services/api_key_service.py`
- `backend/app/repositories/models/api_key.py`
- `backend/app/repositories/api_keys.py`
- `frontend/src/app/features/api-keys/`
- `frontend/src/app/core/api/api-key.api.ts`

## Living specs

- Active: none right now.
- Archived: `specs/_archive/C2-content-and-ads/009-public-content-api/`,
  `…/012-delete-revoked-api-keys/`

## Stable contracts

- `POST /api/admin/api-keys` — create (raw value returned once).
- `POST /api/admin/api-keys/{id}/rotate` — rotate in place.
- `DELETE /api/admin/api-keys/{id}` — revoke (idempotent 204).
- `POST /api/admin/api-keys/{id}/delete` — hard delete (revoked
  only, 409 if active).
- `GET /api/admin/api-keys` — list (never returns raw value).
- `POST /api/public/content/upload` — photo + video only; silently
  ignores `isFixed` and `recurringEveryXIterations` (018).

## Cross-capability surfaces

- Public upload creates rows in `top_content_items` (C2).
- `api_key_changed` audit event surfaces in the admin event log (C3
  shell wraps the listing).

## Recent amendments

- 018 (US6) — extension-based content-type autodetect on the public
  endpoint; `isFixed` / `recurring` flags silently ignored.
- 012 — `POST /api/admin/api-keys/{id}/delete` (revoked only).

## See also

- `sdd-optimization/05-capability-map-from-code.md`