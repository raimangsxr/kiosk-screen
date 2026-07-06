import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetModule,
  MatBottomSheetRef
} from '@angular/material/bottom-sheet';

import { ConfirmDialogData } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-confirm-bottom-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatBottomSheetModule],
  template: `
    <div class="confirm-sheet">
      <h2 class="confirm-sheet__title">{{ data.title }}</h2>
      <p class="confirm-sheet__message">{{ data.message }}</p>
      <div class="confirm-sheet__actions">
        <button mat-stroked-button type="button" class="confirm-sheet__button" (click)="close(false)">
          {{ data.cancelLabel }}
        </button>
        <button
          mat-flat-button
          type="button"
          class="confirm-sheet__button"
          [color]="data.destructive ? 'warn' : 'primary'"
          (click)="close(true)"
        >
          {{ data.confirmLabel }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .confirm-sheet {
        display: grid;
        gap: 16px;
        padding: 20px 20px calc(20px + var(--admin-safe-bottom, 0px));
      }
      .confirm-sheet__title {
        margin: 0;
        font: var(--mat-sys-title-large);
      }
      .confirm-sheet__message {
        margin: 0;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-medium);
      }
      .confirm-sheet__actions {
        display: grid;
        gap: 8px;
      }
      .confirm-sheet__button {
        width: 100%;
        min-height: var(--app-touch-target);
      }
    `
  ]
})
export class ConfirmBottomSheetComponent {
  protected readonly data: ConfirmDialogData = inject(MAT_BOTTOM_SHEET_DATA);
  private readonly sheetRef = inject(MatBottomSheetRef<ConfirmBottomSheetComponent, boolean>);

  close(confirmed: boolean): void {
    this.sheetRef.dismiss(confirmed);
  }
}
