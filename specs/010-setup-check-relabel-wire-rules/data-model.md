# Data Model: Setup Check Relabel and Wire Empty Rules

**Branch**: `010-admin-cleanup-and-polish` | **Date**: 2026-06-19 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## Summary

This spec makes **no schema change**. The two new readiness rules use
existing columns on existing tables.

## Entities Touched

The following entities are read by the new rules but are not modified.

### `TopContentItem` (existing)

`backend/app/repositories/models/content.py:9-32`

| Column | Type | Used by | Notes |
|--------|------|---------|-------|
| `id` | str | (FK target) | — |
| `organization_id` | str | both rules | scoping |
| `title` | str(255) | missing-media rule | reported in the warning string |
| `content_type` | str(32) | unapproved-domains rule | filter on `'embedded_web'` |
| `source_reference` | str(1024) | unapproved-domains rule | URL whose host is checked |
| `media_file_id` | str \| None | missing-media rule | nullable; the rule is a no-op for null |
| `is_active` | bool | both rules | filter on `True` |

### `ClientAdItem` (existing)

`backend/app/repositories/models/ad.py:9-31`

| Column | Type | Used by | Notes |
|--------|------|---------|-------|
| `id` | str | (FK target) | — |
| `organization_id` | str | missing-media rule | scoping |
| `media_file_id` | str \| None | missing-media rule | nullable; the rule is a no-op for null |
| `is_active` | bool | missing-media rule | filter on `True` |

`ClientAdItem` is not affected by the unapproved-domains rule (only
iframe content uses approved domains).

### `ApprovedEmbeddedDomain` (existing)

`backend/app/repositories/models/approved_domain.py:7-14`

| Column | Type | Used by | Notes |
|--------|------|---------|-------|
| `id` | str | (FK target) | — |
| `organization_id` | str | unapproved-domains rule | scoping |
| `domain` | str(255) | unapproved-domains rule | exact host comparison |
| `is_active` | bool | unapproved-domains rule | filter on `True` |

### `MediaFileReference` (existing)

`backend/app/repositories/models/media.py:7-17`

| Column | Type | Used by | Notes |
|--------|------|---------|-------|
| `id` | str | (FK source) | — |
| `organization_id` | str | missing-media rule | scoping |
| `storage_path` | str(1024) | missing-media rule | resolved to absolute path via `MediaStorageService.absolute_path` |

## Inputs to the readiness service

The `ReadinessInput` dataclass (`backend/app/domain/readiness.py:4-11`)
already has the two fields the new rules populate:

```python
@dataclass(frozen=True)
class ReadinessInput:
    configuration_enabled: bool
    event_duration_minutes: int | None
    active_top_content_count: int
    active_ad_count: int
    invalid_sources: list[str] = field(default_factory=list)
    unapproved_embedded_domains: list[str] = field(default_factory=list)
```

The service stops passing `[]` for the two new fields and replaces
them with the result of the new computations.

## No migration

No Alembic migration is added. The schema is unchanged.
