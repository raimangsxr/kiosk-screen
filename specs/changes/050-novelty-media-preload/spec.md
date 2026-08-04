---
id: CHG-050
type: change
status: implemented
modifies:
  - CONTENT.ROTATION
depends_on: []
extends: []
supersedes: []
superseded_by: []
consolidated_into: []
source_of_truth: false
read_by_default: false
requires_contract_update: true
oversize: false
---

# Feature Specification: Precarga de medios de novedades antes de emisión

**Feature Branch**: `050-novelty-media-preload`

**Created**: 2026-08-04

**Status**: Draft

**Input**: User description: "Al llegar content a la cola de novedades, cuando se van a mostrar, se descargan en tiempo real; si es una foto pesada o un video, tarda varios segundos en descargarse y el kiosk se ve en negro. Resolver la descarga previamente y que no esté disponible para ser mostrado en el frontend hasta que esté completamente descargado y listo para reproducir."

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `CONTENT.ROTATION`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## Clarifications

### Session 2026-08-04

- Q: Cuando el quiosco recibe órdenes de emisión más nuevas mientras aún espera mostrar una anterior en compuerta, ¿qué comportamiento debe tener? → A: Último gana — descartar pendientes anteriores y mostrar solo el `show_content` más reciente cuando su medio esté listo.
- Q: ¿Qué alcance debe tener la primera implementación? → A: Novedades + rotación regular — misma precarga y compuerta para todo el contenido top en modo loop.
- Q: ¿Cómo debe el quiosco provocar el avance cuando un medio no puede mostrarse? → A: Enviar `media_error` al servidor; el orquestador avanza y emite el siguiente `show_content`.
- Q: ¿Cómo debe priorizarse la descarga de múltiples novedades encoladas? → A: Señal de precarga para todas; descarga concurrente limitada (FIFO, máx. 3 simultáneas).
- Q: Cuando un quiosco reporta `media_error` por fallo/timeout de descarga, ¿qué debe hacer el orquestador? → A: El primer `media_error` avanza la rotación para todos los displays (emite siguiente `show_content` a todos).
- Q: ¿Cuándo debe mostrarse la zona indicadora de novedades en el quiosco? → A: Siempre visible en la pantalla del quiosco como overlay discreto (el público puede verlo de forma tenue).
- Q: Si hay más de 5 novedades en cola, ¿cómo debe comportarse la zona indicadora? → A: Máximo 5 iconos visibles (los 5 primeros en orden FIFO) + contador “+N” para el resto.
- Q: Si la descarga de una novedad falla, ¿qué debe mostrar su icono antes de desaparecer? → A: Estado de error visible en el icono (p. ej. ✗ superpuesto o tinte de error) hasta que desaparece al hacer skip.
- Q: ¿En qué momento debe desaparecer el icono de una novedad que va a emitirse? → A: Cuando la novedad es realmente visible en pantalla (compuerta abierta y slide mostrado).
- Q: Tras reconexión SSE o snapshot, ¿cómo debe el quiosco reconstruir los iconos de la zona indicadora? → A: Desde snapshot / plan de rotación del servidor (lista de novedades pendientes vigente).

## Problem statement

Cuando una novedad (upload público) entra en la cola de rotación, el quiosco recibe la orden de mostrarla en el siguiente límite de ciclo. El archivo multimedia (imagen o video) se descarga en el momento del cambio de diapositiva. Archivos pesados provocan varios segundos de pantalla negra, degradando la experiencia del evento en vivo.

Hoy existe precarga parcial para el siguiente ítem regular de la cola, pero **no para novedades** y **no hay bloqueo de emisión** hasta que el medio esté listo: si la descarga no terminó, el visor intenta renderizar la URL remota y el usuario ve negro.

## Enfoque recomendado

La solución óptima combina **precarga anticipada** y **compuerta de visualización en el quiosco**, sin coordinar por quiosco en el servidor (evita que el kiosk más lento bloquee a todos).

