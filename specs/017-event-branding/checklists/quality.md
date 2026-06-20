# Specification Quality Checklist: Event Branding and Ads Section Title

**Purpose**: Validate the completeness, clarity, consistency, measurability, and coverage of the requirements in `specs/017-event-branding/spec.md` before proceeding to planning and implementation.
**Created**: 2026-06-20
**Feature**: [spec.md](../spec.md)
**Audience**: Author self-review (depth: Standard)
**Migration emphasis**: High

## Requirement Completeness

- [x] CHK001 - Are the required CRUD operations on event configuration enumerated (create-or-update, read, list-of-one-per-org, no delete-by-API)? [Completeness, Spec §FR-004]
- [x] CHK002 - Is the response shape of `GET /api/event-branding` specified for the case where the row exists but the logo was cleared (`organizerLogoMediaId=null` → `organizerLogoUrl=null`)? [Completeness, Spec §FR-005]
- [x] CHK003 - Is the behaviour for a fresh organization (no kiosk configuration, no event configuration) defined end-to-end (migration, public branding response, admin form initial load)? [Completeness, Spec §Edge Cases / §FR-012]
- [x] CHK004 - Is the order of operations in FR-008 (write new logo to disk → insert MediaFileReference → update FK on event row → delete previous reference if unreferenced) specified for failure recovery? [Completeness, Spec §FR-008 / §Edge Cases]
- [x] CHK005 - Is the audit-event payload schema fully specified (each field name, type, nullability, and an example JSON object)? [Completeness, Spec §FR-025 / §Q9]
- [x] CHK006 - Are the admin navigation entry, quick action, and dashboard card all listed (route, label, icon, summary) so that the admin shell change is unambiguous? [Completeness, Spec §FR-022 / §Assumption]
- [x] CHK007 - Is there a single named identity (logo image element, overlay container) used consistently across FR-016/FR-017/FR-018 and SC-002 so a test can target it? [Consistency, Spec §FR-016–FR-018 / §SC-002]

## Requirement Clarity

- [x] CHK008 - Is "Patrocinadores del evento" visual placement quantified (left/center/right within the gold band, font size, weight, letter spacing, contrast ratio)? [Clarity, Spec §FR-019]
- [x] CHK009 - Is the overlay's geometry specified (max-width, padding, font-size, opacity, backdrop blur or solid background, breakpoint at ≤760px)? [Clarity, Spec §FR-016 / §FR-018]
- [x] CHK010 - Is "atomically replace" in FR-008 defined in implementation-neutral terms (what observable invariants hold for an external observer if the request fails mid-way)? [Clarity, Spec §FR-008]
- [x] CHK011 - Is the separator dot in the overlay specified (character, spacing, hidden when fewer than two pieces)? [Clarity, Spec §FR-016]
- [x] CHK012 - Is the upper bound for `eventDurationMinutes` (1440 minutes = 24h) justified with the kiosk session-length use case, or is it arbitrary? [Clarity, Spec §FR-003 / §FR-014]
- [x] CHK013 - Is the order of fields in the audit event payload specified (changedFields ordering, treatment of unchanged fields)? [Clarity, Spec §FR-025 / §Q9]
- [x] CHK014 - Is the logo replacement behaviour when both `file` and `removeLogo=true` are sent in the same PUT defined (rejected vs. file wins vs. removeLogo wins)? [Conflict, Spec §FR-007 / §FR-010]

## Requirement Consistency

- [x] CHK015 - Do FR-007–FR-010 consistently treat the logo as a single-slot resource owned by the event configuration row (no parallel endpoints, no shared media reference by other entities)? [Consistency, Spec §FR-007–FR-010]
- [x] CHK016 - Is the migration's "one-way transformation" assumption consistent with the down-migration in FR-011 (does the down-migration restore schema only, or also data)? [Consistency, Spec §FR-011 / §Assumption]
- [x] CHK017 - Are the wording of "Client ads" (legacy aria-label) and "Patrocinadores del evento" (new aria-label + visible title) consistent — is "Client ads" removed everywhere it appears (admin aria-labels, dashboard, copy strings), not only in the kiosk template? [Consistency, Spec §FR-020 / §Q2]
- [x] CHK018 - Are the role sets in FR-001/FR-023 (admin edit) consistent with the Q6 clarification and with the existing `CONFIGURATION_MANAGEMENT_ROLES` definition used elsewhere in the backend? [Consistency, Spec §FR-001 / §FR-023 / §Q6]
- [x] CHK019 - Does FR-014 enumerate every code path that reads event duration (services, repositories, scripts, tests, fixtures), or does it risk leaving stale readers that reference the removed column? [Consistency, Spec §FR-014 / §Edge Cases]

## Acceptance Criteria Quality

- [x] CHK020 - Is the latency in SC-008 ("within one second") defined by a concrete clock (request response received → audit event appears in `GET /api/events`) and an explicit test method? [Measurability, Spec §SC-008]
- [x] CHK021 - Is the visual equality check in SC-003 ("pixel-identical ± 1 px") defined with a concrete measurement (which DOM element, which breakpoint, which background) so the test is reproducible? [Measurability, Spec §SC-003]
- [x] CHK022 - Are all eight SCs traceable to at least one FR (TQ-001), with no SC that floats without a requirement it verifies? [Traceability, Spec §SC-001–SC-008]
- [x] CHK023 - Is the existing test surface (pytest layout, karma config) sufficient to host each SC's verification, or are new harnesses implied? [Traceability, Spec §TQ-002]

