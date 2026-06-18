# Migration Contract: Administration Refactor

## Purpose

Define requirements for any persisted data redesign performed during the refactor.

## Migration Scope

If data structures change, migration must preserve:

- organizations
- users
- role assignments
- operator sessions when still relevant
- kiosk display configuration
- top content items
- client ad items
- clients
- approved embedded domains
- media file references
- display events and operational records

## Migration Documentation

Each migration must document:

- source records
- target records
- field mapping
- default values for new required fields
- removed or replaced fields
- business meaning preserved
- rollback or recovery notes
- validation checks

## Migration Validation

Migration validation must prove:

- existing content can still be listed, edited, and displayed
- existing ads can still be listed, edited, and displayed
- clients and approved domains retain dependency relationships
- users and roles retain expected access
- display configuration still drives kiosk timing and layout
- media references still resolve
- operational records remain queryable or have documented replacement

## Acceptance Rule

No persisted data redesign is complete until migration validation passes for representative existing data or an explicit approved exception is documented.
