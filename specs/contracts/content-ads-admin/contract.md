---
id: CONTENT.ADS.ADMIN
type: contract
status: active
source_of_truth: true
owns:
  - backend/app/api/content.py
  - backend/app/api/ads.py
  - backend/app/api/v1/content/**
  - backend/app/api/v1/ads/**
  - backend/app/application/content/**
  - backend/app/application/ads/**
  - frontend/src/app/features/content/**
  - frontend/src/app/features/ads/**
tests:
  - backend/tests/**/*
  - frontend/src/app/**/*.spec.ts
related_changes:
  - CHG-009
  - CHG-003
  - CHG-007
  - CHG-027
  - CHG-046
related_adrs:
  []
---

# Content and Ads Admin Contract

## Purpose

This active contract is the current source of truth for `CONTENT.ADS.ADMIN`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- Administrators can create, edit, delete, activate/deactivate, and reorder top content and ads.
- Content supports photos, videos, approved iframe/domain references where applicable, fixed eligibility, and recurring cadence.
- Ads support upload-backed images, advertiser labels, ordering, and active state.
- Admin lists show thumbnails or visual identification where media is present.
- Fixed-content selection surfaces previews for media-backed fixed content so operators can distinguish similarly named items before pinning one on screen.
- Admin content uploads return HTTP 415 for unsupported media types and HTTP 413 for oversize files, using the same typed upload error envelope as the public API.
- Replacing media on an existing content item uses `PUT /content/{id}/upload` and deletes the previous file when it is no longer referenced.
- Show on screen now issues a jump_to navigation command when allowed.
- Admin content list exposes `isNovelty` on each item (pending public-upload novelty, cleared after kiosk consume).
- Items with `isNovelty=true` are visually highlighted in the list.
- A client-side **Solo novedades** filter shows only pending novelties (`isNovelty=true`); drag-and-drop reorder is disabled while the filter is active.
- Top content list (`content-list.component`) uses a **compact desktop table**: icon-only inline actions with Spanish `matTooltip` labels; truncated title/media cells; slightly smaller thumbnails.
- Thumbnail **full-resolution media preview** on hover (desktop), keyboard focus, or tap (compact cards): anchored beside the thumbnail; uses `mediaFile.mediaUrl`; max display ~480px; dismiss on pointer exit, blur, Escape, or outside tap.
- Top content list **client-side pagination**: page sizes 10, 20, 50, 100, and **Todas** (default 20); range indicator (e.g. `21–40 de 87`); prev/next navigation; same pagination on desktop table and compact cards; page size persisted in browser local storage.
- Changing page size or **Solo novedades** resets to page 1; changing page clears bulk selection (current page only).
- Drag-and-drop reorder is disabled when page size is not **Todas** (in addition to novelty filter); Spanish hint when disabled due to pagination. Mobile up/down reorder follows the same rule.

## Public interfaces

- `GET/POST/PUT/DELETE /content`
- `POST /content/upload`
- `PUT /content/{id}/upload`
- `POST /content/reorder`
- `GET/POST/PUT/DELETE /ads`
- `POST /ads/reorder`

## Owned code paths

- `backend/app/api/content.py`
- `backend/app/api/ads.py`
- `backend/app/api/v1/content/**`
- `backend/app/api/v1/ads/**`
- `backend/app/application/content/**`
- `backend/app/application/ads/**`
- `frontend/src/app/features/content/**`
- `frontend/src/app/features/ads/**`

## Quality gates

- Changed behavior must be covered by automated tests or an explicit manual validation task with rationale.
- The manifest entry for this contract must be updated when owned paths or related changes move.
- Durable technical rationale belongs in `docs/adr/`, not only in feature `plan.md` files.

## Non-goals

- Advanced campaign scheduling and targeting are outside current admin scope.

## Change history

- CHG-009
- CHG-003
- CHG-007
- CHG-027
- CHG-046
