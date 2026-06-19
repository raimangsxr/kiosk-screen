# Remote Control Smoke Validation

**Feature**: Remote Control Display
**Created**: 2026-06-18

## Purpose

Record manual validation for the administrator remote control and running kiosk display flow.

## Results

| Scenario | Status | Evidence | Notes |
|----------|--------|----------|-------|
| US1 loop to iframe and back | Automated pass | Backend contract/integration tests and frontend display/component tests passed on 2026-06-18. | Live two-device smoke remains pending. |
| US2 ads hidden and restored | Automated pass | Backend unit/integration tests passed (`16 passed`) and frontend facade/component/display tests passed (`24 SUCCESS`) on 2026-06-18. | Live two-device smoke remains pending. |
| US4 new display starts loop with ads visible | Automated pass | Backend unit/integration tests passed (`15 passed`) and frontend display startup regression passed (`18 SUCCESS`) on 2026-06-18. | Live two-device smoke remains pending. |
| Non-administrator blocked | Automated pass | Backend integration tests passed in full suite (`93 passed`) on 2026-06-18. | Live two-device smoke remains pending. |
| Escape returns to hall | Automated pass | Frontend display tests passed in full suite (`206 SUCCESS`) on 2026-06-18. | Live browser smoke remains pending. |

## Quickstart Smoke

| Step | Status | Evidence | Notes |
|------|--------|----------|-------|
| Open display session | Automated pass | `backend/tests/integration/test_display_api.py` passed in full backend suite. | Live display browser not started. |
| Open administrator remote control | Automated pass | Remote-control route/component/facade tests passed in full frontend suite. | Live admin browser not started. |
| Switch loop/iframe | Automated pass | US1 tests passed in full suites. | Requires live eligible iframe for final manual validation. |
| Hide/restore ads | Automated pass | US2 tests passed in full suites. | Full-height layout verified by component test. |
| Change polling/configuration while display is open | Automated pass | US3 tests passed in full suites. | Live timing smoke remains pending. |

## Notes

- Automated validation records feature behavior before live two-device smoke validation.
