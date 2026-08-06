---
id: CHG-056
type: change
status: implemented
modifies:
  - CONTENT.ROTATION
  - DISPLAY.RUNTIME
  - DISPLAY.CONFIG_SESSION
  - CONTENT.ADS.ADMIN
depends_on: []
extends:
  - CHG-050
supersedes: []
superseded_by: []
consolidated_into: []
source_of_truth: false
read_by_default: false
requires_contract_update: true
oversize: false
---

# Feature Specification: Diferir novedades en rotación tolerante a bajo ancho de banda

**Feature Branch**: `056-novelty-defer-rotation`

**Created**: 2026-08-07

**Status**: Draft

**Input**: User description: "Refactorizar el sistema de novedades en modo rotación. Actualmente estoy teniendo muchos problemas por dispositivos con bajo ancho de banda, por lo que necesito cambiar la forma de funcionar. Cuando llegan novedades al backend, los frontend las precargan (como hasta ahora), pero si no da tiempo a descargarse del todo para mostrarse en la siguiente transición, en lugar de descartar la novedad, la retrasaremos una transición. El máximo de transiciones durante las que se podrá descargar contenido de novedades sin que llegue a descartarse debe ser configurable en Admin (pantalla)."

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `CONTENT.ROTATION`, `DISPLAY.RUNTIME`, `DISPLAY.CONFIG_SESSION`, `CONTENT.ADS.ADMIN`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## Clarifications

### Session 2026-08-07

- Q: ¿Qué ocurre con el ítem regular sustituido por una novedad lista (p. ej. 4 cuando entra la novedad 6)? → A: El ítem regular sustituido se **reprograma** y se muestra en la transición inmediatamente posterior a la novedad.
- Q: ¿Cuándo se considera una novedad lista para emisión en un evento con varios quioscos? → A: Solo cuando **todos** los quioscos conectados han confirmado descarga completa; entonces se emite de forma sincronizada para todos.
- Q: Si un quiosco se desconecta mientras una novedad sigue en aplazamiento, ¿cuenta para el criterio de «todos listos»? → A: Solo cuentan los quioscos **conectados en ese momento**; un display desconectado no bloquea la emisión para el resto.
- Q: ¿Dónde se configura el máximo de transiciones de aplazamiento en Admin? → A: En **configuración general** del evento (`/admin/configuration`); un único valor para toda la sesión.
- Q: Al descartar una novedad por agotar aplazamientos sin haberse mostrado, ¿qué ocurre en Admin? → A: Se **consume** la novedad: se limpia el flag de novedad en Admin y desaparece del indicador en quiosco (equivalente a consumo sin emisión visual).

## Problem statement

En dispositivos con bajo ancho de banda, las novedades (subidas por API pública) no siempre terminan de descargarse antes del límite de rotación en el que les toca emitirse. El comportamiento actual — mantener el contenido visible hasta que el medio esté listo o descartar la novedad tras fallo o tiempo de espera — resulta impredecible para el personal del evento y puede bloquear visualmente la rotación o perder novedades válidas.

Se necesita un modelo más tolerante: **seguir avanzando la rotación regular** mientras la novedad se descarga en segundo plano, **aplazar su emisión una transición** cada vez que aún no esté lista, y **descartarla solo** tras superar un número máximo de aplazamientos configurable por el operador.

## Enfoque propuesto

| Aspecto | Comportamiento actual (CHG-050) | Comportamiento objetivo |
|--------|--------------------------------|-------------------------|
| Límite de rotación con novedad no lista | El quiosco mantiene el ítem actual hasta que el medio esté listo (compuerta) o hasta timeout/fallo | El quiosco **avanza al siguiente ítem regular** de la cola; la novedad permanece pendiente |
| Indicador de novedad | Icono sin check hasta descarga; check al completar | Igual: icono visible desde que entra en cola; check al completar descarga |
| Momento de emisión | En el siguiente límite tras encolar (si está lista) | En el **primer límite posterior** en el que la descarga esté completa, **sustituyendo** el ítem regular que le habría correspondido |
| Límite de espera | Timeout de compuerta (~30 s) → avance por error de medio | Contador de **transiciones aplazadas** por novedad; al superar el máximo configurado → descarte controlado |
| Descarte por agotar aplazamientos | `media_error` / timeout; flag de novedad según consumo al emitir | Descarte + **consumo de flag en Admin** sin emisión visual en quiosco |
| Ítem regular sustituido | N/A | Se **reprograma** para la transición inmediatamente posterior a la novedad |
| Configuración | No configurable | Máximo de transiciones de aplazamiento configurable en Admin |

**Ejemplo ilustrativo** (contenidos regulares 1–5, novedad 6 llega mientras se muestra 1):

