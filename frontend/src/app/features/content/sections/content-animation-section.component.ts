import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { RotationAnimation } from '../../../shared/media-upload.models';

/**
 * Presentational section for the rotation animation settings.
 * All form controls remain owned by the parent ContentFormComponent; this
 * component only renders them by binding the shared FormGroup.
 */
@Component({
  selector: 'app-content-animation-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <div class="content-form__row" [formGroup]="form()">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Animación</mat-label>
        <mat-select formControlName="rotationAnimation">
          <mat-option [value]="null">Predeterminada</mat-option>
          @for (animation of animations(); track animation) {
            <mat-option [value]="animation">
              {{ animation }}
            </mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Duración de la animación (ms)</mat-label>
        <input matInput type="number" formControlName="animationDurationMilliseconds" min="1" />
        <mat-hint>Déjalo vacío para usar el valor por defecto del quiosco.</mat-hint>
      </mat-form-field>
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
      .content-form__row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
      }
    `
  ]
})
export class ContentAnimationSectionComponent {
  readonly form = input.required<FormGroup>();
  readonly animations = input.required<readonly RotationAnimation[]>();
}
