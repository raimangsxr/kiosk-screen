---
id: CHG-051
type: change
status: implemented
modifies:
  - DISPLAY.RUNTIME
  - CONTENT.ADS.ADMIN
depends_on:
  - CHG-041
  - CHG-028
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

# Feature Specification: Estabilidad del runtime del kiosk en eventos largos

**Feature Branch**: `051-kiosk-runtime-performance`

**Created**: 2026-08-06

**Status**: Implemented

**Input**: User description: "Corregir de una vez los problemas de rendimiento del kiosk: fugas de memoria, bloqueo del navegador y degradación del SSE detectados en uso real durante eventos."

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `DISPLAY.RUNTIME`, `CONTENT.ADS.ADMIN`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## Clarifications

### Session 2026-08-06

- Q: ¿Cuál debe ser el tamaño máximo de la ventana de retención de medios en el quiosco? → A: Solo pieza visible + 1 precarga (siguiente en cola).
- Q: Cuando la cola SSE de un quiosco supera su límite (FR-012), ¿qué debe hacer el servidor? → A: Descartar eventos antiguos (cola FIFO acotada); el cliente procesa solo los más recientes.
- Q: Para reducir la carga de los ticks de anuncios (FR-010), ¿está permitido cambiar el protocolo SSE de `show_ads`? → A: No; mantener payload actual del servidor y optimizar solo en cliente (deduplicar, no re-procesar catálogo idéntico).
- Q: Si hay que eliminar el segundo `<video>` del blur-fill (FR-003), ¿qué alternativa visual es aceptable para vídeos? → A: Un `<video>` + fondo CSS (`background-image` del poster/frame con blur).
- Q: ¿La cola SSE acotada con drop-oldest (FR-012) aplica también al stream admin de contenido? → A: Solo stream de display; admin queda fuera de cola acotada en servidor (optimización cliente vía FR-014).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — El quiosco aguanta un evento completo sin degradarse (Priority: P1)

Un operador deja una o varias pantallas en `/display` funcionando durante un evento de varias horas con rotación continua de fotos y vídeos. Al cabo del evento, las pantallas siguen mostrando contenido con fluidez, sin que el navegador se congele ni requiera recarga manual.

**Why this priority**: Es el fallo que puede arruinar un evento en vivo; hoy la RAM sube de forma continua y el navegador acaba bloqueado.

**Independent Test**: Ejecutar un quiosco de laboratorio con rotación real durante ≥ 8 h (o acelerada en laboratorio con medición de memoria) y verificar que la rotación no se detiene y que el consumo de memoria se estabiliza.

**Acceptance Scenarios**:

1. **Given** un quiosco en modo rotación con al menos 20 piezas de contenido (fotos y vídeos) y anuncios activos, **When** permanece abierto durante 8 h continuas, **Then** la rotación de contenido y anuncios continúa sin intervención del operador.
2. **Given** el mismo escenario de 8 h, **When** se monitoriza el consumo de memoria del navegador, **Then** el uso de RAM deja de crecer de forma sostenida tras las primeras rotaciones y se mantiene dentro de un margen acotado respecto al pico inicial estabilizado (ver SC-001).
3. **Given** un quiosco que ya lleva varias horas en rotación, **When** el operador cambia contenido o anuncios desde el panel, **Then** el quiosco refleja los cambios en el tiempo de respuesta ya definido por el contrato de orquestación SSE existente, sin recargar la página.

---

### User Story 2 — La conexión en vivo permanece fiable bajo estrés (Priority: P1)

Durante un evento, las pantallas deben seguir recibiendo órdenes del orquestador (cambio de slide, modo, anuncios, branding) aunque la red fluctúe o el dispositivo esté bajo carga.

**Why this priority**: Cuando el navegador se satura, el SSE deja de procesarse y el operador pierde control en vivo — el síntoma reportado en producción.

