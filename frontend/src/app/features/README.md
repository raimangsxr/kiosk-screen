# Frontend Features Boundary

Feature folders own capability screens, facades, models, and API adapters for administration workflows.

- `hall` owns the authenticated entry point for operator and administrator workflows.
- `remote-control` owns the administrator-facing kiosk control surface. It may call display remote-control APIs through its feature API adapter, but fullscreen kiosk rendering remains under `src/app/display`.
- `display-config` owns persisted display configuration, including the remote control polling interval that the running display hot-applies.
