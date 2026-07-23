import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

import { AdsFacade } from './ads.facade';
import { AdItem } from '../../core/api/ads.api';
import { RotationAnimation } from '../../shared/media-upload.models';
import { AdminListComponent } from '../../shared/ui/admin/admin-list.component';
import { StatusChipComponent } from '../../shared/ui/status-chip.component';
import { ConfirmDialogService } from '../../shared/ui/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'app-ad-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatCheckboxModule,
    MatSnackBarModule,
    CdkDropList,
    CdkDrag,
    AdminListComponent,
    StatusChipComponent
  ],
  template: `
    <app-admin-list
      [title]="pageTitle"
      [description]="pageDescription"
      [loading]="facade.loading()"
      [error]="facade.error()"
      errorTitle="Anuncios no disponibles"
      [empty]="facade.empty()"
      [primaryAction]="primaryAction"
      [refreshAction]="refreshAction"
      [selectedCount]="selection().size"
      emptyTitle="Sin anuncios"
      emptyMessage="Sube imágenes de anuncios para la zona inferior."
      emptyActionLabel="Añadir anuncio"
      emptyActionRoute="/admin/ads/new"
      emptyIcon="campaign"
    >
      @if (selection().size > 0) {
        <button
          adminListBulk
          mat-stroked-button
          color="warn"
          type="button"
          (click)="removeSelected()"
          [disabled]="facade.saving()"
          data-testid="ad-delete-selected"
        >
          <mat-icon aria-hidden="true">delete_sweep</mat-icon>
          Eliminar {{ selection().size }}
        </button>
      }
      <ng-template #adminListTable>
        <div
          cdkDropList
          class="ad-list__drop"
          (cdkDropListDropped)="onDrop($event)"
          aria-label="Arrastra para reordenar anuncios"
        >
          <table mat-table [dataSource]="facade.ads()" [trackBy]="trackById" aria-label="Anuncios" class="app-table ad-list__table">
            <ng-container matColumnDef="select">
              <th mat-header-cell *matHeaderCellDef class="ad-list__select-cell">
                <mat-checkbox
                  [checked]="allChecked()"
                  [indeterminate]="someChecked()"
                  (change)="toggleAll($event.checked)"
                  aria-label="Seleccionar todos los anuncios"
                  data-testid="ad-select-all"
                />
              </th>
              <td mat-cell *matCellDef="let ad" class="ad-list__select-cell">
                <mat-checkbox
                  [checked]="isSelected(ad.id)"
                  (change)="toggleSelection(ad.id, $event.checked)"
                  [attr.aria-label]="'Seleccionar anuncio ' + ad.id + ' para acciones en lote'"
                  data-testid="ad-select"
                />
              </td>
            </ng-container>

            <ng-container matColumnDef="thumbnail">
              <th mat-header-cell *matHeaderCellDef class="ad-list__thumb-cell" scope="col">Vista previa</th>
              <td mat-cell *matCellDef="let ad" class="ad-list__thumb-cell">
                @if (ad.mediaFile?.mediaUrl) {
                  <img
                    class="ad-list__thumb"
                    [src]="ad.mediaFile?.mediaUrl ?? ''"
                    alt=""
                    loading="lazy"
                    data-testid="ad-thumbnail"
                  />
                } @else {
                  <mat-icon class="ad-list__thumb-placeholder" aria-hidden="true">image</mat-icon>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="order">
              <th mat-header-cell *matHeaderCellDef>Orden</th>
              <td mat-cell *matCellDef="let ad">{{ ad.displayOrder }}</td>
            </ng-container>

            <ng-container matColumnDef="advertiser">
              <th mat-header-cell *matHeaderCellDef>Anunciante</th>
              <td mat-cell *matCellDef="let ad">{{ ad.advertiser || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="media">
              <th mat-header-cell *matHeaderCellDef>Medio</th>
              <td mat-cell *matCellDef="let ad">{{ mediaLabel(ad) }}</td>
            </ng-container>

            <ng-container matColumnDef="rotation">
              <th mat-header-cell *matHeaderCellDef>Rotación</th>
              <td mat-cell *matCellDef="let ad">{{ rotationSummary(ad) }}</td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let ad">
                <app-status-chip
                  [label]="ad.isActive ? 'Activo' : 'Inactivo'"
                  [kind]="ad.isActive ? 'success' : 'neutral'"
                />
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let ad">
                <button
                  mat-button
                  color="primary"
                  type="button"
                  [routerLink]="['/admin/ads', ad.id, 'edit']"
                  [attr.aria-label]="'Editar anuncio ' + ad.id"
                >
                  <mat-icon aria-hidden="true">edit</mat-icon>
                  Editar
                </button>
                <button
                  mat-button
                  color="warn"
                  type="button"
                  (click)="remove(ad)"
                  [disabled]="facade.saving()"
                  [attr.aria-label]="'Eliminar anuncio ' + ad.id"
                >
                  <mat-icon aria-hidden="true">delete</mat-icon>
                  Eliminar
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: displayedColumns"
              cdkDrag
              [cdkDragData]="row"
              class="ad-list__row"
            ></tr>
          </table>
        </div>
        @if (selection().size > 0) {
          <p class="ad-list__selection-hint" aria-live="polite">
            {{ selection().size }} anuncio(s) seleccionado(s). Arrastra cualquier fila seleccionada para mover la selección como un bloque.
          </p>
        }
      </ng-template>

      <ng-template #adminListCards>
        @for (ad of facade.ads(); track ad.id) {
          <mat-card appearance="outlined" class="ad-list__card-item">
            @if (ad.mediaFile?.mediaUrl) {
              <img
                class="ad-list__card-thumb"
                [src]="ad.mediaFile?.mediaUrl ?? ''"
                alt=""
                loading="lazy"
              />
            }
            <mat-card-content>
              <div class="ad-list__card-select">
                <mat-checkbox
                  [checked]="isSelected(ad.id)"
                  (change)="toggleSelection(ad.id, $event.checked)"
                  [attr.aria-label]="'Seleccionar anuncio ' + ad.id"
                />
                <div class="ad-list__card-reorder">
                  <button
                    mat-icon-button
                    type="button"
                    [disabled]="!canMove(ad, -1)"
                    (click)="moveItem(ad, -1)"
                    aria-label="Subir"
                  >
                    <mat-icon aria-hidden="true">arrow_upward</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    type="button"
                    [disabled]="!canMove(ad, 1)"
                    (click)="moveItem(ad, 1)"
                    aria-label="Bajar"
                  >
                    <mat-icon aria-hidden="true">arrow_downward</mat-icon>
                  </button>
                </div>
              </div>
              <div class="ad-list__card-header">
                <h3 class="ad-list__card-title">Anuncio #{{ ad.displayOrder }}</h3>
                <app-status-chip
                  [label]="ad.isActive ? 'Activo' : 'Inactivo'"
                  [kind]="ad.isActive ? 'success' : 'neutral'"
                />
              </div>
            <p class="ad-list__card-meta">
              <span>{{ ad.advertiser || '—' }}</span>
              <span> · {{ mediaLabel(ad) }}</span>
              <span> · Orden {{ ad.displayOrder }}</span>
            </p>
              <p class="ad-list__card-rotation">{{ rotationSummary(ad) }}</p>
            </mat-card-content>
            <mat-card-actions class="app-card-actions ad-list__card-actions">
              <a
                mat-button
                color="primary"
                [routerLink]="['/admin/ads', ad.id, 'edit']"
                [attr.aria-label]="'Editar anuncio ' + ad.id"
              >
                <mat-icon aria-hidden="true">edit</mat-icon>
                Editar
              </a>
              <button
                mat-button
                color="warn"
                type="button"
                (click)="remove(ad)"
                [disabled]="facade.saving()"
                [attr.aria-label]="'Eliminar anuncio ' + ad.id"
              >
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
      .ad-list__drop {
        width: 100%;
        overflow-x: auto;
      }
      .ad-list__table {
        width: 100%;
        min-width: 760px;
        background: transparent;
      }
      .ad-list__select-cell {
        width: 48px;
        padding-left: 8px;
        padding-right: 0;
      }
      .ad-list__thumb-cell {
        width: 80px;
        padding-right: 8px;
      }
      .ad-list__thumb {
        width: 64px;
        height: 64px;
        object-fit: cover;
        border-radius: 4px;
        display: block;
        background: var(--mat-sys-surface-container);
      }
      .ad-list__thumb-placeholder {
        width: 64px;
        height: 64px;
        font-size: 32px;
        line-height: 64px;
        text-align: center;
        display: inline-block;
        color: var(--mat-sys-on-surface-variant);
        background: var(--mat-sys-surface-container);
        border-radius: 4px;
      }
      .ad-list__row {
        cursor: grab;
      }
      .ad-list__row.cdk-drag-preview {
        background: var(--mat-sys-surface-container);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
      }
      .ad-list__row.cdk-drag-placeholder {
        opacity: 0.4;
      }
      .ad-list__selection-hint {
        margin: 8px 4px 0;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
      }
      .ad-list__card-item {
        display: block;
        min-width: 0;
        overflow: hidden;
        background: var(--mat-sys-surface);
      }
      .ad-list__card-thumb {
        width: 100%;
        height: 160px;
        object-fit: cover;
        display: block;
        background: var(--mat-sys-surface-container);
      }
      .ad-list__card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
        min-width: 0;
      }
      .ad-list__card-select {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }
      .ad-list__card-reorder {
        display: inline-flex;
        gap: 4px;
      }
      .ad-list__card-title {
        margin: 0;
        min-width: 0;
        overflow-wrap: anywhere;
        font: var(--mat-sys-title-medium);
        letter-spacing: var(--mat-sys-title-medium-tracking);
      }
      .ad-list__card-meta {
        margin: 4px 0 0;
        min-width: 0;
        overflow-wrap: anywhere;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
      }
      .ad-list__card-rotation {
        margin: 6px 0 0;
        min-width: 0;
        overflow-wrap: anywhere;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
      }
      .ad-list__card-actions {
        flex-wrap: wrap;
        gap: 4px;
        padding: 0 16px 12px;
      }
    `
  ]
})
export class AdListComponent implements OnInit {
  protected readonly facade = inject(AdsFacade);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(ConfirmDialogService);

