# Supersedes: C4-configuration-and-setup

Cross-spec amendments within the C4 capability.

| From | To | Amendment |
|---|---|---|
| 002 | 017 | `configured_event_duration_minutes` moved from `kiosk_display_configurations` to `event_configurations`. Migration `0011_event_branding.py`. |
| 003 | 005, 010 | Rotation config endpoints refactored; relabeled "Readiness" to "Setup check" in user-visible copy. |
| 006 | 016 | `videoEndDelaySeconds` knob added (0-30, default 2). |
| 010 | 016 | `unapproved_embedded_domains` readiness rule removed (no embedded domains after 016). |