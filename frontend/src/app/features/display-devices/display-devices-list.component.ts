import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

import { AdminListComponent } from '../../shared/ui/admin/admin-list.component';
import { StatusChipComponent } from '../../shared/ui/status-chip.component';
import { ConfirmDialogService } from '../../shared/ui/confirm-dialog/confirm-dialog.service';
import { ADMIN_COPY } from '../../shared/ui/admin/admin-copy';
import {
  DisplayDeviceRenameDialogComponent,
  type DisplayDeviceRenameDialogData,
} from './display-device-rename-dialog.component';
import { DisplayDeviceRow, DisplayDevicesFacade } from './display-devices.facade';

@Component({
  selector: 'app-display-devices-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    AdminListComponent,
    StatusChipComponent,
  ],
  template: `
    <app-admin-list
      title="Pantallas"
      description="Inventario de quioscos registrados y etiquetas pre-creadas para el evento."
      [loading]="facade.loading()"
      [error]="facade.error()"
      [empty]="facade.empty()"
      [refreshAction]="refreshAction"
      emptyTitle="Sin pantallas registradas"
      emptyMessage="Pre-crea una etiqueta aquí o conecta un quiosco con nombre en /display."
      emptyIcon="connected_tv"
      (refresh)="onRefresh()"
    >
      <div adminListActions class="display-devices-list__create">
        <mat-form-field appearance="outline" class="display-devices-list__create-field">
          <mat-label>Nueva pantalla</mat-label>
          <input matInput [formControl]="newLabel" maxlength="80" autocomplete="off" />
        </mat-form-field>
        <button
          mat-flat-button
          color="primary"
          type="button"
          [disabled]="!canCreate() || facade.mutating()"
          (click)="onCreate()"
          data-testid="add-display-device"
        >
          Añadir pantalla
        </button>
      </div>

      <ng-template #adminListTable>
        <table mat-table [dataSource]="facade.devices()" class="app-table display-devices-list__table" aria-label="Pantallas registradas">
          <ng-container matColumnDef="label">
            <th mat-header-cell *matHeaderCellDef>Etiqueta</th>
            <td mat-cell *matCellDef="let row">{{ row.label }}</td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let row">
              <app-status-chip
                [label]="row.connected ? 'Conectada' : 'Desconectada'"
                [kind]="row.connected ? 'success' : 'neutral'"
              />
            </td>
          </ng-container>

          <ng-container matColumnDef="lastSeenAt">
            <th mat-header-cell *matHeaderCellDef>Última actividad</th>
            <td mat-cell *matCellDef="let row">
              @if (row.lastSeenAt) {
                {{ row.lastSeenAt | date: 'short' }}
              } @else {
                —
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let row">
              <button
                mat-button
                type="button"
                (click)="onRename(row)"
                [disabled]="facade.mutating()"
                [attr.aria-label]="'Renombrar pantalla ' + row.label"
              >
                <mat-icon aria-hidden="true">edit</mat-icon>
                Renombrar
              </button>
              <button
                mat-button
                color="warn"
                type="button"
                (click)="onDelete(row)"
                [disabled]="facade.mutating()"
                [attr.aria-label]="'Eliminar pantalla ' + row.label"
              >
                <mat-icon aria-hidden="true">delete</mat-icon>
                Eliminar
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </ng-template>

      <ng-template #adminListCards>
        @for (row of facade.devices(); track row.id) {
          <mat-card appearance="outlined" class="display-devices-list__card">
            <mat-card-content>
              <div class="display-devices-list__card-header">
                <h3 class="display-devices-list__card-title">{{ row.label }}</h3>
                <app-status-chip
                  [label]="row.connected ? 'Conectada' : 'Desconectada'"
                  [kind]="row.connected ? 'success' : 'neutral'"
                />
              </div>
              <p class="display-devices-list__card-meta">
                Última actividad:
                @if (row.lastSeenAt) {
                  {{ row.lastSeenAt | date: 'short' }}
                } @else {
                  —
                }
              </p>
            </mat-card-content>
            <mat-card-actions class="app-card-actions">
              <button mat-button type="button" (click)="onRename(row)" [disabled]="facade.mutating()">
                <mat-icon aria-hidden="true">edit</mat-icon>
                Renombrar
              </button>
              <button mat-button color="warn" type="button" (click)="onDelete(row)" [disabled]="facade.mutating()">
                <mat-icon aria-hidden="true">delete</mat-icon>
                Eliminar
              </button>
            </mat-card-actions>
          </mat-card>
        }
      </ng-template>
    </app-admin-list>
  `,
  styles: [
    `
      .display-devices-list__create {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
      }
      .display-devices-list__create-field {
        min-width: 14rem;
      }
      .display-devices-list__table {
        width: 100%;
      }
      .display-devices-list__card {
        display: block;
      }
      .display-devices-list__card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
      }
      .display-devices-list__card-title {
        margin: 0;
      }
      .display-devices-list__card-meta {
        margin: 0.5rem 0 0;
        color: var(--mat-sys-on-surface-variant);
      }
    `,
  ],
})
export class DisplayDevicesListComponent implements OnInit {
  protected readonly facade = inject(DisplayDevicesFacade);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  protected readonly displayedColumns = ['label', 'status', 'lastSeenAt', 'actions'] as const;
  protected readonly refreshAction = { label: 'Actualizar' };
  protected readonly newLabel = this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(80)]);

  ngOnInit(): void {
    this.facade.startPolling(this.destroyRef);
  }

  protected canCreate(): boolean {
    return !!this.newLabel.value.trim();
  }

  protected onRefresh(): void {
    this.facade.refresh().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  protected onCreate(): void {
    const label = this.newLabel.value.trim();
    if (!label) {
      return;
    }
    this.facade.create(label).subscribe({
      next: () => {
        this.newLabel.setValue('');
        this.snackBar.open('Pantalla añadida.', 'Cerrar', { duration: 3000 });
      },
      error: (error: { error?: { message?: string }; message?: string }) => {
        const message = error?.error?.message ?? error?.message ?? 'No se pudo crear la pantalla.';
        this.snackBar.open(message, 'Cerrar', { duration: 4000 });
      },
    });
  }

  protected onRename(row: DisplayDeviceRow): void {
    const data: DisplayDeviceRenameDialogData = { deviceId: row.id, label: row.label };
    this.dialog
      .open(DisplayDeviceRenameDialogComponent, { data, width: '28rem' })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.snackBar.open('Pantalla renombrada.', 'Cerrar', { duration: 3000 });
        }
      });
  }

  protected onDelete(row: DisplayDeviceRow): void {
    const prefix = row.connected ? 'Esta pantalla está conectada ahora mismo. ' : '';
    this.confirm
      .confirm({
        title: 'Eliminar pantalla',
        message: `${prefix}¿Eliminar "${row.label}"? Esta acción no se puede deshacer.`,
        confirmLabel: ADMIN_COPY.delete,
        cancelLabel: ADMIN_COPY.cancel,
        destructive: true,
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.facade.delete(row.id).subscribe({
          next: () => this.snackBar.open('Pantalla eliminada.', 'Cerrar', { duration: 3000 }),
          error: () => this.snackBar.open('No se pudo eliminar la pantalla.', 'Cerrar', { duration: 4000 }),
        });
      });
  }
}
