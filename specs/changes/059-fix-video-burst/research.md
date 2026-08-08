# Research: Video Burst Recovery

## Decision 1: One scheduler owns all preparations

**Decision**: `ensureReady()` becomes the public enqueue boundary. Every caller receives a deduplicated promise, while only the cache scheduler starts fetch/probe work and enforces the global limit of three.

**Rationale**: The current warm queue limits only calls made through `warm()`. Novelty tracking and readiness call `ensureReady()` directly, which bypasses that limit.

**Alternatives considered**:

- Teach each caller to use `warmItems()`: rejected because concurrency correctness would remain distributed and easy to bypass again.
- Add a second novelty-only semaphore: rejected because gate, visible content and novelty requests would still compete outside one global bound.

## Decision 2: Readiness does not imply retained Blob URL

**Decision**: A successfully downloaded/probed URL can remain logically ready without a retained presentation blob when it is outside the visible + one-preload window. Its temporary Blob URL is revoked immediately. If later selected for display, the retained request prepares it again before commit.

**Rationale**: CHG-056 needs readiness for pending novelties, while CHG-051/053 requires at most two retained top blobs. Treating those as the same state causes unbounded retention.

**Alternatives considered**:

- Retain all ready novelty blobs: rejected because memory grows with the queue and reproduces the production failure.
- Report later novelties ready without ever validating them: rejected because the server could emit an undecodable item.

## Decision 3: Gate every command that lacks a presentation source

**Decision**: Novelty commands retain their server-side priority but no longer bypass local source validation. If a ready novelty blob was released, the previous content remains visible until a presentation URL is available.

**Rationale**: Server readiness can outlive a client Blob URL. Immediate commit would bind an empty `src` and create a blank frame.

**Alternatives considered**:

- Fall back to the authenticated remote URL: rejected because it reintroduces buffering/black-frame behavior that CHG-050 removed.

## Decision 4: Failures use cooldown, not lifetime stickiness

**Decision**: Store failure time and reject immediate repeats during a short fixed cooldown. A later request clears the expired failure and re-enters the FIFO scheduler.

**Rationale**: Permanent failure state converts temporary network or decoder pressure into a kiosk-lifetime outage; immediate retry can create a request storm.

**Alternatives considered**:

- Retry automatically in a loop: rejected because unavailable/corrupt media would consume the scheduler indefinitely.
- Clear every failure immediately on eviction: rejected because fast rotation could hammer the same broken URL.

## Decision 5: Command-scoped video lifecycle

**Decision**: Include `commandId` in the render identity and error handler. A video error is reported once only if the element's command is still current.

**Rationale**: Reusing an ended video element for a repeated command does not restart playback, and reporting with the controller's newest command can misattribute a late DOM event.

**Alternatives considered**:

- Call `play()` imperatively on every command: rejected because remounting matches the existing declarative teardown model and resets decoder state cleanly.
