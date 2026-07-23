import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { EventConfiguration } from '../../core/api/event-config.api';
import { BrandingLayout } from '../../core/api/event-branding.api';
import { DirtyFormAware } from '../../shared/dirty-form.models';
import { positiveInteger } from '../../shared/forms/admin-validators';
import { AdminStateComponent } from '../../shared/admin-state.component';
import { AdminFormShellComponent } from '../../shared/ui/admin/admin-form-shell.component';
import { FileInputComponent } from '../../shared/ui/file-input.component';
import { AdminPageComponent } from '../../shared/ui/admin/admin-page.component';
import {
  EventConfigFacade,
  EventConfigFormValue,
  VISUAL_DEFAULTS
} from './event-config.facade';
import {
  BrandingLayoutSectionComponent,
  EventConfigLayoutField
} from './sections/branding-layout-section.component';

const LOGO_LAYOUT_FIELDS: readonly EventConfigLayoutField[] = [
  { controlName: 'logoSize', label: 'Tama\u00f1o del logo', hint: 'Altura del logo del organizador', min: 1, max: 50, step: 1, unit: 'vh' },
  { controlName: 'logoX', label: 'Posici\u00f3n X del logo', hint: 'Desplazamiento horizontal desde el borde izquierdo de la superposici\u00f3n', min: 0, max: 100, step: 1, unit: 'vw' },
  { controlName: 'logoY', label: 'Posici\u00f3n Y del logo', hint: 'Desplazamiento vertical desde el borde superior de la superposici\u00f3n', min: 0, max: 100, step: 1, unit: 'vh' },
  { controlName: 'logoTransparency', label: 'Transparencia del logo', hint: '100 = totalmente transparente (invisible), 0 = totalmente opaco', min: 0, max: 100, step: 1, unit: '%' },
  { controlName: 'logoBorderRadius', label: 'Radio de borde del logo', hint: 'Esquinas redondeadas del logo', min: 0, max: 50, step: 1, unit: 'vh' }
];

const EVENT_NAME_LAYOUT_FIELDS: readonly EventConfigLayoutField[] = [
  { controlName: 'eventNameSize', label: 'Tama\u00f1o del nombre del evento', hint: 'Tama\u00f1o de fuente de la etiqueta del nombre del evento', min: 1, max: 50, step: 1, unit: 'vw' },
  { controlName: 'eventNameX', label: 'Posici\u00f3n X del nombre del evento', hint: 'Desplazamiento horizontal desde el borde derecho de la superposici\u00f3n', min: 0, max: 100, step: 1, unit: 'vw' },
  { controlName: 'eventNameY', label: 'Posici\u00f3n Y del nombre del evento', hint: 'Desplazamiento vertical desde el borde superior de la superposici\u00f3n', min: 0, max: 100, step: 1, unit: 'vh' },
  { controlName: 'eventNameTransparency', label: 'Transparencia del nombre del evento', hint: '100 = totalmente transparente (invisible), 0 = totalmente opaco', min: 0, max: 100, step: 1, unit: '%' },
  { controlName: 'eventNameBorderRadius', label: 'Radio de borde del nombre del evento', hint: 'Esquinas redondeadas de la etiqueta del nombre del evento', min: 0, max: 50, step: 1, unit: 'vh' }
];

const ALLOWED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const MAX_LOGO_BYTES = 1024 * 1024;
const LAYOUT_AUTOSAVE_DEBOUNCE_MS = 400;

function rangeValidator(field: EventConfigLayoutField): ReturnType<typeof Validators.compose> {
  return Validators.compose([
    Validators.min(field.min),
    Validators.max(field.max)
  ]);
}

