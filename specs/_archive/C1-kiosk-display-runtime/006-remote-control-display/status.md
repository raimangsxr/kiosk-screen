# Status: 006-remote-control-display

**Capability**: C1-kiosk-display-runtime
**Closed on**: 2026-06-22 (commit `sdd-optimization-bundle`)
**Supersedes**: —
**Superseded by**: 015-remote-control-polish (Material 3 remote-control rewrite), 016-preconfigured-iframes-and-video-end (iframe options), 017-event-branding (branding overlay on top region), 018-content-rotation-modes (pause/resume/fixed, contentMode fixed, navigationCommand pause/resume), 019-display-control-canonical (Phase 6, canonical anchor)

The `display_control_states` table, `contentMode ∈ {loop, iframe}` enum,
polling interval, and `selectedIframeId` column are still authoritative
in their pre-amendment form. The display state endpoint
`GET /api/display/state` is the canonical kiosk polling endpoint.

**Status file index**: this is the only file an agent needs to read for
this archived spec.

**Spec declaration drift**: declared branch was `008-remote-control-display`;
canonical name should have been `006-remote-control-display`. Grandfathered.