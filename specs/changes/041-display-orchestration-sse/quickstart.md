# Quickstart: Synchronized multi-kiosk display control (CHG-041)

**Branch**: `041-display-orchestration-sse`

## Prerequisites

- Local lab: `docker compose up` (includes Redis after Phase 1)
- Admin + event operator credentials
- Readiness ready (content + ads configured)
- Two browser windows or machines for multi-kiosk tests

## Contract prep (before code)

1. Merge `contracts/contract-deltas.md` into affected active contracts (six files).
2. Confirm `specs/manifest.yml` CHG-041 status and `related_changes` on contracts.
3. ADR-0009 status → Accepted when implementation starts.

## Phase 1 — SSE infra validation

### Setup

```sh
docker compose up -d postgres redis migrate backend frontend
```

### Manual test: config fan-out (SC-001)

1. Operator: `POST /api/display/open` (or open `/display` in browser A).
2. Register kiosk A: `POST /api/display/kiosk/register` with `clientInstanceId`.
3. Open SSE: `GET /api/display/stream?kioskId=...` (browser A network tab or
   second tab with dev tools).
4. Repeat steps 2–3 for browser B (different `clientInstanceId`).
5. Admin: change `topRegionRatio` in `/admin/configuration`.
6. **Expect**: both streams receive `config_updated` within 1 s; layout updates
   without reload. Rotation may still be poll-driven in Phase 1.

### Automated

```sh
pytest backend/tests/integration/test_display_stream.py -v
```

## Phase 2 — Synchronized rotation (SC-002, SC-003)

### Manual test: three-display loop

1. Enable `DISPLAY_ORCHESTRATOR=true` in frontend environment.
2. Open three `/display` tabs (three `clientInstanceId` values).
3. Remote control: pause → all freeze.
4. Resume → all continue same item.
5. Next → all show same next `contentId`.
6. Run photo 10 s + video loop for 5 cycles — verify `commandId` matches across
   tabs (network SSE payloads).

### Automated

```sh
pytest backend/tests/unit/test_display_orchestrator.py -v
pytest backend/tests/integration/test_display_stream.py -v -k multi_kiosk
npm --prefix frontend run test -- --include='**/display-stream**'
npm --prefix frontend run test -- --include='**/display-viewer**'
```

## Phase 3 — Novelty and recurring (SC-005)

1. Public upload via API key (`POST /api/public/content/upload`).
2. **Expect**: on next loop boundary, all three displays show novelty.
3. Configure recurring item N=3; verify due behavior matches CHG-039 scenarios.

```sh
pytest backend/tests/integration/test_public_content_novelty.py -v
pytest backend/tests/unit/test_display_orchestrator.py -k recurring
```

## Phase 4 — Polling retired

1. Confirm `DisplayPollingService` not provided in `display-screen` providers.
2. Disconnect SSE (offline in devtools) > 60 s → reconnect UI, no silent poll.
3. `GET /api/display/state` documented deprecated in OpenAPI.

## Soak test (SC-006)

1. Loop mode, 10 s slides, 3 displays, 10 minutes.
2. Count ad advances — should be ~60 / `defaultAdDurationSeconds`, independent
   of top advances (~60).

## Troubleshooting

| Symptom | Check |
|---------|-------|
| SSE 401 | Session cookie; re-login on `/display` |
| Only one kiosk gets events | Redis running; pub/sub in backend logs |
| Stream closes immediately | `session_ended` — new `display/open` superseded session |
| nginx buffering | `X-Accel-Buffering: no` on stream response |

## Full validation (pre-merge)

```sh
pytest backend/tests
npm --prefix frontend run test
npm --prefix frontend run build
docker build -f backend/Dockerfile backend
docker build -f frontend/Dockerfile frontend
```
