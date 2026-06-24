# Implementation Plan: Content and Ads Admin

**Branch**: `009-content-and-ads-admin` | **Date**: 2026-06-23
**Spec**: [spec.md](./spec.md)
**Migrations**: `0001_initial_kiosk_schema` (partial: base
`top_content_items`, `client_ad_items`) + `0002_admin_media_uploads`
(rotation columns, FK to media) + `0006_drop_client_ad_items_label`
+ `0007_drop_client_concept` (advertiser free-text).

## Summary

Expose the content and ad CRUD, the upload endpoints, the
reorder endpoints, the auto-detect on upload, the
`is_fixed` / `recurring_every_x_iterations` exclusivity, and the
drag-and-drop admin UI.

## Technical Context

- **Language/Version**: Python 3.11+ (backend), TypeScript 5.8
  (frontend).
- **Primary Dependencies**: SQLAlchemy 2, FastAPI; Angular 17,
  Angular CDK drag-and-drop.
- **Storage**: PostgreSQL (production).
- **Testing**: pytest, Karma + Jasmine.

## Architecture

### Backend

- `backend/app/repositories/models/content.py` — `TopContentItem`
  with the three rotation columns, `is_fixed`,
  `recurring_every_x_iterations`, and the three CHECKs.
- `backend/app/repositories/models/ad.py` — `ClientAdItem` with
  `advertiser`.
- `backend/app/services/content_service.py` — `create_uploaded`,
  `update`, `delete`, `reorder`, `append_via_public_api` (per spec
  004).
- `backend/app/services/ads_service.py` — same shape for ads.
- `backend/app/api/content.py` — the seven content endpoints.
- `backend/app/api/ads.py` — the seven ad endpoints.

### Frontend

- `frontend/src/app/features/content/content-list.component.ts` —
  CDK drag-drop reorder.
- `frontend/src/app/features/content/content-form.component.ts` —
  "Fijo" checkbox + "Recurrente cada N" number input with the
  mutual-exclusion hint.
- `frontend/src/app/features/content/content.facade.ts`.
- `frontend/src/app/features/ads/ad-list.component.ts` and
  `ad-form.component.ts` and `ads.facade.ts`.

## Constitution Check

- **Spec traceability**: every FR maps to a backend file in
  `app/api/content.py`, `app/api/ads.py`,
  `app/services/content_service.py`, or
  `app/services/ads_service.py`, or a frontend file in
  `features/content/` / `features/ads/`.
- **Requirement clarity**: 10 FRs, 3 SCs.
- **Plan alignment**: the auto-detect behaviour and the
  exclusivity validation are the cross-spec surfaces.
- **Simplicity**: no new dependencies; `detect_media_type_from_extension(...)`
  is the single source of truth for the content type detection.
- **Contracts**: `ContentItemSchema`, `AdItemSchema`,
  `ContentItemRequest`, `AdItemRequest`, `ReorderRequest` are
  documented in `app/api/schemas.py`.
- **Testing**: integration tests for CRUD, upload, reorder,
  exclusivity, auto-detect.
- **Security**: content endpoints gated by
  `CONTENT_MANAGEMENT_ROLES`; ad endpoints by
  `AD_MANAGEMENT_ROLES`.
- **No speculative scope**: out-of-scope list explicit.
- **Conflict handling**: this spec introduces `content_changed`,
  `ad_changed`, `content_type_autodetected`, `media_uploaded` to
  the audit log; spec 012 covers the full contract.

## Project Structure

```
specs/changes/009-content-and-ads-admin/
├── plan.md
├── spec.md
├── tasks.md
└── checklist.md
```

## Out of Scope

- Multi-bucket content categorization.
- Bulk upload.
- Versioning / drafts.
- A/B testing the rotation order.
