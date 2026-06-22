# Feature Specification: Content Rotation Modes

**Feature Branch**: `018-content-rotation-modes`
**Created**: 2026-06-22
**Status**: Draft
**Input**: User description: "He estado probando la aplicación y quiero hacer los siguientes cambios: La rotación de Ads no funciona correctamente, se ve la animación de transición pero parece que no se cambia el índice correctamente, el resultado es que los ads son siempre los mismos en pantalla y lo que tendría que hacer es ir rotandolos en el orden definido. Por otro lado, la rotación tampoco se hace cada 'ad duration' segundos, no se corresponde con el intervalo de actualización de ads configurado en el panel de administrador. Otro problema es que en Firefox se ve bien la ad-region, sin embargo en chrome no se ve y por lo tanto no salen los ads. Quiero que funcione también en chrome. En modo iframe, no debe ser visible el bloque de branding-overlay. En el control remoto, concretamente en Rotation navigation, aparte de las acciones que ya hay, añadir poder pausar y reanudar la rotación de Content. Cuando añadimos nuevo Content, ahora puede también ser normal (como hasta ahora) o recurrente. Si es recurrente, se mostrará este Content cada X iteraciones de los ítems de la rotación, es decir, se configurará la cadencia del Content recurrente y esa imagen / video se mostrará cada X veces que cambie el Content. Aquí la idea es utilizar esta nueva feature para añadir información relevante del evento que quieres que salga de forma recurrente en la pantalla. También quiero content que pueda marcar como fijo. En remote-control hay un nuevo modo que será 'fijo' y que al igual que los iframes, me permitirá seleccionar uno de los content marcados como fijo. Al usar este nuevo modo con un content fijo, detendrá la rotación de Content y pondrá en pantalla el content fijo seleccionado. Cuando vuelva a modo rotación, no volverá a empezar la rotación, sino que continuará por el índice del content que estaba proyectándose cuando entramos en modo fijo. Con respecto a la subida de Content vía API, debe reconocer automáticamente si se trata de una imagen o un video por su extension, no quiero tener que seleccionar el tipo, porque para automatizaciones en sistemas poco parametrizables, nos enviarán el contenido sin saber si es video o foto, por lo que debemos verificarlo en el backend."

## Conflicto con `017-event-branding`

Esta spec modifica explícitamente un requisito aprobado de la feature 017:

- **`017 US2` Acceptance Scenario 5** (`specs/017-event-branding/spec.md` línea 59): "el overlay se sigue renderizando en modo iframe".
- **`017 T031` [P] [US2]** (`specs/017-event-branding/tasks.md` línea 105): test de iframe que exige overlay visible.

La presente spec invierte ese comportamiento: el `branding-overlay` **no** se renderizará cuando el kiosk esté en modo iframe (US2 de esta spec). Como parte del cierre de 018, las tareas T031 y la AS-5 de 017 se marcan como **obsoletas** y la implementación del kiosk se ajusta. No se reabre el alcance restante de 017.

## Clarifications

### Session 2026-06-22

