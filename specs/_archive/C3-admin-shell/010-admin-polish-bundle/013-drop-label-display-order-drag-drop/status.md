# Status: 013-drop-label-display-order-drag-drop

**Capability**: C2-content-and-ads
**Closed on**: 2026-06-22 (commit `sdd-optimization-bundle`)
**Branch**: `010-admin-cleanup-and-polish`
**Shipped via**: PR #9

Migration `0006_drop_client_ad_items_label.py` drops the
`client_ad_items.label` column. New uploads get auto-incremental
`displayOrder` (per-org advisory lock). The list component supports
drag-and-drop reorder via `POST /api/ads/reorder` and
`POST /api/content/reorder` (multi-select with `mat-checkbox`).

**Note**: 013 is part of the `010-admin-polish-bundle` consolidation.