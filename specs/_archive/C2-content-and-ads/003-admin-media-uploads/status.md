# Status: 003-admin-media-uploads

**Capability**: C2-content-and-ads
**Closed on**: 2026-06-22 (commit `sdd-optimization-bundle`)
**Supersedes**: —
**Superseded by**: 016-preconfigured-iframes-and-video-end (US2 — `embedded_web` content type removed), 013-drop-label-display-order-drag-drop (label column dropped), 014-drop-client (client FK dropped)

The image/video upload pipeline, mime + size validation, and media
storage path are still authoritative. The `embedded_web` content type
and `client_ad_items.label` column are gone; the `client_id` FK is
gone; the rotation overrides pattern is in 013.

**Status file index**: this is the only file an agent needs to read for
this archived spec.