- Q: Cuando el Content fijo es un video y dispara `ended`, ¿qué debe hacer el kiosk? → A: Reinicia el video en bucle (`currentTime = 0; play()`); el item fijo se mantiene visible indefinidamente.
- Q: Si el operador cambia el modo del kiosk (loop↔iframe↔fixed) mientras un video está reproduciéndose, ¿qué debe pasar? → A: Interrumpir inmediatamente: pausar/descargar el video actual y aplicar el nuevo modo al instante.
- Q: ¿Cómo debe comportarse el contador de cadencia del Content recurrente cuando el kiosk está fuera de `loop` (en `iframe` o `fixed`)? → A: El contador se pausa (no avanza) mientras el kiosk está fuera de `loop`, y se reanuda exactamente donde estaba al volver a `loop`.
- Q: Si el kiosk está pausado en `loop` y el operador cambia a `fixed` o `iframe` (y luego vuelve a `loop`), ¿qué debe pasar con el estado Pause? → A: Al salir de `loop`, el estado Pause se descarta; al volver a `loop`, la rotación arranca activa.
- Q: ¿En qué endpoints se aplica la validación de exclusividad `isFixed` + `recurringEveryXIterations`? → A: ~~Tanto `POST /api/content/upload` (admin) como `POST /api/public/content/upload` (público) validan la exclusividad y devuelven HTTP 400 con el mismo mensaje. La API pública acepta los flags `isFixed` y `recurringEveryXIterations` como opcionales y los persiste igual que admin.~~ **SUPERSEDED by Q6 (next line).** The text kept here for traceability; the live answer is Q6.
- Q: ¿La API pública debe permitir crear Contents fijos (`isFixed=true`) y recurrentes? → A: No. La API pública (`POST /api/public/content/upload`) **no acepta** `isFixed` ni `recurringEveryXIterations`; siempre los persiste como `false`/`null`. El panel admin (`POST /api/content/upload`) es el único canal para crear Contents fijos y recurrentes.
- Q: ¿La API pública debe permitir crear Contents fijos (`isFixed=true`) y recurrentes? → A: No. La API pública (`POST /api/public/content/upload`) **no acepta** `isFixed` ni `recurringEveryXIterations`; siempre los persiste como `false`/`null`. El panel admin (`POST /api/content/upload`) es el único canal para crear Contents fijos y recurrentes.
- Q: Cuando el kiosk está en modo `iframe` o `fixed`, ¿la ad-region debe seguir rotando? → A: Sí. Los ads siguen rotando normalmente en la banda inferior en cualquier modo (`loop`, `iframe`, `fixed`). La ad-region es ortogonal al modo del Content principal; solo se ve afectada por el flag `adsVisible` del control remoto.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Corrección de la rotación de Ads y del Content (Priority: P1)

Operador y administrador observan que, sobre la pantalla del kiosk, los Ads rotan con la animación pero **siempre se ven los mismos elementos en el mismo orden**; el índice del carrusel no avanza. Adicionalmente, los Ads **no rotan cada `defaultAdDurationSeconds`** segundos (configurado en `/admin/display`) sino en un intervalo distinto, no determinista a ojos del usuario. La rotación de Content principal (fotos/videos) tampoco respeta la duración efectiva del elemento actual cuando coexiste con videos que disparan `ended`.

**Why this priority**: Sin esta corrección la pantalla es inutilizable en producción; bloquea cualquier demo o despliegue.

**Independent Test**: Con 3 ads cargados en `/admin/ads` y `defaultAdDurationSeconds=10` en `/admin/display`, abrir `/display` en Firefox y en Chrome, dejar pasar 30 segundos y comprobar que se han mostrado los 3 anuncios en orden y que cada uno ha durado 10s ±1s. Repetir con un video en la rotación principal y comprobar que tras `ended` el siguiente elemento se proyecta respetando su `effectiveDurationSeconds`.

**Acceptance Scenarios**:

1. **Given** N ads (N≥2) visibles en `ad-region` y `defaultAdDurationSeconds=10`, **When** pasan 10 segundos desde que un ad aparece, **Then** el siguiente ad de la cola aparece (sin repetir el actual) y se respeta el orden definido por `displayOrder`.
2. **Given** un `<video>` en Content principal termina su reproducción (`ended`), **When** pasan `videoEndDelaySeconds`, **Then** se avanza al siguiente elemento de la rotación y se respeta su `effectiveDurationSeconds` (no se vuelve a proyectar el mismo video).
3. **Given** un item de Content no tiene `effectiveDurationSeconds` propio, **When** se proyecta, **Then** se aplica `defaultTopDurationSeconds` de la configuración del kiosk.
4. **Given** N ads cargados, **When** el kiosk está en Chrome o Firefox, **Then** todos los ads son visibles en la `ad-region` y rotan al ritmo configurado.

---

### User Story 2 — Branding overlay oculto en modo iframe (Priority: P1)

Operador configura branding (logo + nombre del evento + organizador) en `/admin/event`. Cuando el kiosk entra en modo iframe desde el control remoto, el `branding-overlay` **deja de verse** para no competir visualmente con el iframe del patrocinador. Al volver a modo rotación, el overlay vuelve a aparecer si el branding sigue configurado.

**Why this priority**: Cambia un requisito aprobado de 017 y resuelve un solapamiento visual reportado.

