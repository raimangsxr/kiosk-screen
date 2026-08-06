---
id: CHG-057
type: change
status: implemented
modifies:
  - CONTENT.ROTATION
  - DISPLAY.RUNTIME
depends_on: []
extends:
  - CHG-041
  - CHG-051
  - CHG-053
supersedes: []
superseded_by: []
consolidated_into: []
source_of_truth: false
read_by_default: false
requires_contract_update: true
oversize: false
---

# Feature Specification: Recuperación automática de rotación de anuncios en kioskos

**Feature Branch**: `057-fix-ad-rotation-recovery`

**Created**: 2026-08-07

**Status**: Planned

**Input**: User description: "Implementemos las correcciones identificadas tras el análisis de rotación de anuncios congelada en kioskos: recuperación sin refrescar pestaña tras cortes de red, rearma de rotación al restaurar visibilidad de sponsors, sincronización en modo de respaldo por polling, y rotación perceptible cuando hay pocos anuncios activos."

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `CONTENT.ROTATION`, `DISPLAY.RUNTIME`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## Clarifications

### Session 2026-08-07

- Q: Cuando un kiosko reconecta tras una interrupción que dejó inactivo el motor de rotación de la sesión, ¿qué debe recuperarse automáticamente? → A: Recuperar rotación completa (sponsors y contenido superior), respetando pausa, fijo e iframe activos.
- Q: En modo de respaldo (polling), ¿cómo debe el kiosko mantener sponsors y contenido superior al día? → A: Ampliar el estado consultado en respaldo para incluir ventana de sponsors y contenido superior actual del motor de rotación.
- Q: Con un solo sponsor y animación configurada como `none`, ¿qué comportamiento se espera? → A: Respetar `none`; la franja puede permanecer estática. US4/SC-004 aplican solo cuando la animación configurada no es `none`.
- Q: ¿En qué momentos debe el servidor reactivar el motor de rotación durante cortes prolongados del canal en tiempo real? → A: Al registrar el kiosko, al abrir/reconectar el canal SSE y al servir el estado consultado en respaldo si el motor está inactivo.
- Q: Cuando la rotación se recupera automáticamente tras un bloqueo, ¿qué debe ver el operador o visitante en el kiosko? → A: Recuperación silenciosa; solo los indicadores de conexión/respaldo ya existentes.

## Problem statement

En producción, operadores con acceso limitado a los kioskos han observado que la franja de sponsors deja de rotar y la única recuperación fiable es refrescar la pestaña del navegador. El análisis técnico identificó varias causas independientes que comparten el mismo síntoma visible:

1. Tras cortes de conexión prolongados, el motor de rotación del servidor puede quedar inactivo mientras el kiosko reconecta el canal de eventos sin reactivarlo.
2. Ocultar y volver a mostrar sponsors desde control remoto puede dejar el temporizador de anuncios sin rearma.
3. En modo de respaldo (cuando el canal en tiempo real no está disponible), el estado consultado no refleja el avance de la ventana de anuncios.
4. Con pocos anuncios activos respecto al número mostrados en línea, el kiosko puede ignorar ticks consecutivos equivalentes y la franja parece congelada aunque el servidor siga avanzando.

Este cambio busca que la rotación de sponsors se recupere sola y siga siendo perceptible, sin intervención física en el kiosko.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Rotación sobrevive a cortes de red (Priority: P1)

Como operador de evento con kioskos en ubicaciones de difícil acceso, quiero que la rotación de sponsors se restaure automáticamente tras interrupciones de red, para no depender de refrescar manualmente cada pantalla.

**Why this priority**: Es el escenario reportado en producción y el que más impacto operativo tiene cuando el acceso físico es limitado.

**Independent Test**: Simular desconexión del canal en tiempo real durante más de dos minutos, reconectar el kiosko sin recargar la página y verificar que los sponsors vuelven a rotar en el intervalo configurado.

**Acceptance Scenarios**:

1. **Given** un kiosko mostrando sponsors y contenido superior en rotación activa (modo bucle, sin pausa), **When** el canal en tiempo real se interrumpe durante un periodo superior al umbral de inactividad del motor de rotación y el kiosko reconecta sin refrescar, **Then** la rotación de sponsors y de contenido superior se reanuda en un plazo acotado sin intervención del operador.
2. **Given** un kiosko reconectado tras la interrupción, **When** el operador observa la pantalla durante al menos dos ciclos de duración de anuncio, **Then** la franja de sponsors muestra al menos un cambio de ventana o animación acorde a la configuración.
3. **Given** varios kioskos conectados al mismo evento, **When** solo uno sufre la interrupción y reconecta, **Then** ese kiosko recupera la rotación completa sin afectar negativamente a los demás.
4. **Given** un kiosko en pausa, modo fijo o modo iframe, **When** se reactiva el motor de rotación tras reconexión, **Then** solo se recupera la rotación de sponsors; el contenido superior permanece en el estado de control remoto vigente.

