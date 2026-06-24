---
id: CHG-001
type: change
status: consolidated
modifies:
  - AUTH.RBAC
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into:
  - AUTH.RBAC
requires_contract_update: false
read_by_default: false
---
# Feature Specification: Foundation, Auth and RBAC

**Feature Branch**: `001-foundation-auth-and-rbac`
**Spec Directory**: `specs/changes/001-foundation-auth-and-rbac/`
**Created**: 2026-06-23
**Status**: Approved
**Input**: foundational data model for organizations, users and role assignments, plus the session-cookie authentication flow and the role-based access control (RBAC) primitives that every other spec depends on.

## User Scenarios & Testing

### User Story 1 — Operator signs in (Priority: P1)

An operator opens the kiosk app in a browser, lands on the login page,
enters their email and password, optionally ticks "Recordarme", and is
authenticated. The backend issues an `httponly` session cookie and
returns the user profile (id, email, displayName, isActive, roles). The
client then routes the operator into the application.

**Why this priority**: every other spec depends on having an
authenticated identity and a role set attached to it.

**Independent Test**: POST `/auth/login` with a valid bootstrap admin
credential returns 200 + `UserSchema`; the response sets the
`kiosk_session` cookie; subsequent GET `/auth/me` returns the same
profile.

**Acceptance Scenarios**:

1. **Given** an active user with valid password, **When** POST
   `/auth/login` is called with `rememberMe=false`, **Then** the
   response is 200, `UserSchema` is returned, and the session cookie
   has `Max-Age=86400` (24 h).
2. **Given** an active user with valid password, **When** POST
   `/auth/login` is called with `rememberMe=true`, **Then** the session
   cookie has `Max-Age=2592000` (30 d).
3. **Given** an inactive user, **When** POST `/auth/login` is called,
   **Then** the response is 401 with no detail about the account
   state.
4. **Given** an unknown email, **When** POST `/auth/login` is called,
   **Then** the response is 401 and no information about the email's
   existence leaks.
5. **Given** a valid session cookie, **When** GET `/auth/me` is called,
   **Then** the response is 200 with the same `UserSchema` returned
   on login.
6. **Given** a valid session cookie, **When** POST `/auth/logout` is
   called, **Then** the response is 204, the cookie is deleted, and a
   subsequent GET `/auth/me` returns 401.

### User Story 2 — Role-based access control (Priority: P1)

Every protected endpoint reads the authenticated user's roles and
applies one of six role sets. The five `Role` enum values are
hierarchical by capability: a user with `administrator` can do
everything a `content_manager` or `advertising_manager` can, plus
user and key administration; an `event_operator` can open the kiosk
display and operate the remote control; `display_viewer` exists for
read-only kiosk access (no admin endpoints grant it).

**Why this priority**: without a shared, centralized role set, every
spec re-implements authorization, and the codebase drifts.

**Independent Test**: invoking each role set as a dependency in
isolation returns 403 for endpoints the role does not own.

**Acceptance Scenarios**:

1. **Given** a user with role `event_operator`, **When** they call
   `POST /display/open`, **Then** the request succeeds (200).
2. **Given** a user with role `display_viewer`, **When** they call
   `POST /display/open`, **Then** the request fails with 403.
3. **Given** a user with role `content_manager`, **When** they call
   `POST /content`, **Then** the request succeeds.
4. **Given** a user with role `content_manager`, **When** they call
   `POST /ads`, **Then** the request fails with 403 (cross-domain).
5. **Given** a user with role `advertising_manager`, **When** they
   call `PUT /display/configuration`, **Then** the request fails
   with 403 (the configuration form owns cross-domain writes).

### User Story 3 — Bootstrap admin on first run (Priority: P2)

On the first run of an empty database, a bootstrap admin user is
created from the `BOOTSTRAP_ADMIN_*` environment variables. The
bootstrap admin has role `administrator` and `is_active=True`. This
flow runs only when no users exist in the database; subsequent
restarts do not re-create the admin.

**Why this priority**: an empty database is unreachable without it.

**Independent Test**: dropping the schema, booting the app against an
empty PostgreSQL, then calling `GET /auth/me` after authenticating
with the bootstrap credentials returns 200.

