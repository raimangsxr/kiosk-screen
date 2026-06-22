# Kiosk Regression

This document records regression validation for the kiosk display path that
the administration refactor (FR-003, FR-004, FR-006, FR-008, FR-011) must
preserve end-to-end. The refactor split backend handlers and business
behavior into `backend/app/api/v1/display/` and
`backend/app/application/display/`, but the user-facing display contract
remains unchanged (see `contracts/contract-change-log.md`, "Display state"
row, status: Preserved).

## Automated regression coverage

| Path | File | Result |
|---|---|---|
| Frontend rotation (timing, effective overrides, ties, single-item) | `frontend/src/app/display/display-rotation.service.spec.ts` | 9 of 9 pass |
| Frontend display (Escape, fallback, inline ads, single-item, listener cleanup) | `frontend/src/app/display/display-screen.component.spec.ts` | 11 of 11 pass |
| Backend application facade (T087) | `backend/tests/unit/test_display_application_service.py` | 5 of 5 pass |
| Backend v1 contract (T086) | `backend/tests/contract/test_v1_display_contract.py` | 5 of 5 pass |

Run with:

```sh
python -m pytest backend/tests/unit/test_display_application_service.py \
                  backend/tests/contract/test_v1_display_contract.py -q
npm --prefix frontend run test -- --watch=false
```

## Manual smoke checklist (T088 + T094)

Executed by an operator against a running stack (`docker compose up -d
postgres && alembic upgrade head && uvicorn app.main:app --reload --app-dir
backend && npm --prefix frontend start`).

| Check | Expected | Status | Evidence |
|---|---|---|---|
| Open `/display` while signed in as `event_operator` | Display opens with top content in the 4/5 region and at least one ad in the 1/5 region | Pending |  |
| Rotate top content | Each top content item shows for its effective duration (`durationSeconds` fallback to `defaultTopDurationSeconds`); cycle loops | Pending |  |
| Rotate ads | Each ad shows for its effective duration; `inlineAdCount` controls the visible strip | Pending |  |
| Animation class | Items carry `rotation-{none,fade,slide}` per effective animation; CSS class matches the resolved animation | Pending |  |
| Single content item | Display does not auto-rotate; one item is shown indefinitely | Pending |  |
| Empty content / ads with `fallbackActive=true` | Both regions show "Content unavailable" / "Ads unavailable" placeholders | Pending |  |
| Escape from display | Returns to `/hall` | Pending |  |
| Escape listener cleanup | After leaving `/display`, keydown Escape does not navigate | Pending |  |
| Read-only display | No admin navigation, settings, or management controls visible in the display UI | Pending |  |
| Operator session | Opening the display records a `display_opened` event and an `OperatorSession` row that is honored for `configuredEventDurationMinutes` | Pending |  |
| Fallback event | Forcing the kiosk into a fallback state records a `fallback_activated` warning event | Pending |  |
| Iframe content | Approved embedded domains render via iframe; unapproved domains are blocked server-side | Pending |  |
| Image / video content | Image renders via `<img>`, video via `<video autoplay muted loop>`, both with object-fit cover | Pending |  |
| Inline ad count > 1 | Multiple ads visible in the bottom strip, ordered by `displayOrder` | Pending |  |
| Animation duration | `effectiveAnimationDurationMilliseconds` controls the keyframes timing in the rendered class | Pending |  |

## Sign-off

- [ ] All automated tests above are green in the latest `npm run test` and `pytest backend/tests` runs.
- [ ] All manual checks above are marked Status: Pass with an Evidence link to the operator's notes or a recorded screen capture.
- [ ] No new `validation/implementation-conflicts.md` rows were opened for this slice.

Date: __________
Operator: __________
