# SDD Token-Aware Migration

This repository has been migrated from a flat `specs/NNN-*` Spec Kit layout to a contract-centric, token-aware SDD layout.

## What changed

- Added `.specify/memory/constitution.md` with concrete governance rules.
- Added `specs/manifest.yml` as the SDD entrypoint.
- Added active contracts under `specs/contracts/**/contract.md`.
- Moved previous flat specs to `specs/changes/**` and added metadata front matter.
- Added `context-pack.md` for the active `019-display-responsive-runtime` change.
- Updated `AGENTS.md` to remove stale flat-spec guidance and reduce default context size.
- Updated Spec Kit templates for manifest-driven context, active contracts, and context packs.
- Updated Spec Kit scripts so new feature specs are created under `specs/changes/`.
- Updated workflow integration requirements to `opencode` / `codex` and restored clarify/checklist/analyze gates.
- Added ADRs for SDD governance, display runtime ratios, and display/audit event catalog governance.
- Cleaned macOS AppleDouble files and Python bytecode caches from the deliverable.

## Recommended validation

```sh
.specify/scripts/bash/setup-plan.sh --json
.specify/scripts/bash/setup-tasks.sh --json
pytest backend/tests
npm --prefix frontend run test
npm --prefix frontend run build
```

The SDD migration is documentation and workflow oriented; application source code was not intentionally changed.
