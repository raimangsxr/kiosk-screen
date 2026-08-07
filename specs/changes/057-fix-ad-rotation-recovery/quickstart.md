# Quickstart: CHG-057 Ad Rotation Recovery

Manual validation scenarios for operators and developers. Run after implementation.

## Prerequisites

- Local lab per `docs/dev/local-lab.md`
- Event with ≥2 active sponsors and ≥2 top content items, loop mode, default ad duration 10s
- One kiosk at `/display` with label set

---

## §1 — Reconnect after orchestrator reaper (US1, SC-001)

**Goal**: Rotation resumes without page refresh after prolonged SSE loss.

1. Open display from admin; confirm kiosk shows rotating sponsors and top content.
2. In DevTools → Network, block `/api/display/stream` or kill backend SSE (simulate disconnect >2 min in integration test; locally use test hook or wait for reaper in staging).
3. Wait until reaper removes orchestrator (integration test uses 120s grace; staging: check logs `Reaped … idle orchestrator`).
4. Unblock network / allow SSE reconnect **without** refreshing the kiosk tab.
5. **Pass**: Within two ad-duration intervals, sponsors animate or change window; top content advances (loop, not paused).

**Evidence**: Screenshot or screen recording; optional SSE event log showing `show_ads` after reconnect.

---

## §2 — Hide and restore sponsors (US2, SC-002)

**Goal**: Remote hide/show does not permanently freeze sponsors.

1. Kiosk rotating with sponsors visible.
2. Admin → remote control → hide sponsors (`adsVisible: false`).
3. Wait ≥1 full ad duration.
4. Restore sponsors (`adsVisible: true`).
5. **Pass**: Sponsors rotate within the next full ad cycle without kiosk refresh.

---

## §3 — Fallback polling sync (US3, SC-003)

**Goal**: Polled state keeps sponsors/top in sync when SSE is down.

1. With kiosk running, force SSE failure until “Modo de respaldo: actualización por polling” appears (~60s).
2. Observe sponsors and top for ≥5 poll intervals (default remote control polling if configured, or fallback interval from `DisplayPollingService`).
3. **Pass**: With ≥2 ads/top items, visible window or top item advances at least once across polls; or single-ad event shows animation each cycle if animation ≠ `none`.

---

## §4 — Single sponsor animation (US4, SC-004)

**Goal**: Few ads still look “alive” when animation configured.

1. Configure event with **one** active sponsor, animation `fade` (not `none`), inline ad count 1.
2. Observe kiosk for ≥2 ad cycles.
3. **Pass**: Fade animation runs each cycle though the same image shows.

4. Repeat with animation `none`.
5. **Pass**: Strip remains static; **not** a failure.

---

## §5 — Silent recovery (FR-010)

After any recovery in §1–§3:

- **Pass**: No new toast/banner beyond existing “Reconectando…” / “Modo de respaldo…”.

---

## Automated substitute

When manual staging is unavailable, run:

```sh
pytest backend/tests/integration/test_display_ad_rotation_recovery.py -q
npm --prefix frontend run test -- --include='**/display-viewer.controller.spec.ts' --include='**/display-screen.component.spec.ts'
```

Record pass/fail in `checklists/requirements.md` §Success Criteria Validation during implement.
