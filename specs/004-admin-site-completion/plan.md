# Implementation Plan: Administration Site Completion

**Branch**: `006-admin-site-completion` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-admin-site-completion/spec.md`

## Summary

Complete the administrator-facing site so administrators can configure the whole kiosk from visible, discoverable screens. The implementation extends the existing Angular admin/content/ad/readiness views with a dashboard entry screen, persistent navigation, quick actions, complete management forms and lists, empty states, unsaved-change protection, and clearer validation/failure feedback. Backend work is limited to contract gaps needed by the UI; existing FastAPI, SQLAlchemy, Alembic, PostgreSQL, upload, media, configuration, readiness, user, role, content, ad, client, and domain capabilities remain the source of behavior.

## Technical Context

**Language/Version**: TypeScript with Angular-supported TypeScript version; Python 3.12 for backend runtime and tooling

**Primary Dependencies**: Angular standalone components, Angular Router, Angular forms, Angular HTTP client, FastAPI, Pydantic, SQLAlchemy 2.x, Alembic, PostgreSQL driver, pytest, Angular-compatible test runner

**Storage**: PostgreSQL remains the source of truth for persisted administration data. Uploaded media remains disk-backed with PostgreSQL metadata references from the existing media upload feature.

**Testing**: Angular unit/component tests for dashboard, navigation, forms, dirty-form guard, empty states, and API services; pytest backend tests only for changed API/readiness contract behavior; smoke validation for complete admin setup flow

**Target Platform**: Web browser for administrators on desktop and tablet-sized viewports; existing FastAPI backend and PostgreSQL database

**Project Type**: Web application with separated Angular frontend and FastAPI backend packages in one repository

**Performance Goals**: Administrator can reach each section in two clicks or fewer; basic kiosk setup can be completed in under 10 minutes; save/upload/validation/storage failure feedback appears within 5 seconds; administration layouts remain usable at 1024x768 and 1440x900 viewports

**Constraints**: Keep Angular as the frontend framework and FastAPI/SQLAlchemy/Alembic/PostgreSQL as backend stack. Keep UI logic separate from domain/application logic. Avoid new backend dependencies unless a contract gap cannot be solved through existing APIs. Do not change kiosk display playback behavior except where current admin configuration visibility requires it.

**Scale/Scope**: One administrator-focused MVP admin experience covering dashboard, navigation, content, ads, clients, iframe/domain management, display configuration, readiness, users, and roles. Multi-organization administration, new media types, scheduled publishing, analytics, billing, and ad targeting remain out of scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Spec traceability**: PASS. The plan maps to the approved specification, user stories US1-US4, functional requirements FR-001-FR-021, and success criteria SC-001-SC-008.
- **Requirement clarity**: PASS. Clarification resolved the dashboard entry experience and unsaved-change navigation behavior.
- **Plan alignment**: PASS. Technical approach stays inside the existing Angular/FastAPI architecture and focuses on administration-site completion.
- **Simplicity**: PASS. The plan consolidates existing screens under a coherent shell and adds small shared UI helpers rather than creating a second administration application.
- **Contracts**: PASS. UI expectations and any backend API contract gaps are documented in `contracts/admin-ui-contract.md`.
- **Testing**: PASS. Changed frontend behavior has component/service tests and admin setup smoke validation; backend contract tests are planned only for changed API behavior.
- **Security, observability, accessibility**: PASS. Role-gated admin access, non-sensitive errors, keyboard usability, focus visibility, readable labels, and admin failure feedback are planned.
- **No speculative scope**: PASS. Visual rebranding, new playback behavior, analytics, multi-organization admin, scheduled publishing, and new media types remain excluded.
- **Conflict handling**: PASS. If existing API reality cannot support a required admin screen, implementation stops and the spec/plan is updated before changing direction.

## Proposed Architecture

The feature keeps the existing separated frontend/backend structure:

1. **Angular administration shell**: Add a dashboard entry view and persistent navigation that links to all admin sections. Existing content, ads, clients, domains, configuration, readiness, users, and roles views are organized under the administration experience.
2. **Angular feature screens**: Extend existing list and form components with complete fields, empty states, status summaries, quick actions, dirty-form detection, and clear success/error feedback.
3. **Angular services and guards**: Keep API communication in services. Add a dirty-form navigation guard or shared form-state helper so unsaved changes are handled consistently.
4. **FastAPI backend**: Reuse existing endpoints for content, ads, clients, approved domains, configuration, readiness, users, roles, uploads, and media. Add or adjust schemas only if the admin UI needs fields that are not currently exposed.
5. **PostgreSQL/media storage**: No new persistence model is expected. Existing tables and uploaded media references remain in force.

## Affected Frontend Modules

- `frontend/src/app/admin/`
  - Add administration dashboard with setup status, quick actions, and section summaries.
  - Extend admin shell navigation to all sections and active section state.
  - Extend display configuration, approved domains, users, and roles UX, including user create/edit/active status and assignment of existing role types.
- `frontend/src/app/content/`
  - Complete content list and form behavior for uploaded image/video and iframe entries.
  - Add empty states, edit paths, delete affordances where allowed, validation feedback, and dirty-form tracking.
- `frontend/src/app/ads/`
  - Complete client/ad list and form behavior, including selectable clients for ad upload.
  - Add empty states, edit paths, delete affordances where allowed, validation feedback, and dirty-form tracking.
- `frontend/src/app/readiness/`
  - Show blockers/warnings with clear links or directions to relevant admin sections.
- `frontend/src/app/shared/`
  - Add shared admin navigation models, quick action models, form dirty-state helper, reusable empty/error states, and compact status presentation if useful.
- `frontend/src/app/app.routes.ts`
  - Route admin dashboard and admin child sections so all admin areas are reachable from visible navigation.

## Affected Backend Modules

- `backend/app/api/`
  - Adjust response schemas only if required fields are missing from current admin UI needs.
  - Preserve validation and authorization behavior at API boundaries.
- `backend/app/services/`
  - Reuse existing services. Add readiness summary helpers only if current readiness data is insufficient for dashboard setup status.
  - Add minimal client/domain update, deactivate/reactivate, dependency-safe delete, and event-recording behavior only where current APIs lack the clarified management contract.
- `backend/tests/`
  - Add or update contract/integration tests only for changed backend behavior.

## UI Contracts

Administration UI expectations are defined in [contracts/admin-ui-contract.md](./contracts/admin-ui-contract.md).

Primary UI contract groups:

- Dashboard setup status and quick actions
- Persistent navigation and active section state
- Complete management list contracts
- Complete management form contracts
- Dirty-form navigation warning
- Failure and empty state presentation
- Readiness blocker/warning guidance

## Data Model

No new persisted entities are expected. The feature uses existing data concepts:

- Administrator
- Administration Section
- Main Content Item
- Client Ad Item
- Client
- Approved Domain
- Display Configuration
- Readiness Status
- User and Role Assignment

Detailed field expectations and validation rules are documented in [data-model.md](./data-model.md).

## Validation and Error Handling

- Admin forms must block invalid or incomplete changes before save.
- Upload and storage errors must identify the failed item and corrective action without exposing internal paths.
- Dirty forms must warn before leaving and allow the administrator to stay or discard changes.
- Empty states must state what is missing and provide the action to add the first record where creation is supported.
- Readiness blockers and warnings must guide administrators to the section that resolves the problem.
- Backend validation and authorization failures must remain visible as non-technical admin-facing messages.
- Content and ad deletion may use existing hard-delete behavior. Client and approved-domain deletion must be blocked when active dependent ads or iframe content exist; the UI must offer deactivate/reactivate as the safe default.
- Concurrent edits use last-save-wins behavior. Successful saves refresh list/detail data, and failed saves must not overwrite the latest persisted state.

## Security Considerations

- Preserve administrator role checks for full administration capabilities.
- Users and roles management is limited to existing role types; password reset and new role-type creation are excluded.
- Do not expose internal file paths, secrets, raw session data, or token values in screens or errors.
- Keep upload failure and readiness diagnostics non-sensitive.
- Do not broaden permissions for non-administrator users as part of this administrator-focused feature.

## Observability

- Existing backend display/admin events remain sufficient unless new backend behavior is added. New client/domain mutation endpoints must record admin events consistent with existing content/ad/configuration changes.
- Frontend should surface save/upload/configuration/readiness failures clearly to administrators.
- Smoke validation should record whether dashboard and readiness guidance make blockers actionable.

## Accessibility

- Persistent navigation and all forms must be keyboard usable.
- Active navigation state and focus state must be visible.
- Forms must use clear labels for all inputs.
- Error and success states must be visible and compatible with assistive technology expectations.
- Layout must avoid overlapping text or hidden actions at 1024x768 and 1440x900 viewport sizes.

## Testing Strategy

- **Frontend component tests**: admin dashboard, shell navigation, active state, empty states, dirty-form warning, content/ad/client/domain/configuration/readiness views.
- **Frontend service tests**: request and response shapes used by dashboard, lists, forms, readiness, users, and roles.
- **Backend tests**: only for changed response fields, readiness summary behavior, or the minimal client/domain mutation endpoints required by the clarified management contract.
- **Accessibility-oriented tests**: keyboard-visible controls, labels, validation message presence, and 1024x768/1440x900 layout checks for administration forms.
- **Smoke validation**: log in as administrator, complete the basic kiosk setup flow from dashboard/navigation only, verify every section is reachable in two clicks or fewer, verify dirty-form warning, verify failure/empty states, verify 5-second failure feedback, and verify users/roles create/edit/role assignment flow.

## Local Development Setup

- Use the existing local lab database, backend, and frontend startup documented in `README.md`.
- Apply existing migrations before exercising administration screens.
- Start backend and frontend, then log in as `admin@example.com` / `admin`.
- Use the dashboard as the entry point for validation.

## CI/CD Considerations

- Existing CI should continue running backend tests, frontend tests, frontend build, and Docker image builds.
- Add frontend tests for new admin shell/dashboard/form behavior to the normal frontend test command.
- No new deployment resource is expected unless a backend contract gap introduces server-side changes.

## Risks and Assumptions

- **Risk**: Administration completion can become a large redesign. **Mitigation**: keep scope to dashboard, navigation, completeness, and usability of existing workflows.
- **Risk**: Current backend APIs may not expose all fields needed by complete admin lists/forms. **Mitigation**: document contract gaps and add minimal schema changes only when required.
- **Risk**: Delete actions can break dependent ads or iframe content. **Mitigation**: prefer deactivate/reactivate for clients/domains and block hard delete when active dependents exist.
- **Risk**: Dirty-form warnings can become inconsistent across forms. **Mitigation**: use one shared behavior pattern for form screens.
- **Risk**: Dashboard duplicates readiness logic. **Mitigation**: dashboard summarizes readiness and links to readiness details rather than creating a second source of truth.
- **Assumption**: Existing admin authentication, media upload, content, ads, clients, approved domains, readiness, users, and roles behavior remains valid.
- **Assumption**: Administrator-focused completion does not need role-specific non-admin variants in this feature.
- **Assumption**: Existing upload limits, media types, and approved-domain policy remain unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/004-admin-site-completion/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── admin-ui-contract.md
├── checklists/
│   ├── requirements.md
│   └── admin-ux.md
└── tasks.md              # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── api/
│   ├── services/
│   └── repositories/
└── tests/
    ├── contract/
    ├── integration/
    └── unit/

frontend/
├── src/
│   └── app/
│       ├── admin/
│       ├── ads/
│       ├── content/
│       ├── readiness/
│       ├── shared/
│       └── app.routes.ts
```

**Structure Decision**: Use the existing web application structure. Most work is in `frontend/src/app`; backend paths are touched only for contract gaps.

## Complexity Tracking

No constitution violations or complexity exceptions are currently required.