**Independent Test**: Simular inestabilidad de red o carga elevada en laboratorio y verificar que el quiosco se recupera y vuelve a obedecer eventos de control sin tormenta de peticiones auxiliares.

**Acceptance Scenarios**:

1. **Given** un quiosco conectado al stream en vivo, **When** la conexión SSE se interrumpe brevemente y se restablece, **Then** el quiosco vuelve a estado conectado y procesa el siguiente evento de contenido o control en ≤ 60 s sin recarga manual.
2. **Given** reconexiones repetidas del SSE, **When** el quiosco intenta recuperar la sesión, **Then** no dispara ráfagas de comprobaciones de autenticación que bloqueen el hilo principal ni impidan procesar el stream.
3. **Given** un quiosco en modo de respaldo por polling (SSE caído > 60 s), **When** el SSE vuelve a estar disponible, **Then** el quiosco deja el modo de respaldo y no mantiene carga duplicada de actualización más allá del tiempo necesario para confirmar la reconexión.
4. **Given** latidos periódicos del servidor para mantener la conexión viva, **When** llegan al quiosco, **Then** no provocan re-renderizado de contenido ni reprocesamiento de la rotación en pantalla.

---

### User Story 3 — La experiencia visual se mantiene sin duplicar el coste de medios (Priority: P1)

Los asistentes al evento siguen viendo el contenido con el tratamiento visual acordado (marco con relleno estético en la zona superior, anuncios en la franja inferior), pero el quiosco no mantiene dos reproducciones simultáneas del mismo vídeo ni acumula indefinidamente copias en memoria de cada pieza ya mostrada.

**Why this priority**: El diseño actual de doble capa de media y caché sin límite es una causa directa del crecimiento de RAM y del bloqueo en vídeos.

**Independent Test**: Reproducir un vídeo en rotación durante 1 h midiendo decodificadores activos y memoria; comparar con línea base tras el cambio.

**Acceptance Scenarios**:

1. **Given** un vídeo en rotación en la zona superior, **When** está visible en pantalla, **Then** solo hay **un** elemento `<video>` activo; el relleno estético usa **fondo CSS** (`background-image` del poster o frame con blur), no un segundo decodificador de vídeo.
2. **Given** una secuencia de N piezas de contenido distintas en rotación, **When** el quiosco avanza por la cola, **Then** libera de forma predecible los medios que ya no forman parte del conjunto retenido (como máximo: pieza visible + 1 precarga).
3. **Given** el aspecto visual de relleno de la zona superior (CHG-028), **When** un operador compara antes y después en laboratorio, **Then** la diferencia visual es imperceptible o aceptable para el operador de evento (sin regresión funcional evidente).
4. **Given** anuncios en la franja de patrocinadores, **When** rotan según la configuración, **Then** solo se mantienen en memoria los medios de la ventana visible actual (sin retener el historial de rotaciones anteriores de la sesión).

---

### User Story 4 — El panel de administración sigue usable durante un evento activo (Priority: P2)

Un operador gestiona la lista de contenido mientras el evento está en marcha y el stream de inventario emite actualizaciones frecuentes (subidas, novedades, reordenaciones). La consola no se vuelve lenta ni acumula trabajo redundante.

**Why this priority**: Menos crítico que el quiosco, pero las actualizaciones SSE del admin pueden solaparse y empeorar la experiencia del operador en el momento más sensible.

**Independent Test**: Dejar abierta la lista de contenido con SSE activo, disparar ≥ 10 cambios de inventario en 2 min y medir fluidez de la UI y peticiones redundantes.

**Acceptance Scenarios**:

1. **Given** la lista de contenido abierta con stream de inventario activo, **When** llegan varias señales de cambio en poco tiempo, **Then** la lista se reconcilia con el servidor sin lanzar refrescos solapados que dejen la vista en estado inconsistente.
2. **Given** el operador arrastra para reordenar contenido, **When** el stream está en modo diferido por arrastre, **Then** las señales acumuladas se aplican una sola vez al soltar, como ya exige el contrato admin SSE.
3. **Given** un evento con muchas mutaciones de contenido, **When** el operador usa la lista durante ≥ 2 h, **Then** la pestaña del admin no muestra degradación progresiva comparable a la del quiosco previa a este cambio.

