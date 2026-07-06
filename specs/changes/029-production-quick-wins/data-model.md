# Data Model: Production Quick Wins

**Date**: 2026-07-06  
**Spec**: [spec.md](./spec.md)

No database migrations. This document describes logical entities and
comparison fields affected by CHG-029.

## Display state fingerprint (extended)

### Content item material fields

Compared in `sameTopContentState()` and `_queueItemFingerprint()`:

| Field | Type | Material when |
|-------|------|----------------|
| `id` | string | identity change |
| `displayOrder` | number | reorder |
| `isActive` | boolean | activation |
| `isFixed` | boolean | fixed flag |
| `isNovelty` | boolean | novelty flag |
| `recurringEveryXIterations` | number \| null | cadence |
| **`sourceReference`** | string | URL/path swap |
| **`mediaFile.mediaUrl`** | string \| undefined | uploaded file swap |
| **`effectiveDurationSeconds`** | number \| null | duration override |

**Immaterial** (unchanged in fingerprint): `title`, animation fields when duration unchanged, `contentType` alone without source change.

### Iframe material fields

Compared in `equalByDisplayFingerprint()`:

| Field | Material when |
|-------|----------------|
| `selectedIframe.id` | iframe selection |
| **`selectedIframe.url`** | same id, new embed URL |

### Unchanged fingerprint slices

- `sameAdsState` — no change in CHG-029
- `sameDisplayConfiguration` — no change
- Remote control scalar fields — unchanged

## Public upload route (singleton)

| Property | Value |
|----------|-------|
| Canonical path | `POST /api/public/content/upload` |
| Auth | Bearer API key (`ksk_live_…`) |
| Removed | Duplicate mount on `/api/content/upload` via v1 router |

## Rotation audit event (client-initiated)

| Field | Value |
|-------|-------|
| HTTP | `POST /api/display/rotation-event` |
| Body | `{ eventType: 'content_rotation_empty', payload: { reason: 'no_contents' } }` |
| Auth | Session cookie (display operator) |
| Response | `202 Accepted` |
| Client debounce | 200ms schedule; 60s min between reports (controller) |

## Session expiry (client)

| Status | Action on protected API |
|--------|-------------------------|
| 401 | Clear session → `/login` |
| 403 | Clear session → `/login` (new) |
| Login POST 401 | No redirect (unchanged) |

## Organizer logo visibility state

| State | `hiddenLogoUrl` | `organizerLogoUrl` | Visible |
|-------|-----------------|-------------------|---------|
| Normal | null | U | yes |
| Broken | U | U | no |
| Fixed URL | U | U2 | no (bug today) |
| **After CHG-029** | null (reset) | U2 | yes |

## Node toolchain pin

| Artifact | Value |
|----------|-------|
| `.nvmrc` | `24` |
| README | documents Node 24 |
| `release-images.yml` | `node-version: "24"` (already) |

## State transitions (fingerprint)

```
Poll N: content id=A, mediaUrl=X
Poll N+1: content id=A, mediaUrl=Y
  → sameTopContentState: false
  → watchState emits
  → applyState runs
  → if RC fingerprint unchanged: preserve content timer
  → UI renders media Y
```

## Relationships

- `display-fingerprint.ts` ← shared by `display.api.ts` and tests
- `kiosk-rotation.controller.ts` ← `_queueItemFingerprint` must mirror content fields
- `display-screen.component.ts` ← wires `rotationEventSink` to API
- `PUBLIC_CONTENT.API_KEYS` contract ← documents single upload path