1. Llega la novedad 6 → precarga en segundo plano; icono de novedad visible sin check.
2. Transición a 2 → 6 aún no lista → se muestra 2; icono sin check; contador de aplazamiento = 1.
3. Transición a 3 → durante la visualización de 3, 6 termina de descargarse → icono con check.
4. Transición siguiente → en lugar del ítem regular 4, se emite la novedad 6.
5. Transición posterior → se muestra el ítem regular 4 (reprogramado), y la rotación continúa con 5, 1, etc.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Novedad pesada con rotación continua (Priority: P1)

Un operador de evento tiene quioscos en redes lentas. Llega un video pesado como novedad mientras el display muestra contenido regular. La rotación **no se detiene**: siguen viéndose los ítems 2, 3, etc., mientras el video se descarga. El personal ve el icono de novedad pendiente y, cuando la descarga termina, el check. En la siguiente transición, la novedad se muestra en lugar del ítem regular que le habría tocado.

**Why this priority**: Es el caso de uso principal descrito por el usuario y resuelve la impredecibilidad en bajo ancho de banda.

**Independent Test**: Con video ≥10 MB en cola de novedades y red limitada artificialmente, verificar que la rotación avanza por al menos dos ítems regulares sin pantalla negra ni bloqueo, y que la novedad se emite en la primera transición posterior a completar la descarga.

**Acceptance Scenarios**:

1. **Given** rotación activa con ítems 1–5 y una novedad 6 encolada cuya descarga no ha terminado, **When** ocurre la transición programada, **Then** se muestra el siguiente ítem regular (p. ej. 2) y la novedad 6 permanece en cola con icono sin check.
2. **Given** la novedad 6 completa su descarga durante la visualización del ítem 3, **When** el operador observa el indicador, **Then** el icono de la novedad 6 muestra check de descarga completada.
3. **Given** la novedad 6 está lista antes de la siguiente transición, **When** ocurre esa transición, **Then** se muestra la novedad 6 en lugar del ítem regular que le correspondía en ese punto de la cola (p. ej. 4).
4. **Given** la novedad 6 acaba de emitirse en sustitución del ítem 4, **When** ocurre la transición siguiente, **Then** se muestra el ítem regular 4 reprogramado antes de continuar con el resto de la cola (p. ej. 5).

---

### User Story 2 — Límite configurable de aplazamientos (Priority: P1)

Un administrador configura cuántas transiciones de rotación puede esperar una novedad sin descartarse. Si la descarga no termina dentro de ese margen, la novedad se descarta de forma controlada y la rotación continúa con normalidad.

**Why this priority**: Sin un límite configurable, las novedades imposibles de descargar bloquearían indefinidamente la cola o confundirían al personal.

**Independent Test**: Configurar máximo = 2; encolar novedad en red muy lenta; verificar que tras dos transiciones regulares sin descarga completa, la novedad desaparece del indicador y no se emite.

**Acceptance Scenarios**:

1. **Given** el operador ha configurado un máximo de 3 transiciones de aplazamiento, **When** guarda la configuración, **Then** todos los quioscos de la sesión aplican ese valor en la siguiente rotación o reconexión.
2. **Given** una novedad ha sido aplazada 3 veces (máximo = 3) sin completar descarga, **When** ocurre la siguiente transición, **Then** la novedad se descarta, desaparece del indicador, se limpia su flag de novedad en Admin y la rotación muestra el ítem regular correspondiente.
3. **Given** el máximo configurado es N, **When** una novedad completa la descarga en la transición N−1, **Then** se emite en la transición siguiente y no se descarta.

---

### User Story 3 — Múltiples novedades en cola (Priority: P2)

Durante un evento llegan varias novedades en poco tiempo. Cada una se precarga, muestra su icono y sigue la misma lógica de aplazamiento de forma independiente (orden FIFO). Una novedad lista no salta por delante de otra anterior aún pendiente.

**Why this priority**: Eventos con mucha actividad en API pública pueden acumular novedades; el orden debe ser predecible.

**Independent Test**: Encolar novedades A y B; A lista en la segunda transición, B aún no → solo A se emite en la siguiente oportunidad; B sigue aplazándose hasta estar lista o agotar su contador.

**Acceptance Scenarios**:

1. **Given** novedades A y B en cola (A antes que B), **When** A completa descarga y B no, **Then** A se emite en la siguiente transición elegible y B permanece pendiente con su propio contador de aplazamiento.
2. **Given** más de 5 novedades pendientes, **When** el operador mira el indicador, **Then** se mantiene el comportamiento actual de máximo 5 iconos + contador «+N» para el resto.

---

### User Story 4 — Visibilidad operativa del estado de aplazamiento (Priority: P2)

El personal junto al quiosco puede distinguir de un vistazo: novedad en descarga (sin check), novedad lista para emitir (con check), y error de descarga (estado de error existente).

