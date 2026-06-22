<!--
Sync Impact Report
Version change: 1.0.0 -> 2.0.0 (MAJOR)
Modified principles:
- Template principle 1 -> I. Spec-Driven Development (no change)
- Template principle 2 -> II. Clear, Testable, Traceable Requirements (no change)
- Template principle 3 -> III. Plan-Aligned Implementation (clarified)
- Template principle 4 -> IV. Simple Modular Architecture (no change)
- Template principle 5 -> V. Explicit Contracts and Quality Gates (no change)
Added principles:
- VI. Supersession and Archival
- VII. Capability Boundary
- VIII. Size Budget and Anti-Bundle
Added sections:
- Validation Artefacts
- Conflict Recording
- Governance: archive and merge
Removed sections:
- None
Templates requiring updates:
- updated: .specify/templates/spec-template.md (frontmatter + Supersedes block)
- updated: .specify/templates/plan-template.md (Constitution Check extended)
- no change: .specify/templates/tasks-template.md
- no change: .specify/templates/checklist-template.md
- no change: .specify/templates/constitution-template.md
Reviewed: AGENTS.md preamble (full update deferred to Phase 7)
Follow-up TODOs:
- Phase 5: introduce capability overviews under specs/_capabilities/
- Phase 6: add 019-display-control-canonical as the first cross-spec anchor
- Phase 7: update AGENTS.md preamble to read capability overview first
-->
# kiosk-screen Constitution

## Core Principles

### I. Spec-Driven Development

Non-trivial work MUST start from an approved Spec Kit specification, plan,
and task list. Implementation MUST be traceable to explicit tasks and
validation steps. Direct-to-code changes are allowed only for trivial
maintenance that does not alter behavior, architecture, contracts, or
user-visible output.

Rationale: The application is greenfield, so disciplined discovery and
traceability prevent unreviewed scope from becoming implicit product
behavior.

### II. Clear, Testable, Traceable Requirements

Requirements MUST be written as clear, testable statements with measurable
success criteria and explicit acceptance scenarios. Each requirement MUST
be traceable to at least one user story, task, and validation method.
Ambiguity MUST be resolved through clarification before planning or
implementation proceeds.

Rationale: Requirements that cannot be tested or traced cannot reliably
guide implementation or review.

### III. Plan-Aligned Implementation

Implementation MUST follow the approved specification, implementation plan,
and task list. Work MUST stop when implementation reality conflicts with
the approved plan, the agreed architecture, or the stated requirements;
the conflict MUST be explained and recorded in
`<active-spec>/validation/implementation-conflicts.md` (creating the file
if necessary) before changing direction. Speculative features, unapproved
scope, and opportunistic rewrites MUST NOT be implemented.

Rationale: Stopping on conflicts protects product intent, reviewability,
and delivery confidence.

### IV. Simple Modular Architecture

Architecture MUST remain simple, modular, and maintainable. Business logic
MUST be isolated from delivery mechanisms, public boundaries MUST be
explicit, and new abstractions or dependencies MUST be justified by
current requirements. The simplest design that satisfies the approved
plan MUST be preferred.

Rationale: A greenfield system benefits from clear module boundaries and
small decisions that can evolve without premature complexity.

### V. Explicit Contracts and Quality Gates

System behavior at public, integration, data, and user-interface
boundaries MUST be represented by explicit contracts or documented
expectations. Tests are mandatory for changed behavior, with unit tests
for business logic and integration, contract, or end-to-end tests for
external boundaries. Security, observability, and accessibility MUST be
considered during specification, planning, implementation, and
validation.

Rationale: Explicit contracts and required tests make behavior
reviewable, regressions visible, and operational risks discoverable early.

### VI. Supersession and Archival

Approved specs are append-only. A spec that has been approved (past
`/speckit.clarify` and `/speckit.plan`) is not edited in place; behavior
changes create a new spec and a `supersedes.md` file in the new spec's
directory. The amended spec receives a one-line footer
`> Superseded by: <NNN>-<name> (<US>)` and, when its `tasks.md` is fully
checked, moves to `specs/_archive/<capability>/<NNN>/` on the next
housekeeping PR.

