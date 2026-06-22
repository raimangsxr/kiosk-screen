# Admin UI Contract: Administration Site Completion

This contract documents expected user-interface behavior and frontend/backend data expectations for the completed administration site.

## Dashboard Contract

The administration dashboard must present:

- Overall setup status: ready, blocked, or warning.
- Readiness blockers and warnings with links or clear direction to the resolving section.
- Quick actions for content upload, iframe entry, client creation, ad upload, display configuration, domain management, readiness, and user/role management where appropriate.
- Persistent navigation to every administration section.

## Navigation Contract

Required visible destinations:

- Dashboard
- Content
- Ads
- Clients
- Iframe/domain management
- Display configuration
- Readiness
- Users and roles

Rules:

- Every destination is reachable from the administration site without manual URL entry.
- Current active section is visible.
- Every section is reachable in two clicks or fewer from the administration site.
- Navigation remains usable at common desktop and tablet viewport sizes.

## List Contract

Administration lists must define:

- Empty state when no records exist.
- Primary action when record creation is supported.
- Row fields: name/title, type where relevant, active state where relevant, display order where relevant, and media/source presence where relevant.
- Edit action for records that can be updated.
- Delete action only where deletion is allowed.
- Client and approved-domain delete actions must be hidden or blocked when active dependent ads or iframe content exist; deactivate/reactivate remains available.

## Form Contract

Administration forms must define:

- Clear field labels.
- Required field indicators through label or validation text.
- Save success state.
- Validation failure state.
- Authorization failure state.
- Upload/storage failure state where uploads are present.
- Dirty-form warning before navigation away.
- Stay/discard choices when leaving dirty forms.
- After a successful save, list/detail data refreshes so last-save-wins behavior is visible.

## Readiness Guidance Contract

Readiness blockers and warnings must include:

- Human-readable issue text.
- Whether the issue blocks kiosk readiness.
- The administration section or action that resolves the issue.
- No internal paths, secrets, or raw session values.

## Backend Contract Expectations

Existing backend responses should provide enough data for:

- Content/ad/client/domain/configuration/user/role lists and forms.
- Dashboard readiness summaries.
- Upload success and failure feedback.
- Validation and authorization failure messages.
- Users and roles list/create/edit flows using existing role types.
- Dependency-safe client and approved-domain deactivate/reactivate/delete flows.

If implementation discovers missing fields, add minimal response fields and corresponding backend contract tests before changing frontend assumptions.

## Viewport and Feedback Contract

- Administration navigation, lists, and forms must remain readable and actionable at 1024x768 and 1440x900.
- Save, upload, validation, and storage failure feedback must be visible within 5 seconds of the failed action.
- Normal admin screens and errors must not expose internal file paths, secrets, or raw session values.
