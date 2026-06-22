# Quickstart: Remote Control Display

This quickstart describes local validation for the planned feature after implementation tasks are complete.

## Prerequisites

- Backend dependencies installed.
- Frontend dependencies installed.
- Local database running.
- Alembic migrations applied.
- Administrator account available.
- At least one active eligible iframe content item exists.
- At least one active eligible ad exists for ads-visible checks.

## Run Locally

1. Start backend using the existing project README workflow.
2. Start frontend:

```bash
npm --prefix frontend run start
```

3. Open the frontend in two browser windows or two devices.

## Smoke Flow

1. Sign in as administrator.
2. Open the hall.
3. Open kiosk display in one browser.
4. Open remote control from hall in the other browser.
5. Select iframe mode and choose an existing iframe.
6. Confirm the display changes without refreshing the display browser.
7. Hide ads.
8. Confirm content occupies the full display height.
9. Show ads.
10. Confirm regular content-and-ads layout returns.
11. Switch back to loop.
12. Confirm content rotation resumes.
13. Open display configuration.
14. Change remote control polling interval within 1-60 seconds.
15. Confirm subsequent remote control updates apply using the new interval without refreshing display.
16. Change another display setting such as content timing, ad timing, animation, or visible ad count.
17. Confirm the running display hot-applies the configuration.
18. Sign in as a non-administrator and confirm remote control cannot be used.
19. Press Escape on the display and confirm the hall returns.

## Automated Validation Commands

Backend:

```bash
pytest backend/tests
```

Frontend:

```bash
npm --prefix frontend run test
```

CI-style frontend coverage:

```bash
npm --prefix frontend run test:ci
```

## Expected Evidence

- Backend unit, integration, contract, and migration tests pass.
- Frontend component/facade/service/display regression tests pass.
- Manual smoke results are recorded under this feature's validation notes when tasks are generated.
