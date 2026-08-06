# Research: Kiosk runtime performance (CHG-051)

**Date**: 2026-08-06

## R1 — Media retention window size

**Decision**: Retain at most **one visible** top-content blob plus **one preload**
blob; for ads, retain only URLs in the current visible sponsor window (no
rotation history).

**Rationale**: Spec clarification session 2026-08-06 (Q1=A). Matches
orchestrator `preload` semantics (single upcoming item). Prevents monotonic
`blobByUrl` growth observed in production.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| LRU of N=5–10 items | Still grows with large playlists; overshoots spec |
| Unlimited preload signals | Violates FR-004; root cause of leak |
| Server-side media push reduction | Out of scope; protocol unchanged for content |

---

## R2 — Video blur-fill without double decoder

**Decision**: Single `<video>` for playback; backdrop uses **CSS
`background-image`** set from a **one-time canvas capture** (`drawImage` on
`loadeddata`) stored as a short-lived blob URL revoked with the slide.

**Rationale**: Spec Q4=A. Preserves CHG-028 visual intent while SC-004 requires
one active decoder. Photos may keep dual `<img>` (decode cost lower than video).

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Second muted `<video>` backdrop | Root cause of RAM/CPU issue |
| Solid `#102832` only for video | Regresses CHG-028 acceptance |
| `filter: blur()` on same video element | Blurs foreground, not backdrop fill |

---

## R3 — Display SSE heartbeat shape

**Decision**: Emit **SSE comment** lines (`: ping\n\n`) from `display_stream.py`,
matching admin content stream. Do **not** call `hub.publish(event_type="ping")`.

**Rationale**: Application pings advanced sequence, filled Redis buffer, and set
`lastEvent` on client — triggering 15 Angular effects every 30 s. Comments keep
connection alive per HTTP SSE spec without application semantics.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Client-only ignore of ping events | Server still wastes buffer/sequence |
| `build_ping_envelope(advance_sequence=False)` | Still fan-out JSON; comment is lighter |
| Disable heartbeats | Proxies/timeouts close long-lived streams |

---

## R4 — SSE error auth refresh storm

**Decision**: **5 s debounce** + **single-flight** guard on `verifyAuthOrRedirect`
in `DisplayStreamService`.

**Rationale**: `EventSource.onerror` fires repeatedly during reconnect; each call
to `auth.refresh()` contended with SSE message processing on a saturated main
thread.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| No auth check on SSE error | Stale sessions never redirect to login |
| 30 s debounce | Too slow for real auth expiry during event |
| Exponential backoff to 60 s | Same as fallback delay; confusing UX |

---

## R5 — Display subscriber queue bound

**Decision**: `queue.Queue(maxsize=64)` with **drop-oldest** on `put` when full
(display stream only). Admin stream unchanged (spec Q5=A).

**Rationale**: Unbounded `queue.Queue()` grew server RAM when kiosk main thread
blocked; burst on recovery worsened client freeze. 64 events ≈ many minutes of
rotation at typical cadence before loss; drop-oldest favors current program state.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Close connection on overflow | Disrupts live event; forces full reconnect storm |
| Coalesce by event type server-side | Higher complexity; drop-oldest sufficient for v1 |
| Bound admin queue too | Low volume; FR-014 handles client |

---

## R6 — `show_ads` load reduction

**Decision**: **Client-side fingerprint dedupe** before `applyShowAds` /
`mediaCache.warm`. Server payload unchanged (spec Q3=B).

**Rationale**: Avoids protocol/version churn across kiosks mid-event. Fingerprint
=`commandId` + `startIndex` + sorted visible ad ids + border hash.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Delta-only SSE ticks | Spec explicitly forbids protocol change |
| Server cache per kiosk | Out of scope; no session state on ads catalog |

---

## R7 — Angular change detection strategy

**Decision**: `ChangeDetectionStrategy.OnPush` on `DisplayScreenComponent`;
remove `syncContentRenderItems()` → `detectChanges()`; use signals + `markForCheck`
only where template reads non-signal state (`stateVersion`).

**Rationale**: Default CD + 15 constructor effects re-ran on every ping and blob
revision; correlated with “SSE feels dead” reports under load.

**Alternatives considered**:

| Alternative | Replaced detectChanges only | Insufficient without OnPush |
|-------------|---------------------------|-----------------------------|
| Zoneless migration | Larger blast radius | Deferred to future change |

---

## R8 — Admin inventory reconcile coalescing

**Decision**: `content-list` uses **`switchMap`** (or explicit abort) on
`inventoryChanged$` → `facade.refresh({ silent: true })` so only one list fetch
is in flight; debounce 1 s preserved.

**Rationale**: Overlapping silent refreshes during busy upload windows stacked
HTTP + table re-renders; FR-014 requirement.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|------------------|
| Increase debounce to 5 s | Stale list during rapid edits |
| Server push full list in SSE | Out of scope |
