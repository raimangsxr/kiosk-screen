---
id: CHG-048
type: change
status: implemented
modifies:
  - CONTENT.ADS.ADMIN
  - CONTENT.ROTATION
depends_on:
  - CHG-041
  - CHG-047
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
source_of_truth: false
read_by_default: true
requires_contract_update: true
oversize: false
---

# Feature Specification: Contenido en emisión y trazabilidad de rotación

**Feature Branch**: `048-content-now-playing`

**Created**: 2026-07-30

**Status**: Draft

**Input**: User description: "En la vista de contenido del admin: (1) destacar la fila del contenido que se muestra actualmente en los displays mediante fondo de fila (p. ej. amarillo), sin columna nueva; (2) el backend debe registrar en cada iteración de rotación el contenido mostrado, el siguiente y la lista de novedades, incluyendo cuando llega una novedad a mitad de ciclo."

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `CONTENT.ADS.ADMIN`, `CONTENT.ROTATION`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## Clarifications

### Session 2026-07-30

- Q: ¿Cómo debe actualizarse el fondo amarillo cuando avanza la rotación sin cambios en el inventario? → A: Nuevo evento SSE `now_playing_changed` en el stream admin existente (CHG-047), con `contentId` del ítem en emisión.
- Q: ¿A qué nivel deben escribirse los registros de rotación en producción? → A: `INFO` siempre (cada avance y cada replanificación).
- Q: Si un ítem es novedad y está en emisión, ¿cómo se ve la fila? → A: Fondo amarillo (emisión gana); chip «Nov.» se mantiene si `isNovelty=true`.
- Q: ¿Quién debe ver el fondo amarillo en vivo? → A: Cualquier operador autenticado con acceso a la lista (incl. `event_operator`).
- Q: Cuando el display no muestra contenido superior, ¿qué hace la lista? → A: Sin destacado hasta que vuelva contenido superior en emisión.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Ver qué contenido está en pantalla (Priority: P1)

Un operador de evento consulta la lista de contenido superior en el panel de administración mientras los quioscos están emitiendo. Puede identificar de un vistazo qué ítem está **en emisión ahora** porque **solo esa fila** lleva un fondo destacado (p. ej. tono amarillo suave), sin añadir columnas ni chips extra a la tabla.

**Why this priority**: Reduce incertidumbre operativa durante eventos en vivo; evita preguntas del tipo «¿cuál está sonando ahora?» y errores al reordenar o editar el ítem equivocado.

**Independent Test**: Abrir `/admin/content` con una sesión de display activa y rotación en marcha; verificar que exactamente una fila visible tiene fondo destacado y coincide con lo que muestran los quioscos.

**Acceptance Scenarios**:

1. **Given** una sesión de display activa que emite el contenido «Agenda», **When** el operador abre la lista de contenido, **Then** la fila de «Agenda» tiene el fondo destacado (p. ej. amarillo) y el resto de filas mantienen el fondo normal.
2. **Given** la rotación avanza al siguiente ítem, **When** el orquestador emite el nuevo ítem, **Then** el admin recibe evento SSE `now_playing_changed` y el fondo destacado se mueve a la nueva fila en ≤ 3 s sin recargar la página manualmente.
3. **Given** el ítem en emisión está en otra página de la tabla (paginación activa), **When** el operador está en una página distinta, **Then** ve un aviso compacto bajo la barra de acciones («En pantalla: [título]») que indica qué se emite aunque la fila no sea visible.
4. **Given** no hay sesión de display activa, **When** el operador abre la lista, **Then** ninguna fila tiene fondo destacado y no se muestra aviso engañoso.
5. **Given** el display está en modo anuncios, pausa o sin contenido superior visible, **When** el operador consulta la lista, **Then** ninguna fila tiene fondo destacado y no aparece aviso «En pantalla».
6. **Given** vista compacta en tarjetas (móvil), **When** hay ítem en emisión, **Then** la tarjeta correspondiente usa el mismo tratamiento de fondo destacado que la fila de escritorio.

---

### User Story 2 — Trazar cada paso de la rotación en logs (Priority: P1)

Un responsable técnico u operador con acceso a logs del servidor necesita auditar el comportamiento del orquestador de rotación: qué se muestra, qué tocará después y qué novedades pendientes hay en cada decisión de avance.

**Why this priority**: Depurar colas de novedades, saltos inesperados y desincronización entre admin y quiosco sin reproducir manualmente cada escenario.

**Independent Test**: Activar display, dejar rotar 3 ítems; en logs aparece una línea estructurada por avance con `mostrando`, `siguiente` y `novedades`.

**Acceptance Scenarios**:

