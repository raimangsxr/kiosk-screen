# Research: Content Rotation Modes

**Branch**: `018-content-rotation-modes` | **Date**: 2026-06-22

This file resolves all `NEEDS CLARIFICATION` markers from the spec (none remained after `/speckit-clarify`) and records the technical decisions taken during planning, plus the simpler alternatives considered and rejected.

## Technical decisions

### TD-001 — Single `KioskRotationController` driven by Angular `effect()`

**Decision**: Replace the two ad-hoc `setTimeout` subsystems in `display-screen.component.ts` (one for Content via `scheduleTransition`, one for Ads via `scheduleNextAd`) with a single `core/kiosk-rotation.controller.ts` that exposes signals (`mode`, `currentContentIndex`, `adIndex`, `cadenceCounter`, `isPaused`, `currentFixedContentId`) and an `effect()` that arms a `setTimeout` per signal change.

**Rationale**:
- The current code's two timers race against each other and against the display-state poll (`applyState` re-arms them on every poll that returns a different `configuration` fingerprint). That is the root cause of US1 AS-1 (ad index not advancing) and US1 AS-2 (interval not respected).
- An `effect()`-driven controller reads all signals it depends on (`mode`, `currentContentIndex`, `effectiveDurationSeconds`, `cadenceCounter`, `isPaused`) and re-arms its single timer reactively. The cursor is no longer captured in a closure mutated by `setTimeout` callbacks.
- Compatible with the existing `DisplayRotationService` (queue picking, novelty queue, fixed-content handling): the controller consumes that service for "what to play next" but owns "when to advance".

**Alternatives considered**:
- **A**: Keep two `setTimeout` subsystems but add a debounce. Rejected: does not fix the closure-stale-state issue and adds complexity.
- **B**: Push the cadence counter and rotation index to the backend (`GET /api/display/state` includes `currentIndex`, `cadenceCounter`, `isPaused`). Rejected: violates A-006 ("rotation logic lives in the client"), introduces a network round-trip per advance, and the polling cadence is too coarse (≥ 3 s) to honour `effectiveDurationSeconds` for short videos.
- **C**: Use RxJS `timer` + `switchMap`. Rejected: works but does not compose well with Angular signals; would require a parallel RxJS layer that mirrors signals. The `effect()` approach is the project's idiom (Angular 20.3 default).

### TD-002 — Pause state is client-only

**Decision**: Pause / Resume are NOT persisted in `display_control_states` or any other backend table. They live only in the kiosk's `KioskRotationController` and survive across Content advances but NOT across mode changes (per FR-012a and Q4 answer).

**Rationale**:
- Pause is an operator-driven temporary state; persisting it would couple the kiosk to the last operator's intent.
- The existing `navigation_command` / `navigation_command_id` mechanism already handles "fire and forget" commands; Pause fits that pattern.
- The backend's only role is to forward the command via `POST /api/display/remote-control/navigation`; the kiosk applies it and keeps the state locally.

**Alternatives considered**:
- **A**: Persist `isPaused` in `display_control_states`. Rejected: pollutes the mode-of-operation with transient operator intent; complicates the 017 dashboard and the 017 readiness logic.
- **B**: Make Pause a "soft" mode alongside `loop`/`iframe`/`fixed`. Rejected: would force FR-023 to forbid navigation commands in three modes instead of one and would require UI changes for "Pause" as a distinct mode, against operator intent (Q4 answer "el operador cambió de modo a propósito").

### TD-003 — Auto-detect by extension wins over explicit `contentType`

**Decision**: When a Content upload includes both an explicit `contentType` form field AND a filename whose extension contradicts it (e.g. `contentType=photo` + filename `image.mp4`), the extension wins. The backend ignores the explicit `contentType` and persists based on the extension; an audit event `content_type_autodetected` records the override.

**Rationale**:
- The user's stated motivation ("automatizaciones en sistemas poco parametrizables, nos enviarán el contenido sin saber si es video o foto") implies that integration senders may guess wrong on the form field. Trusting the extension removes ambiguity.
- Backwards compatibility is preserved: if the form field is correct and matches the extension, nothing changes.

**Alternatives considered**:
- **A**: Reject the upload with HTTP 400 when form field and extension disagree. Rejected: hostile to automation; the operator must intervene for a perfectly valid file.
- **B**: Trust the form field when present, only fall back to extension when omitted. Rejected: this is the current admin behaviour; the user explicitly said "no quiero tener que seleccionar el tipo" — the explicit field should not be authoritative.
- **C**: Trust the MIME header (`upload.content_type`). Rejected: the existing public API already does this and the operator has reported it is error-prone when the upload tool lies; extension is more reliable than MIME.

### TD-004 — Public API silently ignores `isFixed` / `recurring`

**Decision**: `POST /api/public/content/upload` always persists `isFixed=false` and `recurringEveryXIterations=null`, regardless of what the client sends. The backend does not return an error and does not log a warning (silent ignore). The public API schemas do not declare these fields.

**Rationale**:
- Security: external integrations must not be able to take over the kiosk (Q6 answer Option A).
- Backwards compatibility: existing public-API clients that happen to send extra fields are not rejected.
- Auditability: the admin channel remains the only path for these flags, so any `isFixed=true` row in `top_content_items` is provably operator-initiated.

**Alternatives considered**:
- **A**: Per-organisation flag `allowPublicFixedAndRecurring` (Q6 Option C). Rejected: more configuration surface, harder to reason about, easy to mis-configure.
- **B**: Return HTTP 400 when public API receives `isFixed=true`. Rejected: hostile to clients that send extra fields; the ignore approach is more forgiving.

