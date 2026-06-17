# Integration Validation

Commands:

```sh
alembic -c backend/alembic.ini upgrade head
kubectl kustomize deploy/kubernetes
```

Result: Passed against the local PostgreSQL lab database. Kubernetes manifests rendered successfully.

Manual checklist:

- `scripts/smoke/admin_media_uploads.md` added for upload-to-display and backend restart persistence validation.
- Full browser smoke was not executed in this session.
