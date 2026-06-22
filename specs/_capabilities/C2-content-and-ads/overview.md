# Capability: C2-content-and-ads

The content (top region) and ad (bottom region) entities, the upload
endpoints, the list / form / detail admin pages, the public upload
API, and the public content rotation rules.

## What this capability is

Owns what the kiosk shows. The two entity types are
`top_content_items` (photos + videos, photo-or-video-by-extension since
018) and `client_ad_items` (image ads, free-text `advertiser` since
014). Upload pipelines, validation, list management, drag-and-drop
reorder, public REST API, and the novelty queue are all in scope.

## Owning code

- `backend/app/api/content.py`, `ads.py`, `iframes.py`
- `backend/app/services/content_service.py`, `ads_service.py`,
  `iframe_service.py`
- `backend/app/repositories/models/content.py`, `ad.py`, `iframe.py`
- `backend/app/repositories/content.py`, `ads.py`
- `backend/app/domain/media.py`
- `frontend/src/app/features/content/`, `ads/`, `iframes/`
- `frontend/src/app/core/api/content.api.ts`, `ad.api.ts`,
  `iframe.api.ts`

## Living specs

- Active: none right now.
- Archived: `specs/_archive/C2-content-and-ads/003-admin-media-uploads/`,
  `…/009-public-content-api/`
- 013, 014, 016, 018 are part of the 010-admin-polish-bundle, archived
  under C3 (admin shell). They materially amend C2 entities.

## Stable contracts

- `POST /api/content/upload` (admin) — extension-autodetect
  (`photo` / `video`); supports `isFixed`, `recurringEveryXIterations`
  (018).
- `POST /api/public/content/upload` (public) — extension-autodetect;
  silently ignores `isFixed`, `recurringEveryXIterations` (018).
- `POST /api/ads/reorder`, `POST /api/content/reorder` — drag-and-drop
  multi-select reorder (013).
- `GET /api/iframes` — preconfigured iframe list (016).

## Cross-capability surfaces

- `top_content_items.is_fixed` and `recurring_every_x_iterations` are
  read by `display_control_state` (C1) and the
  `KioskRotationController` (C1).
- The display configuration knobs (default top duration, ad duration,
  animation, inline ad count) live in C4.

## Recent amendments

- `018-content-rotation-modes` (US4) — recurring content cadence.
- `018-content-rotation-modes` (US5) — fixed content + new `fixed`
  mode.
- `018-content-rotation-modes` (US6) — extension-based content-type
  autodetect.
- `016-preconfigured-iframes-and-video-end` (US2) — `embedded_web`
  content type removed; iframes are a separate entity.
- `014-drop-client` (US1) — `Client` entity hard-deleted; `advertiser`
  free-text.
- `013-drop-label-display-order-drag-drop` (US1) — `label` column
  dropped; auto-incremental `displayOrder`; drag-and-drop.

## See also

- `sdd-optimization/05-capability-map-from-code.md`
- `sdd-optimization/07-target-speckit-structure.md`