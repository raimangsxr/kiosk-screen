# Implementation Plan: Admin Media Uploads

**Branch**: `003-admin-media-uploads` | **Date**: 2026-06-23
**Spec**: [spec.md](./spec.md)
**Migration**: `0002_admin_media_uploads`.

## Summary

Persist the `media_file_references` table, the per-item rotation
fields, and the four default rotation knobs on
`kiosk_display_configurations` plus `inline_ad_count`. Centralise
upload validation in `domain/media.py` and serve media via
`GET /media/{id}` to authenticated sessions.

## Technical Context

- **Language/Version**: Python 3.11+ (backend), TypeScript 5.8
  (frontend).
- **Primary Dependencies**: SQLAlchemy 2, FastAPI; Angular 17.
- **Storage**: PostgreSQL (production), local disk
  (`MEDIA_STORAGE_PATH`).
- **Testing**: pytest, Karma + Jasmine.

## Architecture

### Backend

- `backend/app/repositories/models/media.py` —
  `MediaFileReference`.
- `backend/app/repositories/models/content.py`,
  `models/ad.py` — add `duration_seconds`, `rotation_animation`,
  `animation_duration_milliseconds`, plus FK `media_file_id` to
  `media_file_references`.
- `backend/app/repositories/models/kiosk_configuration.py` — add
  the four default rotation columns and `inline_ad_count`.
- `backend/app/domain/media.py` — `ALLOWED_IMAGE_TYPES`,
  `ALLOWED_LOGO_TYPES`, `ALLOWED_VIDEO_TYPES`,
  `ALLOWED_ROTATION_ANIMATIONS`, `IMAGE_EXTENSIONS`,
  `VIDEO_EXTENSIONS`, `ALLOWED_UPLOAD_EXTENSIONS`,
  `MediaValidationLimits`, `validate_media_upload`,
  `validate_logo_upload`, `detect_media_type_from_extension`.
- `backend/app/services/media_storage_service.py` — write / read
  the file on disk under `MEDIA_STORAGE_PATH`.
- `backend/app/api/media.py` — `GET /media/{id}` with the
  cookie-or-operator-token auth check.

### Frontend

- `frontend/src/app/shared/media-upload.models.ts` —
  `RotationAnimation`, `ROTATION_ANIMATIONS`, `MediaFileReference`.
- The form bindings for content / ads (spec 009) consume the
  union; this spec ships the shared types.

## Constitution Check

- **Spec traceability**: every FR maps to a backend file in
  `backend/app/api/media.py`, `domain/media.py`, or
  `services/media_storage_service.py`.
- **Requirement clarity**: 10 FRs, 3 SCs.
- **Plan alignment**: no cross-spec surface beyond the media
  reference type that spec 009 and 008 consume.
- **Simplicity**: no new dependencies; everything is in
  `starlette` (FileResponse), `pathlib`, and `pydantic`.
- **Contracts**: `MediaFileReference` (Python) and
  `MediaFileReference` (TypeScript) are documented in
  `shared/media-upload.models.ts`.
- **Testing**: integration tests for the four error paths
  (oversize, wrong MIME, wrong extension, cross-org).
- **Security**: cross-org lookup returns 404 (no leak); GET
  requires a session cookie or an unexpired operator token.
- **No speculative scope**: out-of-scope list explicit.
- **Conflict handling**: no conflicts.

## Project Structure

```
specs/changes/003-admin-media-uploads/
├── plan.md
├── spec.md
├── tasks.md
└── checklist.md
```

## Out of Scope

- Object storage backends (S3, GCS, Azure Blob).
- Image processing (resize, compress, EXIF strip).
- Per-tenant storage quotas.
- Antivirus scanning.
