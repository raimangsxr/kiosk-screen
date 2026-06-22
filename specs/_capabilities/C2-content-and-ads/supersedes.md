# Supersedes: C2-content-and-ads

Cross-spec amendments within the C2 capability.

| From | To | Amendment |
|---|---|---|
| 003 | 016 | `embedded_web` content type removed; iframes become a separate entity. |
| 003 | 013 | `label` column dropped; auto-incremental `displayOrder`; drag-and-drop reorder. |
| 003 | 014 | `Client` entity hard-deleted; `advertiser` free-text replaces client picker. |
| 009 | 016 | Public endpoint never accepts `embedded_web`. |
| 009 | 018 | Public endpoint silently ignores `isFixed` and `recurringEveryXIterations`. |
| 009 | 012 | `DELETE` for revoked API keys (C6 surface; the key authenticates public C2 uploads). |