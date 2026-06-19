# Final Acceptance: Public Content API with Novelty Priority

**Feature**: `specs/009-public-content-api/`
**Date**: 2026-06-18
**Reviewer(s)**: (filled at sign-off)

This document records the final acceptance gate for the feature. Each row must be filled with `pass`, `fail`, or `exception` (with an exception approver, reason, and risk noted). A row is only complete when evidence is linked and the responsible party signs off.

## Automated Validation

| Check | Status | Evidence | Owner | Notes |
|---|---|---|---|---|
| `pytest backend/tests` (full suite) | | | | |
| `pytest backend/tests/integration/test_public_content_upload.py` | | | | T013 |
| `pytest backend/tests/integration/test_public_content_multi_org.py` | | | | T014 |
| `pytest backend/tests/integration/test_public_content_concurrency.py` | | | | T038 |
| `pytest backend/tests/integration/test_public_content_burst.py` | | | | T039 |
| `pytest backend/tests/integration/test_multi_kiosk_independence.py` | | | | T037 |
| `pytest backend/tests/integration/test_public_content_audit.py` | | | | T040 |
| `pytest backend/tests/integration/test_admin_api_keys.py` | | | | T019 |
| `pytest backend/tests/integration/test_admin_api_keys_audit.py` | | | | T041 |
| `pytest backend/tests/integration/test_migrations.py` (round-trip 0003) | | | | T042 |
| `pytest backend/tests/contract/test_public_content_openapi.py` | | | | T012 |
| `pytest backend/tests/contract/test_openapi.py` (updated) | | | | T043 |
| `pytest backend/tests/unit/test_api_key_service.py` | | | | T005 |
| `npm --prefix frontend run test` (full suite) | | | | |
| `npm --prefix frontend run build` | | | | |

## Manual Smoke (Quickstart Flow)

For each row, the operator runs the corresponding step from `specs/009-public-content-api/quickstart.md` and records pass/fail.

| Step | Status | Evidence (screenshot or log) | Owner | Notes |
|---|---|---|---|---|
| Login as bootstrap admin | | | | |
| Create an API key in `/admin/api-keys` | | | | US2 step 3 |
| Copy raw key once; verify it never reappears | | | | US2 step 3, raw key dialog |
| Reload `/admin/api-keys`; verify label, prefix, status, last-used | | | | US2 step 3 |
| Upload a file via `curl` and the public endpoint; expect 201 | | | | US1 step 4 |
| Verify file on disk under `var/media/<org_id>/...` | | | | US1 |
| Open kiosk mode in browser; verify the uploaded item appears | | | | US3 |
| Measure latency from upload 201 to first render; expect ≤ 6s p95 | | | | SC-001 |
| Rotate the key; verify previous raw value returns 401 on next upload | | | | US2 step 6 |
| Revoke the key; verify the value returns 403 on next upload | | | | US2 step 7 |
| Open a second kiosk session in another tab; verify both pick up new items | | | | SC-008 |
| Re-open kiosk mode (Escape then re-enter); verify queue is empty | | | | SC-009 |
| Run 20 concurrent uploads via shell; verify `display_order` is contiguous | | | | SC-002 |
| Configure `PUBLIC_API_CORS_ORIGINS`; verify CORS preflight succeeds from a browser-based test | | | | FR-017A |

## Non-Regression

| Check | Status | Evidence | Owner | Notes |
|---|---|---|---|---|
| Existing `POST /api/content/upload` (admin) still works | | | | FR-034, T048 |
| Existing `GET /api/display/state` returns the same shape | | | | FR-035, T048 |
| Existing `TopContentItem`, `MediaFileReference`, `DisplayEvent` schemas are unchanged | | | | FR-036, T048 |
| `005-admin-refactor` files are not modified | | | | T048 |

## Code Review Pass

| Check | Status | Evidence | Owner | Notes |
|---|---|---|---|---|
| No internal paths, secrets, or stack traces in any error response | | | | FR-017, T046 |
| `RequestIdMiddleware` adds `X-Request-Id` to public endpoint responses | | | | T046 |
| The `Authorization` header value is never logged | | | | T046 |
| `lastUsedAt` is updated only on 201 (no client-side lastUsedAt logic) | | | | FR-015, T046 |

## Outstanding Exceptions

If any row above is `exception`, document it here with: the approver, the reason, the risk, the evidence, and the follow-up.

| Check | Exception Approver | Reason | Risk | Evidence | Follow-up |
|---|---|---|---|---|---|
| | | | | | |

## Sign-off

When all rows are `pass` or approved `exception`, the feature is accepted. Each approver signs with date and role.

- Backend lead: ____________________
- Frontend lead: ____________________
- QA / smoke operator: ____________________
- Product owner: ____________________
