# Supersedes: 017-event-branding

This document records the cross-spec amendments that 018 introduces
against the approved 017 spec. Each amendment produces a one-line
footer in the amended spec (`017/spec.md`, `017/tasks.md`) and a row
in this file.

## Amendments

### A-001 — Branding overlay hidden in iframe mode

- **Amends**: `017 US2` Acceptance Scenario 5 (`017/spec.md:59`)
- **Replaced by**: `018 US2 AS-1` and `018 US2 AS-2` (`018/spec.md`)
  plus `018 FR-006` (`018/spec.md`).
- **Effective behavior**: when `contentMode === 'iframe'`, the
  `branding-overlay` is not rendered in the DOM. The guard is
  `*ngIf="hasBranding() && !iframeUrl()"` in
  `frontend/src/app/display/display-screen.component.ts:69`.
- **Test impact**: `017 T031` is replaced by `018` tests TBD in the
  iframe-mode test class.

### A-002 — T031 iframe-mode test obsolete

- **Amends**: `017 T031` (`017/tasks.md:105`) — "Iframe-mode test: with
  branding configured, set the kiosk to iframe mode (mock the display
  state). The overlay is still rendered."
- **Replaced by**: no test in 017; 018 owns the equivalent coverage
  (US2 AS-2: "the `branding-overlay` no aparece en el DOM").
- **Action**: 017 T031 is marked OBSOLETE in `017/tasks.md:105` (the
  strikethrough already in place is preserved as historical record).

## Why not edit 017 in place

Constitution v2.0.0 Principle VI (Supersession and Archival) declares
that approved specs are append-only. The 017 spec is approved and the
two amended items are now governed by 018. The amended 017 keeps its
strikethrough annotations as a historical record and gains a one-line
footer:

```
> Superseded by: 018-content-rotation-modes (US2)
```

## Cross-references

- 017 spec directory: `specs/017-event-branding/`
- 018 spec directory: `specs/018-content-rotation-modes/`
- Canonical display-control anchor (Phase 6):
  `specs/019-display-control-canonical/`
- Phase 6 of the SDD optimization plan:
  `sdd-optimization/08-refactoring-roadmap.md`
