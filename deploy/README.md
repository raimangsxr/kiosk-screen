# Kiosk Screen Deployment

Deployment manifests include placeholders for:

- FastAPI backend image
- Angular frontend image
- PostgreSQL
- Backend Alembic migration job
- Persistent media storage mounted at `/app/var/media`

Uploaded media must be stored on a persistent volume. The database stores
metadata and protected media references, but image and video bytes are loaded
from the backend media volume. The backend and migration job both receive
`MEDIA_STORAGE_PATH=/app/var/media`; the backend deployment mounts the PVC at
that path.

Before production use, replace image names, secret values, storage class details,
and ingress/routing configuration for the target Kubernetes cluster.