@Component({
  selector: 'app-event-config',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    AdminStateComponent,
    FileInputComponent,
    AdminFormShellComponent,
    AdminPageComponent,
    BrandingLayoutSectionComponent,
  ],
  template: `
    <app-admin-page
      title="Configuración del evento"
      description="Organizador, nombre del evento, logo, duración de la sesión del operador y disposición de marca del quiosco."
    />

    @if (form) {
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="event-config"
        novalidate
        aria-label="Formulario de configuración del evento"
      >
        <app-admin-form-shell [loading]="facade.loading()">
          @if (facade.error(); as error) {
            <app-admin-state
              kind="error"
              title="Problema con la configuración del evento"
              [message]="error.message"
            />
          }

          <div class="event-config__row">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Nombre del organizador</mat-label>
              <input matInput formControlName="organizerName" maxlength="255" autocomplete="off" />
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Nombre del evento</mat-label>
              <input matInput formControlName="eventName" maxlength="255" autocomplete="off" />
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Duración del evento (minutos)</mat-label>
              <input matInput type="number" formControlName="eventDurationMinutes" min="1" max="1440" required />
              @if (form.controls.eventDurationMinutes.hasError('positiveInteger')) {
                <mat-error>
                  Debe ser un número entero positivo.
                </mat-error>
              }
              @if (form.controls.eventDurationMinutes.hasError('max')) {
                <mat-error>
                  Debe ser 1440 minutos o menos.
                </mat-error>
              }
            </mat-form-field>
          </div>

          <div class="event-config__logo">
            <app-file-input
              buttonLabel="Elegir logo"
              ariaLabel="Elige el logo del organizador"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              [existingFileName]="configuration()?.organizerLogoMediaFile?.originalFilename ?? null"
              [showPreview]="true"
              (fileSelected)="onFileSelected($event)"
            />

            @if (configuration()?.organizerLogoMediaFile) {
              <mat-checkbox
                formControlName="removeLogo"
                [disabled]="selectedFile() !== null"
              >
                Quitar logo
              </mat-checkbox>
            }
          </div>

          @if (fileError(); as error) {
            <app-admin-state
              kind="error"
              title="Logo rechazado"
              [message]="error"
            />
          }

          <app-branding-layout-section
            [layout]="form.controls.layout"
            [logoFields]="logoFields"
            [eventNameFields]="eventNameFields"
            [autoSaveStatus]="facade.layoutAutoSave()"
            [autoSaveLabel]="autoSaveLabel()"
          />

          <div formShellActions>
            <button
              mat-flat-button
              color="primary"
              type="submit"
              [disabled]="form.invalid || facade.saving() || fileError() !== null"
            >
              <mat-icon aria-hidden="true">save</mat-icon>
              {{ facade.saving() ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </app-admin-form-shell>
      </form>
    }
  `,
  styles: [
    `
      .event-config {
        display: block;
      }
      mat-form-field {
        width: 100%;
      }
      .event-config__row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
      }
      .event-config__logo {
        display: grid;
        gap: 12px;
        margin-top: 8px;
      }
    `
  ],
})
export class EventConfigComponent implements OnInit, DirtyFormAware {
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly facade = inject(EventConfigFacade);

  protected readonly logoFields = LOGO_LAYOUT_FIELDS;
  protected readonly eventNameFields = EVENT_NAME_LAYOUT_FIELDS;

  protected readonly configuration = this.facade.configuration;
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly fileError = signal<string | null>(null);

  protected form: FormGroup<{
    eventName: FormControl<string>;
    organizerName: FormControl<string>;
    eventDurationMinutes: FormControl<number>;
    removeLogo: FormControl<boolean>;
    layout: FormGroup<{
      logoSize: FormControl<number | null>;
      logoX: FormControl<number | null>;
      logoY: FormControl<number | null>;
      logoTransparency: FormControl<number | null>;
      logoBorderRadius: FormControl<number | null>;
      eventNameSize: FormControl<number | null>;
      eventNameX: FormControl<number | null>;
      eventNameY: FormControl<number | null>;
      eventNameTransparency: FormControl<number | null>;
      eventNameBorderRadius: FormControl<number | null>;
    }>;
  }> | null = null;