**Acceptance Scenarios**:

1. **Given** an empty `users` table, **When** the backend starts,
   **Then** a user is created with the bootstrap credentials and the
   `administrator` role.
2. **Given** an existing user, **When** the backend starts, **Then** no
   bootstrap user is created and existing data is untouched.
3. **Given** a bootstrap user exists, **When** `GET /auth/me` is
   called after login, **Then** `roles` includes `administrator`.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST persist organizations, users, and
  role assignments in dedicated tables, with `(organization_id, email)`
  unique on `users` and `(user_id, role)` unique on
  `role_assignments`.
- **FR-002**: The system MUST expose `POST /auth/login` that accepts
  `LoginRequest { email, password, rememberMe }`, validates against
  the active user whose email matches, and on success issues an
  `httponly` `kiosk_session` cookie plus a `UserSchema` response.
- **FR-003**: The system MUST use 24 h session duration when
  `rememberMe=false` and 30 d when `rememberMe=true`; the cookie
  `Max-Age` MUST reflect the chosen duration.
- **FR-004**: The system MUST return 401 on invalid credentials
  without leaking whether the email exists.
- **FR-005**: The system MUST expose `POST /auth/logout` that
  invalidates the session token server-side, deletes the cookie, and
  returns 204.
- **FR-006**: The system MUST expose `GET /auth/me` that returns the
  authenticated `UserSchema`; 401 if the cookie is missing, invalid,
  or expired.
- **FR-007**: The system MUST define a `Role` enum with the five
  values `display_viewer`, `event_operator`, `content_manager`,
  `advertising_manager`, `administrator`.
- **FR-008**: The system MUST define the six role sets
  `DISPLAY_OPEN_ROLES`, `CONTENT_MANAGEMENT_ROLES`,
  `AD_MANAGEMENT_ROLES`, `ADMIN_ROLES`, `REMOTE_CONTROL_ROLES`,
  `CONFIGURATION_MANAGEMENT_ROLES` and expose `has_any_role(...)` and
  `can_open_display(...)` as the shared authorization primitives.
- **FR-009**: The system MUST create a bootstrap admin user from
  `BOOTSTRAP_ADMIN_*` environment variables on the first run of an
  empty database; subsequent boots MUST NOT mutate existing users.
- **FR-010**: The system MUST hash passwords with a non-reversible
  algorithm (e.g. Argon2 or bcrypt) and MUST NOT log or persist raw
  passwords.
- **FR-011**: The frontend MUST expose a `sessionGuard` Angular route
  guard that redirects unauthenticated users to `/login` and an
  `authRootGuard` that redirects authenticated users away from
  `/login`; both MUST rely on `AuthService` as the single source of
  truth.
- **FR-012**: The frontend MUST render a Material-based login form
  with email, password, and remember-me fields, and surface server
  401 errors as a non-blocking "credenciales incorrectas" message
  without revealing whether the email exists.

### Key Entities

- **Organization**: `id`, `name`, timestamps. Owns users.
- **User**: `id`, `organization_id`, `email`, `display_name`,
  `password_hash`, `is_active`, timestamps. Unique per org on
  `(organization_id, email)`.
- **RoleAssignment**: `id`, `organization_id`, `user_id`, `role`
  (string from `Role` enum), timestamps. Unique per
  `(user_id, role)`.

## Success Criteria

- **SC-001**: A new developer can sign in with the bootstrap admin
  credentials and reach `/admin` in under 60 s after the database
  schema is empty.
- **SC-002**: All five `Role` enum values and the six role sets are
  re-exported from `backend/app/domain/roles.py` and consumed by every
  protected endpoint; no endpoint re-declares its own role string
  literals.
- **SC-003**: The session cookie is `httponly` and `samesite=lax`;
  JavaScript cannot read its value.

## Assumptions

- The first organization is created by the bootstrap flow; subsequent
  organizations are out of scope.
- The bootstrap admin's password is set via
  `BOOTSTRAP_ADMIN_PASSWORD` and is rotated manually on first login
  in a future spec.
- All other specs reuse `Role`, the six role sets, and the auth
  dependencies without modification.

## Supersedes

None. This is the first spec in the corpus.

## Superseded by

None yet.
