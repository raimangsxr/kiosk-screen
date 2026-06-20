# Contract: Kiosk Display State and Render Behaviour

**Date**: 2026-06-20
**Spec**: [spec.md](../spec.md)

This contract describes what the kiosk sees from `GET /api/display/state` and how the kiosk renders the top zone for each content type. It supersedes the iframe-related parts of `specs/006-remote-control-display/contracts/backend-contract.md` and the relevant parts of `specs/009-public-content-api/contracts/kiosk-live-update-contract.md` for video advance timing.

## Public DTO: `GET /api/display/state`

The top-zone-relevant fields of the response are:

```jsonc
{
  "configuration": {
    /* KioskConfigurationSchema, including the new videoEndDelaySeconds */
    "defaultTopDurationSeconds": 15,
    "defaultAdDurationSeconds": 10,
    "inlineAdCount": 3,
    "remoteControlPollingSeconds": 3,
    "videoEndDelaySeconds": 2,
    "isEnabled": true,
    "configuredEventDurationMinutes": 240
  },
  "topContent": [ /* ContentItemSchema[]; contentType is 'photo' or 'video' only */ ],
  "ads": [ /* AdItemSchema[] */ ],
  "remoteControl": {
    "contentMode": "loop" | "iframe",
    "selectedIframeId": "uuid | null",
    "adsVisible": true,
    "updatedAt": "..."
  },
  "selectedIframe": { /* IframeSchema or null, hydrated from selectedIframeId */ },
  "fallbackActive": false
}
```

- `topContent[].contentType` is `'photo' | 'video'` only. The kiosk MUST treat any other value as if it were not in the list (graceful degradation; the server never returns such a value after this feature ships, but the kiosk stays defensive).
- `selectedIframe` is populated when `remoteControl.contentMode === 'iframe'`. When the server detects that the active `Iframe` row referenced by `selectedIframeId` has been deleted, the server sets `remoteControl.contentMode='loop'`, `selectedIframeId=null`, and `selectedIframe=null` in the public DTO (this is the same state as the admin-side cleanup). The kiosk then renders Content rotation.
- `configuration.videoEndDelaySeconds` is included in the kiosk fingerprint equality so the kiosk picks up changes on the next poll.

## Kiosk Render Behaviour

The kiosk's `DisplayScreenComponent` (top zone) has three mutually exclusive render branches:

### Branch 1: Photo

- **Trigger**: `remoteControl.contentMode === 'loop'` AND `currentItem.contentType === 'photo'`.
- **Render**: `<img [src]="currentItem.mediaFile.publicReference" ...>` filling the top zone.
- **Advance**: `setTimeout(advanceNow, currentItem.effectiveDurationSeconds * 1000)` where `effectiveDurationSeconds` is the existing resolution chain (`item.durationSeconds ?? configuration.defaultTopDurationSeconds`).
- **Pre-transition poll**: existing behaviour, fires at `durationMs - 1000` to catch newly uploaded photos.

### Branch 2: Video

- **Trigger**: `remoteControl.contentMode === 'loop'` AND `currentItem.contentType === 'video'`.
- **Render**: `<video [src]="currentItem.mediaFile.publicReference" autoplay muted playsinline (ended)="onVideoEnded(currentItem)">`.
- **Advance**: NO `setTimeout` for the duration. The `(ended)` event handler schedules `setTimeout(advanceNow, configuration.videoEndDelaySeconds * 1000)`. The advance clock is owned by the browser, not the app.
- **No pre-transition poll** during video playback. (The `ended` event is the source of truth.)
- **No loop**: the `loop` attribute is removed from the `<video>` element.
- **Fallback**: none. If the video never fires `ended` (load error, autoplay blocked, live stream), the kiosk stays on the video. The operator must use the remote control to change the content.

### Branch 3: Iframe

- **Trigger**: `remoteControl.contentMode === 'iframe'` AND `selectedIframe` is non-null.
- **Render**: `<iframe [src]="safeUrl(selectedIframe.url)" frameborder="0" allowfullscreen>` filling the top zone. The kiosk applies the standard front-end URL sanitisation (`bypassSecurityTrustResourceUrl`) to satisfy the browser's same-origin policy; no further policy is enforced.
- **Advance**: none. The iframe is fixed until the operator changes the remote control.
- **No polling re-render** of the iframe element on subsequent polls; the iframe element is mounted once on the first poll that introduces `contentMode='iframe'` and unmounted on the first poll that returns `contentMode='loop'`.

### Mode Transitions

- `loop → iframe`: the next poll mounts the iframe element. The rotation cursor (`currentItemId`, `baseAnchorId` in the frontend `DisplayRotationService`) is preserved untouched (Q1, FR-014).
- `iframe → loop`: the next poll unmounts the iframe element and re-enters Branch 1 or Branch 2 depending on the current `topContent` item. The rotation cursor is preserved; if the anchor item is still in `topContent`, it is shown with a fresh `effectiveDurationSeconds` timer; if it has been removed, the existing novelty-queue rules apply (FR-014, US-5 acceptance scenarios).
- The kiosk fingerprint equality in `DisplayApiService.watchState` already ignores `contentMode` changes for re-render purposes; the implementation must ensure that this equality is preserved and that toggling modes does not reset the cursor.

## Polling Contract

- The kiosk polls `GET /api/display/state` every `configuration.remoteControlPollingSeconds` (1..60, default 3).
- For photos, the kiosk also fires a pre-transition poll 1 second before the next scheduled advance. This poll is not used for videos.
- The kiosk does not poll during iframe mode (no `topContent` rotation to advance); the existing `watchState` interval continues, but the response is processed only for `configuration` and `remoteControl` changes.

## Removed Fields

- `ContentItemSchema.contentType` no longer accepts `embedded_web` in any request, response, or DB row.
- `RemoteControlAdminStateSchema.selectedIframe` (old shape) is replaced by the new `IframeSchema`.
- `DisplayStateSchema.selectedIframe` (old shape) is replaced by the new `IframeSchema`.
- `KioskConfigurationSchema` gains `videoEndDelaySeconds`.

## Removed Routes and Models

- `POST /api/content/iframe` is removed.
- `GET/POST/PUT/DELETE /api/approved-domains` are removed.
- The `approved_embedded_domains` table, the `ApprovedEmbeddedDomain` model, and the `frontend/src/app/features/domains/` directory are removed.
