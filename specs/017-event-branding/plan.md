# Implementation Plan: Event Branding and Ads Section Title

**Branch**: `017-event-branding` | **Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/017-event-branding/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add a new "Event configuration" admin module that captures the event identity (organizer name, event name, organizer logo) and consolidates the existing event duration knob. Render a small overlay on the kiosk's top region with the configured branding when at least one of those values is set, and integrate a fixed "Patrocinadores del evento" label inside the existing gold ads band. Move the `configured_event_duration_minutes` column out of `kiosk_display_configurations` into a new dedicated `event_configurations` table via an idempotent Alembic migration. Emit an `event_configuration_changed` audit event on every successful save. No new dependencies; no public contract changes outside two new endpoints and one modified one.

## Technical Context

**Language/Version**:
- Backend: Python 3.11+ (project standard), FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2.
- Frontend: Angular 20.3, TypeScript 5.8, RxJS 7.8, Material 20.

**Primary Dependencies** (no new ones):
- Backend: existing `MediaStorageService`, `ConfigurationRepository`, `DisplayEventRepository`, `require_roles`/`CONFIGURATION_MANAGEMENT_ROLES` dependencies.
- Frontend: existing `FileInputComponent`, `PageHeaderComponent`, `FormPageComponent`, `dirtyFormGuard`, `BreakpointService`.

**Storage**: PostgreSQL (existing). New table `event_configurations`; existing `media_file_references` table reused for the logo (`media_type='logo'`).

**Testing**:
- Backend: pytest (existing).
- Frontend: Karma + Jasmine (existing).

**Target Platform**: Linux server (backend) + Chromium-based kiosks + Angular SPA in admin (existing).

**Project Type**: Web application with `backend/` (FastAPI) + `frontend/` (Angular) — Option 2 in the template.

**Performance Goals**:
- Kiosk branding fetch piggybacked on existing display-state poll (≤60s). No new polling channel; no extra HTTP requests per poll cycle from the kiosk's perspective (it is the same number of parallel fetches: 1 display state + 1 branding).
- Admin PUT with logo upload: ≤2s for a 1 MB file on a typical LAN.

**Constraints**:
- Logo: PNG/JPG/WebP/SVG, max 1 MB (per `image_upload_max_bytes` setting in `app/config.py`).
- No new external service; no new runtime dependency.
- Migration MUST be idempotent (FR-011a).

**Scale/Scope**:
- One row per organisation in `event_configurations`. No new high-volume path.
- One new admin page, one new public endpoint, one modified table, one modified frontend kiosk component.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Spec traceability**: Plan references the approved specification, user stories, requirements (FR-001..FR-026), and measurable success criteria (SC-001..SC-008) in `spec.md`. ✓
- **Requirement clarity**: Open ambiguities (Q11, Q12, Q13) were resolved in the second `/speckit-clarify` pass; FR-010a, FR-011a, FR-015a, SC-001a, SC-004a capture them. ✓
- **Plan alignment**: Technical approach (per `research.md`) stays within spec scope; no new endpoints beyond the two declared (admin PUT/GET, public GET). ✓
- **Simplicity**: No new dependencies. New abstractions (EventConfigurationService, EventConfigurationFacade, EventBrandingService) each have one clear consumer and mirror existing patterns (`DisplayConfigFacade`, `DisplayControlSyncService`). ✓
- **Contracts**: Public/integration/data boundaries documented in `contracts/admin-event-configuration.md`, `contracts/public-event-branding.md`, `contracts/audit-event-configuration-changed.md`. ✓
- **Testing**: Each SC maps to a test class per §10 of `research.md` and `quickstart.md`. ✓
- **Security, observability, accessibility**: Server-side MIME and size validation (FR-007/FR-008); audit event (FR-025/FR-026); `aria-label` on overlay and ads region (FR-018/FR-020); `pointer-events: none` to avoid blocking kiosk controls (FR-018); stale-while-error on branding endpoint (FR-015a). ✓
- **No speculative scope**: Deferred items listed in spec §Assumptions (themed branding, multi-language, scheduled changes, animated logos, kiosk-side caching beyond operator session). ✓
- **Conflict handling**: If implementation reality conflicts with this plan, work stops and the conflict is documented in `spec.md` (per constitution §III).