  protected readonly pageTitle = 'Anuncios';
  protected readonly pageDescription =
    'Anuncios de clientes en la zona inferior. Arrastra filas para reordenar en escritorio.';
  protected readonly primaryAction = {
    label: 'Añadir anuncio',
    route: '/admin/ads/new',
    icon: 'add'
  };
  protected readonly refreshAction = { route: '/admin/ads', label: 'Actualizar' };
  protected readonly displayedColumns = [
    'select',
    'thumbnail',
    'order',
    'advertiser',
    'media',
    'rotation',
    'status',
    'actions'
  ] as const;

  protected readonly selection = signal<ReadonlySet<string>>(new Set());
  private readonly rows = computed(() => this.facade.ads());
  protected readonly allChecked = computed(() => {
    const items = this.rows();
    if (items.length === 0) return false;
    const selected = this.selection();
    return items.every((item) => selected.has(item.id));
  });
  protected readonly someChecked = computed(() => this.selection().size > 0);

  ngOnInit(): void {
    this.facade.refresh().subscribe();
  }

  protected isSelected(id: string): boolean {
    return this.selection().has(id);
  }

  protected toggleSelection(id: string, checked: boolean): void {
    const next = new Set(this.selection());
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this.selection.set(next);
  }

  /**
   * Toggle every visible row. The selection is bounded to the current
   * page (the full list, since the API does not paginate), so an empty
   * list is a no-op.
   */
  protected toggleAll(checked: boolean): void {
    const items = this.rows();
    if (items.length === 0) return;
    if (checked) {
      this.selection.set(new Set(items.map((item) => item.id)));
    } else {
      this.selection.set(new Set());
    }
  }

