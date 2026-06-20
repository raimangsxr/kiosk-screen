# Research: Pre-configured Iframes and Video Plays To End

**Date**: 2026-06-20
**Spec**: [spec.md](./spec.md)

This document records the technical decisions made during the planning phase. All decisions are anchored in the approved spec, the 2026-06-20 clarification session, and the existing repository state.

## Decision: Single Alembic migration covering schema, data purge, and column rename

**Rationale**: The feature produces three coupled database changes: (1) drop the `approved_embedded_domains` table, (2) create the new `iframes` table, (3) rename `display_control_states.selected_content_id` to `selected_iframe_id` and re-point its FK to `iframes.id` with `ON DELETE SET NULL`, (4) add `kiosk_display_configurations.video_end_delay_seconds`. They must land together: the rename step requires the new `iframes` table to exist, and the data purge of legacy `embedded_web` rows must complete before the `display_control_states` FK is re-pointed. Splitting them across migrations would require temporary nullable columns and a more complex downgrade. One migration is the simplest, reviewable unit.

**Alternatives considered**:
- Split into 3–4 migrations (purge + create iframes + rename + video delay). Rejected: more files, more alembic heads, the rename migration would need the new table to exist anyway, and a partial rollout would leave the system in an inconsistent state.
- Multi-step data migration with backup of `embedded_web` rows into a side table. Rejected: the user explicitly approved dropping the rows (no data migration required).

## Decision: `Iframe.url` stored as plain text with custom validation, no normalization

**Rationale**: The admin types the URL exactly as they intend to embed it. The kiosk uses it as-is. Lowercasing, trimming, or rewriting schemes would silently change what the operator asked for and would make round-trip debugging harder. Validation is two checks: (a) string is non-empty after stripping whitespace, (b) parses with `urllib.parse.urlparse` with `scheme in {"http","https"}` and a non-empty `netloc`. The check happens in `IframeService.create` and `update`; the API rejects anything else with `400 invalid_url`.

**Alternatives considered**:
- Pydantic `HttpUrl`. Rejected: it requires a TLD, which would reject valid intranet hostnames (`http://display.local/feed`) and corporate IPs; the team has already documented in the spec that the kiosk is an unattended public display where the operator owns the URL choice.
- Pre-stored `parsed_url` JSON column. Rejected: YAGNI; the kiosk doesn't need to read parsed components, only render the URL.

## Decision: `DisplayControlState.selected_iframe_id` uses `ON DELETE SET NULL` plus service-level cleanup

**Rationale**: The DB-level `ON DELETE SET NULL` is the safety net that prevents an orphaned FK from blocking a future `DELETE FROM iframes` if the service-level cleanup is bypassed. The service-level cleanup (`IframeService.delete`) does more: it scans the active `DisplayControlState` row(s) that point at the iframe, sets them to `loop` with `selected_iframe_id=NULL`, and records a `remote_control_iframe_deleted` `DisplayEvent`. The two together mean the DB is always consistent and the operator gets an auditable event.

**Alternatives considered**:
- Pure service-level cleanup without `ON DELETE SET NULL`. Rejected: an out-of-band SQL delete (manual ops, broken migration) would leave a dangling FK and crash the next read.
- `ON DELETE CASCADE` (delete the `DisplayControlState` row). Rejected: would silently terminate the kiosk's session state on iframe delete, which is a worse user experience than a graceful return to `loop`.

## Decision: Video `ended` event handled on the frontend with `setTimeout`; no backend coordination

**Rationale**: The kiosk's browser is the only place where the `ended` event fires. The backend does not parse video duration and does not need to: spec assumption explicitly states "the contract is 'advance when the browser says the video is done'." The frontend's `DisplayScreenComponent` already owns the `contentTimer` for the current item; the change is a branch: if `currentContent.contentType === 'video'`, do not schedule `setTimeout(advanceNow, durationMs)`; instead, attach `(ended)` to the `<video>` element and let the handler schedule `setTimeout(advanceNow, videoEndDelaySeconds * 1000)`. The pre-transition poll logic already in the component is left in place for photos only.

