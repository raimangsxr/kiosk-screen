# Data Model: Media Preparation Lifecycle

No persisted data model changes are required. The change refines per-display in-memory state.

## Media preparation record

- `url`: deduplication identity.
- `contentType`: `photo` or `video`, used by presentation probing.
- `generation`: component/cache lifecycle that owns the work.
- `state`: `queued` → `downloading` → `ready` or `failed`.
- `promise`: shared completion observed by all callers for the URL.

## Readiness and presentation ownership

- `readyStateByUrl` records whether media has been successfully downloaded and probed.
- `blobByUrl` exists only when the URL belongs to the retained presentation window.
- `topRetained` contains at most visible content plus one preload.
- A URL may be `ready` without an entry in `blobByUrl`; when it later enters `topRetained`, it must be prepared again before display commit.

## Failure lifecycle

```text
idle → queued → downloading → failed(cooldown) → queued → downloading → ready
```

- A request during cooldown fails without starting new network work.
- A request after cooldown removes the stale failure and starts normally.
- A successful preparation clears failure metadata.

## Command-scoped video state

- Render identity: media identity plus originating `commandId`.
- Error dedupe: set of command IDs already reported by the viewer controller.
- A report is valid only when command ID and content ID still match the viewer's current values.
