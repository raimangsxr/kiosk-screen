# Research: Production Quick Wins

**Date**: 2026-07-06  
**Spec**: [spec.md](./spec.md)

## Decision: Canonical public upload path

- **Decision**: Keep only the `/api/public` sub-app mount in `main.py`. Remove `public_content_router` from `api_v1_router`.
- **Rationale**: Documented public interface is `POST /public/content` relative to public app → full path `/api/public/content/upload`. Duplicate registration on v1 router creates `/api/content/upload` shadow route with ambiguous auth.
- **Alternatives considered**:
  - Keep both paths intentionally: rejected — violates FR-001 and confuses integrators.
  - Move public router to v1 only: rejected — breaks CORS isolation on public sub-app.

## Decision: Fingerprint fields for material media change

- **Decision**: Add to content item comparison:
  - `sourceReference`
  - `mediaFile?.mediaUrl ?? ''`
  - `effectiveDurationSeconds ?? durationSeconds ?? null`
  Add to display-level comparison:
  - `selectedIframe?.url ?? ''`
- **Rationale**: Operators swap files without id changes; poll `distinctUntilChanged` and controller `_shouldPreserveContentTimer` must see the change. Timer preservation still applies when only immaterial fields differ (e.g. title not in fingerprint today).
- **Alternatives considered**:
  - Deep JSON compare of entire item: rejected — noisy, resets timers on title edits.
  - Backend version field per content: rejected — out of scope, requires migration.

## Decision: Rotation event delivery

- **Decision**: Add `DisplayApiService.postRotationEvent(eventType, payload)` → `POST /api/display/rotation-event` with credentials. Assign sink in `display-screen` `ngOnInit` after controller attach.
- **Rationale**: Backend endpoint and `RotationEventRequest` schema already exist (`display.py:266`). Controller debounce (200ms schedule, 60s report window) unchanged.
- **Alternatives considered**:
  - Record event only server-side on empty queue: rejected — server does not know client rotation engine state.
  - Fire-and-forget without error handling: acceptable — use `subscribe()` with empty error handler; audit is best-effort.

## Decision: Logo recovery on URL change

- **Decision**: In `display-screen`, add `effect()` watching `brandingViewModel().organizerLogoUrl`; when URL changes, set `hiddenLogoUrl = null`.
- **Rationale**: `hideBrokenLogo` sets hidden URL on `(error)`; without reset, new valid URL is suppressed by `logoVisible()` check.
- **Alternatives considered**:
  - Remove hidden URL pattern entirely: rejected — broken images would flash repeatedly.
  - Key-based img reload only: insufficient if same component instance keeps hidden state.

## Decision: Session expiry on 403

- **Decision**: Extend `authExpiredInterceptor` to handle `error.status === 403` with same clear+redirect logic as 401, excluding login URL.
- **Rationale**: Remote control and role-gated endpoints return 403; operators should re-auth consistently.
- **Alternatives considered**:
  - 403 → forbidden page: rejected — spec FR-006 requires login redirect.
  - Global 403 for all URLs: rejected — must not break intentional anonymous reads (public branding stays unauthenticated).

## Decision: Node version pin

- **Decision**: `.nvmrc` content `24` (same major as `release-images.yml` line 33). Update README local prerequisites to Node 24.
- **Rationale**: CI already uses 24 successfully; README referenced 22.14.0 without `.nvmrc` file. Angular 20 supports Node 20+.
- **Alternatives considered**:
  - Pin 22 LTS: rejected — diverges from release CI, repeats drift.
  - `engines` in package.json only: rejected — spec FR-008 requires root pin file.

## Out of scope (confirmed)

- `DisplayPollingService` integration → CHG-030
- Session persistence / signed cookies → CHG-031
- Branding refresh throttling → CHG-024

## Assumptions

- Postman collection already targets `/api/public/content/upload` (verify during implementation).
- `content_rotation_empty` debounce semantics in `DisplayControlService.record_rotation_event` unchanged.
- No ADR required — incremental fixes; durable rationale lives in contract updates.
