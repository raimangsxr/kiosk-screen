<!--
Sync Impact Report
Version change: template -> 1.0.0
Modified principles:
- Template principle 1 -> I. Spec-Driven Development
- Template principle 2 -> II. Clear, Testable, Traceable Requirements
- Template principle 3 -> III. Plan-Aligned Implementation
- Template principle 4 -> IV. Simple Modular Architecture
- Template principle 5 -> V. Explicit Contracts and Quality Gates
Added sections:
- Development Workflow
- Cross-Cutting Standards
Removed sections:
- None
Templates requiring updates:
- updated: .specify/templates/plan-template.md
- updated: .specify/templates/spec-template.md
- updated: .specify/templates/tasks-template.md
- not applicable: .specify/templates/commands/*.md (directory absent)
- reviewed: AGENTS.md
Follow-up TODOs:
- None
-->
# kiosk-screen Constitution

## Core Principles

### I. Spec-Driven Development
Non-trivial work MUST start from an approved Spec Kit specification, plan, and task list.
Implementation MUST be traceable to explicit tasks and validation steps. Direct-to-code changes
are allowed only for trivial maintenance that does not alter behavior, architecture, contracts,
or user-visible output.

Rationale: The application is greenfield, so disciplined discovery and traceability prevent
unreviewed scope from becoming implicit product behavior.

### II. Clear, Testable, Traceable Requirements
Requirements MUST be written as clear, testable statements with measurable success criteria and
explicit acceptance scenarios. Each requirement MUST be traceable to at least one user story,
task, and validation method. Ambiguity MUST be resolved through clarification before planning or
implementation proceeds.

Rationale: Requirements that cannot be tested or traced cannot reliably guide implementation or
review.

### III. Plan-Aligned Implementation
Implementation MUST follow the approved specification, implementation plan, and task list. Work
MUST stop when implementation reality conflicts with the approved plan, the agreed architecture,
or the stated requirements; the conflict MUST be explained before changing direction. Speculative
features, unapproved scope, and opportunistic rewrites MUST NOT be implemented.

Rationale: Stopping on conflicts protects product intent, reviewability, and delivery confidence.

### IV. Simple Modular Architecture
Architecture MUST remain simple, modular, and maintainable. Business logic MUST be isolated from
delivery mechanisms, public boundaries MUST be explicit, and new abstractions or dependencies MUST
be justified by current requirements. The simplest design that satisfies the approved plan MUST be
preferred.

Rationale: A greenfield system benefits from clear module boundaries and small decisions that can
evolve without premature complexity.

### V. Explicit Contracts and Quality Gates
System behavior at public, integration, data, and user-interface boundaries MUST be represented by
explicit contracts or documented expectations. Tests are mandatory for changed behavior, with unit
tests for business logic and integration, contract, or end-to-end tests for external boundaries.
Security, observability, and accessibility MUST be considered during specification, planning,
implementation, and validation.

Rationale: Explicit contracts and required tests make behavior reviewable, regressions visible, and
operational risks discoverable early.

## Development Workflow

All non-trivial feature work MUST follow this sequence:

1. Create or update the feature specification.
2. Clarify ambiguous requirements and document assumptions.
3. Generate and complete a requirements checklist.
4. Create the implementation plan.
5. Generate implementation tasks.
6. Analyze consistency across the specification, plan, and tasks.
7. Implement only the approved task range.
8. Validate changed behavior before marking tasks complete.

Plans MUST document the selected architecture, dependencies, contracts, test strategy, security
considerations, observability needs, accessibility expectations, and any rejected simpler
alternatives. Tasks MUST remain small, reviewable, and mapped to user stories or cross-cutting
quality work.

## Cross-Cutting Standards

Security decisions MUST preserve least privilege, avoid hardcoded secrets, and validate inputs at
system boundaries. Observability work MUST provide enough logging, error handling, and runtime
signals to diagnose expected failure modes without exposing sensitive data. Accessibility MUST be
addressed for user-facing workflows from the first usable implementation, including keyboard
access, semantic structure, readable contrast, and clear states.

Dependencies, persistence choices, deployment assumptions, and public contracts MUST be documented
in the plan before implementation. Any exception to these standards MUST be recorded in the plan's
complexity or risk tracking with a concrete reason and a simpler alternative considered.

## Governance

This constitution supersedes conflicting repository guidance for feature delivery and quality
gates. Amendments require an explicit constitution update, a Sync Impact Report, and review of
dependent Spec Kit templates and runtime guidance. Approved amendments MUST update the semantic
version as follows:

- MAJOR: Removes or redefines a core principle or weakens mandatory governance.
- MINOR: Adds a principle, section, or materially expands required practice.
- PATCH: Clarifies wording without changing required behavior.

Every specification, plan, task list, and implementation review MUST verify compliance with the
current constitution. Non-compliance MUST be documented before work proceeds, including the risk,
the affected principle, and the approved mitigation.

**Version**: 1.0.0 | **Ratified**: 2026-06-16 | **Last Amended**: 2026-06-16
