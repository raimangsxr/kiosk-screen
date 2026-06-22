# Consolidation: 010-admin-polish-bundle

**Capability**: C3-admin-shell
**Closed on**: 2026-06-22 (commit `sdd-optimization-bundle`)
**Branch**: `010-admin-cleanup-and-polish`
**Shipped via**: PR #9 (`8af8015 feat(010): cleanup and polish bundle (#9)`)

The `010-admin-polish-bundle` consolidates five originally separate
spec directories that all shared the same branch and shipped as a
single release. Each original spec is preserved verbatim under this
folder; original spec IDs and task ID ranges are unchanged.

## Original specs

| Original | Directory | Tasks (closed) | Theme |
|---|---|---:|---|
| 010 | `010-setup-check-relabel-wire-rules/` | 28/28 | Renamed "Readiness" to "Setup check"; wired the two previously empty readiness rules (`unapproved_embedded_domains`, `invalid_sources`). |
| 011 | `011-ux-polish/` | 18/18 | Compact dashboard; brand lockup in toolbar; sidenav entry for remote control. |
| 012 | `012-delete-revoked-api-keys/` | 18/18 | `POST /api/admin/api-keys/{id}/delete` for revoked-only deletion; audit event. |
| 013 | `013-drop-label-display-order-drag-drop/` | 28/28 | Dropped the `label` field from ads; auto-incremental `displayOrder`; drag-and-drop reorder. |
| 014 | `014-drop-client/` | 33/33 | Hard-deleted `clients` table; `advertiser` free-text replaces client picker; migration `0007_drop_client_concept.py`. |

## Why bundled

The five specs each represent ≤ 3 user stories, fit in ≤ 400-line
`tasks.md`, and touch the admin shell exclusively. Splitting them into
five sequential PRs was judged unnecessary churn at the time; the team
shipped them as one release.

## Why consolidated in this archive

Constitution v2.0.0 Principle VIII forbids bundles for new features.
The 010-014 release is grandfathered, but its five spec directories
are consolidated here so a single `_consolidation.md` (this file)
explains the relationship. Future agents reading any one of the five
sub-folders land here for context.

## Status file index

This `_consolidation.md` is the entry point. The five `status.md`
files (one per sub-folder) summarize each original spec.

## Task ID mapping

Task IDs in the original 010-014 specs are sequential within each spec
(T001, T002, ...). They were never renumbered when bundled. The git
commit that shipped them (`8af8015`) is the single audit point.