  private initialSnapshot = '';
  private lastSavedLayoutJson = '';
  private resetStatusTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.buildForm();
    this.facade.refresh().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((configuration) => this.populate(configuration));
  }

  hasUnsavedChanges(): boolean {
    return !!this.form && !this.facade.saving() && this.snapshot() !== this.initialSnapshot;
  }

  onFileSelected(file: File): void {
    this.fileError.set(null);
    this.selectedFile.set(null);
    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      this.fileError.set('Tipo de archivo no admitido. Permitidos: PNG, JPG, WebP, SVG.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      this.fileError.set('El archivo del logo es demasiado grande (máx. 1 MB).');
      return;
    }
    this.selectedFile.set(file);
    this.form?.controls.removeLogo.setValue(false);
  }

  protected autoSaveLabel(): string {
    switch (this.facade.layoutAutoSave()) {
      case 'saving':
        return 'Guardando...';
      case 'saved':
        return 'Guardado';
      case 'error':
        return 'Error — se reintentará al próximo cambio';
      default:
        return '';
    }
  }

  submit(): void {
    if (!this.form || this.form.invalid || this.fileError()) {
      this.form?.markAllAsTouched();
      return;
    }
    const root = this.form.value;
    const removeLogo = root.removeLogo ?? false;
    const formValue = this.composeFormValue();
    this.facade.save(formValue, this.selectedFile(), removeLogo).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (configuration) => {
        this.selectedFile.set(null);
        this.populate(configuration);
        this.lastSavedLayoutJson = JSON.stringify(this.form?.controls.layout.value ?? {});
        this.snackBar.open('Configuración del evento guardada.', 'Cerrar', { duration: 3000 });
      }
    });
  }

  private composeFormValue(): EventConfigFormValue {
    const root = this.form!.value;
    const layout = root.layout ?? {};
    return {
      eventName: root.eventName ?? '',
      organizerName: root.organizerName ?? '',
      eventDurationMinutes: root.eventDurationMinutes ?? 240,
      logoSize: layout.logoSize ?? null,
      logoX: layout.logoX ?? null,
      logoY: layout.logoY ?? null,
      logoTransparency: layout.logoTransparency ?? null,
      logoBorderRadius: layout.logoBorderRadius ?? null,
      eventNameSize: layout.eventNameSize ?? null,
      eventNameX: layout.eventNameX ?? null,
      eventNameY: layout.eventNameY ?? null,
      eventNameTransparency: layout.eventNameTransparency ?? null,
      eventNameBorderRadius: layout.eventNameBorderRadius ?? null
    };
  }

  private buildForm(): void {
    const layoutGroup = this.fb.group({
      logoSize: this.fb.control<number | null>(null, { validators: rangeValidator(LOGO_LAYOUT_FIELDS[0]) }),
      logoX: this.fb.control<number | null>(null, { validators: rangeValidator(LOGO_LAYOUT_FIELDS[1]) }),
      logoY: this.fb.control<number | null>(null, { validators: rangeValidator(LOGO_LAYOUT_FIELDS[2]) }),
      logoTransparency: this.fb.control<number | null>(null, { validators: rangeValidator(LOGO_LAYOUT_FIELDS[3]) }),
      logoBorderRadius: this.fb.control<number | null>(null, { validators: rangeValidator(LOGO_LAYOUT_FIELDS[4]) }),
      eventNameSize: this.fb.control<number | null>(null, { validators: rangeValidator(EVENT_NAME_LAYOUT_FIELDS[0]) }),
      eventNameX: this.fb.control<number | null>(null, { validators: rangeValidator(EVENT_NAME_LAYOUT_FIELDS[1]) }),
      eventNameY: this.fb.control<number | null>(null, { validators: rangeValidator(EVENT_NAME_LAYOUT_FIELDS[2]) }),
      eventNameTransparency: this.fb.control<number | null>(null, { validators: rangeValidator(EVENT_NAME_LAYOUT_FIELDS[3]) }),
      eventNameBorderRadius: this.fb.control<number | null>(null, { validators: rangeValidator(EVENT_NAME_LAYOUT_FIELDS[4]) })
    });
    this.form = this.fb.nonNullable.group({
      eventName: this.fb.nonNullable.control('', { validators: [Validators.maxLength(255)] }),
      organizerName: this.fb.nonNullable.control('', { validators: [Validators.maxLength(255)] }),
      eventDurationMinutes: this.fb.nonNullable.control(240, {
        validators: [Validators.required, positiveInteger('positiveInteger'), Validators.max(1440)]
      }),
      removeLogo: this.fb.nonNullable.control(false),
      layout: layoutGroup
    });
    this.lastSavedLayoutJson = JSON.stringify(layoutGroup.value);
    this.destroyRef.onDestroy(() => {
      if (this.resetStatusTimer !== null) {
        clearTimeout(this.resetStatusTimer);
        this.resetStatusTimer = null;
      }
    });
    this.wireLayoutAutoSave(layoutGroup);
  }

  /**
   * Subscribes to the layout form group's `valueChanges` and auto-saves
   * the new values with a 400 ms debounce. Skips emissions while the form
   * is pristine (initial population from the API) and skips identical
   * serialisations via `distinctUntilChanged`. Errors surface via the
   * facade's `layoutAutoSave` signal without throwing a toast.
   */
  private wireLayoutAutoSave(layoutGroup: FormGroup): void {
    layoutGroup.valueChanges
      .pipe(
        debounceTime(LAYOUT_AUTOSAVE_DEBOUNCE_MS),
        distinctUntilChanged((previous, current) => JSON.stringify(previous) === JSON.stringify(current)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((layout) => {
        const serialized = JSON.stringify(layout);
        if (serialized === this.lastSavedLayoutJson) {
          return;
        }
        if (!this.form) {
          return;
        }
        this.facade.layoutAutoSave.set('saving');
        this.facade.saveLayout(this.composeFormValue())
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.lastSavedLayoutJson = serialized;
              this.initialSnapshot = this.snapshot();
              this.form?.markAsPristine();
              this.scheduleStatusReset();
            },
            error: () => undefined,
          });
      });
  }

  private scheduleStatusReset(): void {
    if (this.resetStatusTimer !== null) {
      clearTimeout(this.resetStatusTimer);
    }
    this.resetStatusTimer = setTimeout(() => {
      if (this.facade.layoutAutoSave() === 'saved') {
        this.facade.layoutAutoSave.set('idle');
      }
      this.resetStatusTimer = null;
    }, 2000);
  }

  private populate(configuration: EventConfiguration): void {
    this.form?.patchValue({
      eventName: configuration.eventName,
      organizerName: configuration.organizerName,
      eventDurationMinutes: configuration.eventDurationMinutes,
      removeLogo: false,
      layout: {
        logoSize: this.coerceField(configuration.logoLayout?.size, VISUAL_DEFAULTS.logoSize),
        logoX: this.coerceField(configuration.logoLayout?.x, VISUAL_DEFAULTS.logoX),
        logoY: this.coerceField(configuration.logoLayout?.y, VISUAL_DEFAULTS.logoY),
        logoTransparency: this.coerceField(configuration.logoLayout?.transparency, VISUAL_DEFAULTS.logoTransparency),
        logoBorderRadius: this.coerceField(configuration.logoLayout?.borderRadius, VISUAL_DEFAULTS.logoBorderRadius),
        eventNameSize: this.coerceField(configuration.eventNameLayout?.size, VISUAL_DEFAULTS.eventNameSize),
        eventNameX: this.coerceField(configuration.eventNameLayout?.x, VISUAL_DEFAULTS.eventNameX),
        eventNameY: this.coerceField(configuration.eventNameLayout?.y, VISUAL_DEFAULTS.eventNameY),
        eventNameTransparency: this.coerceField(configuration.eventNameLayout?.transparency, VISUAL_DEFAULTS.eventNameTransparency),
        eventNameBorderRadius: this.coerceField(configuration.eventNameLayout?.borderRadius, VISUAL_DEFAULTS.eventNameBorderRadius)
      }
    }, { emitEvent: false });
    this.markPristine();
    this.lastSavedLayoutJson = JSON.stringify(this.form?.controls.layout.value ?? {});
  }

  private coerceField(value: number | undefined, fallback: number): number {
    return typeof value === 'number' ? value : fallback;
  }

  private markPristine(): void {
    this.initialSnapshot = this.snapshot();
    this.form?.markAsPristine();
  }

  private snapshot(): string {
    return JSON.stringify({
      form: this.form?.value ?? null,
      selectedFile: this.selectedFile()?.name ?? null,
    });
  }

  /**
   * Re-exported for spec convenience: defaults used when the API
   * returns NULL layout columns (preserves the pre-CHG-023 visual).
   */
  protected readonly visualDefaults: Readonly<typeof VISUAL_DEFAULTS> = VISUAL_DEFAULTS;
}

export type { BrandingLayout };