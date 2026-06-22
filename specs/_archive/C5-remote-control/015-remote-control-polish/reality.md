# Reality: 015-remote-control-polish

## Spec vs. reality

The spec at `specs/_archive/C5-remote-control/015-remote-control-polish/spec.md`
describes a Material 3 rewrite of the remote-control page (sticky
toolbar, status pill, mode radio group, snackbar confirmations, mobile
layout). The `tasks.md` is 392 lines, 22 tasks, all unchecked.

The implementation shipped under PR #10
(`66318c6 015 remote control polish (#10)`) on the `main` branch, not
on the `015-remote-control-polish` branch the spec declared. The
implementation was developed against an internal tracking document
(likely a PR description or external checklist); the spec's
`tasks.md` was never updated.

## Commits that shipped the rewrite

| Commit | Subject |
|---|---|
| `302b2bc` | `feat(015): polish /remote-control admin panel` |
| `119ba7d` | `fix(015): remove local toolbar and align with admin shell` |
| `03e6520` | `fix(015): fix radio title/hint spacing and add iframe selected badge` |
| `94835cf` | `docs(015): align spec/plan with admin-shell-owns-navigation design` |
| `d8421a9` | `Several minimun adjustements at header and sidenav` (related polish) |
| `66318c6` | `015 remote control polish (#10)` (merge commit) |

## What was actually built

Looking at the diff in PR #10, the rewrite matches the spec at a high
level (Material 3 card layout, snackbar on action success, mobile-first
breakpoints). The departure from the spec is on the "admin shell owns
the navigation" decision: the spec still describes a "local toolbar"
in US2; commit `119ba7d` removes that local toolbar and the spec was
retrofitted in `94835cf`.

## Why this spec is archived but not authoritative

The remote-control surface is currently governed by:

- 006 (canonical `display_control_states` schema and polling).
- 015 (Material 3 page rewrite; the spec is the historical design doc).
- 016 (preconfigured iframe list, not the dropdown).
- 017 (branding overlay on top region).
- 018 (pause/resume/fixed, new modes and navigation commands).
- 019 (Phase 6 canonical anchor; the `index.specs.md` for C5
  identifies 015 as the design source for the Material 3 page).

Future work on the remote-control page opens a new spec (e.g. 020+)
that cites 015 for visual design and 019 for behavioral rules. 015
itself is closed and not modified.