---

### User Story 5 — El servidor no acumula eventos sin límite hacia clientes lentos (Priority: P2)

Si un quiosco procesa eventos de display con retraso, el sistema no retiene indefinidamente una cola creciente de mensajes que, al liberarse, colapse el cliente. *(El stream admin de contenido queda fuera del alcance de cola acotada en servidor; ver FR-012 y FR-014.)*

**Why this priority**: Protege tanto al backend como al frontend en el escenario de cliente bloqueado — efecto observado en análisis de colas SSE ilimitadas.

**Independent Test**: Simular consumidor lento en laboratorio y verificar política de límite o descarte documentada.

**Acceptance Scenarios**:

1. **Given** un suscriptor SSE de display con procesamiento artificialmente ralentizado, **When** el orquestador sigue emitiendo rotaciones, **Then** la cola por conexión tiene un límite documentado y, al superarlo, **descarta los eventos más antiguos** (FIFO acotada) conservando los más recientes, sin crecimiento ilimitado de memoria en servidor.
2. **Given** un suscriptor que recupera la velocidad normal tras un retraso, **When** recibe los eventos recientes aún en cola, **Then** converge al estado actual sin bloquear permanentemente el navegador (los eventos descartados no se reenvían).

---

### Edge Cases

- Quiosco con un solo vídeo en bucle fijo durante horas: memoria estable, sin acumulación por rotaciones ficticias.
- Cola de contenido vacía intermitente: no se acumulan temporizadores ni listeners huérfanos que impidan recuperación.
- Modo iframe activo: no se precargan ni retienen blobs de la zona superior que no se muestran.
- Sesión SSE finalizada (`session_ended`) seguida de nueva apertura de display: sin fugas de la sesión anterior.
- Reconexión con `Last-Event-ID`: el cliente no reprocesa en bucle snapshots completos si el estado ya está sincronizado.
- Evento con muchos patrocinadores (franja llena): el servidor sigue enviando el catálogo completo en cada `show_ads`; el cliente deduplica y retiene solo la ventana visible en memoria.
- Pérdida de red prolongada (> 60 s): modo respaldo operativo, retorno limpio a SSE.
- Varios quioscos en la misma sesión: las mejoras aplican por cliente sin degradar el fan-out existente.
- Cliente muy retrasado con eventos descartados en cola: no se reenvían; el quiosco debe converger con los eventos recientes restantes o vía reconexión/replay existente.

## Requirements *(mandatory)*

### Functional Requirements

#### Memoria y medios en el quiosco

- **FR-001**: El runtime del quiosco DEBE acotar la retención en memoria de medios a un máximo de **dos piezas de contenido superior** en cualquier momento: la visible y **una** precarga (la siguiente en cola según la señal `preload` del orquestador). Cualquier medio fuera de ese par DEBE ser candidato a liberación inmediata.
- **FR-002**: El quiosco DEBE liberar explícitamente los recursos de medios que salen del conjunto retenido (visible + 1 precarga), de forma que una rotación prolongada no incremente el uso de RAM de forma monotónica.
- **FR-003**: La zona superior DEBE mostrar el tratamiento visual acordado (relleno estético / encuadre). Para **vídeo**, solo un `<video>` reproduce el archivo; el backdrop usa **CSS `background-image`** (poster o frame) con blur, sin segundo `<video>`. Para **foto**, se permite el patrón de doble capa existente (backdrop + foreground) o un enfoque equivalente de una sola decodificación si cumple el aspecto visual de CHG-028.
- **FR-004**: La precarga de medios DEBE respetar el límite de **una** pieza precargada además de la visible; si llega una nueva señal `preload` para una pieza distinta, la precarga anterior DEBE liberarse antes de retener la nueva.

