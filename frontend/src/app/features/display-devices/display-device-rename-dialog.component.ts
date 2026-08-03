import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { DisplayDevicesFacade } from './display-devices.facade';

export interface DisplayDeviceRenameDialogData {
  deviceId: string;
  label: string;
}

@Component({
  selector: 'app-display-device-rename-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Renombrar pantalla</h2>
    <form [formGroup]="form" (ngSubmit)="onSave()">
      <mat-dialog-content>
        <mat-form-field appearance="outline" class="display-device-rename-dialog__field">
          <mat-label>Etiqueta</mat-label>
          <input matInput formControlName="label" maxlength="80" autocomplete="off" />
          @if (form.controls.label.hasError('required')) {
            <mat-error>La etiqueta es obligatoria.</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || facade.mutating()">
          Guardar
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .display-device-rename-dialog__field {
        width: 100%;
      }
    `,
  ],
})
export class DisplayDeviceRenameDialogComponent {
  readonly facade = inject(DisplayDevicesFacade);
  private readonly dialogRef = inject(MatDialogRef<DisplayDeviceRenameDialogComponent, boolean>);
  private readonly fb = inject(FormBuilder);
  readonly data = inject<DisplayDeviceRenameDialogData>(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group({
    label: [this.data.label, [Validators.required, Validators.maxLength(80)]],
  });

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const label = this.form.controls.label.value.trim();
    if (!label) {
      return;
    }
    this.facade.rename(this.data.deviceId, label).subscribe({
      next: () => this.dialogRef.close(true),
    });
  }
}
