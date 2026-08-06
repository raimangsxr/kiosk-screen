# Context Pack: CHG-051 Kiosk Runtime Performance

**Change**: `specs/changes/051-kiosk-runtime-performance/`
**Status**: implemented (plan complete)
**Branch**: `051-kiosk-runtime-performance`

## Read first (in order)

1. `specs/changes/051-kiosk-runtime-performance/tasks.md`
2. `specs/changes/051-kiosk-runtime-performance/plan.md`
3. `specs/changes/051-kiosk-runtime-performance/research.md`
4. `specs/changes/051-kiosk-runtime-performance/contracts/contract-deltas.md`
5. `specs/changes/051-kiosk-runtime-performance/spec.md`

## Análisis de causa raíz (entrada a esta spec)

Hallazgos priorizados del análisis de rendimiento en uso real:

| Área | Síntoma | Criticidad |
|------|---------|------------|
| `DisplayMediaCacheService` — blobs sin eviction | RAM monotónica | P0 |
| Doble video/img + `blur(24px)` backdrop | CPU/GPU + 2× decode | P0 |
| Ping display como evento de aplicación → `lastEvent` | Churn reactivo cada 30 s | P0 |
| `verifyAuthOrRedirect` en cada `onerror` SSE | Tormenta HTTP en reconexión | P0 |
| `detectChanges` + 15 effects, sin OnPush | Main thread bloqueado | P0 |
| `show_ads` con catálogo completo cada tick | JSON pesado recurrente | P1 — optimización solo cliente (Q3=B) |
| Fallback polling + SSE simultáneo | Doble carga en degradación | P1 |
| `queue.Queue()` ilimitada por suscriptor display | Burst servidor → cliente | P1 — drop-oldest (Q2=A); solo display (Q5=A) |
| Admin `reconcileFromServer` sin coalescing | Refrescos solapados | P2 |

## Archivos de código principales (referencia para plan)

| Archivo | Rol |
|---------|-----|
| `frontend/src/app/display/display-media-cache.service.ts` | Caché blobs — añadir LRU/eviction |
| `frontend/src/app/display/display-screen.component.ts` | Effects, blur-fill, detectChanges |
| `frontend/src/app/display/display-stream.service.ts` | SSE cliente display — ping, onerror |
| `frontend/src/app/display/display-viewer.controller.ts` | Estado viewer |
| `frontend/src/app/features/content/admin-content-stream.service.ts` | SSE admin |
| `frontend/src/app/features/content/content-list.component.ts` | reconcileFromServer |
| `backend/app/api/display_stream.py` | Ping como publish vs comment |
| `backend/app/application/display_orchestrator/sse_hub.py` | Cola suscriptores |
| `backend/app/application/display_orchestrator/command_builder.py` | Payloads show_ads/show_content |

## Contratos a actualizar antes de implementar

- `specs/contracts/display-runtime/contract.md`
- `specs/contracts/content-ads-admin/contract.md` (si se documenta coalescing admin)

## Decisiones de producto bloqueadas

- Un solo entregable corrige P0+P1+P2 del análisis; no se fragmenta en múltiples CHG salvo decisión explícita en plan.
- La orquestación server-side sigue siendo la fuente de verdad de rotación.
- El modo respaldo por polling se mantiene; solo se corrige la superposición permanente con SSE recuperado.
- Retención de medios: visible + 1 precarga (sesión 2026-08-06).
- Cola SSE servidor: drop-oldest solo en stream display.
- Blur-fill vídeo: un `<video>` + backdrop CSS con poster/frame blur.
- `show_ads`: sin cambio de protocolo; deduplicación en cliente.
- ADR: enmendar ADR-0007 (no ADR-0014 salvo expansión de alcance).
- Validación: soak 30 min (proxy) + 8 h (release gate); SC-003 red recovery obligatorio antes de cerrar.