**Why this priority**: La comprensibilidad del nuevo mecanismo depende del feedback visual ya introducido en CHG-050.

**Independent Test**: Observar el overlay durante un ciclo completo de aplazamiento; verificar transiciones de estado del icono sin ambigüedad.

**Acceptance Scenarios**:

1. **Given** una novedad aplazada que sigue descargándose, **When** ocurre una transición regular, **Then** el icono permanece visible sin check.
2. **Given** una novedad cuya descarga falla definitivamente, **When** se agota el margen de aplazamiento o se confirma fallo irrecuperable, **Then** el icono muestra estado de error antes de desaparecer al descartarse.

---

### Edge Cases

- Novedad llega justo antes de una transición: se intenta precarga inmediata; si no está lista, primer aplazamiento en esa transición.
- Rotación en pausa, contenido fijo o modo iframe: sin aplazamiento de novedades (misma inactividad que precarga e indicador hoy).
- Reconexión del quiosco: el indicador y el estado de aplazamiento se reconstruyen desde el plan de rotación del servidor (cola de novedades pendientes y contadores vigentes).
- Quiosco desconectado durante aplazamiento: deja de contar para el criterio de «todos listos»; no bloquea la emisión para los demás. Al reconectar, el quiosco se sincroniza con el plan vigente (snapshot / stream).
- Varias novedades agotan su máximo de aplazamientos en la misma transición: se descartan en orden FIFO sin afectar la rotación regular; cada una consume su flag de novedad en Admin.
- Cambio del máximo de aplazamiento en caliente: el nuevo valor aplica a contadores no agotados a partir del siguiente ciclo de configuración; no reinicia contadores ya en curso salvo que el nuevo máximo sea menor (en cuyo caso se recorta al guardar).
- Novedad lista en el mismo instante que se agota el último aplazamiento permitido: **prioridad a la emisión** si la descarga se completó antes del límite de esa transición.
- Ítem regular sustituido por una novedad lista: se encola para la transición inmediatamente posterior a la emisión de esa novedad; no se pierde ni se mueve al final del ciclo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST precargar cada novedad en cuanto entra en la cola pendiente, igual que hoy, sin bloquear la rotación regular.
- **FR-002**: Cuando en un límite de transición toca emitir una novedad cuya descarga **no** está completa, el sistema MUST emitir el siguiente ítem **regular** de la cola y MUST incrementar en uno el contador de aplazamientos de esa novedad.
- **FR-003**: Cuando una novedad completa la descarga, el indicador en pantalla MUST mostrar el estado de listo (check) sin alterar el ítem actualmente visible.
- **FR-004**: En el primer límite de transición posterior a que una novedad esté lista, el sistema MUST emitir esa novedad **en sustitución** del ítem regular que le habría correspondido en ese punto del ciclo.
- **FR-004a**: El ítem regular sustituido por una novedad MUST **reprogramarse** para emitirse en la transición inmediatamente posterior a esa novedad, antes de continuar con el resto de la cola.
- **FR-005**: Cada novedad MUST llevar un contador independiente de transiciones aplazadas desde que entró en cola o desde su último intento de emisión fallido por no estar lista.
- **FR-006**: El operador MUST poder configurar el número máximo de transiciones de aplazamiento permitidas antes de descartar una novedad, desde la pantalla de **configuración general** del evento en Admin (`/admin/configuration`); un único valor aplica a toda la sesión de operador.
- **FR-007**: El valor configurado MUST persistirse por organización/sesión de operador y propagarse a los quioscos conectados con la misma cadencia que el resto de parámetros de configuración de display.
- **FR-008**: Cuando el contador de aplazamientos de una novedad alcanza el máximo configurado sin descarga completa, el sistema MUST descartar esa novedad de la cola, retirar su icono del indicador, **consumir** su flag de novedad en Admin (limpiar `isNovelty` como si se hubiera emitido) y continuar la rotación regular sin interrupción.
- **FR-009**: Las novedades MUST emitirse en orden FIFO; una novedad posterior no puede emitirse antes que una anterior aún pendiente.
- **FR-010**: El aplazamiento de novedades MUST estar inactivo cuando la rotación está en pausa, en contenido fijo o en modo iframe (paridad con precarga e indicador actuales).
- **FR-011**: Todos los quioscos conectados a la misma sesión de operador MUST recibir la misma decisión de emisión o aplazamiento en cada transición (rotación sincronizada).
- **FR-012**: Una novedad se considera lista para emisión solo cuando **todos** los quioscos **actualmente conectados** a la sesión han confirmado descarga completa de ese ítem; los quioscos desconectados no bloquean la emisión. Entonces el orquestador emite la misma orden a todos los displays conectados.
- **FR-012a**: Un quiosco que se reconecta MUST sincronizar indicador, cola de aplazamiento y estado de descarga desde el plan vigente del servidor sin requerir reemisión manual.
- **FR-013**: El comportamiento de compuerta de visualización para **contenido regular** (no novedad) MUST mantenerse sin cambios respecto al contrato vigente.
- **FR-014**: Para **novedades**, el sistema MUST **no** aplicar la compuerta que retiene el ítem actual hasta descarga completa; el aplazamiento a la siguiente transición regular sustituye ese mecanismo.

