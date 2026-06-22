# Capability: C5-remote-control

The remote-control page: an operator's "second screen" that selects
kiosk content mode (rotation / iframe / fixed), shows or hides ads,
and applies configuration hot. The `display_control_state` table is
the canonical server-side state.

## What this capability is

Owns the operator-facing controls that drive the kiosk from a
separate device. Includes the `display_control_state` schema, the
remote-control page UI, the navigation commands
(`next`/`previous`/`pause`/`resume`), and the fixed-content selection
for `contentMode='fixed'`.

## Owning code

- `frontend/src/app/features/remote-control/` — `remote-control.component.ts`,
  `remote-control.facade.ts`, `remote-control.models.ts`,
  `remote-control.api.ts`
- `backend/app/application/display_control/service.py`
- `backend/app/repositories/models/display_control_state.py`
- `backend/app/api/display.py` (`/api/display/remote-control/*`)
- `backend/app/domain/display_events.py`

## Living specs

- Active: `specs/016-…`, `specs/017-…`, `specs/018-…` (all touch C5)
- Archived: `specs/_archive/C1-…/006-…`, `…/015-…` (C5 in path)

## Stable contracts

- `GET /api/display/state` — kiosk polling endpoint (also serves
  remote control).
- `PUT /api/display/remote-control` — set content mode
  (`loop` | `iframe` | `fixed`).
- `POST /api/display/remote-control/navigation` — operator commands
  (`next`, `previous`, `pause`, `resume`).
- `display_control_state` table — `contentMode`, `selectedIframeId`,
  `selectedFixedContentId`, `adsVisible`, `navigationCommandId`.

## Cross-capability surfaces

- Branding overlay (C7) is hidden in iframe mode (018 supersedes
  017 US2).
- `selectedFixedContentId` references `top_content_items` (C2).
- `display_control_state` is read by the kiosk polling (C1).

## Recent amendments

- `018-content-rotation-modes` (US3) — pause / resume.
- `018-content-rotation-modes` (US5) — new `fixed` mode + new
  `pause`/`resume` navigation commands.
- `017-event-branding` (US2) — branding overlay integration (018
  hides the overlay in iframe mode).
- `016-preconfigured-iframes-and-video-end` (US1, US3) — preconfigured
  iframes and iframe options in remote control.
- `015-remote-control-polish` — Material 3 page rewrite; design
  source for the current UI.
- `006-remote-control-display` — foundational remote control.

## See also

- `sdd-optimization/05-capability-map-from-code.md`
- `specs/019-display-control-canonical/` — Phase 6 canonical anchor
  for `display_control_state` and the four amendments (006, 016,
  017, 018). Start here.
