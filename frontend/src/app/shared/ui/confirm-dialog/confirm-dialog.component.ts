import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly destructive?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="confirm-dialog" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId">
      <h2 [id]="titleId">{{ data.title }}</h2>
      <p>{{ data.message }}</p>
      <div class="confirm-dialog__actions">
        <button type="button" class="secondary-action" (click)="close(false)">{{ data.cancelLabel }}</button>
        <button type="button" class="primary-action" (click)="close(true)">{{ data.confirmLabel }}</button>
      </div>
    </section>
  `
})
export class ConfirmDialogComponent {
  readonly titleId = 'confirm-dialog-title';
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {
    title: 'Confirm action',
    message: 'Do you want to continue?',
    confirmLabel: 'Continue',
    cancelLabel: 'Cancel',
    destructive: false
  };
  private readonly dialogRef = inject<MatDialogRef<ConfirmDialogComponent, boolean>>(MatDialogRef, { optional: true });

  close = (confirmed: boolean): void => {
    this.dialogRef?.close(confirmed);
  };
}
