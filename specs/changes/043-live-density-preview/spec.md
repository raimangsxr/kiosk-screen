---
id: CHG-043
type: change
status: implemented
modifies:
  - DISPLAY.CONFIG_SESSION
  - DISPLAY.RUNTIME
depends_on:
  - CHG-042
extends:
  - CHG-042
supersedes: []
superseded_by: []
consolidated_into: []
source_of_truth: false
read_by_default: false
requires_contract_update: true
oversize: false
---

# Feature Specification: Live Density Profile Calibration

**Feature Branch**: `043-live-density-preview`

**Spec Directory**: `specs/changes/043-live-density-preview/`

**Created**: 2026-07-21

**Status**: Draft

**Input**: Al calibrar perfiles de densidad de pantalla desde administración, el operador debe ver en tiempo real cómo se redimensiona el contenido del iframe en un quiosco conectado. Sliders en lugar de campos numéricos y guardar manual por cada cambio. Autoguardado con debounce (~500 ms). Selector de iframe preconfigurado. La vista en el quiosco debe reflejar la región superior real (proporción de contenido vs franja de patrocinadores). Quiosco de prueba obligatorio al crear un perfil. Aplica al crear, editar y asignar perfiles.

## Clarifications

### Session 2026-07-21

- Q: ¿Dónde debe verse el preview en tiempo real? → A: En un quiosco conectado elegido; los cambios debounced se aplican en la pantalla física (no preview embebido solo en admin).
- Q: ¿Cómo debe funcionar el guardado respecto a los sliders? → A: Autoguardado con debounce; el perfil se persiste automáticamente sin pulsar guardar por cada píxel.
- Q: ¿Qué URL debe cargar el preview? → A: El operador elige un iframe preconfigurado de la organización.
- Q: ¿Simular región superior del quiosco? → A: Sí; el quiosco debe mostrar el ajuste en la misma zona de contenido que en operación normal.
- Q: ¿En qué flujos aplica? → A: Crear perfil, editar perfil existente y asignar perfil a pantalla registrada.
- Q: ¿Cómo encaja el preview al crear sin pantalla asignada? → A: Es obligatorio elegir un quiosco conectado como pantalla de prueba antes de calibrar.
- Q: ¿Debounce preferido? → A: ~500 ms (equilibrado).
- Q: Al editar un perfil ya asignado, ¿qué quioscos reciben la densidad en cada autosave? → A: Solo el quiosco de prueba durante la calibración; las demás pantallas asignadas al confirmar explícitamente.
- Q: ¿Cómo confirma el operador aplicar los valores a pantallas asignadas? → A: Botón dedicado «Aplicar a pantallas asignadas», visible solo si el perfil tiene pantallas asignadas.
- Q: Con iframe de preview seleccionado, ¿qué sliders están activos? → A: Solo el slider de la familia del iframe seleccionado; los demás deshabilitados.
- Q: En asignar perfil (US3), ¿cómo aplica la densidad al quiosco destino? → A: Confirmar asignación aplica densidad al destino al instante; el botón «Aplicar» queda para editar perfiles ya asignados a varias pantallas.
- Q: Si el quiosco de prueba no está en modo iframe, ¿qué hace el sistema? → A: Diálogo de confirmación; si acepta, cambio automático a iframe con la URL elegida vía control remoto.

## SDD Context

- Manifest entry required: yes
- Affected active contracts: `DISPLAY.CONFIG_SESSION`, `DISPLAY.RUNTIME`
- Context pack: `context-pack.md`
- Contract update required before implementation: yes

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Calibrate a new profile on a live display (Priority: P1)

A content manager prepares a new density profile before an event. They open the density profiles screen, select a connected kiosk as the test display, choose which preconfigured iframe to show, and name the profile. They move sliders for each supported embedded app family (bull-style and dual-ladder-style) while watching the physical screen. Each adjustment updates the embedded content on that kiosk within about half a second, and the profile values are saved automatically without pressing save after every pixel change.

**Why this priority**: This is the core workflow — calibration without walking to each screen to type numbers and refresh.

**Independent Test**: With one connected kiosk in iframe mode, create a profile using only sliders; verify the kiosk content resizes live and the saved profile retains the final values after reload.

