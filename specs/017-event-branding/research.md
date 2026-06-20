# Research: Event Branding and Ads Section Title (spec 017)

**Branch**: `017-event-branding` | **Date**: 2026-06-20

This document records the technical decisions and the rationale behind them for implementing `spec.md`. Each decision corresponds to a cluster of requirements (FR-xxx) and a measurable success criterion (SC-xxx) in the spec.

## 1. Backend: New `event_configurations` table vs reusing `kiosk_display_configurations`

- **Decision**: New dedicated table `event_configurations` with a 1:1 relationship to `organizations`. Move `event_duration_minutes` out of `kiosk_display_configurations`.
- **Rationale**: Per Q1. Event identity (organizer, event name, logo) is a different concern from display timing (rotation duration, animation). Mixing them made the `kiosk_display_configurations` row grow wide and made the `kiosk_configuration.py` model carry unrelated fields. A separate table keeps each row focused and the admin form simple.
- **Alternatives considered**:
  - Add columns to `kiosk_display_configurations` and keep a single endpoint. Rejected because it entangles display-config editing (touched on every rotation tuning) with identity editing (rare, branding-sized changes). Also rejected because `display_service.open_display` already fetches the whole `KioskDisplayConfiguration` row and a future "open the display" path shouldn't have to know about branding.
  - Store the event identity on the `Organization` row. Rejected because branding is per-organization and rarely changes; one table per organization would force every branding edit to update an "Organization" row and complicate RBAC.

## 2. Migration safety: idempotent, single transaction, explicit data preservation invariant

- **Decision**: Alembic migration `0011_event_branding.py` is fully idempotent (Q12). Every step guarded by `_table_exists` / `_column_exists` / `_constraint_exists` (same pattern as `0010_remote_control_fullscreen.py` and `0008_preconfigured_iframes_and_video_end.py`). Backfill uses `INSERT ... ON CONFLICT (organization_id) DO NOTHING`.
- **Rationale**: Pipeline reruns, partial prior runs, and operator re-application of migrations must not raise. The migration is data-moving (not just schema-moving): a duplicate `event_configurations` row per organization would silently mask problems, and a duplicate `event_configurations` per `organization_id` would violate the unique constraint at insert time.
- **Alternatives considered**:
  - One-shot migration with no guards. Rejected because the project runs migrations in CI on every PR, and any flake would break the pipeline.
  - Separate "data" migration (Alembic data migration via `op.execute`). Rejected because we want one PR = one migration = one reviewable diff.

## 3. Public kiosk endpoint: `/api/event-branding` (no auth) and piggyback fetch

- **Decision**: `GET /api/event-branding` is unauthenticated (Q10/Q13 context) and is fetched by the kiosk in parallel with `GET /api/display/state` on every poll. No new polling channel.
- **Rationale**: The kiosk display page must be able to render branding without requiring an admin/session role. The endpoint returns only public branding metadata and resolves the current single active organization using the same default organization resolution as public display endpoints. The piggyback keeps the refresh cadence tied to the existing display-state poll.
- **Alternatives considered**:
  - Embed `eventBranding` into the existing `DisplayState` payload. Rejected because (a) `DisplayState` is the timing/content/ads contract; branding is identity and changes on a slower cadence; (b) every poll would carry branding data even if nothing changed; (c) keeping branding separate makes it possible to evolve the contract without breaking kiosk display-state parsing.
  - SSE / WebSocket push. Rejected as over-engineering for a 3s poll budget.

## 4. Logo upload: inline multipart on `PUT /api/event-configuration`

- **Decision**: `PUT /api/event-configuration` is `multipart/form-data`. The body carries the configuration text fields plus an optional `file` field and an optional `removeLogo` boolean. Per Q11, both `file` and `removeLogo=true` together ⇒ HTTP 400.
- **Rationale**: The existing codebase pattern (ad upload, content upload) uses multipart for media-bearing saves. Inline upload means there is never an orphaned file on disk: a `MediaFileReference` row is only committed inside the same DB transaction that updates the event configuration.
- **Alternatives considered**:
  - Separate `POST /api/event-configuration/logo` and `DELETE /api/event-configuration/logo`. Rejected because it introduces orphan GC complexity and a transient "logo is uploaded but config not saved" state that the UI would have to communicate.
  - External image URL only (no upload). Rejected because the brief explicitly requires "subir un logo del organizador" (uploading).

## 5. Audit event: `event_configuration_changed` with payload-only metadata

- **Decision**: Emit one event per successful PUT (Q9). Payload includes `eventConfigurationId`, `changedFields[]`, `previousLogoMediaId`, `newLogoMediaId`, `userId`. Severity `info`. No logo binary.
- **Rationale**: Aligns with existing `configuration_changed` and `remote_control_iframe_deleted` events. The events feed `/admin/api/events` (or equivalent) — same listing endpoint, same shape. No new audit subsystem.
- **Alternatives considered**:
  - Reuse `configuration_changed` with a discriminator field. Rejected because the event payload schemas diverge (branding needs previousLogoMediaId + newLogoMediaId), and reusing would require schema branches.
  - Emit no audit event. Rejected because event-config changes are operationally significant (operator identity, sponsor deal reference) and must be reviewable.

