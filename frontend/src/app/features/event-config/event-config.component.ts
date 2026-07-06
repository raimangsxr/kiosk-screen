import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
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
  EventConfigLayoutValue,
  VISUAL_DEFAULTS
} from './event-config.facade';

interface EventConfigLayoutField {
  controlName: keyof EventConfigLayoutValue;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

const LOGO_LAYOUT_FIELDS: readonly EventConfigLayoutField[] = [
  { controlName: 'logoSize', label: 'Logo size', hint: 'Height of the organizer logo', min: 1, max: 50, step: 1, unit: 'vh' },
  { controlName: 'logoX', label: 'Logo X position', hint: 'Horizontal offset from the overlay\u2019s left edge', min: 0, max: 100, step: 1, unit: 'vw' },
  { controlName: 'logoY', label: 'Logo Y position', hint: 'Vertical offset from the overlay\u2019s top edge', min: 0, max: 100, step: 1, unit: 'vh' },
  { controlName: 'logoTransparency', label: 'Logo transparency', hint: '100 = fully transparent (invisible), 0 = fully opaque', min: 0, max: 100, step: 1, unit: '%' },
  { controlName: 'logoBorderRadius', label: 'Logo border radius', hint: 'Rounded corners on the logo', min: 0, max: 50, step: 1, unit: 'vh' }
];

const EVENT_NAME_LAYOUT_FIELDS: readonly EventConfigLayoutField[] = [
  { controlName: 'eventNameSize', label: 'Event name size', hint: 'Font size of the event name pill', min: 1, max: 50, step: 1, unit: 'vw' },
  { controlName: 'eventNameX', label: 'Event name X position', hint: 'Horizontal offset from the overlay\u2019s right edge', min: 0, max: 100, step: 1, unit: 'vw' },
  { controlName: 'eventNameY', label: 'Event name Y position', hint: 'Vertical offset from the overlay\u2019s top edge', min: 0, max: 100, step: 1, unit: 'vh' },
  { controlName: 'eventNameTransparency', label: 'Event name transparency', hint: '100 = fully transparent (invisible), 0 = fully opaque', min: 0, max: 100, step: 1, unit: '%' },
  { controlName: 'eventNameBorderRadius', label: 'Event name border radius', hint: 'Rounded corners on the event name pill', min: 0, max: 50, step: 1, unit: 'vh' }
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

function rangeError(field: EventConfigLayoutField, errorKey: 'min' | 'max'): string {
  return errorKey === 'min'
    ? `Must be ${field.min} ${field.unit} or more.`
    : `Must be ${field.max} ${field.unit} or less.`;
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
    MatSliderModule,
    MatSnackBarModule,
    AdminStateComponent,
    FileInputComponent,
    AdminFormShellComponent,
    AdminPageComponent,
  ],
  template: `
    <app-admin-page
      eyebrow="Administration"
      title="Event configuration"
      description="Organizer, event name, logo, operator session duration, and kiosko branding layout."
    />

    @if (form) {
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="event-config"
        novalidate
        aria-label="Event configuration form"
      >
        <app-admin-form-shell [loading]="facade.loading()">
          @if (facade.error(); as error) {
            <app-admin-state
              kind="error"
              title="Event configuration issue"
              [message]="error.message"
            />
          }

          <div class="event-config__row">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Organizer name</mat-label>
              <input matInput formControlName="organizerName" maxlength="255" autocomplete="off" />
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Event name</mat-label>
              <input matInput formControlName="eventName" maxlength="255" autocomplete="off" />
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Event duration (minutes)</mat-label>
              <input matInput type="number" formControlName="eventDurationMinutes" min="1" max="1440" required />
              @if (form.controls.eventDurationMinutes.hasError('positiveInteger')) {
                <mat-error>
                  Must be a positive integer.
                </mat-error>
              }
              @if (form.controls.eventDurationMinutes.hasError('max')) {
                <mat-error>
                  Must be 1440 minutes or less.
                </mat-error>
              }
            </mat-form-field>
          </div>

          <div class="event-config__logo">
            <app-file-input
              buttonLabel="Choose logo"
              ariaLabel="Choose organizer logo"
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
                Remove logo
              </mat-checkbox>
            }
          </div>

          @if (fileError(); as error) {
            <app-admin-state
              kind="error"
              title="Logo rejected"
              [message]="error"
            />
          }

          <section class="event-config__layout" formGroupName="layout">
            <h3 class="event-config__layout-title">Kiosko branding layout</h3>
            <p class="event-config__layout-help">
              Controls the visual treatment of the organizer logo and event name pill on the kiosko display.
              Drag the sliders to iterate in real time; each change is auto-saved and pushed to the display.
              Values are interpreted as viewport-relative units; leave a field blank to use the visual default.
            </p>

            <fieldset class="event-config__layout-group" data-testid="layout-logo">
              <legend>
                <span>Organizer logo</span>
                <span class="event-config__layout-status" [attr.data-status]="facade.layoutAutoSave()" aria-live="polite">
                  {{ autoSaveLabel() }}
                </span>
              </legend>
              <div class="event-config__layout-grid">
                @for (field of logoFields; track field.controlName) {
                  <div class="event-config__slider" [attr.data-testid]="'layout-slider-' + field.controlName">
                    <div class="event-config__slider-head">
                      <label class="event-config__slider-label" [attr.for]="'layout-slider-' + field.controlName">
                        {{ field.label }}
                      </label>
                      <span class="event-config__slider-value">
                        {{ formatSliderValue(field, layoutControl(field).value) }} {{ field.unit }}
                      </span>
                    </div>
                    <mat-slider
                      [id]="'layout-slider-' + field.controlName"
                      class="event-config__slider-input"
                      [min]="field.min"
                      [max]="field.max"
                      [step]="field.step"
                      [discrete]="true"
                      [showTickMarks]="field.step >= 1"
                      [attr.aria-label]="field.label + ' (' + field.unit + ')'"
                      [attr.aria-describedby]="'layout-slider-' + field.controlName + '-hint'"
                    >
                      <input matSliderThumb [formControlName]="field.controlName" />
                    </mat-slider>
                    <mat-hint
                      class="event-config__slider-hint"
                      [id]="'layout-slider-' + field.controlName + '-hint'"
                    >{{ field.hint }}</mat-hint>
                    @if (layoutControl(field).hasError('min')) {
                      <mat-error class="event-config__slider-error">
                        {{ rangeErrorMessage(field, 'min') }}
                      </mat-error>
                    }
                    @if (layoutControl(field).hasError('max')) {
                      <mat-error class="event-config__slider-error">
                        {{ rangeErrorMessage(field, 'max') }}
                      </mat-error>
                    }
                  </div>
                }
              </div>
            </fieldset>

            <fieldset class="event-config__layout-group" data-testid="layout-event-name">
              <legend>
                <span>Event name pill</span>
                <span class="event-config__layout-status" [attr.data-status]="facade.layoutAutoSave()" aria-live="polite">
                  {{ autoSaveLabel() }}
                </span>
              </legend>
              <div class="event-config__layout-grid">
                @for (field of eventNameFields; track field.controlName) {
                  <div class="event-config__slider" [attr.data-testid]="'layout-slider-' + field.controlName">
                    <div class="event-config__slider-head">
                      <label class="event-config__slider-label" [attr.for]="'layout-slider-' + field.controlName">
                        {{ field.label }}
                      </label>
                      <span class="event-config__slider-value">
                        {{ formatSliderValue(field, layoutControl(field).value) }} {{ field.unit }}
                      </span>
                    </div>
                    <mat-slider
                      [id]="'layout-slider-' + field.controlName"
                      class="event-config__slider-input"
                      [min]="field.min"
                      [max]="field.max"
                      [step]="field.step"
                      [discrete]="true"
                      [showTickMarks]="field.step >= 1"
                      [attr.aria-label]="field.label + ' (' + field.unit + ')'"
                      [attr.aria-describedby]="'layout-slider-' + field.controlName + '-hint'"
                    >
                      <input matSliderThumb [formControlName]="field.controlName" />
                    </mat-slider>
                    <mat-hint
                      class="event-config__slider-hint"
                      [id]="'layout-slider-' + field.controlName + '-hint'"
                    >{{ field.hint }}</mat-hint>
                    @if (layoutControl(field).hasError('min')) {
                      <mat-error class="event-config__slider-error">
                        {{ rangeErrorMessage(field, 'min') }}
                      </mat-error>
                    }
                    @if (layoutControl(field).hasError('max')) {
                      <mat-error class="event-config__slider-error">
                        {{ rangeErrorMessage(field, 'max') }}
                      </mat-error>
                    }
                  </div>
                }
              </div>
            </fieldset>
          </section>

          <div formShellActions>
            <button
              mat-flat-button
              color="primary"
              type="submit"
              [disabled]="form.invalid || facade.saving() || fileError() !== null"
            >
              <mat-icon aria-hidden="true">save</mat-icon>
              {{ facade.saving() ? 'Saving...' : 'Save' }}
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
      .event-config__layout {
        display: grid;
        gap: 16px;
        margin-top: 24px;
        padding: 16px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 8px;
      }
      .event-config__layout-title {
        margin: 0;
        font-size: 1.1rem;
      }
      .event-config__layout-help {
        margin: 0;
        color: rgba(0, 0, 0, 0.6);
        font-size: 0.9rem;
      }
      .event-config__layout-group {
        border: 0;
        padding: 0;
        margin: 0;
      }
      .event-config__layout-group legend {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        width: 100%;
        font-weight: 600;
        padding: 0 0 8px;
      }
      .event-config__layout-status {
        font-size: 0.8rem;
        font-weight: 500;
        color: rgba(0, 0, 0, 0.55);
      }
      .event-config__layout-status[data-status='saving'] {
        color: #1976d2;
      }
      .event-config__layout-status[data-status='saved'] {
        color: #2e7d32;
      }
      .event-config__layout-status[data-status='error'] {
        color: #c62828;
      }
      .event-config__layout-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 14px 18px;
      }
      .event-config__slider {
        display: grid;
        gap: 2px;
        padding: 8px 4px 4px;
      }
      .event-config__slider-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
      }
      .event-config__slider-label {
        font-size: 0.85rem;
        font-weight: 500;
        color: rgba(0, 0, 0, 0.75);
      }
      .event-config__slider-value {
        font-size: 0.85rem;
        font-variant-numeric: tabular-nums;
        color: rgba(0, 0, 0, 0.6);
      }
      .event-config__slider-input {
        width: 100%;
      }
      .event-config__slider-hint {
        font-size: 0.75rem;
        color: rgba(0, 0, 0, 0.55);
      }
      .event-config__slider-error {
        font-size: 0.75rem;
        color: #c62828;
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
      this.fileError.set('Unsupported file type. Allowed: PNG, JPG, WebP, SVG.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      this.fileError.set('Logo file too large (max 1 MB).');
      return;
    }
    this.selectedFile.set(file);
    this.form?.controls.removeLogo.setValue(false);
  }

  protected rangeErrorMessage(field: EventConfigLayoutField, errorKey: 'min' | 'max'): string {
    return rangeError(field, errorKey);
  }

  protected layoutControl(field: EventConfigLayoutField): FormControl<number | null> {
    const layout = this.form?.controls.layout;
    if (!layout) {
      throw new Error('layout form group is not initialized');
    }
    return layout.controls[field.controlName];
  }

  protected formatSliderValue(field: EventConfigLayoutField, value: number | null): string {
    if (value === null || value === undefined) {
      return '—';
    }
    return String(Math.round(value));
  }

  protected autoSaveLabel(): string {
    switch (this.facade.layoutAutoSave()) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Error — will retry on next change';
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
        this.snackBar.open('Event configuration saved.', 'Dismiss', { duration: 3000 });
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