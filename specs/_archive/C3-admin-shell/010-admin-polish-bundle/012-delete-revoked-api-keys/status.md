# Status: 012-delete-revoked-api-keys

**Capability**: C6-public-api-and-keys
**Closed on**: 2026-06-22 (commit `sdd-optimization-bundle`)
**Branch**: `010-admin-cleanup-and-polish`
**Shipped via**: PR #9

`POST /api/admin/api-keys/{id}/delete` deletes a revoked key (409 if
still active). The existing `DELETE /api/admin/api-keys/{id}` endpoint
remains the contract-pinned revoke endpoint. Audit event
`api_key_changed` is extended with action `delete`.

**Note**: 012 is part of the `010-admin-polish-bundle` consolidation.