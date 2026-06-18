# Backend Application Boundary

Application services coordinate use cases and preserve business rules outside FastAPI route handlers.

- `display` owns opening and reading the effective kiosk display state.
- `display_control` owns session-scoped remote control decisions for the active display session, including iframe eligibility, ads visibility, default state creation, and operational events for invalid or denied control changes.
- Route handlers should keep authorization and HTTP mapping thin, then delegate display behavior to these application services.
