import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

const DEFAULT_DATA: ConfirmDialogData = {
  title: 'Confirm action',
  message: 'Do you want to continue?',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  destructive: false
};

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly dialog = inject(MatDialog);

  open(data: Partial<ConfirmDialogData> = {}): MatDialogRef<ConfirmDialogComponent, boolean> {
    return this.dialog.open(ConfirmDialogComponent, {
      data: { ...DEFAULT_DATA, ...data },
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      disableClose: false
    });
  }

  confirm(data: Partial<ConfirmDialogData> = {}): MatDialogRef<ConfirmDialogComponent, boolean> {
    return this.open(data);
  }
}