**Acceptance Scenarios**:

1. **Given** at least one kiosk connected to the display stream, **When** the manager starts creating a profile, **Then** they must select a test kiosk before sliders become active.
2. **Given** a test kiosk and iframe selected, **When** the manager moves a density slider, **Then** the kiosk's top content region reflects the new density within 2 seconds and the profile stores the new value without a separate save action per adjustment.
3. **Given** a profile being calibrated, **When** the manager stops moving sliders for ~500 ms, **Then** exactly one persistence action occurs for the pending values (no duplicate saves for the same resting position).

---

### User Story 2 — Refine an existing profile on a live display (Priority: P1)

A manager edits an existing profile because hall lighting or mount positions changed. They pick a connected kiosk, select the iframe to preview, and adjust sliders. The test kiosk updates in real time via preview; other kiosks assigned to this profile remain on the previous density until the manager explicitly confirms applying the calibrated values to assigned displays.

**Why this priority**: Profiles are living configuration; editing must be as fast as initial setup.

**Independent Test**: Edit profile density via sliders on one kiosk; confirm another kiosk with a different profile is unaffected.

**Acceptance Scenarios**:

1. **Given** an existing profile assigned to multiple kiosks and a connected test kiosk, **When** the manager changes slider values and autosave completes, **Then** only the test kiosk shows the preview density; other assigned kiosks keep their previous density.
2. **Given** calibrated slider values persisted via autosave, **When** the manager clicks **Aplicar a pantallas asignadas**, **Then** all kiosks assigned to that profile receive the updated density.
3. **Given** debounced autosave completes, **When** the manager reloads the admin profile list, **Then** the profile shows the last slider positions.

---

### User Story 3 — Assign and fine-tune before deployment (Priority: P2)

When assigning a profile to a registered display, the manager can open the live calibration flow for that target screen, pick the iframe, and fine-tune density with sliders before confirming assignment. Confirming assignment applies the profile density to the target display immediately; the separate **Aplicar a pantallas asignadas** action is not required in this flow.

**Why this priority**: On-site assignment often needs a last-mile tweak on the actual monitor.

**Independent Test**: Assign profile to a registered display label with live fine-tuning; open iframe on that display and verify density matches without using the hidden on-display panel.

**Acceptance Scenarios**:

1. **Given** a registered display and connected kiosk matching that label, **When** the manager fine-tunes with sliders and confirms assignment, **Then** the target kiosk receives production profile density immediately without a separate apply action.
2. **Given** assignment without a connected kiosk for that label, **When** the manager attempts live fine-tune, **Then** the system explains that the display must be online and does not silently discard slider values.

---

### Edge Cases