1. **Given** rotación regular sin novedades (ítems 1→2→3), **When** se muestra el ítem 1, **Then** el log indica mostrando=1, siguiente=2, novedades=[].
2. **Given** se muestra el ítem 2 con novedades vacías, **When** se prepara el avance, **Then** el log indica mostrando=2, siguiente=3, novedades=[].
3. **Given** cada iteración de rotación (avance automático, novedad consumida, salto remoto, contenido fijo), **When** el orquestador emite un nuevo ítem al display, **Then** se escribe exactamente un registro de rotación con los tres campos anteriores.
4. **Given** logs en producción, **When** se consultan, **Then** cada registro incluye identificador de organización y de sesión de display para filtrar por evento.

---

### User Story 3 — Registrar cambio de cola de novedades sin esperar al siguiente avance (Priority: P2)

Mientras se muestra el ítem 3, llega un upload público (novedad ID=250). El operador y el equipo técnico deben ver en logs que la **planificación** cambió aunque el quiosco siga mostrando el 3 hasta que corresponda.

**Why this priority**: El caso descrito por el usuario (novedad que llega a mitad de ciclo) es la principal fuente de confusión operativa.

**Independent Test**: Con ítem 3 en emisión y cola de novedades vacía, subir contenido por API pública; verificar log adicional con mostrando=3, siguiente=250, novedades=[250] sin esperar al fin del timer del ítem 3.

**Acceptance Scenarios**:

1. **Given** mostrando ítem 3, siguiente planificado 4, novedades=[], **When** llega novedad 250, **Then** se escribe un registro con mostrando=3, siguiente=250, novedades=[250].
2. **Given** la novedad ya está en cola, **When** el display consume la novedad y avanza, **Then** el siguiente registro refleja mostrando=250 y la cola actualizada.
3. **Given** varias novedades pendientes, **When** se registra el estado, **Then** `novedades` lista todos los IDs pendientes en orden de consumo previsto.

---

### Edge Cases

- Salto remoto (`jump_to`, contenido fijo, iframe): el destacado admin y los logs reflejan el ítem realmente en emisión, no solo el cursor de rotación regular.
- Modo anuncios, pausa remota o ausencia de contenido superior en el display: **sin** fondo destacado ni aviso «En pantalla» hasta que vuelva a emitirse contenido superior.
- Ítem en emisión desactivado o eliminado desde admin: el destacado se limpia o pasa al siguiente en cuanto el orquestador reaccione; el log registra la transición.
- Varios quioscos en la misma sesión: un único «en emisión» (la sesión es autoritativa; todos muestran lo mismo).
- Operador sin sesión de display abierta: lista sin destacado si no hay emisión activa en la org; logs de rotación solo si hay orquestador activo.
- Operador `event_operator`: ve fondo amarillo en vivo igual que gestores de contenido; el stream SSE de `now_playing_changed` es de solo lectura para cualquier rol con acceso a la lista.
- Filtro «Solo novedades» activo: el fondo de emisión sigue aplicándose aunque el ítem en emisión no sea novedad.
- Ítem en emisión y novedad a la vez: fondo **amarillo** de emisión sustituye al naranja de novedad; el chip «Nov.» permanece visible mientras `isNovelty=true`.
- Reordenación drag-and-drop: el estado de arrastre no debe confundirse con el fondo de emisión (estilos distintos).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La lista de contenido superior en admin DEBE destacar la fila (o tarjeta en vista compacta) del ítem en emisión mediante **fondo de fila** visible (p. ej. tono amarillo suave). NO se añade columna nueva ni chip obligatorio en la tabla. Visible para **cualquier operador autenticado** con acceso de lectura a la lista (incl. `event_operator`).
- **FR-002**: El fondo destacado DEBE actualizarse cuando cambie el ítem en emisión, con latencia percibida ≤ 3 s. El backend DEBE emitir evento SSE `now_playing_changed` (payload con `contentId` en emisión) en el stream admin de CHG-047 en cada cambio de emisión, independientemente de mutaciones de inventario. Al **conectar** al stream, el servidor DEBE enviar de inmediato un `now_playing_changed` con el estado actual del orquestador (replay), para que el destacado sea correcto sin esperar al siguiente avance. El evento DEBE estar disponible para todos los roles con acceso de lectura a la lista (no restringido a `CONTENT_MANAGEMENT_ROLES`).
- **FR-003**: Si el ítem en emisión no está en la página visible de la tabla, DEBE mostrarse un aviso textual compacto con el título del ítem en emisión.
- **FR-004**: Sin sesión de display activa **o** sin contenido superior en emisión en el display (p. ej. modo anuncios, pausa), la lista NO DEBE marcar ningún ítem como en emisión ni mostrar aviso «En pantalla».
- **FR-005**: En cada decisión de emisión de contenido superior (rotación automática, consumo de novedad, navegación remota, bootstrap), el backend DEBE escribir un registro de log estructurado en nivel **INFO** con: contenido mostrado (id y título), siguiente contenido planificado (id y título, o explícitamente ninguno), y lista de ids de novedades pendientes ordenada.
- **FR-006**: Cuando la cola de novedades o el siguiente ítem planificado cambien (upload público, admin, reordenación) **sin** que cambie aún el ítem en pantalla, el backend DEBE escribir un registro `rotation_replan` en nivel **INFO** con el mismo formato, reflejando la nueva planificación. El **consumo** de una novedad que avanza la emisión NO genera `rotation_replan`; genera `rotation_plan` en el emit correspondiente (FR-005).
- **FR-007**: Los registros de rotación DEBEN incluir organizationId y operatorSessionId para correlación.
- **FR-008**: El destacado admin y los logs DEBEN basarse en la misma fuente de verdad del orquestador (ítem autoritativo en emisión, no inferencia del cliente).
- **FR-009**: El destacado DEBE ser accesible: la fila en emisión lleva `aria-label` o texto oculto para lectores de pantalla (p. ej. «En pantalla») además del fondo; el contraste texto/fondo debe cumpler legibilidad.
- **FR-010**: Los logs de rotación NO DEBEN incluir datos personales ni contenido binario de medios; ids y títulos administrativos son suficientes.
- **FR-011**: Si un ítem en emisión tiene `isNovelty=true`, la fila DEBE usar fondo amarillo de emisión (no naranja de novedad) y DEBE conservar el chip «Nov.» hasta que el backend limpie el flag.
- **FR-012**: El evento SSE `now_playing_changed` DEBE admitir payload vacío o `contentId: null` cuando el display deja de emitir contenido superior, para que el cliente retire el destacado.

