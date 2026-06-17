# Admin Media Uploads Smoke Checklist

- Start PostgreSQL with `docker compose up -d postgres`.
- Apply migrations with `alembic -c backend/alembic.ini upgrade head`.
- Start the backend with a writable `MEDIA_STORAGE_PATH`.
- Start the frontend and log in as `admin@example.com` / `admin`.
- Upload one image content item and one video content item.
- Create one iframe content item using an approved domain.
- Upload one image ad for an active client.
- Configure rotation duration, animation, animation duration, and inline ad count.
- Open the kiosk display and confirm uploaded media fills its region.
- Request an uploaded media URL in a browser session without login and confirm access is denied.
- Restart the backend, reopen the display, and confirm uploaded media still loads from saved references.
