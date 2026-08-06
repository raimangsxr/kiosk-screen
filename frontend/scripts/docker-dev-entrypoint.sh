#!/bin/sh
set -e

LOCK_FILE=package-lock.json
STAMP_FILE=node_modules/.package-lock.sha256

if [ ! -f "$LOCK_FILE" ]; then
  echo "package-lock.json not found in $(pwd)" >&2
  exit 1
fi

current_sha=$(sha256sum "$LOCK_FILE" | awk '{print $1}')
stored_sha=""
if [ -f "$STAMP_FILE" ]; then
  stored_sha=$(cat "$STAMP_FILE")
fi

if [ "$current_sha" != "$stored_sha" ] || [ ! -d node_modules/qrcode ]; then
  echo "Syncing frontend dependencies (package-lock.json changed or qrcode missing)..."
  npm ci
  echo "$current_sha" > "$STAMP_FILE"
fi

if [ -z "${API_PROXY_TARGET:-}" ]; then
  if node <<'EOF'
const http = require('http');
const request = http.get('http://backend:8000/docs', { timeout: 1500 }, (response) => {
  response.resume();
  process.exit(0);
});
request.on('error', () => process.exit(1));
request.on('timeout', () => {
  request.destroy();
  process.exit(1);
});
EOF
  then
    export API_PROXY_TARGET=http://backend:8000
  else
    export API_PROXY_TARGET=http://host.docker.internal:8000
  fi
  echo "API proxy target: $API_PROXY_TARGET"
fi

exec "$@"
