# Contract Change Log

This log records intentional user-facing UI, API, error, and migration contract changes for the administration refactor.

| Contract | Status | Compatibility / Migration Note | Validation |
|----------|--------|---------------------------------|------------|
| Hall navigation | Pending | Must preserve hall as the authenticated decision point. | `validation/admin-navigation.md` |
| Admin workflows | Pending | Changed layouts or field groupings must preserve approved setup goals. | `validation/admin-workflows.md` |
| Backend API/error envelope | Pending | Changed payloads or safe errors must be documented against OpenAPI. | `validation/backend-contracts.md` |
| Display state | Preserved | Kiosk rotation, ordering, timing, animation, and Escape behavior remain compatible. T091 moved handlers to `backend/app/api/v1/display/routes.py` and T092 moved business behavior to `backend/app/application/display/service.py`, but the `DisplayState` payload fields, error envelope, and authorization intent are unchanged. The v1 `schemas.py` re-exports the original `DisplayStateSchema`/`KioskConfigurationSchema`/`KioskConfigurationRequest` symbols under the historical `DisplayStateRead`/`KioskConfigurationRead`/`KioskConfigurationUpdate` aliases to preserve the original import surface. Frontend `display-screen.component` still consumes `DisplayApiService` with the same `openDisplay()` and `getState()` contract. Frontend rotation regression tests now cover `effectiveDurationSeconds` precedence, `inlineAdCount` slot rotation, and Escape listener cleanup on destroy. | `validation/kiosk-regression.md`, `backend/tests/contract/test_v1_display_contract.py`, `backend/tests/unit/test_display_application_service.py`, `frontend/src/app/display/display-screen.component.spec.ts`, `frontend/src/app/display/display-rotation.service.spec.ts` |
| Data migration | Pending | T108 records Path A or Path B before affected implementation continues. | `validation/migration-validation.md` |