---

### User Story 2 - Visibilidad de sponsors se restaura con rotación (Priority: P1)

Como operador de sala, quiero que al volver a mostrar la franja de sponsors tras haberla ocultado desde control remoto, la rotación continúe con normalidad, para poder ocultar sponsors temporalmente sin dejar la pantalla en un estado roto.

**Why this priority**: Es un bug confirmado en el flujo de control remoto que puede dejar la rotación muerta de forma permanente hasta un refresco.

**Independent Test**: Ocultar sponsors desde admin, esperar al menos un ciclo de rotación, restaurar visibilidad y comprobar que los sponsors rotan de nuevo sin refrescar el kiosko.

**Acceptance Scenarios**:

1. **Given** sponsors visibles y rotando, **When** el operador oculta la franja desde control remoto y después la vuelve a mostrar, **Then** la rotación de sponsors se reanuda automáticamente.
2. **Given** sponsors ocultos, **When** transcurre al menos un intervalo completo de rotación de anuncio antes de restaurar visibilidad, **Then** al mostrarlos de nuevo la rotación no permanece congelada.
3. **Given** sponsors restaurados tras ocultarlos, **When** el kiosko sigue en el mismo modo de contenido (bucle, fijo o iframe), **Then** solo cambia la visibilidad de la franja; el contenido superior no se reinicia innecesariamente.

---

### User Story 3 - Modo de respaldo mantiene sponsors actualizados (Priority: P2)

Como operador, quiero que cuando un kiosko entre en modo de respaldo por fallo del canal en tiempo real, la franja de sponsors siga reflejando el estado del evento en la medida de lo posible, para que un corte de red no congele permanentemente los sponsors en la última imagen recibida.

**Why this priority**: El modo de respaldo ya existe para resiliencia; hoy deja los sponsors estáticos aunque el evento siga activo en el servidor.

**Independent Test**: Forzar modo de respaldo en un kiosko con sponsors activos y verificar que la franja avanza o se resincroniza periódicamente respecto al estado del evento.

**Acceptance Scenarios**:

1. **Given** un kiosko en modo de respaldo con sponsors y contenido superior ya visibles (modo bucle sin pausa), **When** el servidor sigue rotando para el evento, **Then** el kiosko actualiza sponsors y contenido superior en función del estado consultado ampliado (ventana e ítem en curso del motor de rotación), no solo en el arranque inicial.
2. **Given** un kiosko que recupera el canal en tiempo real tras estar en respaldo, **Then** la rotación vuelve al flujo principal sin duplicar animaciones ni parpadeos prolongados.
3. **Given** un kiosko en respaldo cuyo motor de rotación quedó inactivo durante el corte, **When** el kiosko consulta el estado ampliado del evento, **Then** el servidor reactiva el motor y la respuesta refleja la posición actual de rotación.
4. **Given** un kiosko en respaldo, **When** no hay anuncios elegibles en el evento, **Then** la franja permanece vacía u oculta según configuración, sin errores visibles para el visitante.

---

### User Story 4 - Rotación perceptible con pocos sponsors (Priority: P2)

Como visitante del evento, quiero percibir movimiento o cambio en la franja de sponsors aunque el evento tenga pocos anuncios activos, para que la pantalla no parezca averiada.

**Why this priority**: Con la optimización de deduplicación de ventanas equivalentes, escenarios con uno o dos sponsors pueden parecer congelados aunque el sistema funcione correctamente.

**Independent Test**: Configurar un evento con un solo anuncio activo (o con tantos anuncios visibles en línea como anuncios totales) y verificar que la franja sigue mostrando la animación de rotación configurada en cada ciclo.

**Acceptance Scenarios**:

