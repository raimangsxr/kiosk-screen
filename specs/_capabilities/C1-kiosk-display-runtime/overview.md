# Capability: C1-kiosk-display-runtime

The display runtime that shows the kiosk's top region (content
rotation) and bottom region (ads rotation) on a 4fr/1fr grid, plus
the state that drives the kiosk's polling and rotation cursor.

## What this capability is

Owns the kiosk's display lifecycle: how it opens, what it shows, how
it advances through content, and how it is configured. Includes the
`display_control_state` schema, the rotation cursor, the kiosk polling
endpoint, the content-type autodetect, and the client-side
`KioskRotationController`.

## Owning code

- `frontend/src/app/display/` — `display-screen.component.ts`,
  `display-rotation.service.ts`, `display-api.service.ts`,
  `kiosk-rotation.controller.ts`
- `backend/app/services/display_service.py`,
  `backend/app/application/display_control/service.py`
- `backend/app/repositories/models/display_control_state.py`
- `backend/app/domain/rotation.py`, `backend/app/domain/availability.py`
- `backend/app/domain/media.py` (extension autodetect)

## Living specs

- Active: `specs/020-display-control-rotation-tests/` (closes the
  deferred work from 018).
- Archived: `specs/_archive/C1-kiosk-display-runtime/002-kiosk-screen/`,
  `…/006-remote-control-display/`,
  `…/016-preconfigured-iframes-and-video-end/`,
  `…/018-content-rotation-modes/` (behavior shipped; tests deferred
  to 020).

## Stable contracts

- `GET /api/display/state` — kiosk polling endpoint (006).
- `POST /api/display/remote-control/navigation` — operator commands
  (`next`, `previous`, `pause`, `resume`) (006 + 018).
- `GET /api/event-branding` — parallel poll for branding (017).
- `POST /api/content/upload` (admin) and `POST /api/public/content/upload`
  (public) — extension-based content-type autodetect (018).
- `GET /api/iframes` — preconfigured iframe list (016).

## Cross-capability surfaces

- Branding overlay (C7) is rendered by `display-screen.component.ts`.
- `display_control_state.selectedFixedContentId` references
  `top_content_items` (C2).
- `kiosk_display_configurations` table is C4; rotation timing knobs
  live there.

## Recent amendments

- `018-content-rotation-modes` (US1) — rotation bug fixes (ad index,
  ad interval, Chrome rendering).
- `018-content-rotation-modes` (US2) — branding overlay hidden in
  iframe mode.
- `018-content-rotation-modes` (US3) — pause / resume in
  `remote-control`.
- `018-content-rotation-modes` (US4) — recurring content cadence.
- `018-content-rotation-modes` (US5) — fixed content + new `fixed`
  mode in remote-control.
- `018-content-rotation-modes` (US6) — extension-based content-type
  autodetect.
- `017-event-branding` (US2) — branding overlay in top region
  (superseded in iframe mode by 018 US2).
- `016-preconfigured-iframes-and-video-end` (US3) — preconfigured
  iframes + video plays to end + `videoEndDelaySeconds` knob.
- `016-preconfigured-iframes-and-video-end` (US5) — resume Content
  rotation at same index after iframe.

## See also

- `sdd-optimization/05-capability-map-from-code.md`
- `sdd-optimization/07-target-speckit-structure.md`
- `specs/019-display-control-canonical/` — canonical anchor for
  the cross-capability (C1 + C5) display-control narrative.
