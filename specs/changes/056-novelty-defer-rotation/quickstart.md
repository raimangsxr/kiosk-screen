# Quickstart: CHG-056 Novelty Defer Rotation

**Branch**: `056-novelty-defer-rotation`

## Prerequisites

- Local lab running (`docs/dev/local-lab.md`)
- Operator session open with loop rotation and ≥3 regular top items
- Public API or admin upload path to create `isNovelty` content

## Manual validation

### 1. Defer on slow network (P1)

1. Set `noveltyMaxDeferTransitions` to **3** in `/admin/configuration`.
2. Throttle kiosk network (DevTools → Network → Slow 3G).
3. Upload a large video via public API while regular content plays.
4. **Expect**: Rotation continues through regular items; novelty icon without check; no black hold on current slide.
5. When download completes, icon shows check.
6. **Expect**: Next transition shows novelty instead of next regular slot; following transition shows the displaced regular item.

### 2. Max defer discard (P1)

1. Set max defer to **2**; throttle to offline or extreme slow.
2. Upload novelty.
3. **Expect**: After 2 regular transitions without download, novelty icon disappears; Admin «Nov.» chip cleared; rotation continues.

### 3. Multi-kiosk readiness (P1)

1. Connect two kiosks to same session.
2. Throttle only kiosk A; upload novelty.
3. **Expect**: Rotation defers until **both** report ready (B fast alone is insufficient).
4. Disconnect slow kiosk A.
5. **Expect**: When B alone is connected and ready, novelty can emit on next boundary.

### 4. Regular gate unchanged (P1)

1. Remove network throttle.
2. Upload heavy **regular** (non-novelty) content or use large existing item.
3. **Expect**: Regular item still uses display gate (brief hold until ready or 30 s `media_error`).

### 5. Config propagation (P2)

1. Change max defer while kiosks connected.
2. **Expect**: New max within ~5 s via `config_updated`; lower max trims active defer counts per spec edge case.

## Automated tests (target)

```sh
pytest backend/tests/unit/test_novelty_defer_advance.py backend/tests/unit/test_novelty_preload_ready.py -q
pytest backend/tests/integration/test_display_novelty_defer_sse.py -q
npm --prefix frontend run test -- --include display-content-gate.service.spec.ts
```

## Contract update order

1. Apply `contracts/contract-deltas.md` to active contracts.
2. Update `specs/manifest.yml` related_changes.
3. Implement backend defer logic + migration.
4. Implement frontend gate bypass + ready reporter.
5. Admin configuration field.