## 6. Frontend kiosk rendering: overlay (top-left) + integrated ads label

- **Decision**: A new `EventBrandingService` injects branding into `display-screen.component.ts`. The overlay renders inside `.top-region` as a position:absolute block in the top-left corner, conditionally rendered (only when at least one of the three branding fields is set). The `.ad-region` gains a `<h2 class="ad-region__title">Patrocinadores del evento</h2>` as its first child.
- **Rationale**: Per Q2, Q3. Overlay placement in the top-left of the 4fr top-region is "above" the media without occluding it (z-index 3) and uses the existing dark backdrop pattern already in use for the fullscreen prompt. The ads label is integrated into the existing gold band so the band height does not change (FR-019) and the existing `ad-region` grid layout is not disturbed.
- **Alternatives considered**:
  - Banner above the top-region (consumes vertical space, breaks 4fr/1fr grid). Rejected because the brief says "sin que moleste" (without getting in the way).
  - Floating toast in a corner. Rejected because toasts imply interactivity and dismiss; this is a persistent brand badge.
  - Configurable label string. Rejected because the operator asked for the fixed "Patrocinadores del evento" (Q2).

## 7. Stale-while-error on `/api/event-branding` failures

- **Decision**: The kiosk cache keeps the last successful branding payload. A failure (5xx, timeout, network) does NOT clear the cache; the display-state poll proceeds independently. Recovery: cache is replaced atomically on the next success (Q13).
- **Rationale**: Branding changes are infrequent and operator-controlled. Display state is timing-critical. Coupling them would create a regression where a transient branding-endpoint outage blanks the overlay mid-event for no good reason.
- **Alternatives considered**:
  - Clear overlay on error. Rejected because transient errors would visibly "blink" the overlay during a live event.
  - Show a "Branding unavailable" chrome. Rejected as noisy and out of scope.

## 8. Frontend admin module: standalone component following the `display-config` pattern

- **Decision**: `frontend/src/app/features/event-config/event-config.component.ts` is a single form page with three fields (eventName, organizerName, eventDurationMinutes) and the `FileInputComponent` for the logo, guarded by `dirtyFormGuard`. Pattern mirrors `display-config.component.ts`.
- **Rationale**: Consistency. The display-config page is already a single-form-page with `dirtyFormGuard`, snackbar on success, and `markPristine()` after save. Re-using the shape reduces cognitive load and review surface.
- **Alternatives considered**:
  - Tabbed form (Branding / Duration). Rejected because the form has only four fields and a tab is unnecessary.

## 9. Removed field: `configured_event_duration_minutes` from `KioskDisplayConfiguration`

- **Decision**: Drop the column and its check constraint `ck_kiosk_event_duration_positive` as part of the same migration. All consumers (`display_service.open_display`, `readiness_service`, `admin_service.update_configuration`) read from `event_configurations` instead. The display-config form loses its "Event duration" field.
- **Rationale**: A single source of truth for event duration. Otherwise we'd have two places to set it, and they could drift.
- **Alternatives considered**:
  - Keep both, treat `event_configurations` as primary and `kiosk_display_configurations.configured_event_duration_minutes` as a denormalised read-through cache. Rejected as over-engineering for one integer.
  - Keep both columns, rename `kiosk_display_configurations.configured_event_duration_minutes` to `event_duration_minutes_legacy` and read both. Rejected because it leaves an unused column in the schema and a code path that has to be cleaned up later.

## 10. Tests strategy

- **Decision**:
  - Backend unit tests: `tests/unit/test_event_configuration_service.py` for service-level logic (validation, transactional write, logo swap, remove logo).
  - Backend integration tests: `tests/integration/test_event_configuration_api.py`, `test_event_branding_public.py`, `test_display_open_event_duration.py`, `test_migration_0011_event_branding.py` (idempotency, data preservation).
  - Frontend Karma tests: `event-config.component.spec.ts` (form, validation, dirty, save, upload, remove), `display-screen.component.spec.ts` (overlay conditional rendering, ads label presence, stale-while-error cache).
- **Rationale**: Each SC maps to a concrete test class. Per TQ-002, each changed behaviour has a testable validation method.
- **Alternatives considered**:
  - E2E Playwright suite. Out of scope — the project uses Karma+Jasmine for frontend and pytest for backend; introducing Playwright is not justified for this feature.

## 11. Out-of-scope confirmations (from spec §Assumptions)

- Per-event theming, multi-language branding strings, scheduled branding changes, logo upload from URL, animated logos, separate mobile/desktop overlays, A/B tests of overlay placement, multi-tenant branding, kiosk-side caching beyond operator session — **NOT** implemented.
- `dirtyFormGuard` is applied to the new event-config page (analogous to other forms). No new guard variant is introduced.
- `DisplayControlSyncService` is **not** used for branding refresh (browser-local mechanism). Branding refresh piggybacks on the existing display-state poll (Q10).