- No kiosks connected → create/edit calibration blocked with clear message; list and delete profiles still allowed.
- Selected iframe host does not match a supported embedded app family → all density sliders disabled; message explains unsupported preview.
- Test kiosk not in iframe mode → show confirmation dialog; if the operator accepts, switch the test kiosk to iframe mode with the selected URL via remote control; otherwise block calibration until iframe is active.
- Rapid slider movement → intermediate values coalesced; only the resting value after debounce is persisted.
- Autosave fails (network/server) → non-blocking error with retry; slider positions retained in UI; kiosk keeps last successfully applied density.
- Manager switches test kiosk mid-calibration → preview follows the newly selected kiosk; unsaved debounced changes apply to the profile globally, not as a local override on the old kiosk.
- Manager exits calibration without clicking **Aplicar a pantallas asignadas** → profile retains autosaved values; assigned kiosks other than the test kiosk keep their previous density.
- Concurrent editors change the same profile → last successful autosave wins; second editor sees a refresh notice if their view is stale.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST require selection of a connected kiosk as the test display before enabling live density calibration when creating or editing a profile.
- **FR-002**: The system MUST let the operator choose a preconfigured iframe from the organization's iframe list as the preview source.
- **FR-003**: The system MUST provide sliders (not only numeric inputs) for vertical density per supported embedded app family when calibrating a profile; only the slider matching the selected preview iframe's embedded app family MUST be enabled at a time.
- **FR-004**: The system MUST apply slider changes to the selected test kiosk's top content region in near real time, matching normal display layout (content area vs sponsor strip).
- **FR-005**: The system MUST autosave profile density values after the operator pauses adjustment for approximately 500 milliseconds, without requiring a save action per change.
- **FR-006**: The system MUST coalesce rapid slider movements so that persistence occurs once per resting value, not once per intermediate tick.
- **FR-007**: The system MUST support live calibration when creating a profile, editing an existing profile, and fine-tuning during assignment to a registered display.
- **FR-008**: Live preview on a test kiosk MUST NOT permanently change that kiosk's local on-display override; preview reflects the profile being edited until assignment or explicit override elsewhere.
- **FR-009**: The system MUST show clear status during autosave (idle, saving, saved, error) so operators know whether changes are persisted.
- **FR-010**: If autosave fails, the system MUST keep the operator's slider positions and allow retry without losing the session.
- **FR-011**: The system MUST disable sliders for embedded app families that do not match the selected preview iframe or do not support density adjustment, with an explanatory message.
- **FR-012**: During live calibration, density preview MUST apply only to the selected test kiosk; autosave MUST persist profile values but MUST NOT push density updates to other kiosks assigned to the same profile.
- **FR-013**: The system MUST provide a dedicated **Aplicar a pantallas asignadas** action to push the persisted profile density to all kiosks currently assigned to that profile; the action MUST be visible only when the profile has at least one assigned display and MUST NOT be required when confirming a new assignment in the assign flow (US3).
- **FR-014**: Confirming profile assignment during live fine-tuning MUST apply the persisted profile density to the target display immediately, equivalent to apply for that single kiosk.
- **FR-015**: When the selected test kiosk is not in iframe mode, the system MUST prompt the operator for confirmation before switching it to iframe mode with the selected preview URL via remote control; calibration MUST remain blocked until iframe mode is active.

### Traceability & Quality Requirements

- **TQ-001**: Affected active contracts MUST be updated before implementation if observable behavior changes.
- **TQ-002**: Automated tests or explicit manual validation MUST cover debounced autosave, test-kiosk requirement, and live preview on at least one supported embedded app family.
- **TQ-003**: The manifest entry MUST be updated before implementation is considered complete.

### Key Entities

- **Live calibration session**: Operator context binding a profile (new or existing), a selected test kiosk, a selected iframe, in-progress slider values pending debounced save, and optional pending apply to assigned displays.
- **Test kiosk**: A currently connected display client used only to preview profile density during admin calibration; distinct from local on-display overrides (CHG-042).
- **Autosave checkpoint**: The last successfully persisted profile density snapshot after debounce.

## Success Criteria *(mandatory)*

- **SC-001**: An operator can create a new profile using only sliders and a connected test kiosk, with visible density changes on the physical screen within 2 seconds of resting the slider, in 95% of attempts during acceptance testing.
- **SC-002**: After autosave completes, reloading the admin profile list shows values matching the final slider positions without manual per-field save.
- **SC-003**: Rapid slider sweeps produce at most one persistence per resting position (verified in acceptance: 10 quick moves → 1 stored value matching the final position).
- **SC-004**: Operators report they no longer need to type pixel values and press save for each trial when calibrating a profile (qualitative UAT sign-off).
- **SC-005**: Confirming profile assignment with live fine-tuning results in the target display matching profile density on first iframe load without using the hidden on-display tuning panel or a separate apply action.

## Assumptions

- CHG-042 (per-display iframe layout profiles, density protocol, connected kiosk registry) is implemented and available.
- At least one kiosk can be placed in iframe mode with a selected preconfigured URL during calibration.
- Supported embedded apps already honor per-display density from the kiosk parent (joint gate from CHG-042).
- Spanish-only operator copy follows existing kiosk-screen conventions.
- Approximately 500 ms debounce is acceptable for both operator perception and load on connected displays.

## Relationships

- Modifies: `DISPLAY.CONFIG_SESSION`, `DISPLAY.RUNTIME`
- Extends: CHG-042 (admin profile management and density delivery)
- Depends on: CHG-042
- Supersedes: —
- Superseded by: —
