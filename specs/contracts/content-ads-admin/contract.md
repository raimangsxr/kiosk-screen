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
- Show on screen now issues a jump_to navigation command when allowed.

## Public interfaces

- `GET/POST/PUT/DELETE /content`
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
