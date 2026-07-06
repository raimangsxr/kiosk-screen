import { inject, Injectable } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { BreakpointService } from '../../../core/layout/breakpoint.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../confirm-dialog/confirm-dialog.component';
import { ConfirmBottomSheetComponent } from '../admin/confirm-bottom-sheet.component';

const DEFAULT_DATA: ConfirmDialogData = {
  title: 'Confirmar acción',
  message: '¿Deseas continuar?',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  destructive: false
};

export interface AdminConfirmRef {
  afterClosed(): { subscribe(handler: (value: boolean | undefined) => void): void };
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly dialog = inject(MatDialog);
  private readonly sheet = inject(MatBottomSheet);
  private readonly breakpoint = inject(BreakpointService);

  open(data: Partial<ConfirmDialogData> = {}): MatDialogRef<ConfirmDialogComponent, boolean> {
    return this.dialog.open(ConfirmDialogComponent, {
      data: { ...DEFAULT_DATA, ...data },
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      disableClose: false
    });
  }

  confirm(data: Partial<ConfirmDialogData> = {}): AdminConfirmRef {
    const payload = { ...DEFAULT_DATA, ...data };
    if (this.breakpoint.isCompact()) {
      const ref = this.sheet.open(ConfirmBottomSheetComponent, {
        data: payload,
        autoFocus: 'first-tabbable',
        restoreFocus: true
      });
      return {
        afterClosed: () => ({
          subscribe: (handler) => {
            ref.afterDismissed().subscribe(handler);
          }
        })
      };
    }
    return this.open(payload);
  }

  async confirmAsync(data: Partial<ConfirmDialogData> = {}): Promise<boolean> {
    const ref = this.confirm(data);
    return new Promise((resolve) => {
      ref.afterClosed().subscribe((value) => resolve(value === true));
    });
  }
}
