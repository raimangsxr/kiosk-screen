# Status: 014-drop-client

**Capability**: C2-content-and-ads
**Closed on**: 2026-06-22 (commit `sdd-optimization-bundle`)
**Branch**: `010-admin-cleanup-and-polish`
**Shipped via**: PR #9

Migration `0007_drop_client_concept.py` drops the `clients` table and
the `client_id` FK on `client_ad_items`. Replaced with a free-form
`advertiser` text column. Pre-existing ad rows are migrated with
`advertiser = <previous client name>`. Sidenav removes the "Clients"
entry.

**Note**: 014 is part of the `010-admin-polish-bundle` consolidation.