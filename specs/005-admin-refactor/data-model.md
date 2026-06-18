# Data Model: Administration Refactor

## Overview

This refactor may redesign persisted data structures, but it must preserve the business meaning and usability of existing records. The entities below describe the target conceptual model and migration obligations, not a final table design. Concrete table and field changes must be confirmed during implementation planning tasks and implemented with Alembic migrations.

## Entities

### Hall Destination

Represents a visible authenticated entry point.

Fields:

- `label`: user-facing destination name
- `route`: destination path
- `description`: short user-facing explanation
- `accessBehavior`: existing authorization behavior applied when the destination is opened

Validation:

- Must include kiosk mode and administration panel destinations.
- Must not introduce new role-filtered hall behavior unless the product specification is updated.
- Must preserve existing authorization outcomes when a destination is opened.

### Administration Section

Represents a navigable admin capability.

Fields:

- `id`: stable section identifier
- `label`: user-facing name
- `route`: navigation destination
- `summary`: short explanation
- `requiredRoles`: roles allowed to access the section
- `status`: readiness or setup summary when available

Relationships:

- Contains zero or more `AdministrationList` and `AdministrationForm` views.

Validation:

- Every required administration capability must have one section.
- Each section must be reachable from admin navigation in two clicks or fewer.

### Administration List

Represents a collection view for records such as content, ads, clients, domains, users, or events.

Fields:

- `sectionId`: owning administration section
- `columns`: visible fields
- `rows`: records shown to the user
- `actions`: allowed row and page actions
- `state`: `loading`, `ready`, `empty`, or `error`

Validation:

- Must provide loading, empty, error, and ready states.
- Must show active/inactive or readiness status where applicable.
- Must prevent destructive actions when dependencies block deletion.

### Administration Form

Represents a create/edit workflow.

Fields:

- `sectionId`: owning administration section
- `mode`: `create` or `edit`
- `fields`: visible form fields
- `validationMessages`: user-facing validation messages
- `dirtyState`: whether unsaved changes exist
- `saveState`: `idle`, `saving`, `saved`, or `failed`

Validation:

- Must prevent invalid saves.
- Must warn before losing unsaved changes.
- Must show safe user-facing save failures.

### User-Facing Contract

Represents observable behavior relied on by users and validation.

Fields:

- `contractId`: stable identifier
- `capability`: related administration or kiosk capability
- `inputs`: user-visible input fields or actions
- `outputs`: visible data, navigation, messages, and states
- `errors`: user-facing failure outcomes
- `compatibilityStatus`: `preserved`, `changed`, or `removed`
- `migrationNote`: required when changed or removed

Validation:

- Every intentionally changed contract must include compatibility or migration validation.
- No changed contract may remove an approved business goal without explicit approval.

### Application Error

Represents a failure translated into safe feedback and maintainable diagnostics.

Fields:

- `code`: stable error code
- `category`: validation, permission, dependency, upload, storage, migration, not found, conflict, or unexpected
- `userMessage`: safe user-facing message
- `diagnosticMessage`: maintainer-facing diagnostic context
- `correlationId`: optional diagnostic correlation value

Validation:

- User messages must not expose secrets, internal paths, raw session data, or stack traces.
- Errors affecting setup or kiosk operation must be observable.

### Data Migration

Represents a documented transition between persisted structures.

Fields:

- `migrationId`: stable migration identifier
- `sourceEntities`: existing records read by migration
- `targetEntities`: records after migration
- `preservedBusinessMeaning`: description of preserved behavior
- `validationChecks`: checks proving migrated data remains usable
- `rollbackNotes`: recovery or rollback considerations

Validation:

- Must preserve content, ads, clients, approved domains, users, roles, display configuration, media references, and operational records when those records exist.
- Must include automated migration validation.

## Existing Business Data To Preserve

- Organizations
- Users
- Role assignments
- Operator sessions
- Kiosk display configuration
- Top content items
- Client ad items
- Clients
- Approved embedded domains
- Media file references
- Display events and operational records

## State Transitions

### Administration Form

```text
idle -> dirty -> saving -> saved -> idle
idle -> dirty -> saving -> failed -> dirty
dirty -> discard -> idle
dirty -> blocked navigation -> dirty
```

### User-Facing Contract

```text
preserved
preserved -> changed -> migrated
preserved -> removed -> migrated
```

Removed contracts are allowed only when the same approved business goal remains reachable through a documented replacement.

### Data Migration

```text
not-required
planned -> implemented -> validated
planned -> blocked
```

Blocked migrations must stop implementation until the spec or plan is updated.
