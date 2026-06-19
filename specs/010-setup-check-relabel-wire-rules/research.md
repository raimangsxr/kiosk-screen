# Research: Setup Check Relabel and Wire Empty Rules

**Branch**: `010-admin-cleanup-and-polish` | **Date**: 2026-06-19 | **Plan**: [plan.md](./plan.md)

## Decisions

### Decision 1: Reuse the existing `evaluate_readiness` domain function

**Choice**: Keep `app.domain.readiness.evaluate_readiness` as the single
function that turns a `ReadinessInput` into a `ReadinessResult`. The
service computes the two new lists (`unapproved_embedded_domains` and
`invalid_sources`) and passes them into the same domain function.

**Rationale**: The domain function already has explicit branches for
both new rules (`backend/app/domain/readiness.py:33-36`). Wiring the
service to pass real values requires no domain change. Splitting the
function per rule would force every consumer to compose results and
risks rule-ordering bugs.

**Alternatives considered**:
- **A per-rule function** (e.g. `evaluate_unapproved_domains(...)`)
  that the service stitches together. Rejected because it introduces
  composition logic in the service that the domain function already
  owns. The existing function is small (one for-loop each) and the
  rule order is stable.
- **A rule registry** where each rule is a pluggable class. Rejected
  as over-engineered for a feature with five rules, only two of which
  change.

### Decision 2: Compute the unapproved-domains list in the service layer

**Choice**: `ReadinessService.evaluate` walks the active
`embedded_web` content items, parses each `source_reference` with
`urllib.parse.urlparse`, and reports any `host` that is not in the
organization's active `ApprovedEmbeddedDomain.domain` set.

**Rationale**: The service has the SQLAlchemy session and the
`organization_id` already in scope, so the query is a single roundtrip
to Postgres. The host comparison is exact (case-insensitive) and uses
the existing `ApprovedEmbeddedDomain.is_active` flag, matching the
behavior of the existing "delete is blocked if active iframe content
depends on the domain" rule (see
`backend/tests/unit/test_admin_readiness_services.py:35-58`).

**Alternatives considered**:
- **Reuse the existing `eligible_top_content` filter** and walk the
  same items. Rejected because `eligible_top_content` filters by
  availability window (`available_from`/`available_until`); the
  setup-check rule should consider all active items regardless of
  availability — an iframe whose availability window is in the past
  should still appear in the rule's report so the administrator can
  deactivate it. A new query that filters only by `is_active=True`
  and `content_type='embedded_web'` is correct.
- **Resolve the approved domain via the `approved_domain_id` FK**.
  Rejected because the rule should fire even when an iframe item has
  no `approved_domain_id` (which is a data integrity problem of its
  own). Parsing the URL host and comparing to the approved-domain
  set catches both cases (missing FK and FK to a domain whose `host`
  does not match the URL).

### Decision 3: Compute the missing-media list using the existing `MediaStorageService.absolute_path`

**Choice**: For each active `TopContentItem` and `ClientAdItem` with
a non-null `media_file_id`, resolve the path with
`MediaStorageService(...).absolute_path(media)` and call
`Path.exists()`. Report the item's `title` (or "Ad #<displayOrder>"
when the title is unavailable) for each item whose file is not
present.

**Rationale**: The path-resolution helper already enforces the
`<MEDIA_STORAGE_PATH>` root and raises `ValueError` on path traversal
attempts. It is the canonical way to map a `MediaFileReference` to a
filesystem path. The on-disk check is a single `Path.exists()` call
per item; for 1,000 active items, this is well under the 2-second
budget.

**Alternatives considered**:
- **Re-derive the path from `MediaFileReference.storage_path` directly
  without going through `MediaStorageService`**. Rejected because it
  duplicates the path-resolution and root-validation logic. Keeping
  the call centralized ensures that any future change to the storage
  layout (e.g. switching to a content-addressed scheme) is picked up
  by the readiness check automatically.
