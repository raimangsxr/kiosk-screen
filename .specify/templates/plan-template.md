# Implementation Plan: [FEATURE]

**Input**: Feature specification from `/specs/changes/[###-feature-name]/spec.md`  
**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

## Context Grounding

- Manifest read: [yes/no]
- Active contracts read: [list]
- Change specs read: [list]
- Context pack read or created: [path]
- ADRs read: [list]
- Code entrypoints verified: [list]
- Tests identified: [list]
- Archived or consolidated specs read: [list and justification, or none]

## Summary

[Extract from feature spec: primary requirement + technical approach]

## Technical Context

**Language/Version**: [e.g., Python 3.12, TypeScript/Angular]  
**Primary Dependencies**: [e.g., FastAPI, SQLAlchemy, Angular]  
**Storage**: [if applicable]  
**Testing**: [pytest, Angular/Karma, contract tests]  
**Target Platform**: [backend/frontend/browser/deploy target]  
**Project Type**: [web app]  
**Performance Goals**: [domain-specific]  
**Constraints**: [latency, security, accessibility, token context limits]  
**Scale/Scope**: [users, data, screens]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Active contract identified and read: [pass/fail]
- Manifest update needed and planned: [pass/fail]
- Context pack created/updated: [pass/fail]
- Contract update required before implementation: [yes/no]
- Tests planned for changed behavior: [pass/fail]
- Security and user-facing error exposure considered: [pass/fail]
- Observability/audit impact considered: [pass/fail]
- No archived or superseded specs used without justification: [pass/fail]

## Project Structure

### Documentation for this change

```text
specs/changes/[###-feature]/
├── spec.md
├── context-pack.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md
```

### Source code touched

```text
backend/
frontend/
```

## Phase 0: Outline & Research

- [Research questions and decisions]

## Phase 1: Design & Contracts

- [Data model]
- [API/UI contracts]
- [Active contract updates]
- [ADR updates]

## Phase 2: Task Planning Approach

- [How tasks map to user stories]
- [Test strategy]

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
