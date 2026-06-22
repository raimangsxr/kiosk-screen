# Status: 010-setup-check-relabel-wire-rules

**Capability**: C3-admin-shell (with cross-capability in C4-configuration-and-setup)
**Closed on**: 2026-06-22 (commit `sdd-optimization-bundle`)
**Branch**: `010-admin-cleanup-and-polish`
**Shipped via**: PR #9

The "Readiness" feature was renamed to "Setup check" in the user-visible
surface (sidenav, dashboard button, page title, copy, README, smoke
script). The two previously empty readiness rules are now wired:
`unapproved_embedded_domains` and `invalid_sources`. Internal names
(`readiness*`, `ReadinessService`) are unchanged; the rename is
user-facing only.

**Note**: 010 is part of the `010-admin-polish-bundle` consolidation
(see `_consolidation.md` in the parent folder).