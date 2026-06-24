---
id: CHG-<NNN>
type: change
status: draft
modifies: []
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
source_of_truth: false
read_by_default: false
requires_contract_update: false
oversize: false
---

# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`

**Created**: [DATE]

**Status**: Draft

**Input**: User description: "$ARGUMENTS"

## SDD Context

- Manifest entry required: yes
- Affected active contracts: [list ids from `specs/manifest.yml`]
- Context pack: `context-pack.md`
- Contract update required before implementation: [yes/no]

## User Scenarios & Testing *(mandatory)*

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain value and priority]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain value and priority]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### Edge Cases

- [Boundary condition]
- [Failure mode]

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST [specific capability]
- **FR-002**: The system MUST [specific capability]

### Traceability & Quality Requirements

- **TQ-001**: The affected active contract MUST be updated if observable behavior changes.
- **TQ-002**: The change MUST include automated tests or an explicit manual validation task with rationale.
- **TQ-003**: The manifest entry MUST be updated before implementation is considered complete.

### Key Entities

- **[Entity 1]**: [Description]

## Success Criteria *(mandatory)*

- **SC-001**: [Measurable outcome]
- **SC-002**: [Measurable outcome]

## Assumptions

- [Assumption]

## Relationships

- Modifies: [contract ids]
- Extends: [change ids or contract ids]
- Depends on: [change ids, contract ids, ADRs]
- Supersedes: [only if this replaces another spec]
- Superseded by: [blank until replaced]
