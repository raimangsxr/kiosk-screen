import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { MatSlideToggleModule } from '@angular/material/slide-toggle';

/**
 * Presentational section for the "active" toggle.
 * The form control remains owned by the parent ContentFormComponent; this
 * component only renders it by binding the shared FormGroup.
 */
@Component({
  selector: 'app-content-active-toggle-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatSlideToggleModule],
  template: `
    <div class="content-form__toggle" [formGroup]="form()">
      <mat-slide-toggle formControlName="isActive">Activo</mat-slide-toggle>
      @if (!form().controls['isActive'].value) {
        <span class="content-form__hint">
          Los elementos inactivos se omiten durante la rotación.
        </span>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .content-form__toggle {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        padding: 4px 0;
      }
      .content-form__hint {
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
        margin: 0;
      }
    `
  ]
})
export class ContentActiveToggleSectionComponent {
  readonly form = input.required<FormGroup>();
}
