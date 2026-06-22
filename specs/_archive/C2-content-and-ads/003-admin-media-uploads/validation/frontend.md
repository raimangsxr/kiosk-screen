# Frontend Validation

Commands:

```sh
npm --prefix frontend run test -- --watch=false
cd frontend
npm run build -- --progress=false
docker build -f frontend/Dockerfile frontend
```

Result: Passed. Build was run from `frontend/`.

Note: Node.js v25.6.1 reported a non-LTS warning during local build. The Docker build completed but `npm install` reported existing dependency audit warnings.
