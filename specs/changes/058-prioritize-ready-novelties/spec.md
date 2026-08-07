---
id: CHG-058
type: change
status: implemented
modifies:
  - CONTENT.ROTATION
depends_on:
  - CHG-041
  - CHG-056
extends:
  - CHG-056
supersedes: []
superseded_by: []
consolidated_into: []
source_of_truth: false
read_by_default: true
requires_contract_update: true
oversize: false
---

# Feature Specification: Priorizar novedades descargadas

**Feature Branch**: `058-prioritize-ready-novelties`

**Created**: 2026-08-07

**Status**: Implemented

**Input**: User description: "Si hay novedades pendientes de mostrar y descargadas, se debe dar prioridad antes de continuar con la rotación normal. Si se muestra 1 y llegan 6, 7 y 8, se muestran 6, 7 y 8 y después se continúa por 2, 3, etc."

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `CONTENT.ROTATION`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vaciar novedades listas antes de reanudar la rotación (Priority: P1)

Durante la visualización de un contenido regular pueden llegar varias novedades. Cuando las novedades pendientes ya están descargadas en todos los quioscos conectados, el sistema las muestra consecutivamente, en orden de llegada, antes de continuar por el siguiente contenido regular que correspondía.

**Why this priority**: Hace que el contenido recién llegado aparezca cuanto antes y evita intercalar contenido antiguo entre novedades que ya están listas.

**Independent Test**: Iniciar una rotación regular 1–5 mostrando 1, encolar y marcar como listas las novedades 6, 7 y 8, y comprobar la secuencia visible `1, 6, 7, 8, 2, 3`.

**Acceptance Scenarios**:

1. **Given** se muestra el contenido regular 1 y las novedades 6, 7 y 8 están pendientes y listas, **When** ocurren los siguientes límites de rotación, **Then** la secuencia emitida es 6, 7, 8 y después 2.
2. **Given** termina la ráfaga de novedades listas, **When** ocurre la siguiente transición, **Then** la rotación regular continúa desde el contenido que seguía al último regular mostrado, sin saltarlo ni reiniciar el ciclo.
3. **Given** llegan nuevas novedades listas mientras ya se está emitiendo una ráfaga de novedades, **When** alcanzan su posición FIFO, **Then** se muestran antes de reanudar la rotación regular.

---

### User Story 2 - Mantener la tolerancia a descargas incompletas (Priority: P1)

Si la primera novedad pendiente aún no está descargada en todos los quioscos conectados, el sistema conserva el aplazamiento existente: continúa con el siguiente contenido regular, mantiene la novedad pendiente e incrementa su contador.

**Why this priority**: La prioridad de novedades listas no debe volver a bloquear la rotación en redes lentas ni romper el orden FIFO.

**Independent Test**: Encolar 6 sin completar y 7 lista; verificar que 7 no adelanta a 6, que se muestra 2 y que 6 conserva el comportamiento de aplazamiento configurado.

**Acceptance Scenarios**:

1. **Given** la novedad 6 encabeza la cola pero no está lista y la novedad 7 sí, **When** llega una transición, **Then** se muestra el siguiente contenido regular, 6 se aplaza y 7 no la adelanta.
2. **Given** la novedad 6 pasa a estar lista tras un aplazamiento, **When** ocurre la siguiente transición, **Then** se muestran consecutivamente 6 y las novedades FIFO posteriores que también estén listas antes de volver a la rotación regular.

### Edge Cases

- Una única novedad lista se muestra y después se reanuda la rotación en el siguiente contenido regular.
- Una novedad posterior lista no adelanta a la cabeza FIFO si esta continúa descargándose.
- Si una novedad agota el máximo de aplazamientos, se consume según el contrato vigente y la siguiente cabeza de cola se evalúa en la transición posterior.
- Pausa, contenido fijo e iframe mantienen la inactividad de novedades definida actualmente.
- Una cola de novedades que crece mientras se vacía conserva el orden FIFO y no modifica el cursor regular.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: En modo loop, el sistema MUST emitir la cabeza de la cola de novedades antes del siguiente contenido regular cuando esté descargada en todos los quioscos conectados.
- **FR-002**: Tras emitir una novedad, el sistema MUST volver a evaluar la cola de novedades en el siguiente límite de rotación y MUST emitir la nueva cabeza si también está lista.
- **FR-003**: El sistema MUST continuar emitiendo novedades listas consecutivas, en orden FIFO, hasta que la cola quede vacía o su cabeza no esté lista.
- **FR-004**: Mientras se emite una ráfaga de novedades listas, el sistema MUST conservar el cursor regular y el siguiente contenido regular pendiente sin emitirlo ni avanzarlo.
- **FR-005**: Al terminar o interrumpirse la ráfaga de novedades, el sistema MUST reanudar la rotación en el contenido regular que seguía al último regular mostrado.
- **FR-006**: Una novedad posterior MUST NOT adelantar a una novedad anterior que aún no esté lista.
- **FR-007**: Si la cabeza de novedades no está lista, MUST mantenerse el comportamiento vigente de aplazamiento, descarte por máximo y avance regular.
- **FR-008**: Pausa, contenido fijo e iframe MUST conservar el comportamiento vigente y no iniciar ni avanzar una ráfaga de novedades.
- **FR-009**: La planificación y los logs de rotación MUST reflejar como siguiente elemento la cabeza de novedades lista mientras exista una ráfaga prioritaria pendiente.

### Traceability & Quality Requirements

- **TQ-001**: El contrato activo `CONTENT.ROTATION` MUST actualizarse antes de implementar el cambio observable.
- **TQ-002**: El cambio MUST incluir pruebas automatizadas para la secuencia `1, 6, 7, 8, 2`, una sola novedad, cabeza no lista con posterior lista y conservación del cursor regular.
- **TQ-003**: La entrada de manifiesto MUST actualizarse antes de considerar completa la implementación.

### Key Entities

- **Ráfaga de novedades listas**: Secuencia FIFO de una o más novedades consecutivas que están descargadas en todos los quioscos conectados y se emiten antes de reanudar contenido regular.
- **Cursor regular preservado**: Posición de la rotación normal que permanece sin cambios durante la ráfaga y señala el contenido regular a emitir al terminarla.

## Success Criteria *(mandatory)*

- **SC-001**: Con contenidos regulares 1–5 y novedades listas 6–8 llegadas mientras se muestra 1, el 100 % de las ejecuciones de prueba produce `1, 6, 7, 8, 2, 3`.
- **SC-002**: En el 100 % de las pruebas, ningún contenido regular se pierde, duplica o reordena por emitir una ráfaga de novedades.
- **SC-003**: En el 100 % de las pruebas con cabeza no lista, la rotación regular sigue avanzando y ninguna novedad posterior adelanta a la cabeza FIFO.
- **SC-004**: El cambio no introduce pantallas negras ni pausas adicionales respecto al tiempo configurado de cada contenido.

## Assumptions

- "Descargada" conserva la definición vigente de CHG-056: confirmada por todos los quioscos conectados en ese momento.
- Se conserva el orden FIFO de novedades; la prioridad se aplica a la cola desde su cabeza, no a cualquier novedad lista aislada.
- El cursor regular no avanza durante novedades; el mecanismo vigente de contenido regular reprogramado puede conservar el mismo siguiente contenido hasta que termine la ráfaga.
- No cambian las interfaces públicas, la configuración de aplazamiento ni el indicador visual de novedades.

## Relationships

- Modifies: `CONTENT.ROTATION`
- Extends: `CHG-056`
- Depends on: `CHG-041`, `CHG-056`
- Supersedes: —
- Superseded by: —
