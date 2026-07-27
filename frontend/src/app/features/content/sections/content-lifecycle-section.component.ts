import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/**
 * Presentational section for the display-mode (fixed / recurring) settings.
 * All form controls remain owned by the parent ContentFormComponent; the
 * isFixed change is forwarded to the parent, which owns the exclusivity logic.
 */
@Component({
  selector: 'app-content-lifecycle-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatCheckboxModule, MatFormFieldModule, MatInputModule],
  template: `
    <div
      class="content-form__lifecycle"
      aria-label="Modos de visualización"
      [formGroup]="form()"
    >
      <h3
        class="content-form__section-title"
      >Modo de visualización</h3>
      <p class="content-form__hint">
        Recurrente y Fijo son mutuamente excluyentes.
      </p>

      <mat-checkbox
        formControlName="isFixed"
        (change)="isFixedChange.emit()"
        class="content-form__checkbox"
      >
        Marcar como contenido fijo
      </mat-checkbox>
      @if (form().controls['isFixed'].value) {
        <p
          class="content-form__hint content-form__hint--detail"
        >
          Sólo se mostrará en modo "Fijo" del control remoto. No aparece en la rotación normal.
        </p>
      }

      @if (!form().controls['isFixed'].value) {
        <mat-form-field
          appearance="outline"
          subscriptSizing="dynamic"
          class="content-form__cadence"
        >
          <mat-label>Recurrente cada (iteraciones)</mat-label>
          <input
            matInput
            type="number"
            formControlName="recurringEveryXIterations"
            min="1"
          />
          <mat-hint>
            Transiciones de pantalla entre apariciones de este contenido (contador
            independiente por ítem). Tiempo aproximado ≈ N × duración media del slide.
          </mat-hint>
        </mat-form-field>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      mat-form-field {
        width: 100%;
      }
      .content-form__lifecycle {
        display: grid;
        gap: 8px;
        padding: 12px 0;
      }
      .content-form__section-title {
        margin: 0;
        font: var(--mat-sys-title-medium);
        letter-spacing: var(--mat-sys-title-medium-tracking);
      }
      .content-form__checkbox {
        padding: 4px 0;
      }
      .content-form__cadence {
        width: 100%;
      }
      .content-form__hint {
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
        margin: 0;
      }
      .content-form__hint--detail {
        padding-left: 32px;
        font-style: italic;
      }
    `
  ]
})
export class ContentLifecycleSectionComponent {
  readonly form = input.required<FormGroup>();
  readonly isFixedChange = output<void>();
}
