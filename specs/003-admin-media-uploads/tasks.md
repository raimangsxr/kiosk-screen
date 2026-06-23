# Tasks: Admin Media Uploads

**Input**: Design documents from `specs/003-admin-media-uploads/`.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Verify working branch and the spec dir contains the
      four artefacts.
- [X] T002 [P] Confirm `0002_admin_media_uploads` migration
      creates `media_file_references` and adds the per-item
      rotation columns to `top_content_items` and
      `client_ad_items` plus the four default rotation columns
      and `inline_ad_count` to `kiosk_display_configurations`.

## Phase 2: Foundational

- [X] T003 [P] `MediaFileReference` model at
      `backend/app/repositories/models/media.py`.
- [X] T004 [P] Add the rotation columns and the `media_file_id`
      FK to `top_content_items` and `client_ad_items`.
- [X] T005 [P] Add the four default rotation columns and
      `inline_ad_count` to `kiosk_display_configurations`.
- [X] T006 [P] `ALLOWED_*` constants, `MediaValidationLimits`,
      `validate_media_upload`, `validate_logo_upload`,
      `detect_media_type_from_extension`,
      `UnsupportedExtensionError`, `SUPPORTED_EXTENSIONS_MESSAGE`
      at `backend/app/domain/media.py`.

## Phase 3: User Story 1 — Upload an image or video

- [X] T007 `MediaStorageService` at
      `backend/app/services/media_storage_service.py` that writes
      the file under `MEDIA_STORAGE_PATH/<organization_id>/<public_reference>`
      and returns the absolute path.
- [X] T008 `GET /media/{id}` at `backend/app/api/media.py:37`
      that authenticates via cookie-or-operator-token, fetches the
      row by org scope, and streams the file with
      `FileResponse`.
- [X] T009 [P] `MediaFileReference` TypeScript type at
      `frontend/src/app/shared/media-upload.models.ts` matching
      the backend schema.

### Tests for User Story 1

- [X] T010 [P] [US1] Integration test: upload + GET media at
      `backend/tests/integration/test_media_upload.py`.
- [X] T011 [P] [US1] Integration test: oversize image → 400.
- [X] T012 [P] [US1] Integration test: wrong MIME → 415.
- [X] T013 [P] [US1] Integration test: cross-org media id → 404.
- [X] T014 [P] [US1] Integration test: unauthenticated GET → 401.

## Phase 4: User Story 2 — Per-item rotation override

- [X] T015 `EffectiveRotation` dataclass and
      `resolve_effective_rotation(...)` at
      `backend/app/domain/rotation.py:9, 26`.
- [X] T016 [P] Mapper in `backend/app/api/mappers.py` that calls
      `resolve_effective_rotation(...)` and exposes
      `effectiveDurationSeconds`, `effectiveRotationAnimation`,
      `effectiveAnimationDurationMilliseconds` on
      `ContentItemSchema` and `AdItemSchema`.
- [X] T017 [P] Form field validators in
      `frontend/src/app/shared/forms/admin-validators.ts` that
      reject `rotation_animation` outside
      `ALLOWED_ROTATION_ANIMATIONS` (consumer in spec 009).

### Tests for User Story 2

- [X] T018 [P] [US2] Unit test for
      `resolve_effective_rotation(...)` at
      `backend/tests/unit/test_rotation_domain.py`.
- [X] T019 [P] [US2] Integration test: top content with
      per-item override shows the resolved values on
      `GET /display/state` at
      `backend/tests/integration/test_effective_rotation.py`.
- [X] T020 [P] [US2] Integration test: invalid
      `rotation_animation` → 400.

## Dependencies & Execution Order

- Phase 2 → Phase 3 → Phase 4.
- The frontend shared types in Phase 3 step T009 are required by
  the content / ad forms in spec 009.

## Implementation Strategy

Single-contributor path:

1. Phase 1 + 2: 15 min (sanity check).
2. Phase 3: 1 h (storage service + media endpoint + tests).
3. Phase 4: 30 min (effective rotation + mapper + tests).
