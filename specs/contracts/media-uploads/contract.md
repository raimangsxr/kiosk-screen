---
id: MEDIA.UPLOADS
type: contract
status: active
source_of_truth: true
owns:
  - backend/app/api/media.py
  - backend/app/api/v1/media/**
  - backend/app/domain/media.py
  - backend/app/repositories/media.py
  - backend/app/repositories/models/media.py
  - frontend/src/app/shared/media-upload.models.ts
  - frontend/src/app/shared/ui/file-input.component.ts
tests:
  - backend/tests/**/*
  - frontend/src/app/**/*.spec.ts
related_changes:
  - CHG-003
related_adrs:
  []
---

# Media Uploads Contract

## Purpose

This active contract is the current source of truth for `MEDIA.UPLOADS`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- Authorized users can upload images and videos within configured size limits.
- Content type and extension validation reject unsupported or unsafe files before persistence.
- Uploaded files are stored under MEDIA_STORAGE_PATH and referenced from the database through media_file_references.
- The development docker-compose environment sets MEDIA_STORAGE_PATH to `/tmp/kiosk/media` so uploaded media is temporary and container-local.
- Image/video type detection supports downstream content and ad management defaults.
- User-facing errors do not leak storage paths or secrets.

## Public interfaces

- `POST /content/upload` — create a top-content item with an uploaded image or video.
- `PUT /content/{id}/upload` — replace the media file on an existing top-content item.
- `GET /media/{id}`
- `static media URL serving`

## Owned code paths

- `backend/app/api/media.py`
- `backend/app/api/v1/media/**`
- `backend/app/domain/media.py`
- `backend/app/repositories/media.py`
- `backend/app/repositories/models/media.py`
- `frontend/src/app/shared/media-upload.models.ts`
- `frontend/src/app/shared/ui/file-input.component.ts`

## Quality gates

- Changed behavior must be covered by automated tests or an explicit manual validation task with rationale.
- The manifest entry for this contract must be updated when owned paths or related changes move.
- Durable technical rationale belongs in `docs/adr/`, not only in feature `plan.md` files.

## Non-goals

- Cloud object storage is not required by the current local contract.

## Change history

- CHG-003