### TD-005 — Fixed-mode selection requires `isFixed=true` on the target

**Decision**: When the operator selects `contentMode='fixed'` and chooses a `selectedFixedContentId`, the backend validates that the target `TopContentItem` exists AND has `isFixed=true`. Otherwise HTTP 400 with message "El Content seleccionado no está marcado como fijo".

**Rationale**:
- Prevents the operator from pinning a non-fixed content via the dropdown (which would be a UI bug otherwise).
- Defense in depth: even if the dropdown is somehow bypassed, the backend rejects.

**Alternatives considered**:
- **A**: Only the dropdown filters by `isFixed=true`; backend accepts any ID. Rejected: leaves the door open for direct API manipulation.
- **B**: Backend silently coerces non-fixed targets to `loop` mode. Rejected: hides operator mistakes.

### TD-006 — Migration follows the `0010`/`0011` idempotency pattern

**Decision**: Migration `0012_content_rotation_modes.py` uses the `_table_exists`, `_column_exists`, `_constraint_exists` checks (or the equivalent Postgres-native `IF NOT EXISTS`) pattern from `0011_event_branding.py`. Every step is guarded. The migration is runnable twice without raising.

**Rationale**:
- Project standard (last two migrations both follow this pattern).
- Allows the migration to be applied to environments that may have been partially seeded by older branches.

**Alternatives considered**:
- **A**: Single `ALTER TABLE ... ADD COLUMN ...` without guards. Rejected: not idempotent; fails on re-run.
- **B**: Drop and recreate the table. Rejected: loses data.

### TD-007 — Fixed-content video uses HTML5 `<video loop>`

**Decision**: When `contentMode='fixed'` and the selected fixed content is a video, the kiosk template binds `[loop]="true"` on the `<video>` element. The `(ended)` handler is wired only when not in fixed mode.

**Rationale**:
- The native HTML5 `loop` attribute is the simplest correct implementation for "play forever" (Q1 answer Option A).
- Avoids manual `currentTime=0; play()` re-trigger and its race with `pause` events.

**Alternatives considered**:
- **A**: Manual `currentTime=0; play()` in `onVideoEnded`. Rejected: needs extra guard for "don't re-trigger if paused"; native `loop` does this for free.

### TD-008 — `applyState` no longer resets ad timer

**Decision**: The new `KioskRotationController` re-arms its ad timer only when (a) the ad list changes, (b) `defaultAdDurationSeconds` changes, or (c) the kiosk enters `adsVisible=true`. It does NOT re-arm on unrelated poll returns.

**Rationale**:
- This is the root fix for US1 AS-1 (ad index not advancing). The current code's `applyState` calls `scheduleNextAd` on every poll, which discards any in-flight timer.

**Alternatives considered**:
- **A**: Memoize the last `(adList, defaultAdDurationSeconds, adsVisible)` tuple and re-arm only on change. Rejected: equivalent to TD-008 but expressed as memoisation; the signal-driven approach in TD-001 is cleaner.

### TD-009 — Branding overlay hidden in iframe mode: template change only

**Decision**: The `*ngIf` on `.branding-overlay` becomes `hasBranding() && !iframeUrl()`. No CSS rule; the element is not rendered at all.

**Rationale**:
- Matches the spec requirement (FR-006).
- Simplest possible implementation; the `*ngIf` already controls rendering.

**Alternatives considered**:
- **A**: Use CSS `display:none` keyed off a class. Rejected: keeps the element in the DOM and accessible tree, which contradicts the spec ("no aparece en el DOM").
- **B**: Hide via `aria-hidden="true"` and `visibility: hidden`. Rejected: same reason; the spec is explicit.

### TD-010 — Recurring-content cadence counter persists across mode transitions

**Decision**: The cadence counter is part of the kiosk's local state; it does not reset when the kiosk enters `iframe` or `fixed`, but it does NOT advance while outside `loop` (Q3 answer Option C). On return to `loop`, the counter resumes from where it was.

**Rationale**:
- Matches Q3 answer; consistent with FR-008 / FR-021 ("preserva el estado al volver a `loop`").

**Alternatives considered**:
- **A**: Reset to 0 on every `loop` entry. Rejected: violates Q3 answer and creates uneven cadence when the operator toggles modes.
- **B**: Advance counter even outside `loop` (e.g. count "would-have-been" advances). Rejected: the spec explicitly says "no avanza" while outside `loop`.

## Rejected alternatives (global)

These alternatives were considered but rejected for the entire feature:

- **Multi-tenant configuration of fixed/recurring**: deferred; out of scope.
- **Per-kiosk different cadences**: deferred; current model is per-organisation.
- **WebSocket / SSE for remote control**: deferred; existing polling works and the spec says no real-time push.
- **A separate "fixed mode" overlay template for branding**: not needed; branding is hidden in iframe mode per spec, but visible in fixed mode per FR-007.
- **Client-side persistence of Pause across browser reloads**: rejected; Pause is session-local.

## Open items deferred to plan execution

These will be addressed during implementation, not as architectural decisions:

- Concrete CSS rule to ensure ad-region visibility in Chrome (likely replacing `max-width: auto` with a real value and providing a fallback `animation-duration`).
- Exact shape of the `fixedEligibleContentIds` payload (likely just `id`, `name`, `mediaUrl`, `thumbnailUrl`).
- Migration column types: `recurringEveryXIterations` → `Integer` nullable; `isFixed` → `Boolean` default `false`; `selectedFixedContentId` → `Integer` FK `ON DELETE SET NULL`.