| Capa | Qué hace | Por qué |
|------|----------|---------|
| **Precarga al encolar** | En cuanto una novedad entra en la cola pendiente, el quiosco recibe una señal de precarga con la URL del medio y comienza la descarga en segundo plano. | Maximiza el tiempo disponible mientras sigue visible el ítem actual. |
| **Compuerta de visualización** | Al recibir la orden de mostrar un ítem, el quiosco **mantiene el contenido actual** hasta que el medio esté completamente descargado y listo (imagen decodificada; video con buffer suficiente para reproducir sin cortes). Solo entonces cambia la diapositiva. | Elimina la pantalla negra sin depender de la velocidad de red en el instante del cambio. |
| **Extensión a rotación regular** | Aplicar la misma compuerta al contenido regular y adelantar la precarga al inicio del ítem en emisión (no solo en el instante del avance). | Mismo fallo en ítems grandes de la cola normal; una sola regla de comportamiento. |
| **Fallo / tiempo de espera** | Si la descarga falla o supera un tiempo máximo de espera, el quiosco registra el error, omite el ítem y solicita el siguiente avance; no queda bloqueado indefinidamente. | Resiliencia operativa en redes inestables. |
| **Indicador de cola en quiosco** | Zona discreta en pantalla con un icono por novedad pendiente; check al confirmar descarga; el icono desaparece al mostrarse u omitirse la novedad. | Visibilidad operativa para staff junto al display sin distraer al público. |

**Descartado — bloqueo en servidor hasta “listo”**: exigiría que cada quiosco confirme la descarga antes de emitir `show_content`. El kiosk más lento retrasaría a todos los displays del evento. La compuerta local resuelve el problema visual sin penalizar el conjunto.

**Descartado — solo precarga sin compuerta**: la precarga actual no garantiza que el archivo esté listo al cambio (descarga lenta, novedad sin precarga, preload simultáneo al `show_content`). La compuerta es necesaria para cumplir el requisito de “no disponible hasta estar listo”.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Novedad pesada sin pantalla negra (Priority: P1)

Un asistente sube una foto o video grande por la API pública durante un evento. El quiosco sigue mostrando el contenido actual mientras la novedad se descarga en segundo plano. Cuando le toca emitirse, el cambio es instantáneo y sin negro.

**Why this priority**: Es el caso reportado por el usuario y el impacto visual más grave en eventos en vivo.

**Independent Test**: Con un video de ≥10 MB en cola de novedades, verificar que durante el cambio de diapositiva no aparece frame negro y el video arranca de inmediato.

**Acceptance Scenarios**:

1. **Given** un quiosco en rotación loop mostrando ítem A, **When** llega una novedad B (video pesado) por upload público, **Then** el quiosco sigue mostrando A y comienza a descargar B en segundo plano sin interrumpir la emisión.
2. **Given** B completamente descargada y lista, **When** el orquestador emite la orden de mostrar B, **Then** el quiosco cambia a B en menos de 500 ms perceptibles y sin pantalla negra intermedia.
3. **Given** B aún descargándose cuando le toca emitirse, **When** llega la orden de mostrar B, **Then** el quiosco mantiene A visible hasta que B esté lista y solo entonces realiza el cambio.

---

### User Story 2 — Precarga al entrar en cola, no al cambiar (Priority: P1)

El operador y el público no deben depender de que la descarga empiece en el último segundo del ciclo actual.

**Why this priority**: Sin precarga temprana, la compuerta podría retrasar mucho el cambio o forzar esperas visibles largas.

**Independent Test**: Subir novedad mientras el ítem actual tiene 30 s restantes; comprobar que la descarga inicia en los primeros 5 s tras el upload (vía señal de precarga o equivalente), no al expirar el timer.

**Acceptance Scenarios**:

1. **Given** cola de novedades vacía y ítem regular en emisión, **When** se sube novedad N por API pública, **Then** los quioscos conectados reciben señal de precarga para N en ≤2 s.
2. **Given** varias novedades pendientes (N1, N2), **When** se encolan, **Then** se precargan todas en orden de consumo previsto, no solo la primera al momento del cambio.
3. **Given** una novedad ya precargada, **When** le toca mostrarse, **Then** no se inicia una segunda descarga redundante del mismo medio.

---

### User Story 3 — Rotación regular con medios pesados (Priority: P1)

Un ítem regular grande en la cola debe comportarse igual que una novedad: precarga anticipada y compuerta de visualización.

**Why this priority**: Misma causa raíz y misma infraestructura de compuerta; incluido en el alcance de la primera entrega junto con novedades.

**Independent Test**: Ítem regular de video pesado como “siguiente” planificado; verificar precarga durante el ítem anterior y cambio sin negro.

**Acceptance Scenarios**:

1. **Given** ítem R en emisión e ítem S (video pesado) como siguiente en cola regular, **When** R está en pantalla, **Then** S se precarga antes del avance programado.
2. **Given** S precargado, **When** el orquestador avanza a S, **Then** el cambio es inmediato sin pantalla negra.

---

### User Story 4 — Fallo de descarga o espera excesiva (Priority: P2)

En red inestable, el quiosco no debe quedarse en negro ni bloqueado para siempre.

**Why this priority**: Garantiza operación continua del evento aunque falle un archivo.

