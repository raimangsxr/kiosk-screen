# Runtime state model: CHG-053

No persistent data model changes are introduced.

## TopMediaRetentionWindow

- `visibleUrl`: zero or one committed top-media URL.
- `preloadUrl`: zero or one next candidate URL, distinct from `visibleUrl`.
- Invariant: the union contains at most two URLs.
- Transition: mode change to iframe or teardown clears both.

## CacheOperation

- Identity: source media URL.
- State: `idle` → `downloading` → `ready` or `failed`.
- `generation`: component/cache lifecycle generation captured when download starts.
- `evictedWhileInflight`: records that the URL left all retained windows before completion.
- Ready transition is accepted only when the generation is current and the URL remains retained; otherwise the new object URL is revoked and the entry returns to `idle`.
- Probe failure revokes its temporary object URL before `failed` is published.

## BackdropArtifact

- Identity: visible content render key.
- Source: the single foreground image or video element.
- Representation: JPEG data URL, maximum width 320 px, proportional height, blur/saturation baked during capture.
- Lifecycle: at most the active key is stored; changing content or destroying the component removes the prior artifact.
- Reduced motion: artifact style resolves to no image.

## VisibleSponsorWindow

- Ordered visible sponsor IDs after applying `startIndex` and `inlineAdCount`.
- Presentation fields: border and transition configuration.
- Transport `commandId` is not part of equivalence.
- Equivalent consecutive windows do not update `adAnimationRun`.

## FallbackLifecycle

- `displayActive`: reactive boolean; false until initial SSE registration/state bootstrap or polling open succeeds.
- `fallbackPollingActive`: reactive boolean.
- When active + SSE unavailable + fallback threshold reached: start polling once.
- When SSE reconnects: stop polling and clear fallback within one effect cycle.