### Traceability & Quality Requirements

- **TQ-001**: Los contratos activos afectados (`CONTENT.ROTATION`, `DISPLAY.RUNTIME`, `DISPLAY.CONFIG_SESSION`, `CONTENT.ADS.ADMIN`) MUST actualizarse antes de la implementación si cambia el comportamiento observable.
- **TQ-002**: El cambio MUST incluir pruebas automatizadas o tarea manual explícita con rationale para: aplazamiento en bajo ancho de banda, emisión tras descarga, descarte al máximo (incl. consumo de flag en Admin), reprogramación de ítem regular sustituido, múltiples novedades FIFO, configuración Admin, e inactividad en pausa/fijo/iframe.
- **TQ-003**: La entrada de manifiesto MUST actualizarse antes de considerar completa la implementación.

### Key Entities

- **Novedad pendiente**: Contenido marcado como novedad en cola de rotación, con identificador, orden FIFO, estado de descarga (pendiente / lista / error) y contador de aplazamientos.
- **Contador de aplazamientos**: Número entero por novedad que registra cuántas transiciones regulares se han emitido en su lugar por no estar lista; se reinicia al emitirse o al descartarse.
- **Máximo de aplazamientos**: Parámetro de configuración del operador (entero positivo) que define cuántas transiciones puede esperar una novedad antes de descartarse.
- **Transición regular**: Avance programado al siguiente ítem de la cola principal de contenido top, excluyendo la inserción de novedades.
- **Ítem regular reprogramado**: Ítem de la cola principal cuyo hueco de emisión fue ocupado por una novedad lista; se muestra en la transición inmediatamente posterior a esa novedad.

## Success Criteria *(mandatory)*

- **SC-001**: En pruebas con red limitada a ≤2 Mbps, al menos el 90 % de las novedades de tamaño típico de evento (fotos ≤5 MB, videos ≤50 MB) se muestran sin descartarse cuando el máximo de aplazamientos está configurado en ≥3.
- **SC-002**: Durante un aplazamiento, el público no ve pantalla negra ni congelación del ítem actual por espera de novedad en más del 99 % de las transiciones observadas en prueba.
- **SC-003**: El personal del evento puede predecir cuándo aparecerá una novedad: icono sin check → rotación continúa → check → próxima transición muestra la novedad (validado en prueba guiada con ≥5 operadores o checklist operativo).
- **SC-004**: Tras configurar un nuevo máximo de aplazamientos, los quioscos conectados reflejan el valor en menos de 5 segundos sin reinicio manual.
- **SC-005**: Ninguna novedad permanece en cola más allá de «máximo configurado + 1» transiciones desde su llegada sin emitirse ni descartarse explícitamente.

## Assumptions

- El parámetro de máximo de aplazamientos vive en la configuración general del evento (`/admin/configuration`), con un único valor para toda la sesión (confirmado en clarificación 2026-08-07); no hay override por dispositivo en `/admin/displays`.
- Valor por defecto del máximo de aplazamientos: **3** transiciones; rango permitido en Admin: **1–10** (enteros).
- La sincronización multi-quiosco exige confirmación de descarga completa de **todos** los quioscos conectados en ese momento antes de marcar una novedad como lista y emitirla de forma sincronizada; los desconectados no bloquean (confirmado en clarificación 2026-08-07).
- El descarte por agotar aplazamientos no genera pantalla negra ni bloqueo; la rotación regular continúa de inmediato. El contenido descartado se consume en Admin (flag de novedad limpiado) aunque no haya sido mostrado en quiosco (confirmado en clarificación 2026-08-07).
- Los estados de error de descarga irrecuperable cuentan como no lista; si persiste hasta agotar aplazamientos, se descarta con indicador de error previo al retiro (paridad con CHG-050).
- El indicador visual de cola de novedades (iconos, check, overflow +N) se conserva; solo cambia la semántica de emisión, no el diseño del overlay.

## Relationships

- Modifies: `CONTENT.ROTATION`, `DISPLAY.RUNTIME`, `DISPLAY.CONFIG_SESSION`, `CONTENT.ADS.ADMIN` (consumo de flag `isNovelty` al descartar)
- Extends: `CHG-050` (precarga y indicador de novedades; sustituye compuerta de retención para novedades)
- Depends on: `CHG-041` (orquestador servidor), `CHG-027` (cola de novedades)
- Supersedes: —
- Superseded by: —