**Independent Test**: Simular URL de medio inaccesible en cola de novedades; verificar skip automático y registro de error en ≤ tiempo máximo configurado.

**Acceptance Scenarios**:

1. **Given** novedad con medio inaccesible, **When** la descarga falla, **Then** el quiosco no muestra pantalla negra indefinida, envía `media_error` al servidor, y el orquestador avanza al siguiente ítem elegible.
2. **Given** descarga muy lenta, **When** se supera el tiempo máximo de espera en compuerta, **Then** el quiosco envía `media_error`, el orquestador omite el ítem y continúa la rotación con el siguiente `show_content`.
3. **Given** fallo en un quiosco, **When** ese quiosco envía `media_error`, **Then** el orquestador avanza la rotación para todos los displays y emite el siguiente `show_content` al conjunto (el primer `media_error` gana).

---

### User Story 5 — Indicador discreto de cola de novedades en el quiosco (Priority: P2)

Personal técnico u operador junto al display necesita ver de un vistazo cuántas novedades hay pendientes y cuáles ya están descargadas, sin interferir con lo que ve el público.

**Why this priority**: Complementa la precarga y la compuerta con feedback local; no bloquea la entrega P1 pero facilita diagnóstico en vivo durante el evento.

**Independent Test**: Subir dos novedades (una imagen y un video); verificar que aparecen dos iconos en la zona discreta, el check en cada uno al completar la descarga, y que desaparecen al emitirse (en orden de cola).

**Acceptance Scenarios**:

1. **Given** quiosco en loop sin novedades pendientes, **When** no hay ítems en cola de novedades, **Then** la zona indicadora no es visible (o está vacía).
2. **Given** llega novedad N1 por upload público, **When** el quiosco recibe la señal de precarga, **Then** aparece un icono en la zona discreta (tipo imagen o video según `contentType`) en ≤2 s.
3. **Given** N1 en cola y descarga en curso, **When** el medio alcanza estado “listo”, **Then** el icono de N1 muestra un check superpuesto.
4. **Given** N1 y N2 en cola (N1 antes que N2 por `displayOrder`), **When** ambas están encoladas, **Then** se muestran dos iconos en ese orden; cada uno recibe check de forma independiente al estar listo.
5. **Given** N1 lista y el orquestador emite `show_content` para N1, **When** la compuerta abre y N1 es realmente visible en pantalla, **Then** el icono de N1 desaparece de la zona y solo permanecen las novedades aún pendientes.
6. **Given** novedad omitida por política “último gana” o `media_error`, **When** el quiosco deja de considerarla pendiente, **Then** su icono desaparece de la zona sin quedar huérfano.
7. **Given** novedad N1 con descarga fallida, **When** la descarga falla y antes del skip, **Then** el icono de N1 muestra un indicador de error visible (distinto del check de “listo”) hasta que desaparece al omitirse.

8. **Given** quiosco reconectado tras caída de SSE con dos novedades aún pendientes en el servidor, **When** llega el snapshot inicial, **Then** la zona indicadora muestra dos iconos coherentes con la cola del plan de rotación, aunque no se hayan recibido los `preload` originales.

**Out of scope (v1)**: indicador para contenido regular de rotación; miniaturas del medio (solo icono por tipo).

---

### Edge Cases