#### Reactividad y rotación en pantalla

- **FR-005**: Los latidos de conexión del stream de display NO DEBEN actualizar el estado de contenido en pantalla ni disparar efectos equivalentes a un cambio de slide.
- **FR-006**: Cada avance de contenido o anuncio DEBE provocar solo el trabajo de interfaz estrictamente necesario para reflejar el cambio (sin recorridos completos redundantes del árbol de componentes cuando el estado visible no cambia).
- **FR-007**: El componente de pantalla DEBE usar una estrategia de detección de cambios acorde a un runtime de larga duración (actualización mínima por evento).

#### Fiabilidad del SSE de display

- **FR-008**: Ante errores o reconexiones del `EventSource`, el cliente DEBE limitar las comprobaciones de sesión/autenticación a una frecuencia acotada y sin solapamiento de peticiones en vuelo.
- **FR-009**: El modo de respaldo por polling DEBE activarse solo según las reglas existentes (SSE caído > 60 s) y DESACTIVARSE en cuanto el SSE vuelva a estar conectado, sin mantener ambos canales de actualización de estado de forma permanente.
- **FR-010**: Los mensajes `show_ads` **mantienen el payload actual del protocolo SSE** (sin cambio de contrato en esta entrega). El cliente DEBE minimizar la carga local: no re-procesar ni re-renderizar cuando el catálogo y la ventana visible son equivalentes al tick anterior; aplicar deduplicación por huella estable del payload antes de actualizar estado o calentar medios.

#### Servidor y protocolo SSE

- **FR-011**: Los latidos del stream de display DEBEN mantener la conexión viva sin publicar eventos de aplicación que avancen secuencia ni llenen el buffer de replicación (equivalente funcional a los comentarios de ping ya usados en el stream admin).
- **FR-012**: Cada suscriptor SSE de **display** DEBE tener una cola FIFO acotada; al superar el límite, el servidor **descarta el evento más antiguo** y conserva los más recientes. Los eventos descartados no se reenvían; la convergencia al estado actual depende de los eventos subsistentes o de una reconexión con replay/snapshot según el contrato existente. **No aplica** al stream admin de contenido (protección admin en cliente: FR-014).
- **FR-013**: El buffer de replay en almacenamiento compartido MANTIENE su TTL y límite actual; este cambio no lo relaja.

#### Panel de administración

- **FR-014**: La reconciliación de la lista de contenido ante señales SSE DEBE cancelar o coalescer refrescos en curso para que solo la última reconciliación pendiente (tras debounce) se ejecute.
- **FR-015**: Las señales `now_playing_changed` y `content_inventory_changed` MANTIENEN su semántica actual; solo se optimiza el coste de aplicación en cliente.

#### No regresión

- **FR-016**: La orquestación server-side de rotación (CHG-041), el blur-fill visual (CHG-028), el stream admin de contenido (CHG-047) y el modo respaldo por polling DEBEN seguir cumpliendo sus contratos salvo las optimizaciones explícitas de esta especificación.
- **FR-017**: El quiosco DEBE seguir funcionando con service worker en producción; las conexiones SSE permanecen fuera de la interceptación del worker (comportamiento existente).

### Traceability & Quality Requirements

- **TQ-001**: Los contratos activos `DISPLAY.RUNTIME` y, si aplica el delta de comportamiento admin, `CONTENT.ADS.ADMIN` DEBEN actualizarse antes de la implementación.
- **TQ-002**: El cambio DEBE incluir pruebas automatizadas de regresión para: límite de caché de medios, ignorar ping en cliente, debounce de reconexión, preservación del buffer de replay (FR-013), `ngsw-bypass` en SSE (FR-017), y al menos un escenario de integración o unitario de cola acotada en servidor; más validación manual de memoria (SC-001: proxy 30 min + release gate 8 h), recuperación de red SC-003, y comparación visual US3-3 documentada en `quickstart.md`.
- **TQ-003**: La entrada en `specs/manifest.yml` DEBE actualizarse antes de considerar completa la implementación.

