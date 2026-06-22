# Supersedes: 016-preconfigured-iframes-and-video-end

This document records the cross-spec amendments that 018 introduces
against the approved 016 spec. 016 reduced the `contentType` enum to
`{photo, video}` (and removed `embedded_web`); 018 introduces an
extension-based autodetect that runs alongside the existing
`contentType` field, with rules that take precedence over the explicit
form value.

## Amendments

### A-401 — Extension-based `contentType` autodetect on admin upload

- **Amends**: 016's content-type handling
  (`top_content_items.content_type ∈ {photo, video}`).
- **Replaced by**: 018 `US6` plus 018 `FR-025`..`FR-029`.
- **Effective behavior**: on `POST /api/content/upload` (admin),
  when the request omits `contentType` or when the declared
  `contentType` contradicts the file extension, the backend uses the
  extension-detected type. Mapping:
  - `image/*` extensions (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`) →
    `photo`.
  - `video/*` extensions (`.mp4`, `.webm`, `.ogg`, `.mov`) →
    `video`.
  - Unknown extension → HTTP 415 with the list of valid extensions.
- **Test impact**: 016's content-type tests remain for the
  `{photo, video}` invariant. 018 owns the autodetect tests at
  `backend/tests/unit/test_content_service_extension_autodetect.py`.

### A-402 — `isFixed` and `recurringEveryXIterations` flags

- **Amends**: 016's `top_content_items` schema — extends with two
  new columns:
  - `is_fixed BOOLEAN NOT NULL DEFAULT FALSE`.
  - `recurring_every_x_iterations INTEGER NULL` (CHECK `>= 1` when
    not null).
  - CHECK constraint `NOT (is_fixed AND recurring_every_x_iterations
    IS NOT NULL)` (mutual exclusion).
- **Replaced by**: 018 `US4` + `US5` plus 018 `FR-013`..`FR-019`.
- **Effective behavior**: admins can mark a Content as fixed or as
  recurring with a cadence; both flags are mutually exclusive at the
  model level and at the admin upload endpoint.

### A-403 — Public API silently ignores `isFixed` and `recurring`

- **Amends**: 016's admin-only restriction for the content types
  (no equivalent for these new flags yet).
- **Replaced by**: 018 `FR-014` and `FR-019`. The public upload
  endpoint never accepts `isFixed` or `recurringEveryXIterations`;
  it always persists `is_fixed=false, recurring_every_x_iterations=null`.
- **Effective behavior**: external integrations cannot take over the
  kiosk by setting the kiosk-mode flags.

### A-404 — `selectedFixedContentId` foreign key

- **Amends**: 016's `display_control_states.selected_iframe_id` FK
  on `iframes.id`.
- **Replaced by**: 018 `FR-020` adds `selected_fixed_content_id`
  FK on `top_content_items.id` with `ON DELETE SET NULL`. The
  partial index `ix_top_content_items_is_fixed WHERE is_fixed = true`
  powers the fixed-mode selection query.
- **Effective behavior**: when the operator selects `fixed` mode,
  the backend validates the target row has `is_fixed=true`; otherwise
  HTTP 400 with "El Content seleccionado no está marcado como fijo".

## Why not edit 016 in place

Constitution v2.0.0 Principle VI declares approved specs
append-only. The 016 spec is approved. 018 owns the new flags; 016
keeps its original content-type rules as historical record.

## Cross-references

- 016 spec directory: `specs/016-preconfigured-iframes-and-video-end/`
- 016 supersedes 003 (drop `embedded_web`): `specs/016/supersedes-003.md`
- 018 spec directory: `specs/018-content-rotation-modes/`
- 018 supersedes 017 (branding overlay): `specs/018/supersedes-017.md`
- 018 supersedes 006 (display_control_state):
  `specs/018/supersedes-006.md`