1. **Given** un evento con un único anuncio activo, animación de sponsor distinta de `none` y duración de anuncio configurada, **When** transcurren al menos dos ciclos de rotación, **Then** el visitante observa la animación de transición configurada en cada ciclo, aunque el anuncio mostrado sea el mismo.
2. **Given** un evento donde el número de anuncios mostrados en línea es igual o mayor que el total de anuncios activos y la animación configurada no es `none`, **When** el servidor emite ticks de rotación consecutivos, **Then** la franja no permanece visualmente estática entre ticks.
3. **Given** la deduplicación de ventanas equivalentes para evitar trabajo redundante de medios, **When** dos ticks consecutivos muestran los mismos sponsors y la animación configurada no es `none`, **Then** la animación de rotación sí se ejecuta aunque no se repita la precarga innecesaria de medios.
4. **Given** animación de sponsor configurada como `none` (incluido un único anuncio activo), **When** transcurren ciclos de rotación, **Then** la franja permanece estática sin pulso visual forzado; esto no se considera fallo de recuperación.

---

### Edge Cases

- Reconexión rápida (menos de un minuto): la rotación no debe reiniciarse de forma brusca ni perder sincronización visible con otros kioskos del mismo evento.
- Pausa de contenido superior: los sponsors deben seguir rotando mientras la franja esté visible, coherente con el comportamiento actual del contrato.
- Modo iframe o contenido fijo: la recuperación de sponsors no debe interrumpir el iframe ni el contenido fijo seleccionado.
- Sesión de operador sustituida o evento cerrado: el kiosko debe seguir el flujo existente de fin de sesión; este cambio no amplía el alcance de recuperación más allá de sesiones activas.
- Sin anuncios elegibles: no se debe activar un temporizador vacío que consuma recursos; la franja permanece estable sin errores.
- Animación de sponsor configurada como `none`: la franja puede permanecer estática; no se fuerza pulso visual (coherente con reduced-motion y configuración del operador).
- Modo de respaldo con motor inactivo: la consulta de estado ampliado debe reactivar el motor en el servidor antes de responder; el kiosko no debe necesitar re-registrarse.
- Recuperación tras bloqueo: sin mensajes nuevos en kiosko; los banners de reconexión y respaldo existentes son suficientes para el visitante.
- Múltiples reconexiones seguidas: no debe acumularse retardos ni temporizadores duplicados que aceleren o ralenticen la rotación de forma impredecible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE reactivar el motor de rotación de sesión cuando un kiosko reconecta el canal en tiempo real tras una interrupción que haya dejado el motor inactivo, cuando un kiosko se registra en una sesión activa, o cuando se sirve el estado consultado en respaldo y el motor está inactivo, restaurando sponsors y contenido superior en modo bucle sin pausa, sin exigir refresco de página ni nuevo registro manual del kiosko.
- **FR-002**: El sistema DEBE rearma la rotación de sponsors cuando la visibilidad de la franja pasa de oculta a visible desde control remoto, incluso si uno o más ciclos de rotación transcurrieron mientras estaba oculta.
- **FR-003**: El sistema DEBE publicar o aplicar de nuevo el estado actual de visualización (ventana de sponsors y, en modo bucle sin pausa, contenido superior en curso) al restaurar la rotación tras reconexión o cambio de visibilidad, de modo que el kiosko muestre estado coherente de inmediato.
- **FR-004**: En modo de respaldo, el kiosko DEBE actualizar la ventana visible de sponsors y el contenido superior en curso (modo bucle sin pausa) cuando el estado consultado ampliado del evento indique un avance respecto a lo mostrado, no limitarse a rellenar sponsors solo cuando la franja estaba vacía.
- **FR-005**: El estado consultado en modo de respaldo DEBE exponer la posición actual del motor de rotación de sesión (ventana de sponsors e ítem de contenido superior en curso cuando aplique), de forma que el kiosko pueda resincronizarse sin temporizadores locales de rotación. Si el motor está inactivo al servir ese estado, el sistema DEBE reactivarlo antes de responder (complementa FR-001 en el camino de polling).
- **FR-006**: El kiosko DEBE ejecutar la animación de rotación de sponsors en cada ciclo programado cuando la animación configurada no es `none`, aunque la composición visible de anuncios no cambie entre ticks consecutivos.
- **FR-007**: La recuperación de rotación de sponsors NO DEBE reiniciar innecesariamente el contenido superior ni alterar el modo de visualización (bucle, fijo, iframe, pausa) salvo que el control remoto lo indique.
- **FR-008**: El sistema DEBE evitar acumular múltiples temporizadores de rotación de sponsors para la misma sesión de evento tras reconexiones o cambios de visibilidad repetidos.
- **FR-009**: Cuando no existan anuncios elegibles, el sistema DEBE mantener la franja vacía u oculta sin bloquear la recuperación del resto de funciones del kiosko.
- **FR-010**: La recuperación automática de rotación DEBE ser silenciosa en la interfaz del kiosko: no se añaden mensajes nuevos específicos de recuperación; se conservan únicamente los indicadores existentes de reconexión y modo de respaldo.

