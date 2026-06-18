# Contract Change Log

This log records intentional user-facing UI, API, error, and migration contract changes for the administration refactor.

| Contract | Status | Compatibility / Migration Note | Validation |
|----------|--------|---------------------------------|------------|
| Hall navigation | Pending | Must preserve hall as the authenticated decision point. | `validation/admin-navigation.md` |
| Admin workflows | Pending | Changed layouts or field groupings must preserve approved setup goals. | `validation/admin-workflows.md` |
| Backend API/error envelope | Pending | Changed payloads or safe errors must be documented against OpenAPI. | `validation/backend-contracts.md` |
| Display state | Pending | Kiosk rotation, ordering, timing, animation, and Escape behavior must remain compatible. | `validation/kiosk-regression.md` |
| Data migration | Pending | T108 records Path A or Path B before affected implementation continues. | `validation/migration-validation.md` |