- Novedad llega a mitad del último segundo del ítem actual: compuerta extiende la visualización del ítem actual hasta que el medio esté listo o se alcance el tiempo máximo de espera.
- Múltiples novedades encoladas: señal de precarga para todas las pendientes; descarga en el quiosco en orden FIFO con concurrencia máxima de 3 simultáneas.
- Mismo medio reutilizado o re-encolado: no duplicar descargas en memoria.
- Modo pausa, fijo o iframe activo: no precargar ni interceptar novedades (comportamiento actual de CHG-027 se mantiene).
- Reconexión SSE / snapshot: al reenganchar, precargar novedades pendientes según estado actual del plan de rotación y reconstruir la zona indicadora desde la lista de novedades del snapshot (backfill de iconos perdidos).
- Video vs imagen: la condición “listo” para video incluye buffer de reproducción, no solo bytes descargados.
- Servidor adelantado respecto al quiosco: si llegan varios `show_content` mientras la compuerta retiene el ítem visible, el quiosco descarta órdenes intermedias obsoletas y solo intenta mostrar la más reciente cuando su medio esté listo (ítems saltados no se reproducen en FIFO).
- `media_error` multi-quiosco: el primer `media_error` recibido por el orquestador avanza la rotación globalmente; quioscos que tenían el medio listo pasan al siguiente ítem con el resto.
- Indicador de cola: en modo pausa, fijo o iframe la zona indicadora MUST ocultarse (igual que no hay interceptación de novedades).
- Indicador de cola: novedades omitidas por “último gana” o `media_error` MUST eliminarse de la zona aunque no se hayan mostrado.
- Indicador de cola: descarga fallida MUST mostrar estado de error en el icono hasta la eliminación por skip/omisión.
- Indicador de cola: más de 5 novedades pendientes MUST mostrar como máximo los 5 primeros iconos en orden FIFO más un contador “+N” con el número de novedades adicionales no mostradas como iconos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST iniciar la descarga en segundo plano de cada novedad pendiente en cuanto entra en la cola de rotación (upload público u otra mutación que la encole), sin esperar al límite de ciclo.
- **FR-002**: El sistema MUST enviar a los quioscos conectados una señal de precarga con identificador de contenido, URL del medio y tipo de medio para cada novedad pendiente y para el siguiente ítem regular planificado; las descargas en el quiosco MUST ejecutarse en orden FIFO con un máximo de 3 simultáneas.
- **FR-003**: El quiosco MUST NOT cambiar la diapositiva visible hasta que el medio del ítem ordenado esté completamente descargado y listo para mostrar (imagen) o reproducir sin buffer inicial (video).
- **FR-004**: Mientras el medio no esté listo, el quiosco MUST mantener visible el contenido anterior (sin pantalla negra ni área vacía del slot principal).
- **FR-005**: El quiosco MUST aplicar la misma compuerta de visualización al contenido regular de rotación, no solo a novedades.
- **FR-006**: La precarga del siguiente ítem regular MUST iniciarse al comienzo del período de emisión del ítem actual, no simultáneamente con la orden de cambio.
- **FR-007**: Si la descarga falla o la espera en compuerta supera un tiempo máximo configurable, el quiosco MUST enviar `media_error` al servidor, mantener visible el contenido anterior hasta recibir el siguiente `show_content`, y el orquestador MUST avanzar al siguiente ítem elegible para **todos** los displays al recibir el primer `media_error` de cualquier quiosco.
- **FR-008**: El sistema MUST evitar descargas duplicadas del mismo medio cuando ya está en caché local o en curso.
- **FR-009**: La precarga MUST respetar los modos en los que las novedades no se interceptan (pausa, contenido fijo, iframe): sin precarga ni compuerta adicional en esos modos.
- **FR-010**: Tras reconexión del quiosco, el sistema MUST volver a precargar los medios de las novedades pendientes según el plan de rotación vigente y MUST reconstruir la zona indicadora desde el snapshot / plan de rotación del servidor (lista de novedades pendientes), no solo desde eventos `preload` ya recibidos.
- **FR-011**: Si el quiosco recibe un `show_content` más reciente mientras aún espera mostrar uno anterior en compuerta, MUST descartar el pendiente anterior y aplicar la compuerta solo al ítem más reciente ordenado por el servidor.
- **FR-012**: El alcance de la primera entrega MUST cubrir novedades y contenido top regular en modo loop con la misma política de precarga y compuerta.
- **FR-013**: El quiosco MUST mostrar una zona discreta siempre visible en pantalla (overlay de baja prominencia; visible de forma tenue para el público) con un icono por cada novedad pendiente en cola, solo en modo loop activo (no pausa, fijo ni iframe).
- **FR-014**: Cada icono MUST representar el tipo de medio (imagen vs video); miniaturas del archivo quedan fuera de alcance en v1.
- **FR-015**: El quiosco MUST superponer un indicador de check en el icono cuando el medio de esa novedad alcance el mismo estado “listo” que exige la compuerta de visualización (FR-003).
- **FR-016**: El quiosco MUST eliminar el icono de una novedad cuando es **realmente visible** en pantalla (compuerta abierta y slide mostrado), o cuando deja de estar pendiente sin haberse mostrado (omitida por “último gana”, `media_error`, o error de descarga con skip).
- **FR-017**: Los iconos en la zona indicadora MUST ordenarse según el orden de consumo previsto de la cola de novedades (`displayOrder` ascendente).
- **FR-018**: La zona indicadora MUST ocultarse cuando no hay novedades pendientes.
- **FR-019**: Con más de 5 novedades pendientes, la zona indicadora MUST mostrar como máximo 5 iconos (los 5 primeros en orden FIFO) y un contador “+N” donde N es el número de novedades adicionales no representadas como icono.
- **FR-020**: Si la descarga de una novedad falla, el quiosco MUST mostrar un indicador de error visible en su icono (distinto del check) desde el fallo hasta que el icono se elimine por skip u omisión.

