# Supersedes: 006-remote-control-display

This document records the cross-spec amendment that 010 introduces
against the approved 006 spec. 010 wires two previously-empty readiness
rules that gate kiosk open, plus relabels the user-visible "Readiness"
to "Setup check".

## Amendments

### A-601 — Setup check gates kiosk open on unapproved iframe hosts

- **Amends**: 006's implicit assumption that all configured iframe
  hosts are pre-approved (no readiness check on the iframe-host list).
- **Replaced by**: 010 `US2` Acceptance Scenarios 1-2. The
  `unapproved_embedded_domains` readiness rule reports a blocker for
  every active iframe content item whose URL host is not in the
  organization's approved-domains list. The blocker includes a one-click
  deep-link to `/admin/domains`.

> Note: 016 removed the iframe-domain approval system entirely
> (`ApprovedEmbeddedDomain` table, `/admin/domains`, the
> `unapproved_embedded_domains` readiness rule). This 010 amendment
> is therefore effectively obsolete from 016 onward; see
> `specs/016/supersedes-003.md` A-102. The wiring work that 010 did
> remains in `readiness_service.py` but evaluates against an empty
> approved-domains set.

### A-602 — Setup check reports missing media files

- **Amends**: 006's implicit assumption that uploaded media files are
  always present.
- **Replaced by**: 010 `US3`. The `invalid_sources` readiness rule
  reports a warning for every active content or ad item whose
  `media_file_id` references a file no longer present on disk. The
  warning text is `Source may be unavailable: <title>`. Filesystem
  errors while resolving a single path are caught and reported as
  `Source for "<title>" could not be verified.`

### A-603 — User-visible relabel "Readiness" → "Setup check"

- **Amends**: 006's `KioskConfiguration.Readiness` references and
  the user-visible surface (sidenav, dashboard button, page title,
  README, smoke script).
- **Replaced by**: 010 `US1`. Internal names (`readiness*`,
  `ReadinessService`, `/api/readiness`) are unchanged; only the
  user-visible copy changes.

## Why not edit 006 in place

Constitution v2.0.0 Principle VI declares approved specs
append-only. 006 is approved. 010 owns the wiring of the readiness
rules and the relabel. The amendment record lives here.

## Cross-references

- 010 spec directory:
  `specs/_archive/C3-admin-shell/010-admin-polish-bundle/010-setup-check-relabel-wire-rules/`
- 006 spec directory:
  `specs/_archive/C1-kiosk-display-runtime/006-remote-control-display/`
- 010 is part of the `010-admin-polish-bundle` consolidation
  (`_consolidation.md` in the parent folder).
- 016 amendment that supersedes A-601:
  `specs/016/supersedes-003.md`