- **Stat the file with `Path.stat()`** to get the size and timestamp.
  Rejected because the rule only needs existence; `Path.exists()` is
  the cheapest option and matches the user-facing copy ("Source may
  be unavailable" — not "Source is the wrong size").

### Decision 4: Catch and report filesystem errors per-item

**Choice**: Wrap the `Path.exists()` call in a `try/except` for
`PermissionError` and `OSError`. On failure, report
`Source for "<title>" could not be verified.` (a warning) and continue
with the next item.

**Rationale**: A permission error on a single file (e.g. a corrupted
file with mode `000`) should not crash the entire page. The
"degrades gracefully" edge case in the spec requires that the rest of
the readiness report (configuration enabled, event duration, ≥1
active content, ≥1 active ad) still appears. The per-item try/except
is the smallest mechanism that satisfies this.

**Alternatives considered**:
- **Wrap the entire readiness evaluation in a try/except** and
  return a single error. Rejected because it would lose the
  configuration, event-duration, and active-count blockers in the
  failure case, leaving the administrator with no information.
- **No try/except at all** and let the page crash. Rejected because
  it is the worst possible UX for the operator and contradicts the
  spec's "degrades gracefully" edge case.

### Decision 5: Rename user-visible strings only

**Choice**: Update the sidenav label, the page title and description,
the dashboard button label, the dashboard alerts section title, the
display-config hint, the README references, and the smoke script.
Do not rename the route, the endpoint, the schema field, the model
file, the service file, the component selector, the CSS class, or
any code-internal identifier.

**Rationale**: The user confusion is about the **name of the
feature**, not about its URL or its code organization. Renaming the
internal identifiers would force churn across the existing tests,
the OpenAPI contract, the spec folder name, and the data-model
section of every historical spec that mentions readiness. Keeping
the internal naming is the smallest change that delivers the user
value.

**Alternatives considered**:
- **Full rename** (route → `/admin/setup-check`, endpoint →
  `/api/setup-check`, file names, class names). Rejected as
  out-of-scope. The user can request a full rename in a follow-up
  spec if the copy-only rename proves insufficient.
- **A new component with the new name**, leaving the old
  `readiness` component in place. Rejected as a maintenance burden
  (two components doing the same job).

### Decision 6: No new dependencies

**Choice**: Use `urllib.parse.urlparse` (Python standard library)
for URL parsing and `pathlib.Path.exists()` (Python standard
library) for the disk check. No new packages.

**Rationale**: Both helpers are already imported elsewhere in the
backend. Adding a new dependency for a 1-line URL parse or a 1-line
existence check would violate the AGENTS.md guidance
("Do not introduce production dependencies without justification")
and the constitution's "Simple Modular Architecture" principle.

**Alternatives considered**:
- **`tldextract` for domain parsing**. Rejected: it is a third-party
  package and the rule is intentionally a strict host comparison.
- **`requests` for a HEAD request to the iframe URL**. Rejected: the
  rule is about whether the host is on the approved list, not
  whether the URL is reachable. Reachability is a different concern
  and would introduce network latency into a read-only snapshot.

## Open Questions

None. The four clarification questions from the spec session
(2026-06-19) resolved all ambiguous points.

## References

- `backend/app/domain/readiness.py:21-38` — the existing
  `evaluate_readiness` function.
- `backend/app/services/readiness_service.py:12-25` — the existing
  service that passes empty lists for the two new rules.
- `backend/app/repositories/models/approved_domain.py` — the
  `ApprovedEmbeddedDomain` model.
- `backend/app/repositories/models/media.py` — the
  `MediaFileReference` model.
- `backend/app/services/media_storage_service.py:65-70` — the
  `absolute_path` helper used to resolve a media file to a
  filesystem path.
- `backend/app/repositories/models/content.py:20, 23` — the
  `source_reference` and `approved_domain_id` columns on
  `TopContentItem`.
- `backend/app/repositories/models/ad.py:20, 21` — the
  `source_reference` and `media_file_id` columns on `ClientAdItem`.
- `backend/tests/unit/test_readiness.py` — existing unit tests for
  `evaluate_readiness`.
- `backend/tests/unit/test_admin_readiness_services.py:35-58` —
  existing test that confirms a non-approved domain is rejected
  when an iframe content item depends on it.