### Traceability & Quality Requirements

- **TQ-001**: El contrato activo `CONTENT.ROTATION` MUST actualizarse antes de la implementación para reflejar precarga de novedades, compuerta de visualización e indicador de cola en quiosco.
- **TQ-002**: El cambio MUST incluir pruebas automatizadas o tarea manual explícita con rationale para: precarga al encolar, compuerta sin negro, fallo/timeout, rotación regular, e indicador de cola (iconos, checks, eliminación al mostrar/omitir).
- **TQ-003**: La entrada en `specs/manifest.yml` MUST actualizarse antes de dar por completada la implementación.

### Key Entities

- **Novedad pendiente**: Contenido con `isNovelty=true` en cola de rotación, ordenado por `displayOrder`, consumido en el siguiente límite de ciclo en modo loop.
- **Señal de precarga**: Notificación al quiosco con lista de medios a descargar anticipadamente (contenido en cola, no necesariamente en emisión).
- **Medio listo**: Estado local del quiosco donde el archivo está en caché y cumple criterio de presentación (imagen decodificada / video con buffer de reproducción).
- **Compuerta de visualización**: Regla del quiosco que retrasa el cambio de diapositiva hasta “medio listo” o timeout/fallo.
- **Zona indicadora de novedades**: Overlay discreto en la pantalla del quiosco que lista iconos de novedades pendientes, con estado de descarga (sin check / con check) y ciclo de vida acoplado a la cola local.
- **Plan de rotación**: Conjunto mostrando / siguiente / novedades pendientes (ya registrado en CHG-048).

## Success Criteria *(mandatory)*

- **SC-001**: En pruebas con archivos de video ≥10 MB en cola de novedades, el 100% de los cambios de diapositiva observados no muestran pantalla negra superior a 300 ms.
- **SC-002**: La descarga de una novedad comienza en ≤2 s desde que el upload público la encola (medido en quiosco conectado).
- **SC-003**: Cuando el medio está precargado antes del cambio, el tiempo percibido entre orden de emisión y primer frame visible es ≤500 ms en el 95% de los casos.
- **SC-004**: Ante fallo de descarga, el quiosco recupera la rotación automáticamente en ≤30 s sin intervención manual.
- **SC-005**: Los operadores de evento reportan eliminación del efecto “pantalla negra al subir novedad” en validación de aceptación con al menos un evento piloto.
- **SC-006**: Con dos novedades encoladas, los iconos aparecen en ≤2 s, el check de cada uno coincide con “medio listo”, y al hacerse visible la primera en pantalla (compuerta abierta) desaparece su icono dejando solo la pendiente en el 100% de las pruebas de aceptación.

## Assumptions

- El quiosco ya dispone de caché local de medios por blob URL; esta feature extiende cuándo se precarga y cuándo se permite el cambio visual.
- El tiempo máximo de espera en compuerta por defecto es **30 s**, expuesto como constante `GATE_TIMEOUT_MS = 30_000` en `frontend/src/app/display/display-content-gate.service.ts` (v1 sin UI de configuración); tras ese umbral se omite el ítem.
- La concurrencia de precarga en el quiosco es FIFO con máximo 3 descargas simultáneas; todas las novedades pendientes reciben señal de precarga al encolarse.
- No se requiere confirmación quiosco→servidor de “medio listo” para sincronizar emisión entre displays; cada quiosco compuerta localmente mientras el servidor mantiene el ritmo de rotación actual.
- Si el timer del servidor expira mientras un quiosco aún espera el medio, ese quiosco mantiene el ítem visible hasta que el medio del **último** `show_content` recibido esté listo o se alcance timeout; los ítems intermedios omitidos por política “último gana” no se reproducen retroactivamente.
- Ámbito de la primera entrega: contenido top en modo loop (novedades **y** rotación regular); patrocinadores (ads) quedan fuera salvo que se detecte el mismo problema en validación.
- El indicador de cola en quiosco aplica **solo a novedades** en v1; contenido regular de rotación no tiene iconos en la zona indicadora.
- La zona indicadora usa iconos por tipo de medio (no miniaturas); está **siempre visible** en la pantalla del quiosco como overlay discreto (esquina inferior derecha, opacidad reducida), sin modo debug ni toggle en v1; sin animaciones llamativas (respetar `prefers-reduced-motion`).

## Relationships

- Modifies: `CONTENT.ROTATION`
- Extends: `CHG-027` (cola de novedades), `CHG-041` (orquestador SSE), mecanismo `preload` existente
- Depends on: contrato `CONTENT.ROTATION` vigente
- Supersedes: —
- Superseded by: —