**Independent Test**: Con branding configurado (logo + nombres), abrir `/display`. El overlay aparece en la esquina superior izquierda. Activar modo iframe desde el control remoto apuntando a un iframe de prueba. El overlay desaparece del DOM. Volver a modo rotación. El overlay vuelve a aparecer.

**Acceptance Scenarios**:

1. **Given** el kiosk está en modo `loop` con branding configurado, **When** se renderiza la pantalla, **Then** el `branding-overlay` aparece con logo, organizer y event name.
2. **Given** el kiosk está en modo `iframe` con branding configurado, **When** se renderiza la pantalla, **Then** el `branding-overlay` **no** aparece en el DOM (no se renderiza el elemento, no se aplica `display:none`).
3. **Given** el kiosk pasa de modo `iframe` a modo `loop` con branding configurado, **When** el estado se refresca, **Then** el `branding-overlay` vuelve a aparecer sin necesidad de recargar la página.
4. **Given** el kiosk está en modo `iframe` sin branding configurado, **When** se renderiza la pantalla, **Then** el `branding-overlay` no aparece (comportamiento ya existente).
5. **Given** un operador desactiva el modo iframe manualmente, **When** se vuelve al modo `loop`, **Then** la rotación de Content continúa exactamente por el índice del item que estaba activo cuando se entró en iframe (no se reinicia).

---

### User Story 3 — Pausar y reanudar la rotación de Content desde el control remoto (Priority: P1)

Operador o administrador necesita congelar la rotación principal del kiosk (por ejemplo, durante una intervención técnica o una demostración) y volver a ponerla en marcha sin perder el orden ni el ritmo configurado. Las acciones de Pausa y Reanudación se exponen como dos botones en la tarjeta "Rotation navigation" del control remoto, junto a "Previous" y "Next".

**Why this priority**: Aporta control operativo básico que ya tienen los modos iframe/fullscreen.

**Independent Test**: Con rotación activa, pulsar "Pause" desde el control remoto. El item actual permanece en pantalla sin avanzar. Pulsar "Resume". La rotación continúa desde el siguiente item (no se reinicia ni se queda en pausa).

**Acceptance Scenarios**:

1. **Given** el kiosk está en modo `loop` y rotando, **When** el operador pulsa "Pause", **Then** el item actual permanece en pantalla; el timer de avance se cancela.
2. **Given** el kiosk está pausado, **When** el operador pulsa "Resume", **Then** la rotación continúa: el siguiente item se proyecta respetando su `effectiveDurationSeconds`.
3. **Given** el kiosk está pausado, **When** el operador pulsa "Previous" o "Next", **Then** la pausa se mantiene, solo cambia el item mostrado (no se reanuda implícitamente).
4. **Given** el kiosk está en modo `iframe` o `fixed`, **When** el operador pulsa "Pause" o "Resume", **Then** las acciones devuelven un error claro al operador (no son válidas fuera de modo `loop`).
5. **Given** un `<video>` está reproduciéndose, **When** el operador pulsa "Pause", **Then** el video se pausa (`video.pause()`) además de cancelar el timer de avance.

---

### User Story 4 — Content recurrente con cadencia configurable (Priority: P1)

Operador o administrador añade un nuevo Content y lo marca como **recurrente** indicando una cadencia `everyXIterations` (entero ≥ 1). Cuando la rotación principal alcanza el item número `everyXIterations`, ese Content recurrente se proyecta en lugar del siguiente item normal; tras mostrarlo, el contador vuelve a empezar.

**Why this priority**: Permite comunicar información del evento (patrocinador principal, normativa, llamada a la acción) de forma repetitiva sin saturar la cola.

**Independent Test**: Añadir un Content recurrente con cadencia 3 junto a 4 Contents normales. Observar la rotación: en las posiciones 4, 8, 12, ... (después de 3 cambios) aparece el recurrente. Entre recurrentes, la cola normal sigue su orden.

**Acceptance Scenarios**:

1. **Given** un Content recurrente con `everyXIterations=3`, **When** la rotación ha avanzado 3 items desde la última proyección del recurrente, **Then** el recurrente se proyecta a continuación.
2. **Given** dos o más Contents recurrentes activos en la misma organización, **When** toca proyectar un recurrente, **Then** se alternan entre ellos (round-robin) respetando su cadencia individual.
3. **Given** un Content recurrente activo, **When** el operador entra en modo `iframe` o `fixed`, **Then** el contador de cadencia se pausa igual que el resto de la rotación y se reanuda al volver a `loop`.
4. **Given** la cola de Content está vacía o solo tiene recurrentes, **When** la rotación intenta avanzar, **Then** se aplica una política de fallback segura (no entrar en bucle infinito ni crashear el kiosk).
5. **Given** un Content recurrente se sube con cadencia ≤ 0 o no numérica, **When** el operador intenta guardarlo, **Then** la API rechaza la petición con un mensaje claro y el item queda en estado borrador.

---

### User Story 5 — Content fijo y modo "fixed" en el control remoto (Priority: P1)

Operador marca un Content como **fijo** desde la creación/edición. En el control remoto aparece un nuevo modo de Content ("Fixed") junto a "Rotation" e "Iframe". Al seleccionar este modo, el operador elige uno de los Contents fijos disponibles; el kiosk deja de rotar y proyecta exclusivamente ese item. Al volver a modo "Rotation", la rotación **continúa por el índice que estaba activo cuando se entró en modo fijo**, no desde el principio.

**Why this priority**: Necesario para overlays permanentes tipo "vota aquí", "siguiente charla en 5 min", o señalización fija durante una Keynote.

**Independent Test**: Marcar un Content como fijo. En el control remoto, cambiar a modo "Fixed" y elegir ese content. La rotación se detiene y solo se ve ese item. Volver a modo "Rotation". La rotación continúa desde donde estaba antes, no desde el primer item.

**Acceptance Scenarios**:

1. **Given** un Content marcado como fijo, **When** el operador entra en modo `fixed` y lo selecciona, **Then** el kiosk detiene la rotación y proyecta exclusivamente ese item hasta que se cambie de modo.
2. **Given** el kiosk está en modo `fixed` mostrando un Content fijo, **When** el operador vuelve a modo `loop`, **Then** la rotación continúa desde el índice del Content que estaba activo **justo antes** de entrar en `fixed`, sin reiniciar la cola ni saltar items.
3. **Given** no hay ningún Content marcado como fijo en la organización, **When** el operador intenta seleccionar el modo `fixed`, **Then** la opción aparece deshabilitada con el mensaje "No hay content fijo disponible" y el endpoint devuelve un error claro.
4. **Given** el kiosk está en modo `fixed`, **When** el operador intenta enviar comandos "Pause" / "Resume" / "Previous" / "Next", **Then** la API rechaza esas acciones porque solo son válidas en modo `loop`.
5. **Given** el operador está viendo un Content fijo y otro operador / sistema desmarca ese item como fijo, **When** el kiosk refresca el estado, **Then** el kiosk no se queda en blanco: o bien vuelve automáticamente a modo `loop` (preservando el índice previo), o bien muestra un placeholder de "Content no disponible" hasta que el operador decida.

---

### User Story 6 — Auto-detección del tipo de Content por extensión de archivo (Priority: P1)

Integrador externo envía contenido al endpoint admin o público sin saber (o sin poder parametrizar) si es imagen o video. La API backend **debe detectar el tipo por la extensión del archivo** y persistir el item como `photo` o `video` correspondientemente. El operador ya no necesita enviar un campo `contentType` en el form; si lo envía, sigue siendo válido (la detección automática solo aplica cuando falta o es ambiguo).

**Why this priority**: Elimina fricción operativa para automatizaciones externas; es un cambio mínimo en contrato pero muy solicitado.

**Independent Test**: Desde `curl` o Postman, hacer `POST /api/content/upload` (admin) o `POST /api/public/content/upload` (público) con un `.mp4` y sin enviar `contentType`. Verificar que el item se persiste con `contentType=video`. Repetir con un `.jpg`. Verificar `contentType=photo`.

**Acceptance Scenarios**:

1. **Given** el integrador sube un archivo con extensión `.jpg|.jpeg|.png|.gif|.webp` y sin `contentType`, **When** la API procesa el upload, **Then** el item se persiste con `contentType=photo` y se renderiza como imagen en el kiosk.
2. **Given** el integrador sube un archivo con extensión `.mp4|.webm|.ogg|.mov` y sin `contentType`, **When** la API procesa el upload, **Then** el item se persiste con `contentType=video` y se renderiza como video.
3. **Given** el integrador sube un archivo sin extensión reconocible, **When** la API procesa el upload, **Then** la API devuelve HTTP 415 con un mensaje que liste las extensiones válidas; no se persiste el item.
4. **Given** el integrador sube un archivo con extensión reconocible pero MIME declarado contradictorio (p.ej. `.jpg` con `content-type: video/mp4`), **When** la API procesa el upload, **Then** prevalece la extensión del archivo (regla explícita del producto).
5. **Given** el integrador sigue enviando `contentType` como antes, **When** la API procesa el upload, **Then** el comportamiento existente se mantiene (backwards-compatible); la autodetección solo aplica cuando `contentType` falta.

### Edge Cases

- **Publicación parcial**: Si la rotación se pausa y el navegador pierde el foco, el kiosk debe reanudar la cuenta correctamente al volver (no perder tiempo ni duplicar advancements).
- **Cadencia 1**: Un Content recurrente con `everyXIterations=1` debe proyectarse en cada iteración sin caer en bucle infinito.
- **Recurrente único**: Si todos los Contents son recurrentes y/o la cola está vacía, el kiosk debe mostrar un placeholder ("Sin contenido") y registrar un evento `content_rotation_empty`.
- **Fijo + recurrente simultáneos**: Un Content puede ser `fijo` y `recurrente` a la vez? Por defecto NO: la marca `fijo` excluye la marca `recurrente` (mutuamente excluyentes).
- **Fijo seleccionado eliminado**: Si el Content fijo actualmente proyectado se elimina, el kiosk vuelve automáticamente a `loop` preservando el índice previo.
- **Cambio de modo durante `(ended)` de un video**: El handler `onVideoEnded` debe respetar el modo actual (no avanzar si estamos en `iframe` o `fixed`).
- **Pausa durante `(ended)` de un video**: Si llega una pausa mientras el video está terminando, el video debe detenerse y el siguiente item no debe programarse.
- **Múltiples operadores**: El control remoto es multiusuario; las acciones Pause/Resume/Next/Previous se serializan en backend con un id de comando (igual que las acciones existentes), evitando carreras.
- **Modo iframe + branding configurado (regresión 017)**: El overlay ya no se renderiza; este cambio se valida también en navegador real.
- **Content vacío tras autodetección**: Si el body llega sin archivo o con archivo vacío, se devuelve HTTP 400 con el mensaje "Archivo requerido".

## Requirements *(mandatory)*

### Functional Requirements

#### Rotación (US1)

- **FR-001**: El kiosk **debe** avanzar el índice de Ads según el orden `displayOrder` definido en backend, sin repetir un ad hasta haber mostrado todos los demás (round-robin).
- **FR-002**: El intervalo entre rotaciones de Ads **debe** ser exactamente `defaultAdDurationSeconds` (configurado en `/admin/display`) ± 1 segundo de tolerancia.
- **FR-003**: Cuando un `<video>` dispara `ended`, el siguiente item **debe** respetar su `effectiveDurationSeconds` (no aplicar `videoEndDelaySeconds` como si fuera una duración principal).
- **FR-004**: El template y el CSS del kiosk **deben** renderizar la `ad-region` y sus imágenes de forma idéntica en Chrome y Firefox (sin colores, fondos, posiciones o duraciones nulas dependientes del navegador).
- **FR-005**: El componente de display **debe** tener un único subsistema de timers basado en `effect()` + `setTimeout` (o equivalente robusto a re-renders) que avance tanto Content como Ads; no se permiten closures con estado mutable que dependan del ciclo de `applyState`.

#### Branding overlay (US2)

- **FR-006**: Cuando `remoteControl.contentMode === 'iframe'`, el `branding-overlay` **no** se renderiza en el DOM.
- **FR-007**: Cuando `remoteControl.contentMode === 'loop' | 'fixed'` y hay branding configurado, el `branding-overlay` **se** renderiza (comportamiento previo de 017).
- **FR-008**: Al pasar de modo `iframe` a `loop`, la rotación principal **debe** continuar desde el índice del Content que estaba activo cuando se entró en iframe.

#### Transiciones de modo (cross-cutting, US2/US3/US5)

