---
id: CHG-033
type: change
status: implemented
modifies:
  - AUTH.RBAC
  - USERS.ROLES.ADMIN
depends_on:
  - CHG-031
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
requires_contract_update: true
read_by_default: true
---

# Feature Specification: User Password Lifecycle

**Feature Branch**: `033-user-password-lifecycle`

**Created**: 2026-07-06

**Status**: Implemented

**Input**: User description: "Fase 5 del plan maestro: eliminar password hardcodeado change-me al crear usuarios, permitir asignar password inicial en admin, y endpoint para cambio de password por admin u operador."

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `AUTH.RBAC`, `USERS.ROLES.ADMIN`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Admins assign an initial password when creating users (Priority: P1)

When an administrator creates a new operator or content manager, they
must set an initial password (or generate one) — not silently receive a
known default password shared by every user in the system.

**Why this priority**: Hardcoded `change-me` is a critical security gap
for any deployment beyond local lab.

**Independent Test**: Create user via admin API/UI with chosen password;
login as new user with that password succeeds; login with `change-me`
fails.

**Acceptance Scenarios**:

1. **Given** an administrator opens the create-user flow,
   **When** they submit email, roles, and initial password,
   **Then** the user is created and can sign in with that password.
2. **Given** create-user without password when required,
   **When** the form is submitted,
   **Then** validation prevents creation with a clear message.
3. **Given** a newly created user,
   **When** an attacker tries the old default password,
   **Then** login fails.

---

### User Story 2 — Passwords can be changed after creation (Priority: P1)

Administrators must reset passwords for locked-out operators; users with
appropriate permission must change their own password without database
access.

**Why this priority**: Password rotation is required for incident response
and onboarding hygiene.

**Independent Test**: Admin resets user password; user logs in with new
password. User changes own password; old password stops working.

**Acceptance Scenarios**:

1. **Given** an administrator managing an existing user,
   **When** they set a new password,
   **Then** the user can sign in with the new password immediately.
2. **Given** an authenticated user,
   **When** they change password providing current and new password,
   **Then** subsequent login requires the new password only.
3. **Given** wrong current password on self-service change,
   **When** submitted,
   **Then** the change is rejected without revealing which field failed
   beyond generic validation messaging.

---

### User Story 3 — Password quality rules are enforced (Priority: P2)

Passwords must meet minimum length and complexity suitable for an admin
tool — not single character or empty strings.

**Why this priority**: Prevents accidental weak credentials in production.

**Independent Test**: Submit weak passwords; verify rejection with
actionable validation messages.

**Acceptance Scenarios**:

1. **Given** a password shorter than the minimum length,
   **When** create or change is attempted,
   **Then** the request is rejected with validation feedback.
2. **Given** a password meeting policy,
   **When** submitted,
   **Then** the operation succeeds.

### Edge Cases

- Last admin cannot be left without a way to log in after password reset
  (admin-only reset path preserved).
- Deactivated users cannot change password or login.
- Password hashes never returned in API responses.
- Bootstrap admin password remains environment-driven (CHG-031), not this
  change.
- Unicode passwords supported via normalized UTF-8 handling.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: User creation MUST require an initial password from an
  authorized administrator (or a documented secure generation flow).
- **FR-002**: The system MUST NOT assign a hardcoded default password to
  new users.
- **FR-003**: Administrators MUST be able to reset another user's
  password within their organization scope.
- **FR-004**: Authenticated users MUST be able to change their own
  password when they provide the current password.
- **FR-005**: Password policy MUST enforce minimum length (at least 8
  characters) and reject empty passwords.
- **FR-006**: Password hashes MUST never appear in API responses or logs.
- **FR-007**: Admin UI create-user form MUST collect initial password
  consistent with API validation.

### Traceability & Quality Requirements

- **TQ-001**: `AUTH.RBAC` and `USERS.ROLES.ADMIN` contracts MUST be
  updated before merge.
- **TQ-002**: Tests MUST cover: create with password, reject default
  password path, admin reset, self-service change, weak password
  rejection.
- **TQ-003**: `specs/manifest.yml` MUST register CHG-033.

### Key Entities

- **Initial password**: Credential set at user creation time.
- **Password reset**: Administrator action to set a new credential.
- **Password change**: Self-service update with current password proof.

## Success Criteria *(mandatory)*

- **SC-001**: 0% of newly created users in tests receive the legacy
  default password.
- **SC-002**: 100% of valid create-user flows allow login with assigned
  password on first attempt.
- **SC-003**: Password change flows invalidate old password in 100% of
  success-path tests.
- **SC-004**: Weak passwords rejected in 100% of policy violation tests.

## Assumptions

- Email invitation / magic-link flow is out of scope for MVP.
- Forced password change on first login is optional follow-up, not required
  here if initial password is admin-chosen.
- CHG-031 may ship first; this change builds on hardened session handling
  but does not depend on session store choice.
- Single organization scope unchanged.

## Relationships

- Modifies: `AUTH.RBAC`, `USERS.ROLES.ADMIN`
- Depends on: CHG-031 (recommended order for production rollout)
- Supersedes: none
- Superseded by: none
