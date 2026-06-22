# Backend Contract: Administration Refactor

## Purpose

Define backend contract expectations for the refactor. The exact endpoint structure may change, but approved business goals, safe errors, authorization, and migration validation must remain covered.

## API Boundary Contract

Backend APIs must expose documented contracts for:

- authentication and current user
- hall/admin/kiosk authorization support
- content management
- ad management
- client management
- approved domain management
- display configuration
- display state and open display behavior
- readiness
- users and roles
- media access and upload
- operational events or diagnostics

OpenAPI must document the final API surface.

## Authorization Contract

- Authentication is required for hall, administration, kiosk display, and protected media/API access.
- Existing role intent must be preserved:
  - administrator: full administration
  - content manager: content-oriented administration
  - advertising manager: ad/client-oriented administration
  - event operator: display operation as currently approved
  - display viewer: display viewing as currently approved
- The refactor must not broaden permissions without explicit approval.

## Error Contract

Every user-facing backend error must use a safe error envelope with:

- stable error code
- safe user-facing message
- optional non-sensitive details
- appropriate status category

Errors must cover:

- validation failure
- authentication failure
- authorization failure
- not found
- dependency conflict
- upload failure
- storage failure
- migration/compatibility failure
- unexpected server failure

No response may expose:

- internal filesystem paths
- secrets
- raw session data
- stack traces
- database connection details

## Service Boundary Contract

Backend application services must own business behavior for:

- content
- ads
- clients
- approved domains
- display configuration
- readiness
- users and roles
- media storage coordination

FastAPI route handlers must not contain business rules beyond boundary validation, dependency wiring, and response mapping.

## Persistence Contract

- PostgreSQL remains the persisted source of truth.
- SQLAlchemy-managed patterns remain the database access layer.
- Alembic migrations are required for structural changes.
- Disk-backed media storage remains supported unless a separately approved plan changes it.

## Contract Change Rule

Any changed endpoint, payload, response, role behavior, or error shape must document:

- previous behavior
- new behavior
- reason for change
- affected frontend/admin workflow
- migration or compatibility validation
- OpenAPI/contract test coverage
