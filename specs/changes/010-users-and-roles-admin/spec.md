---
id: CHG-010
type: change
status: consolidated
modifies:
  - USERS.ROLES.ADMIN
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into:
  - USERS.ROLES.ADMIN
requires_contract_update: false
read_by_default: false
---
# Feature Specification: Users and Roles Admin

**Feature Branch**: `010-users-and-roles-admin`
**Spec Directory**: `specs/changes/010-users-and-roles-admin/`
**Created**: 2026-06-23
**Status**: Approved
**Input**: the admin user CRUD at `/admin/users`, the role
assignment flow, the `user_changed` audit event, and the
five-value `Role` enum (consumed in spec 001).

## User Scenarios & Testing

### User Story 1 — List and create users (Priority: P1)

An administrator opens `/admin/users`, sees the list of users in
the organization with their roles and active flag, creates a new
user with one or more roles, and the new user can sign in
immediately with the initial password (the form's password field
is the initial value; the user rotates it on first login).

**Why this priority**: a single-tenant app cannot have
collaborators without this.

**Independent Test**: POST `/users` with a valid payload returns
201 + `UserSchema`; the new user can sign in with the initial
credentials.

**Acceptance Scenarios**:

1. **Given** an `administrator`, **When** POST `/users` is called
   with a valid payload, **Then** the response is 201 +
   `UserSchema` and a `user_changed` event is recorded.
2. **Given** a duplicate email within the same organization,
   **When** POST `/users` is called, **Then** the response is 409
   (the unique constraint
   `uq_users_organization_email`).
3. **Given** a `content_manager`, **When** POST `/users` is
   called, **Then** the response is 403.
4. **Given** an `administrator`, **When** GET `/users` is called,
   **Then** the response lists the org's users with their
   `roles`.

### User Story 2 — Edit and deactivate users (Priority: P2)

An administrator edits a user's display name and roles, or
deactivates the user (`is_active=false`). A deactivated user
cannot sign in (`POST /auth/login` returns 401). The edit MUST
record a `user_changed` event with the diff metadata.

**Why this priority**: a user leaving the org should be
deactivated, not deleted; deletion would orphan audit rows.

**Independent Test**: PUT `/users/{id}` with `isActive=false`
returns 200; the user can no longer sign in.

**Acceptance Scenarios**:

1. **Given** an `administrator`, **When** PUT `/users/{id}` is
   called with a new role set, **Then** the response is 200 and a
   `user_changed` event is recorded.
2. **Given** `isActive=false`, **When** the user signs in,
   **Then** the response is 401 (no information leak).
3. **Given** the authenticated user being edited is the same as
   the target, **When** PUT is called, **Then** the response is
   200 (an admin can demote themselves; the bootstrap admin
   cannot demote themselves below `administrator` to avoid
   lockout).

## Requirements

### Functional Requirements

- **FR-001**: The system MUST expose the user CRUD endpoints
  (`GET /users`, `POST /users`, `PUT /users/{id}`) gated by
  `ADMIN_ROLES`.
- **FR-002**: A duplicate `(organization_id, email)` pair MUST
  return 409 on create.
- **FR-003**: The user `roles` field MUST be a list of strings
  drawn from the `Role` enum; the backend MUST validate that
  every value is a known role.
- **FR-004**: Setting `isActive=false` MUST prevent the user
  from signing in (per spec 001 US1 AS-3).
- **FR-005**: The system MUST record a `user_changed` audit
  event on every create and update, with the user id and a
  short diff metadata.
- **FR-006**: The frontend MUST expose `/admin/users` with the
  list, the create form, and the edit form; the form MUST show
  a multi-select for the roles and the `isActive` toggle.
- **FR-007**: The system MUST refuse to demote the last remaining
  `administrator` to avoid lockout; the PUT MUST return 409 with
  a "last administrator" code in that case.

### Key Entities

- **User**: see spec 001.
- **RoleAssignment**: see spec 001.

## Success Criteria

- **SC-001**: An administrator can create 5 users with
  different role combinations in under 2 minutes.
- **SC-002**: A deactivated user is denied sign-in within 1 s
  of the `isActive=false` save.
- **SC-003**: The "last administrator" guard returns 409 with
  a clear code; the audit log records the rejected attempt.

## Assumptions

- The user form accepts the initial password as plain text over
  HTTPS; the backend hashes it with the same algorithm used in
  spec 001.
- User records are not deleted; deactivation is the only
  removal path (preserves audit trail).

## Supersedes

None.

## Superseded by

- `001-foundation-auth-and-rbac` defines the underlying `users`
  and `role_assignments` tables and the auth flow; this spec
  adds the admin CRUD on top.
