# CHG-044 Implementation Plan

## Backend

- Alembic `0023`: add `iframes.scale_x/y`; drop density tables/columns.
- Remove `display_layout` module; add `iframe_runtime.refresh_active_iframe_display`.
- Extend iframe schemas/service; `GET /api/admin/display/kiosks/live` on display stream admin router.

## Frontend

- Iframe form: `scaleX`/`scaleY` fields.
- `display-screen`: CSS scale host; `DisplayLabelService` for kiosk label.
- Remove display-layout feature, density panel, embed defaults in display config.
- Dashboard live kiosks via `LiveKiosksApiService`.

## SDD

- Update active contracts (`IFRAMES.VIDEO_END`, `DISPLAY.RUNTIME`, `DISPLAY.CONFIG_SESSION`, `DISPLAY.EVENTS.AUDIT`).
- ADR-0012 supersedes ADR-0010/0011.

## Validation

```sh
pytest backend/tests
npm --prefix frontend run test
npm --prefix frontend run build
```