  /**
   * Confirm and remove every selected row. After the call resolves we
   * drop the selection unconditionally — even on partial failure —
   * so the UI never keeps ids that the backend has already deleted.
   */
  protected removeSelected(): void {
    const ids = Array.from(this.selection());
    if (ids.length === 0) return;
    const ref = this.dialog.open({
      title: `¿Eliminar ${ids.length} anuncio${ids.length === 1 ? '' : 's'}?`,
      message: 'Estos anuncios se eliminarán de la rotación. La acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      destructive: true
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed !== true) {
        return;
      }
      this.facade.removeMany(ids).subscribe(() => {
        this.selection.set(new Set());
        if (this.facade.error() === null) {
          this.snackBar.open(
            `${ids.length} anuncio${ids.length === 1 ? '' : 's'} eliminado${ids.length === 1 ? '' : 's'}.`,
            'Cerrar',
            { duration: 3000 }
          );
        }
      });
    });
  }

  protected trackById(_index: number, ad: AdItem): string {
    return ad.id;
  }

  protected canMove(ad: AdItem, direction: -1 | 1): boolean {
    const items = this.facade.ads();
    const index = items.findIndex((row) => row.id === ad.id);
    const target = index + direction;
    return index >= 0 && target >= 0 && target < items.length;
  }

  protected moveItem(ad: AdItem, direction: -1 | 1): void {
    if (!this.canMove(ad, direction)) {
      return;
    }
    const items = this.facade.ads();
    const index = items.findIndex((row) => row.id === ad.id);
    const ids = items.map((row) => row.id);
    moveItemInArray(ids, index, index + direction);
    this.facade.reorder(ids).subscribe({
      next: () => {
        if (this.facade.error() === null) {
          this.snackBar.open('Anuncios reordenados.', 'Cerrar', { duration: 3000 });
        }
      }
    });
  }

  protected mediaLabel(ad: AdItem): string {
    if (ad.mediaFile) {
      return ad.mediaFile.originalFilename;
    }
    return ad.sourceReference ? 'Origen externo' : 'Sin medio';
  }

  protected rotationSummary(ad: AdItem): string {
    const duration = ad.effectiveDurationSeconds ?? ad.durationSeconds;
    const animation: RotationAnimation | null | undefined =
      ad.effectiveRotationAnimation ?? ad.rotationAnimation;
    const durationLabel = duration ? `${duration}s` : 'predeterminado';
    const animationLabel = animation ?? 'predeterminada';
    return `${durationLabel}, ${animationLabel}`;
  }

  protected onDrop(event: CdkDragDrop<AdItem>): void {
    const ids = this.rows().map((ad) => ad.id);
    const movedId = ids[event.previousIndex];
    moveItemInArray(ids, event.previousIndex, event.currentIndex);

    const selected = this.selection();
    let newOrder = ids;
    if (selected.has(movedId) && selected.size > 1) {
      const block: string[] = [];
      ids.forEach((id) => {
        if (selected.has(id)) {
          block.push(id);
        }
      });
      const withoutBlock = ids.filter((id) => !selected.has(id));
      const targetIndex = withoutBlock.indexOf(movedId);
      const insertAt = targetIndex === -1 ? withoutBlock.length : targetIndex;
      withoutBlock.splice(insertAt, 0, ...block);
      newOrder = withoutBlock;
    }

    this.selection.set(new Set());
    this.facade.reorder(newOrder).subscribe({
      next: () => {
        if (this.facade.error() === null) {
          this.snackBar.open('Anuncios reordenados.', 'Cerrar', { duration: 3000 });
        }
      }
    });
  }

  protected remove(ad: AdItem): void {
    const ref = this.dialog.open({
      title: `¿Eliminar el anuncio n.º ${ad.displayOrder}?`,
      message: 'Este anuncio se eliminará de la rotación. La acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      destructive: true
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed !== true) {
        return;
      }
      this.facade.remove(ad.id).subscribe(() => {
        if (this.facade.error() === null) {
          this.snackBar.open(`Anuncio n.º ${ad.displayOrder} eliminado.`, 'Cerrar', { duration: 3000 });
        }
      });
    });
  }
}
