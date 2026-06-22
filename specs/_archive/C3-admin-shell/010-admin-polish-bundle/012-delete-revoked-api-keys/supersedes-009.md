# Supersedes: 009-public-content-api

This document records the cross-spec amendment that 012 introduces
against the approved 009 spec. 012 adds a hard-delete endpoint for
revoked API keys.

## Amendments

### A-801 — Hard-delete endpoint for revoked API keys

- **Amends**: 009's `DELETE /api/admin/api-keys/{id}` endpoint
  (contract-pinned to "revoke (idempotent 204)").
- **Replaced by**: 012 `US1` + `US2` Acceptance Scenarios.
  `POST /api/admin/api-keys/{id}/delete` is a separate endpoint
  that hard-deletes a row whose `is_active = false`. Returns 204 on
  success; returns 409 with code `api_key_not_revoked` if the key
  is still active.

### A-802 — Audit-event action whitelist extended

- **Amends**: 009's `api_key_changed` event payload with action
  whitelist `{"create", "rotate", "revoke"}`.
- **Replaced by**: 012 clarification Q4. The whitelist extends to
  `{"create", "rotate", "revoke", "delete"}`. The `delete` event
  has `severity="warning"` (mirroring `revoke`).
- **Payload**: `{ apiKeyId, action: 'delete', label }` (no secret
  material).

## Why not edit 009 in place

Constitution v2.0.0 Principle VI declares approved specs
append-only. 009 is approved. 012 owns the hard-delete semantics.

The existing `DELETE /api/admin/api-keys/{id}` endpoint remains
contract-pinned to "revoke (idempotent 204)" — see
`specs/009/contracts/api-key-contract.md` lines 119-136 and
`test_public_content_openapi.py:25`. Reusing it for hard-delete
would silently start destroying data on revoke calls.

## Cross-references

- 012 spec directory:
  `specs/_archive/C3-admin-shell/010-admin-polish-bundle/012-delete-revoked-api-keys/`
- 009 spec directory:
  `specs/_archive/C2-content-and-ads/009-public-content-api/`
- 012 is part of the `010-admin-polish-bundle` consolidation
  (`_consolidation.md` in the parent folder).