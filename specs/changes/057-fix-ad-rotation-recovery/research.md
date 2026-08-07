# Research: CHG-057 Ad Rotation Recovery

**Date**: 2026-08-07

## R1 — Orchestrator reactivation entry points

**Decision**: Call `ensure_display_orchestrator(session, org_id)` on:

1. Existing path: `POST /display/kiosk/register` (unchanged).
2. **New**: `GET /display/stream` open-time DB session (before snapshot build).
3. **New**: `GET /display/state` (before building response).

`ensure_display_orchestrator` already calls `ensure_ad_rotation` + `ensure_top_rotation` when orchestrator exists or Redis has `commandSequence > 0`.

**Rationale**: Clarification Q4. Stream reconnect without re-register was the production failure mode. Polled state must reactivate engine when reaper removed it during SSE outage (clarification Q2 + edge case “motor inactivo en respaldo”).

**Alternatives considered**:

- Client re-register on fallback — rejected; FR-001 forbids manual re-register; extra traffic.
- Change reaper to keep orchestrator while kiosks registered — rejected in clarify (option C); broader CHG-051 behavior change.

---

## R2 — Polled display state shape

**Decision**: Add optional `currentTop` and `currentAds` to `DisplayStateSchema` / `DisplayState`, using the **same payload shapes** as SSE `snapshot.currentTop` and `snapshot.currentAds` (reuse `build_show_content_payload` / `build_show_ads_payload` via new `runtime_state.py` helper shared with `snapshot_builder`).

**Rationale**: Clarification Q2; avoids parallel DTOs; client can call existing `applyShowContent` / `applyShowAds` during fallback.

**Alternatives considered**:

- Embed only `currentAdStartIndex` integer — insufficient for client apply without rebuilding payloads.
- Return full SSE snapshot on GET `/state` — too large; breaks fingerprint assumptions.

---

## R3 — Polling fingerprint extension

**Decision**: Extend `equalByDisplayFingerprint` to compare runtime rotation position:

- `currentTop?.commandId` + `currentTop?.content.id`
- `currentAds` visible-window fingerprint (reuse `DisplayViewerController.showAdsFingerprint` logic or shared util)

**Rationale**: Without this, `distinctUntilChanged` suppresses poll emissions when playlist shape is stable but orchestrator index advances (root cause #3 in problem statement).

**Alternatives considered**:

- Remove `distinctUntilChanged` on poll — noisy; re-triggers unrelated state effects.

---

## R4 — `adsVisible` false kills ad timer permanently

**Decision**:

1. When `apply_remote_state` sets `adsVisible` from false → true, call `orchestrator.ensure_ad_rotation(session)`.
2. When `advance_ad` runs with `adsVisible: false`, call `self._scheduler.cancel_ad()` and return (do **not** leave a pending timer that dies without re-arm).
3. When hiding ads (`true → false`), cancel ad timer proactively in `apply_remote_state` patch path.

**Rationale**: Clarification Q2 scenario 2; confirmed code path: `advance_ad` returns early without `_arm_ad_timer`, permanently stopping rotation.

**Alternatives considered**:

- Re-arm timer while hidden (no-op ticks) — wastes work; cancel is cleaner.

---

## R5 — Sponsor animation vs media dedupe (CHG-053)

**Decision**: In `DisplayViewerController.applyShowAds`:

1. Compute fingerprint as today.
2. If animation effective value ≠ `none`, always increment `adAnimationRun` (even when fingerprint unchanged).
3. Update `visibleAds`, border, `inlineAdCount`, `lastShowAdsFingerprint` only when fingerprint changes (preserves media warm skip in `display-screen` effects).

**Rationale**: Clarification Q3 (`none` stays static); FR-006; CHG-053 dedupe remains for render/media cost.

**Alternatives considered**:

- Include `commandId` in fingerprint — rejected in CHG-053; would restart media work.
- Server-side always shift `startIndex` with one ad — does not help when `inlineAdCount >= len(ads)`.

---

## R6 — Recovery scope (top + ads)

**Decision**: `ensure_display_orchestrator` restores **both** top and ad rotation when mode is loop and not paused; when paused/fixed/iframe, `ensure_top_rotation` / remote paths already respect mode — sponsors still recover via `ensure_ad_rotation`.

**Rationale**: Clarification Q1; reaper stops entire orchestrator; partial recovery leaves broken kiosks.

**Alternatives considered**:

- Ads-only ensure on reconnect — leaves top frozen after reaper; rejected.

---

## R7 — UX on recovery

**Decision**: No new kiosk UI; existing `reconnecting` / `sseFallbackActive` banners only (FR-010).

**Rationale**: Clarification Q5.

---

## ADR decision

No new ADR file. Behavior extends ADR-0009 server orchestration; document in contract deltas only.
