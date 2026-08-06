# Data Model: Kiosk runtime performance (CHG-051)

**Date**: 2026-08-06

No PostgreSQL or API schema changes. This document describes **runtime state**
owned by client and server processes.

## Client: MediaRetentionSet

| Field | Type | Rule |
|-------|------|------|
| `visibleTopUrl` | `string \| null` | Media URL for current top slide |
| `preloadTopUrl` | `string \| null` | At most one preload URL from latest `preload` SSE |
| `visibleAdUrls` | `Set<string>` | URLs for current sponsor strip window only |
| `blobByUrl` | `Map<string, blobUrl>` | Keys ⊆ union of above; max 2 top + \|visibleAdUrls\| |

**Transitions**:

- On `show_content`: set `visibleTopUrl`; evict blobs not in new set; revoke URLs.
- On `preload`: replace `preloadTopUrl`; revoke prior preload blob if URL changed.
- On `show_ads` (after dedupe): recompute `visibleAdUrls`; evict ad blobs no longer visible.
- On iframe mode: clear top preload/visible blobs.
- On `ngOnDestroy`: `releaseAll()`.

## Client: VideoBackdropState

| Field | Type | Rule |
|-------|------|------|
| `contentId` | `string` | Slide identity |
| `backdropBlobUrl` | `string \| null` | Canvas capture; revoked when slide changes |
| `videoElement` | single ref | Only one `<video>` in DOM for top region |

## Client: DisplayStreamConnectionState

| Field | Type | Rule |
|-------|------|------|
| `connected` | signal | EventSource `onopen` |
| `reconnecting` | signal | `onerror` until `onopen` |
| `lastApplicationEvent` | signal | Updated only for non-heartbeat application events |
| `authVerifyNextAt` | monotonic ms | Debounce 5 s between `/api/auth/me` from SSE errors |
| `authVerifyInFlight` | boolean | Single-flight guard |

**Note**: Rename internal `lastEvent` semantics in contract to clarify heartbeats
do not update application event signal.

## Client: ShowAdsFingerprint

| Field | Type | Rule |
|-------|------|------|
| `commandId` | string | From payload |
| `startIndex` | number | From payload |
| `adIds` | string[] | Visible window ad ids in order |
| `borderKey` | string | `${radius}:${width}:${color}` |

If fingerprint equals previous, skip `applyShowAds` and ad media warm.

## Client: AdminReconcilePipeline

| Stream | Operator | Rule |
|--------|----------|------|
| `inventoryChanged$` | `debounceTime(1000)` | Existing |
| → `refresh({ silent: true })` | `switchMap` | Cancel prior HTTP if new signal |

## Server: StreamSubscriber (display)

| Field | Type | Rule |
|-------|------|------|
| `connectionId` | UUID | Existing |
| `events` | `Queue(maxsize=64)` | FIFO |
| `dropPolicy` | enum | `drop_oldest` on overflow |

**put algorithm**:

```text
if queue.full():
    try: queue.get_nowait()  # discard oldest
    except Empty: pass
queue.put(envelope)
```

## Server: Display heartbeat

| Artifact | Shape | Rule |
|----------|-------|------|
| SSE comment | `: ping\n\n` | Every 30 s idle; no JSON; no sequence advance |

## Relationships

```text
DisplayOrchestrator --publish--> DisplaySseHub --fanout--> StreamSubscriber.events
                                                              |
Kiosk DisplayStreamService <-------- SSE ---------------------+
DisplayMediaCacheService <-- warm/get -- DisplayViewerController
```
