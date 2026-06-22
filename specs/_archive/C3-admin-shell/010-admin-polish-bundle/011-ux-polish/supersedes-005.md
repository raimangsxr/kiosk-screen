# Supersedes: 005-admin-refactor

This document records the cross-spec amendments that 011 introduces
against the approved 005 spec. 011 is the second admin-shell polish
pass: it builds on 005's Material 3 foundation and adds brand
placement, dashboard density, and remote-control discoverability.

## Amendments

### A-701 — Brand lockup moved from sidenav drawer to toolbar

- **Amends**: 005's `AdminShell` layout — the sidenav drawer
  carried the brand (Kiosk Screen + Administration) and the user
  card.
- **Replaced by**: 011 `US2` Acceptance Scenarios. The brand lockup
  moves to the admin toolbar; the user card is removed from the
  sidenav (it was duplicated in the toolbar's user-menu); the
  sidenav becomes a clean navigation surface.

### A-702 — User-menu avatar re-centered

- **Amends**: 005's `UserMenuComponent` (vertical centering).
- **Replaced by**: 011 `US2` clarification Q3. A single fix in
  `user-menu.component.ts` covers both the admin toolbar and the
  hall toolbar (they share the component).

### A-703 — Dashboard density

- **Amends**: 005's `DashboardComponent` spacing tokens
  (`mat-card` content padding, section margins).
- **Replaced by**: 011 `US3` + clarification Q4. Reduce internal
  gaps, section margins, and `mat-card` content padding by 4-6px
  each. The grid stays the same (1/2/3 columns); only the spacing
  shrinks.

### A-704 — Remote-control discoverability in the sidenav

- **Amends**: 005's sidenav entries (did not include Remote control).
- **Replaced by**: 011 `US1`. The sidenav gains a "Remote control"
  entry that links to `/remote-control` from any admin context. The
  summary line explains that the page switches kiosk content mode
  and ad visibility.

> Note: 015 then redesigned the remote-control page itself (Material
> 3 rewrite, shipped via `main` PR #10). See
> `specs/_archive/C5-remote-control/015-remote-control-polish/supersedes-006.md`.

## Why not edit 005 in place

Constitution v2.0.0 Principle VI declares approved specs
append-only. 005 is approved. 011 owns the polish pass.

## Cross-references

- 011 spec directory:
  `specs/_archive/C3-admin-shell/010-admin-polish-bundle/011-ux-polish/`
- 005 spec directory:
  `specs/_archive/C3-admin-shell/005-admin-refactor/`
- 011 is part of the `010-admin-polish-bundle` consolidation
  (`_consolidation.md` in the parent folder).