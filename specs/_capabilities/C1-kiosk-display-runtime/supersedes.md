# Supersedes: C1-kiosk-display-runtime

Cross-spec amendments within the C1 capability. The capability
overview + canonical spec (`019-display-control-canonical`, Phase 6)
are the entry point; this file lists the in-corpus amendments that
moved between specs.

| From | To | Amendment |
|---|---|---|
| 002 | 005, 018 | Rotation timing and 4fr/1fr layout are still authoritative; 005 refactored the admin shell around them; 018 fixes rotation bugs. |
| 003 | 016 | `embedded_web` content type removed; iframes become a separate entity. |
| 006 | 015, 016, 017, 018, 019 | `display_control_state` is extended by 015 (UI rewrite), 016 (`selectedIframeId` replaces `selectedContentId`), 017 (branding overlay integration), 018 (pause/resume/fixed + new contentMode + new navigation commands), 019 (canonical anchor, Phase 6). |
| 016 | 003 | Supersedes the `embedded_web` content type and `ApprovedEmbeddedDomain` table. Detail: `specs/016/supersedes-003.md`. |
| 017 | 018 | Supersedes `017 US2 AS-5` (branding overlay hidden in iframe mode) and `017 T031`. Detail: `specs/018/supersedes-017.md`. |
| 018 | 019 | When 018 closes and 019 lands, 019 becomes the canonical anchor for `display_control_state` and the four amendments. |