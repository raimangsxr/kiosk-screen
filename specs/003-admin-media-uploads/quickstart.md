# Quickstart: Admin Media Uploads

This quickstart describes how to validate the feature after implementation.

## Prerequisites

- Local PostgreSQL running from the repository compose setup.
- Backend dependencies installed.
- Frontend dependencies installed.
- Alembic migrations applied.
- Backend media storage directory configured for local development.

## Start Local Services

From the repository root:

```sh
docker compose up -d postgres
alembic -c backend/alembic.ini upgrade head
uvicorn app.main:app --reload --app-dir backend
```

In another terminal:

```sh
cd frontend
npm install
npm start
```

Open `http://localhost:4200` and sign in as an administrator.

## Admin Upload Smoke Flow

1. Open the main content management screen.
2. Upload a valid image smaller than 25 MB.
3. Upload a valid video smaller than 500 MB.
4. Create an iframe content entry with required metadata.
5. Confirm all three content items appear in the content list.
6. Open the clients and ads workflow.
7. Create or select a client.
8. Upload a valid image ad smaller than 25 MB.
9. Confirm the ad appears in the ad list.
10. Open display configuration.
11. Set default main content rotation time, default ad rotation time, animation defaults, animation durations, and inline ad count.
12. Optionally set item-level rotation overrides for one content item and one ad.
13. Open the kiosk display.
14. Confirm uploaded main content fills the top region one item at a time.
15. Confirm uploaded image ads appear inline in the bottom region using the configured inline count.
16. Confirm rotation timing and animations follow defaults or item-level overrides.

## Error Validation

- Try uploading an unsupported file type and confirm it is rejected before activation.
- Try uploading an image larger than 25 MB and confirm a clear error appears.
- Try uploading a video larger than 500 MB and confirm a clear error appears.
- Try creating an ad without a client and confirm a clear validation error appears.
- Try setting zero or negative rotation/animation values and confirm validation errors appear.
- Try requesting an uploaded media URL while signed out and confirm access is denied.
- Delete a content/ad record and confirm its uploaded file remains available if another item still references it.

## Expected Test Commands

```sh
pytest backend/tests
npm --prefix frontend run test -- --watch=false
PYTHONPATH=backend python3 -m app.api.openapi > /tmp/kiosk-openapi.json
```

## Completion Signal

The feature is ready when:

- Backend tests pass.
- Frontend tests pass.
- OpenAPI contract validation passes.
- Alembic migration validation passes.
- The smoke flow succeeds without broken display placeholders.
- Unauthenticated media URL access is denied.