- **FR-008a**: Cualquier transición entre modos (`loop` ↔ `iframe` ↔ `fixed`) **debe** interrumpir inmediatamente cualquier `<video>` en reproducción (`video.pause()`, `video.currentTime` queda donde esté o se reinicia según la transición): si el destino es `fixed` con un video, se reinicia a `0`; en cualquier otro caso el video simplemente se pausa y no se reanuda.
- **FR-008b**: La ad-region (banda inferior de anuncios) **es ortogonal al modo del Content principal**. Los ads siguen rotando normalmente en modo `loop`, `iframe` y `fixed`. La única manera de detener/ocultar la ad-region es mediante el flag `adsVisible=false` del control remoto.

#### Pause / Resume (US3)

- **FR-009**: El control remoto **debe** exponer dos acciones nuevas en la tarjeta "Rotation navigation": "Pause" y "Resume".
- **FR-010**: El backend **debe** aceptar los comandos `pause` y `resume` en `POST /api/display/remote-control/navigation` y persistirlos con un nuevo `navigationCommandId` (mismo patrón que `next`/`previous`).
- **FR-011**: En el kiosk, `pause` cancela todos los timers activos (Content + Ads) y, si hay un `<video>` reproduciéndose, llama a `video.pause()`. `resume` re-arranca los timers cancelados desde el estado actual (sin reiniciar la cola).
- **FR-012**: Los comandos `pause`/`resume` solo son válidos cuando `contentMode === 'loop'`. En otros modos la API devuelve HTTP 409 con mensaje claro.
- **FR-012a**: El estado Pause es local al modo `loop`. Al salir de `loop` (hacia `iframe` o `fixed`), el estado Pause se descarta; al volver a `loop`, la rotación arranca activa (no pausada). El backend **no** persiste el flag Pause entre cambios de modo.

#### Content recurrente (US4)

- **FR-013**: El modelo de Content **debe** soportar un campo `recurringEveryXIterations: integer | null` con check constraint `>= 1` cuando no nulo.
- **FR-014**: El formulario de alta/edición de Content en el panel admin **debe** permitir marcar el item como recurrente y enviar la cadencia (entero ≥ 1). El endpoint `POST /api/public/content/upload` **no acepta** este flag; si llega en el body, el backend lo ignora silenciosamente y persiste `recurringEveryXIterations=null`.
- **FR-015**: El motor de rotación del kiosk **debe** proyectar el Content recurrente cada X iteraciones del resto de la cola, alternando entre recurrentes activos si hay varios. El contador de cadencia **se pausa** (no avanza) mientras el kiosk está en modo `iframe` o `fixed` y **se reanuda exactamente donde estaba** al volver a `loop`.
- **FR-016**: Las marcas `isFixed=true` y `recurringEveryXIterations IS NOT NULL` son **mutuamente excluyentes** en el modelo `TopContentItem`. Solo el endpoint admin (`POST /api/content/upload`) acepta y valida ambos flags. El endpoint público (`POST /api/public/content/upload`) **no acepta** ninguno; persiste `isFixed=false` y `recurringEveryXIterations=null` siempre, ignorando cualquier valor recibido. Si el admin combina ambas marcas, la API devuelve HTTP 400 con el mensaje "Un Content no puede ser fijo y recurrente a la vez".
- **FR-017**: Si la cola queda vacía o solo contiene recurrentes y el motor no puede avanzar, el kiosk muestra un placeholder "Sin contenido" y registra el evento `content_rotation_empty`.

#### Content fijo y modo fixed (US5)

