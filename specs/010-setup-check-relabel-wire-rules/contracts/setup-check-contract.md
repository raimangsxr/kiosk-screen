# Contract: Setup Check Relabel and Wire Empty Rules

**Branch**: `010-admin-cleanup-and-polish` | **Date**: 2026-06-19 | **Spec**: [spec.md](./spec.md)

## Scope

This contract documents the user-visible change in the "Readiness"
feature after it is relabeled to "Setup check" and the two previously
empty rules are wired.

## HTTP contract

The HTTP contract is **unchanged**. The endpoint, the request, and the
response shape are all identical to the existing
`GET /api/readiness` endpoint.

- **Endpoint**: `GET /api/readiness`
- **Auth**: authenticated session (`get_current_user`)
- **Response**: `200 OK` with body

```json
{
  "ready": true,
  "blockers": ["…"],
  "warnings": ["…"]
}
```

## Response string catalog

The response body contains two string lists: `blockers` (which block
the kiosk from opening) and `warnings` (which are advisory). The
following strings may appear in the response.

### Blockers (existing, unchanged)

| String | Rule | When emitted |
|--------|------|--------------|
| `Display configuration is disabled.` | configuration-enabled | `KioskDisplayConfiguration.is_enabled` is `False`. |
| `Configured event duration is required.` | event-duration | `configured_event_duration_minutes` is `None` or zero. |
| `At least one active top content item is required.` | ≥1 active content | `eligible_top_content(session, organization_id)` returns 0 items. |
| `At least one active ad item is required.` | ≥1 active ad | `eligible_ads(session, organization_id)` returns 0 items. |

### Blockers (new, wired by this spec)

| String | Rule | When emitted |
|--------|------|--------------|
| `Embedded domain is not approved: <host>` | unapproved-embedded-domain | An active `TopContentItem` with `content_type='embedded_web'` has a URL host that is not in the organization's active `ApprovedEmbeddedDomain.domain` set. |

The string is emitted once per non-approved host that is used by at
least one active iframe item. The placeholder `<host>` is the
`urlparse(source_reference).hostname.lower()` value. If the URL
cannot be parsed into a host (malformed URL or non-HTTP(S) scheme),
the literal placeholder `<unparseable-url>` is used in place of
`<host>` so the blocker still names the offending item.

### Warnings (new, wired by this spec)

| String | Rule | When emitted |
|--------|------|--------------|
| `Source may be unavailable: <title>` | missing-media | An active `TopContentItem` or `ClientAdItem` has a `media_file_id` whose backing file is not present on disk. |
| `Source for "<title>" could not be verified.` | missing-media-error | The on-disk check raised `PermissionError` or `OSError` for that item (e.g. permission denied on the storage directory). The administrator is told the source could not be verified, not that it is missing. |

The placeholder `<title>` is the `TopContentItem.title` for content
items, or the literal `Ad #<displayOrder>` for ad items (which do not
have a `title` column). The string is emitted once per affected item.

## Backward compatibility

The response shape is unchanged. The strings inside `blockers` and
`warnings` grow as the new rules fire. Existing consumers that
specifically check for the absence of unknown strings (e.g. test
asserts that `blockers == ['At least one active top content item is
required.']`) must be updated. Existing consumers that pattern-match
on substrings continue to work.

## User-visible copy

The following user-visible labels and copy strings are updated.

| Location | Old | New |
|----------|-----|-----|
| `frontend/src/app/features/admin-shell/admin-navigation.service.ts:14` | `Readiness` | `Setup check` |
| `frontend/src/app/features/readiness/readiness.component.ts:33` | `title="Readiness"` | `title="Setup check"` |
| `frontend/src/app/features/readiness/readiness.component.ts:34` | description text mentioning "blockers and warnings" | "Verify all kiosk setup is complete before opening the display for an event." |
| `frontend/src/app/features/readiness/readiness.component.ts:39` | `aria-label="Loading readiness"` | `aria-label="Loading setup check"` |
| `frontend/src/app/features/readiness/readiness.component.ts:43` | `title="Readiness unavailable"` | `title="Setup check unavailable"` |
| `frontend/src/app/features/readiness/readiness.component.ts:48, 53` | "Ready to open kiosk" / "Blocked" pills | unchanged wording; the surrounding copy uses "setup check" |
| `frontend/src/app/features/readiness/readiness.component.ts:87-88` | empty state: "No readiness report" / "Readiness has not been computed yet." | "No setup check yet" / "The setup check has not been computed yet." |
| `frontend/src/app/features/dashboard/dashboard.component.ts:53` | "Review readiness" | "Run setup check" |
| `frontend/src/app/features/dashboard/dashboard.component.ts:88` | alerts section title "Readiness" | "Setup check" |
| `frontend/src/app/features/display-config/display-config.component.ts:199` | "readiness will block setup" | "the setup check will report a blocker" |
| `README.md:21, 35, 154` | references to "Readiness" feature | updated to "Setup check" |
| `scripts/smoke/kiosk_mvp.md:9` | smoke step mentions "readiness" | updated to "setup check" |

## Out of contract

The following are explicitly **not** changed by this spec and remain as
they are today. They are listed for completeness; if a future spec
amends them, this list will need to be updated.

- The route path `/admin/readiness` and the URL slug.
- The endpoint path `/api/readiness`.
- The Pydantic model `ReadinessReportSchema` in
  `backend/app/api/schemas.py:185-188`.
- The dataclass `ReadinessInput` in
  `backend/app/domain/readiness.py:4-11`.
- The function name `evaluate_readiness` and the file name
  `readiness.py`.
- The service class `ReadinessService` and the file name
  `readiness_service.py`.
- The frontend component class `ReadinessComponent`, its selector
  `app-readiness`, its CSS class prefix `readiness__`, and its file
  name `readiness.component.ts`.
- The frontend facade `ReadinessFacade` and the file name
  `readiness.facade.ts`.
- The `readiness` tag on the FastAPI router in
  `backend/app/api/readiness.py:9`.
