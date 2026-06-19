# Kiosk MVP Smoke Checklist

- Start PostgreSQL with `docker compose up -d postgres`.
- Run backend migrations with `alembic -c backend/alembic.ini upgrade head`.
- Start the backend with `uvicorn app.main:app --reload --app-dir backend`.
- Start the frontend with `npm --prefix frontend start`.
- Sign in as the seeded administrator or operator.
- Confirm unauthenticated users cannot open `/display`.
- Open the setup check and confirm blockers are readable when content or ads are missing.
- Open the display and confirm the 4/5 top region and 1/5 ad region remain stable.
- Confirm top content and ads follow configured order.
- Confirm unauthorized users cannot modify content, ads, domains, users, or configuration.
- Run `pytest backend/tests`.
- Run `npm --prefix frontend run test` (headless, single run).
- Run backend OpenAPI contract tests with `pytest backend/tests/contract`.