- **FR-018**: El modelo de Content **debe** soportar un campo `isFixed: boolean` (default `false`).
- **FR-019**: El control remoto **debe** añadir un nuevo modo de Content llamado "Fixed" junto a "Rotation" e "Iframe". Los Contents fijos solo se crean desde el panel admin (`POST /api/content/upload`); el endpoint público no permite crear fijos.
- **FR-020**: Cuando el operador selecciona el modo `fixed` y elige un Content fijo, el backend persiste `contentMode='fixed'` + `selectedContentId` en `display_control_states`. El kiosk deja de rotar y proyecta exclusivamente ese Content. Si el Content fijo es un video y dispara `ended`, el kiosk lo reinicia en bucle (`currentTime = 0; play()`) para mantenerlo visible indefinidamente.
- **FR-021**: Al pasar de `fixed` a `loop`, la rotación continúa desde el índice del Content que estaba activo **justo antes** de entrar en `fixed` (no se reinicia la cola).
- **FR-022**: Si no hay Contents marcados como `isFixed` en la organización, la opción "Fixed" en el control remoto aparece deshabilitada con tooltip explicativo.
- **FR-023**: Los comandos `pause`/`resume`/`next`/`previous` son **inválidos** en modo `fixed` (HTTP 409).
- **FR-024**: Si el Content fijo actualmente seleccionado se elimina o se desmarca como fijo mientras el kiosk está en modo `fixed`, el kiosk vuelve automáticamente a modo `loop` preservando el índice previo al entrar en `fixed`.

#### Autodetección por extensión (US6)

