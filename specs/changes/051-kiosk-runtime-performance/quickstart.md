# Quickstart: Kiosk runtime performance (CHG-051)

**Branch**: `051-kiosk-runtime-performance`

## Prerequisites

- Local lab: `docs/dev/local-lab.md`
- Active display session + ≥ 10 content items (mix photo/video) + ads
- Chrome DevTools → Memory + Performance panels

## Contract prep (before code)

1. Merge `contracts/contract-deltas.md` into `DISPLAY.RUNTIME` and
   `CONTENT.ADS.ADMIN`.
2. Add CHG-051 to `specs/manifest.yml` when implementation starts.

## Automated regression (after implementation)

```sh
# Narrow first
npm --prefix frontend run test -- --include='**/display-media-cache**'
npm --prefix frontend run test -- --include='**/display-stream**'
pytest backend/tests/unit/test_display_sse_hub.py -v
pytest backend/tests/integration/test_display_stream.py -v

# Broader
npm --prefix frontend run test
pytest backend/tests
```

## Manual: media retention (SC-001 — pre-merge proxy, ≥ 30 min)

1. Open `/display` on a kiosk with 20+ rotating items.
2. Chrome → Memory → Take heap snapshot at **T+0** (after 5 min warm-up).
3. Let rotate **≥ 30 min**; take snapshot **T+30**.
4. **Expect**: `Detached` video count stable; `Blob` count does not grow linearly
   with number of slides shown (bounded small set).
5. **Expect**: ≤ 2 blob URLs for top content in Application → Frames (visible +
   preload).
6. **Expect**: RAM at T+30 is within the stabilized band used for the 20 % rule
   in SC-001 (document device + Chrome version).

## Manual: full soak (SC-001 / SC-002 — release gate, 8 h)

**Required before marking CHG-051 implemented** (T037).

1. Same setup as above with ≥ 20 mixed items; run **8 h** continuous rotation.
2. Take heap snapshots at T+30 min and T+8 h.
3. **Expect (SC-001)**: RAM at T+8 h ≤ 1.2 × RAM at T+30 min.
4. **Expect (SC-002)**: No manual browser reload required; rotation continues
   through the full window.

## Manual: video blur-fill visual (US3-3)

1. Capture a baseline screenshot of video blur-fill **before** CHG-051 (or from
   staging pre-deploy).
2. Deploy CHG-051 build; force the same video item full-screen in the top zone.
3. Compare side-by-side with operator; note acceptance in
   `checklists/requirements.md`.
4. **Expect**: Imperceptible or operator-acceptable difference; single `<video>`
   in DOM (see SC-004 below).

## Manual: single video decoder (SC-004)

1. Force rotation through video items only (or fixed video).
2. Chrome → More tools → Media or Performance → count video decode sessions.
3. **Expect**: One active `<video>` in DOM; backdrop uses CSS `background-image`
   (poster/frame blur), not a second `<video>`.

## Manual: SSE heartbeat (FR-005 / FR-011)

1. Network tab → `display/stream` → EventStream.
2. Wait 30 s idle.
3. **Expect**: `: ping` comment lines; no JSON `type":"ping"` events.
4. **Expect**: No content flash / rotation reset on ping.

## Manual: reconnect auth debounce (FR-008)

1. With display connected, throttle network to Offline 10 s → Online.
2. Filter Network for `/api/auth/me`.
3. **Expect**: At most one auth request per ~5 s during reconnect churn, not
   dozens per second.

## Manual: network recovery (SC-003)

**Required before marking CHG-051 implemented** (T032 / T037).

1. Open `/display` connected to a live session with operator panel available.
2. Note current slide or issue `jump_to` / mode change capability from admin.
3. Set network **Offline** for **2 min**; restore **Online**.
4. From admin, emit a remote control change (e.g. `jump_to` another slide) within
   30 s of connectivity return.
5. Start timer when network returns; stop when kiosk reflects the change.
6. **Expect**: Kiosk shows the remote change in **≤ 90 s** from connectivity
   recovery without manual page reload.
7. Record device, Chrome version, and elapsed time in
   `checklists/requirements.md`.

## Manual: server queue (SC-006, dev only)

1. Run backend locally; attach debugger or log queue depth in test harness.
2. Use integration test `test_display_subscriber_queue_bounded` (added in CHG-051).
3. **Expect**: Queue length never exceeds 64.

## Manual: admin reconcile (SC-005)

1. Open `/admin/content` with stream connected.
2. Upload 5 images rapidly via public API or admin.
3. Network tab: count `GET /content` during 2 min.
4. **Expect**: ≤ 1 effective list fetch per 1 s debounce window; UI remains
   responsive (no > 1 s freezes).

## Soak validation tiers (summary)

| Tier | Duration | Gates | When |
|------|----------|-------|------|
| Pre-merge proxy | ≥ 30 min | SC-001 RAM proxy, SC-004 | CI / PR review (T035) |
| Release gate | 8 h | SC-001, SC-002 | Before T037 implemented |
| Network recovery | 2 min outage | SC-003 | Before T037 (T032) |
| Visual sign-off | One comparison | US3-3 | Before T037 (T035) |
