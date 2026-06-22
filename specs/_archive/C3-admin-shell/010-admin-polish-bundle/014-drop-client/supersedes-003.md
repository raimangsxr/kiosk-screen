# Supersedes: 003-admin-media-uploads

This document records the cross-spec amendment that 014 introduces
against the approved 003 spec. 014 hard-deletes the `Client` entity
end-to-end.

## Amendments

### A-1001 — `clients` table hard-deleted

- **Amends**: 003 `US3` ("Manage Client Ads") and the underlying
  `clients` table + `client_ad_items.client_id` FK.
- **Replaced by**: 014 `US1`..`US3` Acceptance Scenarios plus
  migration `0007_drop_client_concept.py`. The migration drops the
  `clients` table and the `client_id` FK on `client_ad_items` in a
  single transaction. Existing ad rows are migrated with
  `advertiser = <previous client name>`; if the lookup fails,
  `advertiser = NULL`.

### A-1002 — Free-text `advertiser` replaces client picker

- **Amends**: 003's `Ad.clientId` relationship.
- **Replaced by**: 014 `US2` Acceptance Scenarios plus the new
  `advertiser TEXT` column on `client_ad_items`. The ad form renders
  a plain `<input type="text">` (optional). The ad list shows an
  "Advertiser" column with a dash when empty.

### A-1003 — Sidenav entry and quick action removed

- **Amends**: 003's implicit admin navigation entry "Clients".
- **Replaced by**: 014 `US1` clarification Q4. The
  `AdminNavigationService.items` and `.quickActions` lists drop the
  "Clients" entry and the "Add client" quick action.

### A-1004 — User-visible terminology

- **Amends**: 003's user-visible use of "Client" / "Sponsor".
- **Replaced by**: 014 clarification Q3. The sidenav, form labels,
  list columns, and error messages say "Advertiser" (not "Client"
  or "Sponsor"). The database column, Pydantic field, SQLAlchemy
  model field, and migration column remain named `advertiser`.

## Why not edit 003 in place

Constitution v2.0.0 Principle VI declares approved specs
append-only. 003 is approved. 014 owns the hard-delete semantics.

## Cross-references

- 014 spec directory:
  `specs/_archive/C3-admin-shell/010-admin-polish-bundle/014-drop-client/`
- 003 spec directory:
  `specs/_archive/C2-content-and-ads/003-admin-media-uploads/`
- 003 also superseded by 016 (drop `embedded_web`) and 013 (drop
  `label`, drag-and-drop reorder). See 003's `## Superseded by`
  block in `spec.md`.
- 014 is part of the `010-admin-polish-bundle` consolidation
  (`_consolidation.md` in the parent folder).