**Alternatives considered**:
- Watchdog timer (fallback to `durationMs` if `ended` doesn't fire in N seconds). Rejected per Q6 in the clarification session: no fallback in this version.
- Server-issued "advance" event via polling on a per-video token. Rejected: the kiosk's existing 1s pre-transition poll already provides the freshness needed for short videos, and the spec rule is "advance on `ended`."

## Decision: Rotation cursor preservation is implemented in the frontend `DisplayRotationService.applyPollState`

**Rationale**: The existing `DisplayRotationService` already keeps `currentItemId` and `baseAnchorId` across polls via the novelty-queue state machine. The only behavioural change is: when the polled `state.remoteControl.contentMode` toggles to `iframe` (and back to `loop`), `applyPollState` MUST NOT reset `currentItemId` or `baseAnchorId`. Today, `applyPollState` is keyed on `topContent` identity only (not on `contentMode`), so the natural behaviour is already correct. The implementation task is to add a regression test that proves toggling does not clear the cursor. The display fingerprint equality in `DisplayApiService.watchState` already ignores `contentMode` changes, so they do not trigger an unnecessary re-render. The plan reuses the existing service; no new abstraction is introduced.

**Alternatives considered**:
- New `IframeRotationService`. Rejected: a second service would have to mirror `currentItemId` to the existing one; the simplest correct behaviour is the existing service's "do not touch on mode change" rule.
- Server-side cursor. Rejected per Q1 in the clarification session: client-side memory is sufficient and matches the existing novelty-queue model.

## Decision: `approved_embedded_domains` table and all its dependents are removed in a single sweep

**Rationale**: After this feature ships, the only consumer of the table is the readiness check. The user explicitly approved removing the entire approval system (Q3). The migration drops the table; the `ApprovedEmbeddedDomain` SQLAlchemy model, the `ApprovedEmbeddedDomainRepository`, the `AdminService` CRUD methods, the `/api/approved-domains` router, the `frontend/src/app/features/domains/` directory, the "Iframe domains" sidenav entry, and the "unapproved embedded domains" readiness check are all deleted. The `ContentService` no longer needs `validate_content` to look up approved domains for `embedded_web` rows (it no longer accepts `embedded_web` at all). The `admin_service`'s "cannot delete approved domain because of active iframe content" check moves to the new `IframeService` (where it is no longer needed, since there is no concept of "approved domain").

**Alternatives considered**:
- Soft-removal (keep the table, mark deprecated, no code path uses it). Rejected: dead code with no test coverage drifts; a future developer would be confused by its presence.
- Keep the table for the readiness check on a different entity. Rejected: no entity uses it after the change.

## Decision: `TopContentItem.content_type` validation lives in `ContentService`, not in a DB enum

**Rationale**: The existing `content_type` column is `String(32)` (no DB-level enum). The application layer in `ContentService.validate_content` and `ContentService.validate_uploaded_content` enforces the allow-list `{"photo","video","embedded_web"}`. The change is to drop `"embedded_web"` from both allow-lists, which makes any incoming `embedded_web` value a 400 from both the admin and the public API. The DB does not need a migration for the column type. Existing rows with `content_type='embedded_web'` are purged in the same migration (per the user's "no data migration" answer).

**Alternatives considered**:
- Add a DB CHECK constraint `content_type IN ('photo','video')`. Rejected: the column already has rows (the ones being purged); the constraint would fail to apply if the purge runs after. The current application-layer check is the canonical contract and has been sufficient for `MediaFileReference`-related validation.
- Drop the `String(32)` column and re-create as a `ENUM` type. Rejected: the team has consistently kept these as application-layer checks; introducing an enum here would be inconsistent and would require additional migration work for the drop.

## Decision: `videoEndDelaySeconds` is a column on `kiosk_display_configurations` with CHECK 0..30 and default 2

**Rationale**: The kiosk display configuration table already stores operational knobs (polling interval, default durations, etc.) and is hot-applied to the running kiosk via the same polling path. Adding the new column is a one-line schema change; the application layer validates the range on PUT and rejects 400 if out of bounds. The `DisplayConfigComponent` form gains a new numeric input. The kiosk fingerprint equality in `DisplayApiService.watchState` already includes `configuration.remoteControlPollingSeconds`; it must be extended to also include `configuration.videoEndDelaySeconds` so changes are detected by the kiosk on the next poll.

**Alternatives considered**:
- Storing it in a separate `kiosk_runtime_overrides` table. Rejected: this is operational config, not an override.
- Storing it in environment variables. Rejected: the spec requires the value to be configurable from the admin UI; env vars are not user-editable through the admin.
