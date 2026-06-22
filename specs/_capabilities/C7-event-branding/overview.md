# Capability: C7-event-branding

The event configuration module (organizer name, event name, event
duration, organizer logo) and the kiosk's branding overlay and
"Patrocinadores del evento" ads section title.

## What this capability is

Owns the event identity displayed on the kiosk. Includes the
`event_configurations` table, the `event-branding.service.ts` poll,
the kiosk overlay component, and the hardcoded "Patrocinadores del
evento" label in the ads region.

## Owning code

- `backend/app/repositories/models/event_configuration.py`
- `backend/app/services/event_configuration_service.py`
- `backend/app/api/event_configuration.py`, `event_branding.py`
- `frontend/src/app/core/event-branding.service.ts`,
  `core/api/event-branding.api.ts`
- `frontend/src/app/features/event-config/`
- `frontend/src/app/display/display-screen.component.ts:69-89` (overlay
  rendering)
- `frontend/src/app/display/display-screen.component.ts:92`
  (sponsor title)

## Living specs

- Active: `specs/017-event-branding/`
- 018 supersedes 017 US2 (overlay hidden in iframe mode).

## Stable contracts

- `PUT /api/event-configuration` (multipart) — event name, organizer
  name, event duration, logo (017).
- `GET /api/event-configuration` (admin) — current row.
- `GET /api/event-branding` (public) — `eventName`, `organizerName`,
  `organizerLogoUrl` for kiosk consumption.
- `event_configuration_changed` audit event.

## Cross-capability surfaces

- Branding overlay is rendered by `display-screen.component.ts` (C1).
- Stale-while-error on `GET /api/event-branding` is documented in
  017 (the kiosk keeps the last good value).

## Recent amendments

- 018 US2 — branding overlay hidden in iframe mode
  (`hasBranding() && !iframeUrl()` guard).

## See also

- `sdd-optimization/05-capability-map-from-code.md`