## Project Structure

### Documentation (this feature)

```text
specs/017-event-branding/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── admin-event-configuration.md
│   ├── public-event-branding.md
│   └── audit-event-configuration-changed.md
└── tasks.md             # Phase 2 output (next step)
```

### Source Code (repository root)

Web application layout (Option 2):

```text
backend/
├── app/
│   ├── api/
│   │   ├── event_configuration.py        # NEW: PUT/GET /api/event-configuration (multipart PUT, JSON GET)
│   │   ├── event_branding.py             # NEW: GET /api/event-branding (public)
│   │   ├── mappers.py                    # MODIFIED: to_event_configuration_schema, to_event_branding_schema
│   │   ├── router.py                     # MODIFIED: register new routers
│   │   └── schemas.py                    # MODIFIED: EventConfigurationSchema, EventConfigurationRequest, EventBrandingSchema
│   ├── repositories/
│   │   ├── configuration.py              # MODIFIED (or NEW sibling): event_configurations CRUD
│   │   └── models/
│   │       ├── __init__.py               # MODIFIED: export EventConfiguration
│   │       └── event_configuration.py    # NEW: EventConfiguration ORM model
│   ├── services/
│   │   ├── event_configuration_service.py  # NEW: validation + transactional write + audit
│   │   ├── display_service.py            # MODIFIED: read event_duration_minutes from event_configurations
│   │   ├── readiness_service.py          # MODIFIED: same
│   │   ├── admin_service.py              # MODIFIED: drop configured_event_duration_minutes assignment
│   │   └── bootstrap_service.py          # MODIFIED: insert event_configurations row in MVP bootstrap
│   ├── domain/
│   │   └── media.py                      # MODIFIED: new validate_logo_upload(content_type, size)
│   ├── auth/                             # unchanged (reuses CONFIGURATION_MANAGEMENT_ROLES)
│   └── shared/                           # unchanged
├── alembic/versions/0011_event_branding.py  # NEW: idempotent migration
└── tests/
    ├── unit/test_event_configuration_service.py        # NEW
    ├── integration/test_event_configuration_api.py     # NEW
    ├── integration/test_event_branding_public.py       # NEW
    ├── integration/test_display_open_event_duration.py # NEW (or extend existing)
    └── integration/test_migration_0011_event_branding.py  # NEW

frontend/
├── src/app/
│   ├── core/api/
│   │   ├── admin.api.ts                  # MODIFIED: remove configuredEventDurationMinutes from KioskConfiguration
│   │   ├── display.api.ts                # MODIFIED: remove configuredEventDurationMinutes from DisplayKioskConfiguration
│   │   ├── event-config.api.ts           # NEW: EventConfigurationApiService
│   │   └── event-branding.api.ts         # NEW: EventBrandingApiService
│   ├── core/
│   │   └── event-branding.service.ts     # NEW: signal cache + parallel fetch
│   ├── features/
│   │   ├── display-config/
│   │   │   └── display-config.component.ts  # MODIFIED: drop event-duration field
│   │   ├── event-config/
│   │   │   ├── event-config.component.ts         # NEW
│   │   │   ├── event-config.component.spec.ts    # NEW
│   │   │   └── event-config.facade.ts            # NEW
│   │   ├── admin-shell/
│   │   │   ├── admin-navigation.service.ts       # MODIFIED: insert Event entry
│   │   │   └── admin-shell.component.ts          # MODIFIED: iconFor(Event)
│   │   ├── dashboard/
│   │   │   ├── dashboard.service.ts              # MODIFIED: load event config + summary card
│   │   │   └── dashboard.component.ts            # MODIFIED: render event card icon
│   │   └── readiness/readiness.component.ts      # MODIFIED: surface event-config blockers (if applicable)
│   ├── display/
│   │   ├── display-screen.component.ts           # MODIFIED: overlay + ads label + parallel fetch
│   │   └── display-screen.component.css          # MODIFIED: overlay + ads title styles
│   └── app.routes.ts                             # MODIFIED: register /admin/event
└── src/app/features/event-config/event-config.component.spec.ts  # NEW (Karma)
```

