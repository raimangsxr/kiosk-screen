# SDD Specification Model

This repository uses a contract-centric, token-aware SDD model.

- `manifest.yml` is the mandatory entrypoint for agents.
- `contracts/**/contract.md` contains active living contracts and is the source of truth for current behavior.
- `changes/**` contains historical or in-progress change specs. Consolidated changes are not read by default.
- `archive/**` is reserved for superseded material that should never be read unless explicitly justified.

Agents must not scan all specs by default. For a task, read the manifest, the affected active contract, the active change spec if any, and the relevant `context-pack.md`.
