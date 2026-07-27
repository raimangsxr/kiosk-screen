import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSliderModule } from '@angular/material/slider';

import { EventConfigLayoutValue } from '../event-config.facade';

export interface EventConfigLayoutField {
  controlName: keyof EventConfigLayoutValue;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

function rangeError(field: EventConfigLayoutField, errorKey: 'min' | 'max'): string {
  return errorKey === 'min'
    ? `Debe ser ${field.min} ${field.unit} o más.`
    : `Debe ser ${field.max} ${field.unit} o menos.`;
}

/**
 * Presentational branding-layout section (CHG-024). Renders the logo and
 * event-name slider fieldsets bound to the layout FormGroup passed in by
 * the parent. Owns NO business logic: form construction, validators and
 * auto-save all live in {@link EventConfigComponent}. The layout group is
 * bound here via `[formGroup]` so every `formControlName` keeps working,
 * mirroring the original `formGroupName="layout"` container verbatim.
 */
@Component({
  selector: 'app-branding-layout-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatSliderModule],
  template: `
    <section class="event-config__layout" [formGroup]="layout()">
      <h3 class="event-config__layout-title">Disposición de marca del quiosco</h3>
      <p class="event-config__layout-help">
        Controla el tratamiento visual del logo del organizador y de la etiqueta del nombre del evento en la pantalla del quiosco.
        Arrastra los controles deslizantes para iterar en tiempo real; cada cambio se guarda automáticamente y se envía a la pantalla.
        Los valores se interpretan como unidades relativas al viewport; deja un campo en blanco para usar el valor visual por defecto.
      </p>

      <fieldset class="event-config__layout-group" data-testid="layout-logo">
        <legend>
          <span>Logo del organizador</span>
          <span class="event-config__layout-status" [attr.data-status]="autoSaveStatus()" aria-live="polite">
            {{ autoSaveLabel() }}
          </span>
        </legend>
        <div class="event-config__layout-grid">
          @for (field of logoFields(); track field.controlName) {
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
          <span>Etiqueta del nombre del evento</span>
          <span class="event-config__layout-status" [attr.data-status]="autoSaveStatus()" aria-live="polite">
            {{ autoSaveLabel() }}
          </span>
        </legend>
        <div class="event-config__layout-grid">
          @for (field of eventNameFields(); track field.controlName) {
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
  `,
  styles: [
    `
      .event-config__layout {
        display: grid;
        gap: 16px;
        margin-top: 24px;
        padding: 16px;
        border: 1px solid var(--app-border);
        border-radius: var(--r-md);
        background: var(--app-surface);
      }
      .event-config__layout-title {
        margin: 0;
        font-size: 1.1rem;
        color: var(--app-text);
      }
      .event-config__layout-help {
        margin: 0;
        color: var(--app-text-dim);
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
        color: var(--app-text);
      }
      .event-config__layout-status {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--app-text-dim);
      }
      .event-config__layout-status[data-status='saving'] {
        color: var(--app-info);
      }
      .event-config__layout-status[data-status='saved'] {
        color: var(--app-success);
      }
      .event-config__layout-status[data-status='error'] {
        color: var(--app-danger);
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
        color: var(--app-text-2);
      }
      .event-config__slider-value {
        font-size: 0.85rem;
        font-variant-numeric: tabular-nums;
        color: var(--app-text-dim);
      }
      .event-config__slider-input {
        width: 100%;
      }
      .event-config__slider-hint {
        font-size: 0.75rem;
        color: var(--app-text-dim);
      }
      .event-config__slider-error {
        font-size: 0.75rem;
        color: var(--app-danger);
      }
    `
  ],
})
export class BrandingLayoutSectionComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Layout sub-group owned by the parent form; bound via `[formGroup]`. */
  readonly layout = input.required<FormGroup>();
  readonly logoFields = input.required<readonly EventConfigLayoutField[]>();
  readonly eventNameFields = input.required<readonly EventConfigLayoutField[]>();
  readonly autoSaveStatus = input<string>('');
  readonly autoSaveLabel = input<string>('');

  ngOnInit(): void {
    // OnPush + template read-outs bound to raw control values (not signals):
    // reflect slider/control updates by marking this view for check. Purely
    // change-detection plumbing — no business logic lives here.
    this.layout().valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cdr.markForCheck());
  }

  protected layoutControl(field: EventConfigLayoutField): AbstractControl {
    return this.layout().controls[field.controlName as string] as FormControl<number | null>;
  }

  protected formatSliderValue(field: EventConfigLayoutField, value: number | null): string {
    if (value === null || value === undefined) {
      return '—';
    }
    return String(Math.round(value));
  }

  protected rangeErrorMessage(field: EventConfigLayoutField, errorKey: 'min' | 'max'): string {
    return rangeError(field, errorKey);
  }
}