Rationale: Inline strikethrough notes in approved specs are fragile and
invisible to agents. First-class `supersedes.md` files make cross-spec
amendments greppable, reviewable, and reversible.

### VII. Capability Boundary

Each spec names exactly one capability via the `capability:` frontmatter
line in `spec.md`. Cross-capability changes require either two specs
(one per capability) or a designated `bridge.md` linking them. Every
capability listed in `specs/_capabilities/` MUST have an
`overview.md` (≤ 60 lines) before any new spec in that capability is
opened.

Rationale: Capabilities are the natural axis of agent cost. A
capability overview becomes the agent's first read; a single spec per
capability keeps load bounded.

### VIII. Size Budget and Anti-Bundle

Artefacts MUST stay within the following line budgets:

| Artefact | Max lines |
|---|---:|
| `spec.md` | 250 |
| `plan.md` | 300 |
| `tasks.md` | 400 |
| `research.md` | 200 |
| `data-model.md` | 200 |
| each `contracts/*.md` | 150 |

Exceeding requires an `oversize: true` frontmatter line and a
`## Oversize justification` block (≤ 5 lines) explaining why splitting is
not viable. Existing pre-`v2.0.0` specs are grandfathered and flagged
in their archive `status.md` if over budget.

A "bundle" — defined as ≥ 2 capabilities in one spec or ≥ 5 sibling
specs sharing one branch — is forbidden for new features. The historical
010–014 bundle is consolidated under
`specs/_archive/C3-admin-shell/010-admin-polish-bundle/` as a one-time
grandfather exception.

Rationale: Without a budget, specs grow to match the corpus. The budget
is calibrated to the existing Spec Kit skill defaults and to what an
agent can read in a single context window.

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

Plans MUST document the selected architecture, dependencies, contracts,
test strategy, security considerations, observability needs,
accessibility expectations, and any rejected simpler alternatives. Tasks
MUST remain small, reviewable, and mapped to user stories or
cross-cutting quality work.

## Cross-Cutting Standards

Security decisions MUST preserve least privilege, avoid hardcoded
secrets, and validate inputs at system boundaries. Observability work
MUST provide enough logging, error handling, and runtime signals to
diagnose expected failure modes without exposing sensitive data.
Accessibility MUST be addressed for user-facing workflows from the first
usable implementation, including keyboard access, semantic structure,
readable contrast, and clear states.

Dependencies, persistence choices, deployment assumptions, and public
contracts MUST be documented in the plan before implementation. Any
exception to these standards MUST be recorded in the plan's complexity
or risk tracking with a concrete reason and a simpler alternative
considered.

## Validation Artefacts

Each shipped spec carries exactly one of the following, not both:

- `validation/` directory — for substantial features (≥ 3 user stories
  OR ≥ 50 tasks). Each file holds a `pass` / `fail` / `exception` row
  with evidence.
- `quickstart.md` — for slim features (< 3 user stories AND < 50 tasks).
  A runnable recipe that exercises the user-visible behavior end-to-end.

A spec without either is in violation of this constitution.

## Conflict Recording

When implementation diverges from the approved spec/plan/tasks, the
developer adds a row to
`<active-spec>/validation/implementation-conflicts.md` (creating the
file if necessary) **before continuing the work**. The next `plan.md`
Constitution Check rejects the work if the conflict is unresolved.

## Governance

This constitution supersedes conflicting repository guidance for feature
delivery and quality gates. Amendments require an explicit constitution
update, a Sync Impact Report, and review of dependent Spec Kit
templates and runtime guidance. Approved amendments MUST update the
semantic version as follows:

- MAJOR: Removes or redefines a core principle, adds Principles VI–VIII
  governance (supersession, capability boundary, size budget), weakens
  mandatory governance, or changes the validation/conflict workflow.
- MINOR: Adds a principle, section, or materially expands required
  practice.
- PATCH: Clarifies wording without changing required behavior.

Every specification, plan, task list, and implementation review MUST
verify compliance with the current constitution. Non-compliance MUST be
documented before work proceeds, including the risk, the affected
principle, and the approved mitigation.

**Version**: 2.0.0 | **Ratified**: 2026-06-16 | **Last Amended**: 2026-06-22