### Traceability & Quality Requirements

- **TQ-001**: Los contratos activos `CONTENT.ROTATION` y `DISPLAY.RUNTIME` DEBEN actualizarse si cambia el comportamiento observable de recuperación, respaldo o deduplicación de sponsors.
- **TQ-002**: El cambio DEBE incluir pruebas automatizadas que cubran reconexión, restauración de visibilidad, respaldo y rotación con pocos anuncios; cualquier validación manual restante DEBE documentarse con criterio de aceptación explícito.
- **TQ-003**: La entrada en `specs/manifest.yml` DEBE crearse o actualizarse antes de considerar la implementación completa.

### Key Entities

- **Motor de rotación de sesión**: Responsable de avanzar sponsors y contenido superior para una sesión de operador activa; puede quedar inactivo por inactividad o interrupción.
- **Canal en tiempo real del kiosko**: Conexión persistente por la que el kiosko recibe comandos de visualización; puede degradarse a consultas periódicas.
- **Ventana visible de sponsors**: Subconjunto de anuncios activos mostrados en la franja inferior, definido por cantidad en línea e índice de inicio.
- **Visibilidad de sponsors**: Estado de control remoto que oculta o muestra la franja sin cambiar necesariamente el modo de contenido superior.
- **Modo de respaldo del kiosko**: Estado operativo en el que el kiosko consulta el estado ampliado del evento periódicamente (incluyendo posición del motor de rotación) en lugar de depender del canal en tiempo real.

## Success Criteria *(mandatory)*

- **SC-001**: En pruebas de reconexión tras interrupción prolongada, al menos el 95 % de los kioskos recuperan rotación visible de sponsors y de contenido superior (en modo bucle sin pausa) en menos de dos intervalos de duración de anuncio configurados, sin refrescar la página.
- **SC-002**: En pruebas de ocultar y restaurar sponsors, el 100 % de los casos reanudan la rotación en el primer ciclo completo tras restaurar visibilidad.
- **SC-003**: En modo de respaldo, los kioskos de prueba muestran al menos un avance de ventana de sponsors o de contenido superior cada cinco consultas de estado ampliado cuando el servidor sigue rotando y hay más de un ítem elegible en la dimensión correspondiente, o animación perceptible en cada ciclo cuando solo hay un anuncio.
- **SC-004**: En escenarios con un único anuncio activo y animación de sponsor distinta de `none`, observadores en prueba de usabilidad reportan que la franja «sigue viva» (animación visible) en al menos el 90 % de los ciclos observados durante cinco minutos.
- **SC-005**: Tras el despliegue, los incidentes operativos que requieren refrescar kioskos únicamente para desbloquear sponsors se reducen de forma medible respecto al periodo anterior (objetivo: eliminación en los escenarios cubiertos por este cambio). *Métrica operativa post-lanzamiento; validación manual/ops en T032, no bloquea merge.*

## Assumptions

- La rotación de sponsors sigue siendo responsabilidad del servidor; el kiosko no introduce un temporizador independiente de rotación en el camino principal.
- El umbral de inactividad del motor de rotación y el retardo de entrada en modo de respaldo existentes se mantienen salvo ajuste menor documentado en planificación.
- La deduplicación de ventanas equivalentes (CHG-053) se conserva para medios y trabajo de renderizado; solo se relaja su efecto sobre la animación visible.
- Los operadores siguen pudiendo ocultar sponsors desde control remoto; este cambio corrige el estado roto posterior, no elimina la función.
- La recuperación en kiosko es silenciosa para el visitante; la trazabilidad operativa (si se requiere) puede abordarse en planificación sin nuevos mensajes en pantalla.
- La recuperación aplica solo mientras exista una sesión de operador activa para el evento.

## Relationships

- Modifies: `CONTENT.ROTATION`, `DISPLAY.RUNTIME`
- Extends: CHG-041 (orquestación servidor), CHG-051 (rendimiento y reaper), CHG-053 (deduplicación de ventanas de sponsors)
- Depends on: contratos activos anteriores; sin cambio de esquema de datos previsto
- Supersedes: ninguno