## Scenario Coverage

- [x] CHK024 - Are alternate flows covered: admin saves with same values (no-op), admin saves with whitespace-only text (treated as empty?), admin clears a single field? [Coverage, Spec §Edge Cases / §FR-007]
- [x] CHK025 - Are exception flows covered: `PUT /api/event-configuration` fails because `eventDurationMinutes` is invalid; admin sees the error and the form does not lose the unsaved values? [Coverage, Spec §FR-003 / §FR-014]
- [x] CHK026 - Are recovery flows covered: kiosk page reload mid-session keeps the last-fetched branding; kiosk `display/state` succeeds but `/api/event-branding` 5xx — does the kiosk keep showing the cached overlay, hide it, or surface an error? [Coverage, Spec §FR-015 / §Edge Cases]
- [x] CHK027 - Are non-functional flows covered: load on the kiosk with 50 ad images and a large logo (no layout shift, no overflow, no z-index war with the fullscreen prompt)? [Coverage, Spec §FR-018 / §FR-019]

## Edge Case Coverage

- [x] CHK028 - Is the case "operator deletes the event configuration row while a kiosk display is open" explicitly classified (out-of-scope per current edge-case list) and is the out-of-scope statement verified against the live session's `valid_until` semantics? [Edge Case, Spec §Edge Cases]
- [x] CHK029 - Is the case "logo media file deleted on disk out-of-band" covered with a concrete graceful-degradation behaviour (broken-image fallback, missing image tag, or `alt` text only)? [Edge Case, Spec §Edge Cases / §FR-018]
- [x] CHK030 - Is the case "two admins save the event configuration in quick succession" classified (last-write-wins is stated, but is concurrent PUT handled — e.g., both PUTs serialised by the row update)? [Edge Case, Spec §Edge Cases]
- [x] CHK031 - Is the case "admin PUT with `file` of valid type but empty content (0 bytes)" defined (rejected or accepted)? [Edge Case, Spec §FR-007]

## Non-Functional Requirements

- [x] CHK032 - Are accessibility requirements quantified beyond `aria-label` (e.g., minimum contrast ratio for the overlay text over the dark backdrop, focus order if the overlay becomes interactive)? [Gap, Spec §FR-018]
- [x] CHK033 - Are security requirements specified for the public `/api/event-branding` endpoint (rate limit, payload size cap, absence of any organisation-internal data, caching headers)? [Gap, Spec §FR-005]
- [x] CHK034 - Are performance expectations specified for the kiosk with the new parallel fetch (no measurable regression on the existing 1–60s polling budget, additional bandwidth ≤ X KB/poll)? [Gap, Spec §FR-015]

## Dependencies & Assumptions

- [x] CHK035 - Is the assumption "existing media storage (`media_file_references`) is reused" validated against the current code (the storage service, the reference-count logic, the `media_type` enum constraints)? [Assumption, Spec §Assumption]
- [x] CHK036 - Is the dependency on the `DisplayControlSyncService` removed consistently across all spec sections (the service is no longer required by FR-015 but is still referenced in the assumption as "Replaced by Q10")? [Consistency, Spec §FR-015 / §Assumption]
- [x] CHK037 - Are the existing role definitions (`CONFIGURATION_MANAGEMENT_ROLES`, `CONTENT_MANAGEMENT_ROLES`) cited by name in FR-001/FR-023 rather than re-listing the role names, so any future role-set change is automatically picked up? [Dependency, Spec §FR-001 / §FR-023]

## Migration Safety (high-weight)

- [x] CHK038 - Is the migration's down path documented (does `downgrade()` restore the `configured_event_duration_minutes` column from `event_configurations`)? [Completeness, Spec §FR-011 / §Assumption]
- [x] CHK039 - Is the migration's idempotency defined (running `alembic upgrade head` twice does not duplicate rows, drop a column twice, or fail on a partial prior run)? [Gap, Spec §FR-011]
- [x] CHK040 - Is the migration's data-preservation invariant explicit (after `alembic upgrade head`, for every pre-existing organisation, the value previously in `configured_event_duration_minutes` equals the value now in `event_duration_minutes`)? [Completeness, Spec §FR-011 / §FR-012]
- [x] CHK041 - Is the migration's atomicity defined for the case where the FK from `event_configurations.organizer_logo_media_id` to `media_file_references.id` cannot be created because of an existing row that violates the new constraint? [Edge Case, Spec §FR-002]

## Notes

- This checklist is a self-review tool. Items marked `[Gap]` indicate missing requirements that should be added to the spec before planning; items marked `[Consistency]`/`[Clarity]` indicate wording to tighten in-place.
- Migration safety (CHK038–CHK041) is weighted higher than the rest of the checklist because this feature moves a column with a check constraint used by an existing production flow (`open_display`).
- After addressing the open items, re-run this checklist and mark resolved items. Any remaining unchecked items become input to `/speckit-analyze` and the implementation plan's risk register.

## Resolution Log

- CHK014 (`file` + `removeLogo` conflict): resolved by FR-010a in the second clarify pass (Q11) — server rejects with HTTP 400, no partial state.
- CHK026 (branding fetch failure on the kiosk): resolved by FR-015a and SC-001a in the second clarify pass (Q13) — stale-while-error cache, no error chrome.
- CHK039 (migration idempotency): resolved by FR-011a and SC-004a in the second clarify pass (Q12) — `_column_exists` / `_table_exists` guards throughout.
- All items resolved by the clarification pass, plan/contracts, task coverage, or the remediation edits made before implementation.