**Structure Decision**: Option 2 (web app). Backend changes touch ORM, services, API routers, mappers, schemas, and migration. Frontend changes introduce a new `event-config` feature module and a new shared `event-branding` service, modify the kiosk display screen, and update navigation/dashboard.

## Implementation phases (informational — see tasks.md for the executable breakdown)

1. **Backend skeleton**: model, schema, mapper, repository, service. Migration `0011_event_branding`.
2. **Backend API**: admin PUT/GET (multipart), public GET, audit-event emission.
3. **Backend consumers**: switch `display_service`, `readiness_service`, `admin_service`, `bootstrap_service` to `event_configurations`.
4. **Frontend admin module**: API service, facade, component, route, navigation, dashboard, display-config simplification.
5. **Frontend kiosk**: branding service (signal cache + parallel fetch), overlay rendering, ads label, stale-while-error fallback.
6. **Tests**: unit + integration + Karma for the new component + contract test for the new endpoints.
7. **Validation**: `alembic upgrade head` (and rerun), `npm --prefix frontend run build`, `npm --prefix frontend run test`, `pytest backend/tests`.

## Dependencies (introduced or upgraded)

None. All new code reuses existing patterns and libraries.

## Public / integration / data / UI boundaries (summary)

- **Admin endpoint `PUT /api/event-configuration`** — multipart; see `contracts/admin-event-configuration.md`.
- **Admin endpoint `GET /api/event-configuration`** — JSON; same role set; returns `EventConfigurationSchema`.
- **Public endpoint `GET /api/event-branding`** — JSON; see `contracts/public-event-branding.md`.
- **Audit event `event_configuration_changed`** — see `contracts/audit-event-configuration-changed.md`.
- **Database change** — new table `event_configurations`; dropped column `kiosk_display_configurations.configured_event_duration_minutes`; see `data-model.md`.
- **Kiosk UI** — new overlay inside `.top-region`; new label inside `.ad-region`; see `display-screen.component.ts`.

## Security

- Server-side MIME and size validation for the logo (FR-007/FR-008). No client-side-only check.
- `removeLogo` is a typed boolean; arbitrary values do not enable deletion.
- Ambiguous-intent guard (FR-010a) prevents accidental logo replacement via confusing PUT.
- Audit event includes `userId` only; no PII beyond what is already in the user record.
- Public `/api/event-branding` exposes only branding metadata; the contract explicitly forbids exposing `id`, `organizationId`, `eventDurationMinutes`, or audit fields.

## Observability

- One audit event per successful PUT (Q9, FR-025/FR-026), visible in the existing admin events listing.
- Existing Pydantic error responses for validation failures (HTTP 400 with `code/message/details`).
- No new structured log lines (the existing service-level logging is sufficient).

## Accessibility

- `aria-label="Organizer and event branding"` on the overlay (FR-018).
- `aria-label="Patrocinadores del evento"` on the ads region (FR-020).
- Decorative `alt=""` on the logo `<img>` (FR-018 / acceptance scenario).
- `pointer-events: none` on the overlay so it does not intercept clicks on the kiosk's fullscreen button.
- Visual contrast of the overlay over the top-region media is left as a CSS choice in the implementation plan; the spec defers contrast ratio to CHK032 (a `[Gap]` deferred to a follow-up if needed).

## Out-of-scope confirmations

Per spec §Assumptions:
- No per-event theming, multi-language strings, scheduled branding, logo-from-URL, animated logos, separate mobile/desktop overlays, A/B testing, multi-tenant branding, kiosk-side caching beyond the operator session.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| None | n/a | n/a |

No constitution violations. The plan introduces no new dependencies, no new abstractions beyond three named services that each have one consumer, and uses the same migration pattern as the two most recent migrations (`0010_remote_control_fullscreen.py`, `0008_preconfigured_iframes_and_video_end.py`).
