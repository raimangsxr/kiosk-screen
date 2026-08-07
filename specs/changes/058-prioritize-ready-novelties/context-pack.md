# Context pack: CHG-058 priorizar novedades descargadas

## Read first

1. `specs/manifest.yml`
2. `specs/contracts/content-rotation/contract.md`
3. `specs/changes/058-prioritize-ready-novelties/spec.md`
4. `backend/app/application/display_orchestrator/rotation_logic.py`
5. `backend/app/application/display_orchestrator/rotation_plan.py`
6. `backend/app/application/display_orchestrator/service.py`
7. Pruebas unitarias de aplazamiento y planificación de novedades en `backend/tests/unit/`

## Optional context

- `specs/changes/056-novelty-defer-rotation/context-pack.md` y `spec.md`, solo para rastrear la semántica de aplazamiento, FIFO y contenido regular reprogramado que este cambio extiende.
- `backend/app/application/display_orchestrator/novelty_defer.py` si la lógica de descarte o contadores interviene en el punto de decisión.

## Do not read by default

- `specs/archive/**`
- Otros cambios consolidados o no relacionados
- Frontend, salvo que la inspección del contrato de eventos revele un cambio observable en el cliente

## Current behavior and gap

- CHG-056 permite que una novedad lista sustituya el siguiente hueco regular y reprograma ese regular para la transición inmediatamente posterior.
- Con varias novedades listas, el regular reprogramado se emite entre novedades.
- El comportamiento objetivo conserva el cursor regular y vacía primero la secuencia FIFO de novedades listas: `1, 6, 7, 8, 2`.

## Expected validation

- Secuencia de varias novedades listas.
- Una sola novedad lista.
- Cabeza FIFO no lista con una posterior lista.
- Cursor y contadores regulares sin avance durante una ráfaga.
- Snapshot de planificación sin mutación y logs `rotation_plan`/`rotation_replan` coherentes.