- **FR-025**: El endpoint `POST /api/content/upload` (admin) **debe** permitir omitir el campo `contentType` y autodetectarlo por la extensión del archivo subido.
- **FR-026**: El endpoint `POST /api/public/content/upload` (público) **debe** detectar el tipo por la extensión del archivo. Si la extensión es desconocida, devuelve HTTP 415 listando extensiones válidas.
- **FR-027**: Las extensiones válidas para autodetección son:
  - Imágenes: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` → `contentType=photo`.
  - Videos: `.mp4`, `.webm`, `.ogg`, `.mov` → `contentType=video`.
- **FR-028**: Si el integrador envía `contentType` y la extensión lo contradice, prevalece la **extensión** del archivo (regla explícita). El backend ignora el campo y registra una nota en logs / evento de auditoría.
- **FR-029**: Si el campo `contentType` se omite y la extensión no es reconocible, la API devuelve HTTP 415 con el mensaje: "Tipo de archivo no reconocido. Extensiones válidas: jpg, jpeg, png, gif, webp, mp4, webm, ogg, mov."

### Traceability & Quality Requirements *(mandatory)*

- **TQ-001**: Cada requisito funcional anterior mapea a al menos una historia de usuario (US1–US6) y a un criterio de éxito medible.
- **TQ-002**: Toda conducta nueva o modificada lleva un test asociado: unit para lógica de rotación y motor de cadencia; integración/contrato para los endpoints admin/público/control remoto; Karma para el componente del kiosk y la UI del control remoto.
- **TQ-003**: Contratos públicos / integración que cambian: `POST /api/content/upload`, `POST /api/public/content/upload`, `POST /api/display/remote-control/navigation`, `GET /api/display/state`. Se documentan en `specs/018-content-rotation-modes/contracts/`.
- **TQ-004**: Seguridad: los nuevos comandos `pause`/`resume`/`fixed` siguen el mismo control de acceso por rol que `next`/`previous`. La autodetección por extensión **no** relaja la validación de MIME ya existente.
- **TQ-005**: Observabilidad: los modos `loop`/`iframe`/`fixed` y las acciones `pause`/`resume` se registran como eventos auditables (`display_control_changed`, `content_rotation_empty` cuando aplique).
- **TQ-006**: Fuera de alcance explícito: nuevo sistema de versionado de configuraciones; nuevos tipos de MIME no listados en FR-027; notificaciones push al cliente; playlist multi-organización cruzada.

### Key Entities *(include if feature involves data)*

- **`TopContentItem`** (extendido): campos nuevos `recurringEveryXIterations: int | null`, `isFixed: bool` (default `false`). Restricciones: `recurringEveryXIterations IS NULL OR recurringEveryXIterations >= 1`; `NOT (isFixed AND recurringEveryXIterations IS NOT NULL)`. Los flags `isFixed` y `recurringEveryXIterations` solo se aceptan desde el endpoint admin (`POST /api/content/upload`); el endpoint público los ignora siempre.
- **`DisplayControlState`** (extendido): campo nuevo `selectedFixedContentId: FK(TopContentItem) | null`. Restricción: `selectedFixedContentId IS NOT NULL => contentMode = 'fixed'`.
- **`DisplayContentMode`** (extendido, en frontend y backend): pasa de `{'loop', 'iframe'}` a `{'loop', 'iframe', 'fixed'}`.
- **`RemoteControlNavigationCommand`** (extendido): pasa de `{'next', 'previous'}` a `{'next', 'previous', 'pause', 'resume'}`.
- **Nuevos eventos de auditoría**: `display_control_paused`, `display_control_resumed`, `display_control_fixed_changed`, `content_rotation_empty`, `content_type_autodetected`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con N ads (N≥3) y `defaultAdDurationSeconds=10`, en 30 segundos el kiosk ha mostrado los N ads en orden, sin repeticiones, en Chrome y Firefox, con tolerancia ±1 s por ad.
- **SC-002**: Tras pulsar "Pause" en el control remoto, **el Content actual permanece ≥ 5 minutos sin avanzar** y **los Ads también quedan pausados** (per FR-011: pause cancela todos los timers activos, Content + Ads). Tras "Resume", la rotación continúa y el siguiente Content aparece en ≤ 1s + su `effectiveDurationSeconds`; los Ads también reanudan. Verificable manualmente.
- **SC-003**: Tras configurar un Content recurrente con cadencia 3, el recurrente aparece en la posición 4, 8, 12, ... de la rotación. Tras 30 cambios, el recurrente se ha mostrado exactamente 10 veces (±1).
- **SC-004**: Tras seleccionar un Content fijo y volver a modo rotación, la rotación continúa por el índice del Content que estaba activo antes de entrar en `fixed`. Verificable inspeccionando el log de auditoría: la entrada `display_control_fixed_changed` registra el índice previo y el nuevo estado.
- **SC-005**: Un POST admin o público con `.mp4` sin `contentType` devuelve 200 con el item persistido como `contentType=video`. Un POST con `.xyz` devuelve 415 con el mensaje de extensiones válidas. Tasa de error < 1% en 100 peticiones de prueba.
- **SC-006**: Con branding configurado, al pasar el kiosk a modo iframe, el `branding-overlay` no aparece en el DOM (asertado vía `document.querySelector('.branding-overlay') === null`). Al volver a `loop`, reaparece.
- **SC-007**: Cobertura de tests: ≥ 80% en líneas para `backend/app/services/content_service.py` (rotación + autodetección) y ≥ 70% en líneas para `frontend/src/app/display/display-screen.component.ts`.

## Assumptions

- **A-001**: El integrador externo usa HTTP estándar con `multipart/form-data`. No se requiere negociación de contenido ni streaming.
- **A-002**: El backend puede mantener la convención actual de nombres en español para mensajes de error visibles al usuario (ej. "Extensiones válidas", "Sin contenido").
- **A-003**: El navegador del kiosk es moderno (Chrome ≥ 110, Firefox ≥ 110). No se soportan navegadores legacy.
- **A-004**: El control remoto sigue siendo single-tab-multi-user con debounce en backend por comando (patrón actual con `navigationCommandId`).
- **A-005**: El orden `displayOrder` de Ads ya existe y está bien persistido; la presente spec solo garantiza que el kiosk lo respeta (no introduce reordenación).
- **A-006**: El motor de rotación es **único** y vive en el cliente (kiosk). La cadencia de recurrentes y la lógica de "continuar desde el índice previo al entrar en `fixed`" se implementan allí; el backend solo expone los datos.
- **A-007**: Los nuevos campos `recurringEveryXIterations` y `isFixed` se migran con Alembic siguiendo el patrón idempotente de 0011 (`_column_exists`, `_constraint_exists`).
- **A-008**: El cambio de comportamiento del `branding-overlay` en iframe (US2) se aplica también a la feature 017 ya desplegada; por tanto la tarea T031 de 017 se considera obsoleta a partir del merge de 018.

## Out of Scope

- Reproducción sincronizada multi-kiosk.
- Editor visual del orden de los recurrentes en la cola (la cola es round-robin entre recurrentes, sin orden configurable entre ellos).
- Modo "Fixed" para Ads (los Ads no tienen marca `isFixed`).
- Notificaciones en tiempo real (websocket/SSE) al control remoto; sigue siendo polling.
- Subida de Contents con marca `isFixed` y `recurring` simultáneamente (mutuamente excluyentes, ver FR-016).
- Limpieza automática de Contents que lleven mucho tiempo en cola.