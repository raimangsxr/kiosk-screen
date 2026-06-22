# Supersedes: 003-admin-media-uploads

This document records the cross-spec amendments that 013 introduces
against the approved 003 spec. 013 dropped the redundant `label`
field from ads, made `displayOrder` auto-incremental, and added
drag-and-drop reorder.

## Amendments

### A-901 — `client_ad_items.label` column dropped

- **Amends**: 003 `US1` acceptance scenarios that referenced a
  `label` field on ads.
- **Replaced by**: 013 `US1` Acceptance Scenarios 1-4. The
  `label` column is removed by migration
  `0006_drop_client_ad_items_label.py`. The ad form no longer asks
  for `label`; the ad list does not show a `label` column.

> Note: 003's `label` referred to a redundant secondary text that
> ads had alongside their client (per 013 clarification Q1). 003's
> `title` on Content is unrelated and kept.

### A-902 — Auto-incremental `displayOrder` on create and upload

- **Amends**: 003's assumption that `displayOrder` is a manual
  integer entered by the operator.
- **Replaced by**: 013 clarification Q2 + Q3. On create and upload,
  if the request omits `displayOrder`, the server computes
  `max(existing display_order) + 1` within a per-organization
  Postgres advisory lock. If the request includes `displayOrder`,
  the server uses it (backward compat with the PUT path).

### A-903 — Drag-and-drop reorder endpoints

- **Amends**: 003's lack of bulk-reorder endpoints.
- **Replaced by**: 013 `US2` Acceptance Scenarios plus
  `POST /api/ads/reorder` and `POST /api/content/reorder`. Both
  take `{ "orderedIds": ["id1", "id2", ...] }` and renumber
  `display_order` per the new list. The endpoint uses a
  per-organization advisory lock to serialize concurrent reorders
  (last-write-wins).

## Why not edit 003 in place

Constitution v2.0.0 Principle VI declares approved specs
append-only. 003 is approved. 013 owns the new column rules and the
reorder endpoints.

## Cross-references

- 013 spec directory:
  `specs/_archive/C3-admin-shell/010-admin-polish-bundle/013-drop-label-display-order-drag-drop/`
- 003 spec directory:
  `specs/_archive/C2-content-and-ads/003-admin-media-uploads/`
- 003 also superseded by 016 (drop `embedded_web`):
  `specs/_archive/C2-content-and-ads/003-admin-media-uploads/spec.md`
  `## Superseded by` block.
- 013 is part of the `010-admin-polish-bundle` consolidation
  (`_consolidation.md` in the parent folder).