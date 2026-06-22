# Supersedes: 006-remote-control-display

This document records the cross-spec amendment that 015 introduces
against the approved 006 spec. 015 is a Material 3 redesign of the
remote-control page that 006 originally specified.

## Amendments

### A-501 — Material 3 redesign of `/remote-control`

- **Amends**: 006 `UI Contract` (006/contracts/ui-contract.md) and
  the implementation under
  `frontend/src/app/features/remote-control/`.
- **Replaced by**: 015 `US1`..`US4` — sticky toolbar (later removed
  per commit `119ba7d`), status pill, mode radio group (Rotation /
  Iframe), snackbar confirmations, mobile-first breakpoints.
- **Effective behavior**: the remote-control page renders the
  page header, the status pill, the Rotation/Iframe radio group,
  and the Ads card on any viewport from 360×640 to 1280×800.
  Successful actions show a snackbar with a 3-second auto-dismiss.

### A-502 — Navigation chrome owned by the surrounding admin shell

- **Amends**: 006's implicit assumption that the remote-control page
  renders its own toolbar.
- **Replaced by**: 015 clarification Q5 + commit `119ba7d`. The
  surrounding admin shell (deployed per spec 011) owns navigation.
  The remote-control page is responsible for the page content only
  and does not render a local toolbar, back button, or user menu.

## Reality note

015 was declared for branch `015-remote-control-polish` but shipped
on `main` via PR #10 (`66318c6 015 remote control polish (#10)`). The
spec's `tasks.md` (392 lines, 22 tasks) was never used as the working
checklist; the implementation tracked the four commits listed in
`specs/_archive/C5-remote-control/015-remote-control-polish/reality.md`.

015 is a design source, not a behavior source. The behavioral rules
for display-control are owned by 006 (canonical schema) and amended
by 016, 017, 018, with 019 as the canonical anchor.

## Why this file exists

Per constitution v2.0.0 Principle VI, every cross-spec amendment
creates a `supersedes.md` file. 015 amends 006's UI contract; the
amendment is recorded here so future readers find the chain.

## Cross-references

- 006 spec directory:
  `specs/_archive/C1-kiosk-display-runtime/006-remote-control-display/`
- 015 spec directory:
  `specs/_archive/C5-remote-control/015-remote-control-polish/`
- 015 reality note:
  `specs/_archive/C5-remote-control/015-remote-control-polish/reality.md`
- 019 canonical anchor: `specs/019-display-control-canonical/`