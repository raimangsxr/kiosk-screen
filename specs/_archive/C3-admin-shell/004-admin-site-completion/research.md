# Research: Administration Site Completion

## Decision: Treat The Feature As Admin UX Completion, Not New Domain Behavior

**Rationale**: The specification asks for full administrator configurability, easy kiosk setup, and complete navigation. Existing features already provide most domain behavior for uploads, iframes, ads, clients, configuration, users, and readiness. Keeping this feature focused on administration UX avoids duplicating backend business rules.

**Alternatives considered**:
- Rebuild the admin area as a separate application: rejected as unnecessary scope and architecture drift.
- Add new backend domain entities for dashboard state: rejected unless existing readiness/configuration APIs cannot support summaries.

## Decision: Dashboard Entry With Readiness Summary And Quick Actions

**Rationale**: The clarified requirement selects a dashboard entry screen. The dashboard should summarize setup status, expose blockers/warnings, and provide quick actions while linking to detailed sections rather than becoming a second readiness implementation.

**Alternatives considered**:
- Direct configuration screen entry: rejected because it does not help administrators discover all setup areas.
- Step-by-step wizard only: rejected because day-to-day administration needs free navigation.

## Decision: Persistent Administration Navigation Covers Every Section

**Rationale**: SC-001 requires every administration section to be reachable in two clicks or fewer. A persistent navigation model is the simplest way to satisfy this across dashboard, lists, forms, and readiness.

**Alternatives considered**:
- Contextual links only: rejected because they make discoverability fragile.
- Separate top-level routes without shell navigation: rejected because administrators would still need to know URLs.

## Decision: Shared Dirty-Form Pattern

**Rationale**: FR-021 requires warning before losing unsaved changes. A shared dirty-form pattern keeps behavior consistent across content, ads, clients, domains, configuration, and user/role forms.

**Alternatives considered**:
- Silent discard: rejected by clarification.
- Autosave drafts: rejected as larger scope and persistence complexity not required by the spec.

## Decision: Minimal Backend Changes

**Rationale**: Existing APIs should remain the source of content, ads, clients, configuration, domains, readiness, users, roles, media uploads, and errors. Backend changes should only fill fields missing from visible admin screens or dashboard/readiness summaries.

**Alternatives considered**:
- Add a dedicated admin dashboard API immediately: deferred until implementation confirms current APIs are insufficient.
- Duplicate readiness calculations in frontend: rejected because readiness should have one source of truth.

## Decision: Test Primarily At Frontend Component And Service Boundaries

**Rationale**: Most changed behavior is navigation, form completion, empty/error states, dirty-form protection, and dashboard UI. Frontend component and service tests directly cover those contracts. Backend tests are needed only for changed API contracts.

**Alternatives considered**:
- Backend-heavy test plan: rejected because it would not validate the main UX risk.
- Manual-only validation: rejected by the constitution's testing requirements.
