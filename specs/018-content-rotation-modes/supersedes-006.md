# Supersedes: 006-remote-control-display

This document records the cross-spec amendments that 018 introduces
against the approved 006 spec. 006 is the foundational spec for the
`display_control_state` schema and the remote-control surface; 018
amends it in three places: the content-mode enum, the
navigation-command enum, and the audit-event taxonomy.

## Amendments

### A-301 — `contentMode` extended with `fixed`

- **Amends**: 006 `contentMode ∈ {loop, iframe}` enum
  (006/contracts/backend-contract.md, 006/data-model.md).
- **Replaced by**: `018 US5` Acceptance Scenarios 1-5 plus 018
  `FR-018`..`FR-024`.
- **Effective behavior**: `contentMode ∈ {loop, iframe, fixed}`.
  When `contentMode='fixed'`, `selectedFixedContentId` is non-null
  and references a `TopContentItem` with `is_fixed=true`. The
  `KioskRotationController` pins to that item; on `ended` for a
  video, the controller restarts the video in a loop.
- **Test impact**: 006's contentMode tests remain for `{loop,iframe}`;
  018 owns the `fixed` mode tests.

### A-302 — `navigationCommand` extended with `pause`/`resume`

- **Amends**: 006 `navigationCommand ∈ {next, previous}` enum
  (006/data-model.md, 006/contracts/backend-contract.md).
- **Replaced by**: 018 `US3` Acceptance Scenarios 1-5 plus 018
  `FR-006`, `FR-009`..`FR-012a`.
- **Effective behavior**: `navigationCommand ∈ {next, previous, pause,
  resume}`. `pause` and `resume` are valid in `loop` only; the backend
  returns HTTP 409 outside `loop`. Pause state is local to `loop`
  and is discarded on exit.
- **Test impact**: 006's `next`/`previous` tests remain. 018 owns the
  `pause`/`resume` tests in
  `backend/tests/unit/test_display_control_service_pause_resume.py`.

### A-303 — `selectedFixedContentId` column added

- **Amends**: 006 `display_control_states` table — adds a new
  nullable column `selected_fixed_content_id` referencing
  `top_content_items.id` with `ON DELETE SET NULL`.
- **Replaced by**: 018 `FR-020` plus the new CHECK constraint
  `ck_display_control_fixed_has_target`
  (`selected_fixed_content_id IS NOT NULL OR content_mode != 'fixed'`).
- **Effective behavior**: column exists in migration
  `0012_content_rotation_modes.py`; FK constraint enforces referential
  integrity.

### A-304 — Audit events added

- **Amends**: 006 `display_control_changed` audit event
  (006/contracts/backend-contract.md).
- **Replaced by**: 018 adds five new audit events:
  `display_control_paused`, `display_control_resumed`,
  `display_control_fixed_changed`, `content_rotation_empty`,
  `content_type_autodetected`. Detail in 018 `FR-016`..`FR-019` and in
  the canonical contract at
  `specs/019-display-control-canonical/contracts/audit-display-events.md`.

### A-305 — Content-mode transitions: ad-band orthogonality

- **Amends**: 006 implicit assumption that the ad-band pauses when
  the content-mode is not `loop`.
- **Replaced by**: 018 `FR-008b`: the ad-band keeps rotating in
  `loop`, `iframe`, and `fixed`. The only way to hide ads is
  `adsVisible=false` from the remote control.

### A-306 — Rotation cursor and recurring content cadence

- **Amends**: 006's framing of the rotation cursor as part of the
  kiosk display lifecycle.
- **Replaced by**: 018 `FR-015` (recurring content cadence pauses
  outside `loop`), `FR-021` (fixed mode preserves the loop index on
  exit), and the `KioskRotationController` Angular service that
  owns the cursor client-side.

## Why not edit 006 in place

Constitution v2.0.0 Principle VI (Supersession and Archival) declares
approved specs append-only. The 006 spec is approved; the runtime
behavior is now governed by 018 (and by 019 as the canonical anchor
of the four-amendment chain).

## Canonical anchor

When 018 closes, the canonical reference for the consolidated
`display_control_state` amendments becomes
`specs/019-display-control-canonical/spec.md` (Phase 6). 019's
`## Supersedes` block names 006, 015, 016, 017, 018. This file
remains the source-of-truth amendment record from 018's perspective.

## Cross-references

- 006 spec directory:
  `specs/_archive/C1-kiosk-display-runtime/006-remote-control-display/`
- 018 spec directory: `specs/018-content-rotation-modes/`
- 019 canonical anchor: `specs/019-display-control-canonical/`
- Phase 6 of the SDD optimization plan:
  `sdd-optimization/08-refactoring-roadmap.md`