### Traceability & Quality Requirements

- **TQ-001**: Los contratos `CONTENT.ADS.ADMIN` y `CONTENT.ROTATION` DEBEN actualizarse antes de la implementación.
- **TQ-002**: DEBEN existir pruebas automatizadas del formato de log en avance y en llegada de novedad, más prueba de UI del destacado; o validación manual documentada en `quickstart.md`.
- **TQ-003**: El manifiesto DEBE registrar CHG-048 antes de dar por cerrada la implementación.

### Key Entities

- **NowPlayingState**: Ítem de contenido actualmente en emisión para una sesión de display (contentId, título, timestamp).
- **RotationPlanSnapshot**: Vista derivada en un instante: siguiente ítem planificado y cola de novedades pendientes.
- **RotationLogEntry**: Registro estructurado emitido en cada avance o cambio de planificación.

## Success Criteria *(mandatory)*

- **SC-001**: El 100 % de los operadores de prueba identifican el ítem en emisión en la lista admin en menos de 5 segundos, sin consultar el quiosco.
- **SC-002**: Tras un cambio de ítem en display, el destacado admin se actualiza en ≤ 3 s en el 95 % de las pruebas en red local.
- **SC-003**: Cada avance de rotación en pruebas automatizadas produce exactamente un registro de log con los tres campos obligatorios (mostrando, siguiente, novedades).
- **SC-004**: Una novedad insertada a mitad de ciclo genera un registro de replanificación en ≤ 2 s sin esperar al siguiente avance.
- **SC-005**: Los registros permiten reconstruir manualmente una secuencia de 10 pasos de rotación sin ambigüedad (revisión por persona técnica en menos de 10 minutos).

## Assumptions

- Una sesión de display activa por organización es el caso habitual; el destacado refiere a esa sesión.
- Todos los quioscos de la sesión muestran el mismo contenido superior (modelo CHG-041).
- Los logs se consumen vía infraestructura de logging existente (stdout/agregador); nivel **INFO** en producción para avances y replanificaciones; no se exige panel admin de logs en esta entrega.
- La lista admin ya dispone de actualización en vivo (CHG-047); el destacado se integra mediante evento SSE `now_playing_changed` además del sync de inventario existente.
- El estilo de fondo reutiliza el patrón visual de la lista existente (similar al tinte de novedades) pero con token/color distinto para «en emisión» (p. ej. amarillo vs. naranja de novedad).
- Los títulos en logs coinciden con el título administrativo del ítem en el momento del registro.

## Relationships

- Modifies: `CONTENT.ADS.ADMIN`, `CONTENT.ROTATION`
- Depends on: CHG-041 (orquestador autoritativo), CHG-047 (lista admin con sync en vivo + stream SSE extendido)
- Extends: —
- Supersedes: —