### Key Entities

- **Media retention window**: Conjunto acotado de piezas de media que el quiosco retiene en memoria: como máximo **1 pieza visible + 1 precarga** en la zona superior, más los medios de la **ventana visible actual** de anuncios (sin historial de rotaciones pasadas).
- **Display stream heartbeat**: Señal periódica de mantenimiento de conexión que no altera el estado de reproducción.
- **SSE subscriber queue policy**: Cola FIFO acotada por conexión del stream de **display** únicamente; ante desbordamiento se elimina el evento más antiguo (drop-oldest). El stream admin no tiene cola acotada en servidor en esta entrega.
- **Reconciliation coalescer**: Comportamiento del admin que agrupa señales de inventario en un único refresco efectivo.

## Success Criteria *(mandatory)*

- **SC-001**: En un ensayo de laboratorio de 8 h de rotación continua con ≥ 20 piezas de contenido mixto, el uso de memoria del navegador en el quiosco se estabiliza y el crecimiento total desde el minuto 30 al final del ensayo es ≤ 20 % del valor estabilizado en el minuto 30.
- **SC-002**: En el mismo ensayo de 8 h, no se requiere ninguna recarga manual del navegador para que la rotación continúe.
- **SC-003**: Tras una interrupción de red de hasta 2 min, el quiosco vuelve a reflejar un cambio de control remoto emitido por el operador en ≤ 90 s desde la recuperación de conectividad.
- **SC-004**: Durante 1 h de rotación de vídeo en la zona superior, no hay más de una reproducción activa del archivo de vídeo visible (verificable en laboratorio con métricas del navegador).
- **SC-005**: Con 10 señales de inventario en 2 min en la lista de contenido, el operador percibe la lista como fluida (sin bloqueos perceptibles > 1 s) y no se observan más de una petición de listado efectiva por ventana de debounce de 1 s.
- **SC-006**: En prueba de carga de servidor con suscriptor **de display** lento, la memoria atribuible a la cola por conexión no crece sin tope durante 30 min de emisión continua.

## Assumptions

- La duración objetivo de un evento en vivo es de 4–12 h; 8 h es el escenario de aceptación principal.
- Los dispositivos quiosco son navegadores Chromium recientes en hardware de señalización (mini PC o similar) con ≥ 4 GB RAM.
- El análisis de causa raíz previo (caché de blobs ilimitada, doble decodificación de vídeo, pings como eventos de aplicación, tormenta de auth en `onerror`, detección de cambios agresiva, payloads SSE pesados, cola ilimitada) es la base del alcance; esta spec agrupa las correcciones en un único entregable coherente.
- La calidad visual del relleno estético (CHG-028) se preserva; para vídeos el backdrop es **CSS con poster/frame blur** y un solo `<video>` activo (ver FR-003 y clarificación de sesión 2026-08-06).
- No se cambia el modelo de orquestación server-side ni se reintroduce rotación cliente como fuente de verdad.
- El protocolo SSE de `show_ads` no cambia en esta entrega; las optimizaciones de anuncios son exclusivamente del lado cliente (FR-010).
- La cola SSE acotada en servidor (FR-012) aplica **solo al stream de display**; el admin se optimiza en cliente (FR-014).

## Relationships

- Modifies: `DISPLAY.RUNTIME`, `CONTENT.ADS.ADMIN` (solo si el contrato admin documenta reconciliación/coalescing)
- Extends: comportamiento estable de CHG-041, CHG-028, CHG-047
- Depends on: CHG-041 (orquestación SSE), CHG-028 (media fit), CHG-047 (admin content SSE)
- Supersedes: ninguno
- Superseded by: —
