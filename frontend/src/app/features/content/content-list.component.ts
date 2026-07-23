import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';

import { ContentFacade } from './content.facade';
import { ContentItem } from '../../core/api/content.api';
import { injectExtendedColors } from '../../core/theme/extended-colors';
import { AdminListComponent } from '../../shared/ui/admin/admin-list.component';
import { StatusChipComponent } from '../../shared/ui/status-chip.component';
import { ConfirmDialogService } from '../../shared/ui/confirm-dialog/confirm-dialog.service';
import { ContentCardComponent } from './sections/content-card.component';
import {
  contentMediaLabel,
  contentRotationSummary,
  contentTypeLabel
} from './content-labels';

@Component({
  selector: 'app-content-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--status-warning-container]': 'colors.warning.container'
  },
  imports: [
    CommonModule,
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    CdkDropList,
    CdkDrag,
    AdminListComponent,
    StatusChipComponent,
    ContentCardComponent
  ],
  template: `
    <app-admin-list
      [title]="pageTitle"
      [description]="pageDescription"
      [loading]="facade.loading()"
      [error]="facade.error()"
      errorTitle="Contenido no disponible"
      [empty]="listEmpty()"
      [emptyTitle]="emptyTitle()"
      [emptyMessage]="emptyMessage()"
      [primaryAction]="primaryAction"
      [refreshAction]="refreshAction"
      [selectedCount]="selection().size"
      emptyActionLabel="Añadir contenido"
      emptyActionRoute="/admin/content/new"
      emptyIcon="photo_library"
    >
      @if (selection().size > 0) {
        <ng-container adminListBulk>
          <button
            mat-stroked-button
            color="primary"
            type="button"
            (click)="setActiveSelected(true)"
            [disabled]="facade.saving()"
            data-testid="content-activate-selected"
          >
            <mat-icon aria-hidden="true">check_circle</mat-icon>
            Activar {{ selection().size }}
          </button>
          <button
            mat-stroked-button
            type="button"
            (click)="setActiveSelected(false)"
            [disabled]="facade.saving()"
            data-testid="content-deactivate-selected"
          >
            <mat-icon aria-hidden="true">pause_circle</mat-icon>
            Desactivar {{ selection().size }}
          </button>
          <button
            mat-stroked-button
            color="warn"
            type="button"
            (click)="removeSelected()"
            [disabled]="facade.saving()"
            data-testid="content-delete-selected"
          >
            <mat-icon aria-hidden="true">delete_sweep</mat-icon>
            Eliminar {{ selection().size }}
          </button>
        </ng-container>
      }
      <mat-slide-toggle
        adminListActions
        [checked]="noveltyFilterOnly()"
        (change)="noveltyFilterOnly.set($event.checked)"
        data-testid="content-novelty-filter"
      >
        Solo novedades
      </mat-slide-toggle>
      <ng-template #adminListTable>
        <div
          cdkDropList
          class="content-list__drop"
          [cdkDropListDisabled]="noveltyFilterOnly()"
          (cdkDropListDropped)="onDrop($event)"
          aria-label="Arrastra para reordenar contenido"
        >
          <table mat-table [dataSource]="visibleItems()" [trackBy]="trackById" aria-label="Contenido de la zona superior" class="app-table content-list__table">
            <ng-container matColumnDef="select">
              <th mat-header-cell *matHeaderCellDef class="content-list__select-cell">
                <mat-checkbox
                  [checked]="allChecked()"
                  [indeterminate]="someChecked()"
                  (change)="toggleAll($event.checked)"
                  aria-label="Seleccionar todo el contenido"
                  data-testid="content-select-all"
                />
              </th>
              <td mat-cell *matCellDef="let item" class="content-list__select-cell">
                <mat-checkbox
                  [checked]="isSelected(item.id)"
                  (change)="toggleSelection(item.id, $event.checked)"
                  [attr.aria-label]="'Seleccionar contenido ' + item.id + ' para acciones en lote'"
                  data-testid="content-select"
                />
              </td>
            </ng-container>

            <ng-container matColumnDef="thumbnail">
              <th mat-header-cell *matHeaderCellDef class="content-list__thumb-cell" scope="col">Vista previa</th>
              <td mat-cell *matCellDef="let item" class="content-list__thumb-cell">
                @if (item.mediaFile?.mediaUrl) {
                  @if (item.contentType === 'video') {
                    <video
                      class="content-list__thumb"
                      [src]="item.mediaFile?.mediaUrl ?? ''"
                      preload="metadata"
                      muted
                      aria-hidden="true"
                      data-testid="content-thumbnail"
                    ></video>
                  } @else {
                    <img
                      class="content-list__thumb"
                      [src]="item.mediaFile?.mediaUrl ?? ''"
                      alt=""
                      loading="lazy"
                      data-testid="content-thumbnail"
                    />
                  }
                } @else {
                  <mat-icon class="content-list__thumb-placeholder" aria-hidden="true">
                    {{ item.contentType === 'video' ? 'videocam' : 'photo' }}
                  </mat-icon>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="order">
              <th mat-header-cell *matHeaderCellDef>Orden</th>
              <td mat-cell *matCellDef="let item">{{ item.displayOrder }}</td>
            </ng-container>

            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef>Título</th>
              <td mat-cell *matCellDef="let item">{{ item.title }}</td>
            </ng-container>

            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Tipo</th>
              <td mat-cell *matCellDef="let item">{{ typeLabel(item.contentType) }}</td>
            </ng-container>

            <ng-container matColumnDef="media">
              <th mat-header-cell *matHeaderCellDef>Medio</th>
              <td mat-cell *matCellDef="let item">{{ mediaLabel(item) }}</td>
            </ng-container>

            <ng-container matColumnDef="rotation">
              <th mat-header-cell *matHeaderCellDef>Rotación</th>
              <td mat-cell *matCellDef="let item">
                <div class="content-list__rotation">
                  <span>{{ rotationSummary(item) }}</span>
                  @if (item.isFixed) {
                    <app-status-chip
                      label="Fijo"
                      kind="info"
                      ariaLabel="Contenido fijo"
                    />
                  }
                  @if (item.recurringEveryXIterations) {
                    <app-status-chip
                      [label]="'Recurrente cada ' + item.recurringEveryXIterations"
                      kind="warning"
                      [ariaLabel]="'Recurrente cada ' + item.recurringEveryXIterations + ' iteraciones'"
                    />
                  }
                  @if (item.isNovelty) {
                    <app-status-chip label="Novedad" kind="warning" icon="new_releases" />
                  }
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let item">
                <app-status-chip
                  [label]="item.isActive ? 'Activo' : 'Inactivo'"
                  [kind]="item.isActive ? 'success' : 'neutral'"
                />
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let item">
                <button
                  mat-button
                  color="primary"
                  type="button"
                  (click)="showOnScreen(item)"
                  [disabled]="facade.saving() || !item.isActive || item.isFixed === true"
                  [attr.aria-label]="'Mostrar contenido ' + item.title + ' en pantalla ahora'"
                  data-testid="content-show-on-screen"
                >
                  <mat-icon aria-hidden="true">play_circle</mat-icon>
                  Mostrar en pantalla
                </button>
                <a
                  mat-button
                  color="primary"
                  [routerLink]="['/admin/content', item.id, 'edit']"
                  [attr.aria-label]="'Editar contenido ' + item.id"
                >
                  <mat-icon aria-hidden="true">edit</mat-icon>
                  Editar
                </a>
                <button
                  mat-button
                  color="warn"
                  type="button"
                  (click)="remove(item)"
                  [disabled]="facade.saving()"
                  [attr.aria-label]="'Eliminar contenido ' + item.id"
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
              class="content-list__row"
              [class.content-list__row--novelty]="row.isNovelty"
            ></tr>
          </table>
        </div>
        @if (noveltyFilterOnly()) {
          <p class="content-list__filter-hint" data-testid="content-novelty-filter-hint">
            Desactiva "Solo novedades" para reordenar.
          </p>
        }
        @if (selection().size > 0) {
          <p class="content-list__selection-hint" aria-live="polite">
            {{ selection().size }} elemento(s) seleccionado(s). Arrastra cualquier fila seleccionada para mover la selección como un bloque.
          </p>
        }
      </ng-template>

      <ng-template #adminListCards>
        @for (item of visibleItems(); track item.id) {
          <app-content-card
            [item]="item"
            [selected]="isSelected(item.id)"
            [saving]="facade.saving()"
            [reorderEnabled]="!noveltyFilterOnly()"
            [canMoveUp]="canMove(item, -1)"
            [canMoveDown]="canMove(item, 1)"
            (toggleSelect)="toggleSelection(item.id, $event)"
            (moveUp)="moveItem(item, -1)"
            (moveDown)="moveItem(item, 1)"
            (showOnScreen)="showOnScreen(item)"
            (remove)="remove(item)"
          />
        }
      </ng-template>
    </app-admin-list>
  `,
  styles: [
    `
      .content-list__drop {
        width: 100%;
        overflow-x: auto;
      }
      .content-list__table {
        width: 100%;
        background: transparent;
      }
      .content-list__select-cell {
        width: 48px;
        padding-left: 8px;
        padding-right: 0;
      }
      .content-list__thumb-cell {
        width: 80px;
        padding-right: 8px;
      }
      .content-list__thumb {
        width: 64px;
        height: 64px;
        object-fit: cover;
        border-radius: 4px;
        display: block;
        background: var(--mat-sys-surface-container);
      }
      .content-list__thumb-placeholder {
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
      .content-list__rotation {
        display: inline-flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
      }
      .content-list__row {
        cursor: grab;
      }
      .content-list__row--novelty {
        background: color-mix(in srgb, var(--status-warning-container) 35%, transparent);
      }
      .content-list__row.cdk-drag-preview {
        background: var(--mat-sys-surface-container);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
      }
      .content-list__row.cdk-drag-placeholder {
        opacity: 0.4;
      }
      .content-list__selection-hint {
        margin: 8px 4px 0;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
      }
      .content-list__filter-hint {
        margin: 8px 4px 0;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
      }
    `
  ]
})
export class ContentListComponent implements OnInit {
  protected readonly colors = injectExtendedColors();
  protected readonly facade = inject(ContentFacade);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(ConfirmDialogService);

  protected readonly pageTitle = 'Contenido superior';
  protected readonly pageDescription =
    'Fotos, vídeos y contenido web de la zona superior. Arrastra filas para reordenar en escritorio.';
  protected readonly primaryAction = {
    label: 'Añadir contenido',
    route: '/admin/content/new',
    icon: 'add'
  };
  protected readonly refreshAction = { route: '/admin/content', label: 'Actualizar' };
  protected readonly displayedColumns = [
    'select',
    'thumbnail',
    'order',
    'title',
    'type',
    'media',
    'rotation',
    'status',
    'actions'
  ] as const;

  protected readonly selection = signal<ReadonlySet<string>>(new Set());
  protected readonly noveltyFilterOnly = signal(false);
  protected readonly visibleItems = computed(() => {
    const items = this.facade.items();
    return this.noveltyFilterOnly() ? items.filter((item) => item.isNovelty === true) : items;
  });
  protected readonly listEmpty = computed(() => {
    if (this.facade.loading() || this.facade.error()) {
      return false;
    }
    if (this.facade.items().length === 0) {
      return true;
    }
    return this.noveltyFilterOnly() && this.visibleItems().length === 0;
  });
  protected readonly emptyTitle = computed(() => {
    if (this.noveltyFilterOnly() && this.facade.items().length > 0) {
      return 'No hay novedades pendientes';
    }
    return 'No hay contenido';
  });
  protected readonly emptyMessage = computed(() => {
    if (this.noveltyFilterOnly() && this.facade.items().length > 0) {
      return 'Los uploads públicos aparecerán aquí hasta que el quiosco los muestre.';
    }
    return 'Añade fotos o vídeos para la zona superior.';
  });
  private readonly rows = computed(() => this.visibleItems());
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
      title: `¿Eliminar ${ids.length} elemento${ids.length === 1 ? '' : 's'}?`,
      message: 'Estos elementos se eliminarán de la rotación. La acción no se puede deshacer.',
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
            `${ids.length} elemento${ids.length === 1 ? '' : 's'} eliminado${ids.length === 1 ? '' : 's'}.`,
            'Cerrar',
            { duration: 3000 }
          );
        }
      });
    });
  }

  /**
   * Bulk activate/deactivate the current selection. Reads each selected
   * item from the current items list (rather than from the selection
   * set) so the facade can rebuild the full payload per row. Skips the
   * work if nothing is selected — the action buttons are also hidden
   * via `*ngIf` in that case.
   */
  protected setActiveSelected(isActive: boolean): void {
    const ids = Array.from(this.selection());
    if (ids.length === 0) {
      return;
    }
    const items = this.facade.items().filter((item) => ids.includes(item.id));
    if (items.length === 0) {
      return;
    }
    const action = isActive ? 'activate' : 'deactivate';
    const ref = this.dialog.open({
      title: `¿${isActive ? 'Activar' : 'Desactivar'} ${items.length} elemento${items.length === 1 ? '' : 's'}?`,
      message: isActive
        ? 'Los elementos seleccionados empezarán a aparecer en la rotación del quiosco en el próximo sondeo.'
        : 'Los elementos seleccionados se omitirán en la rotación del quiosco hasta que se reactiven.',
      confirmLabel: isActive ? 'Activar' : 'Desactivar',
      cancelLabel: 'Cancelar'
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed !== true) {
        return;
      }
      this.facade.setActiveMany(items, isActive).subscribe(() => {
        this.selection.set(new Set());
        if (this.facade.error() === null) {
          this.snackBar.open(
            `${items.length} elemento${items.length === 1 ? '' : 's'} ${isActive ? 'activado' : 'desactivado'}${items.length === 1 ? '' : 's'}.`,
            'Cerrar',
            { duration: 3000 }
          );
        }
      });
    });
  }

  protected trackById(_index: number, item: ContentItem): string {
    return item.id;
  }

  protected canMove(item: ContentItem, direction: -1 | 1): boolean {
    if (this.noveltyFilterOnly()) {
      return false;
    }
    const items = this.visibleItems();
    const index = items.findIndex((row) => row.id === item.id);
    const target = index + direction;
    return index >= 0 && target >= 0 && target < items.length;
  }

  protected moveItem(item: ContentItem, direction: -1 | 1): void {
    if (!this.canMove(item, direction)) {
      return;
    }
    const items = this.visibleItems();
    const index = items.findIndex((row) => row.id === item.id);
    const ids = items.map((row) => row.id);
    moveItemInArray(ids, index, index + direction);
    this.facade.reorder(ids).subscribe({
      next: () => {
        if (this.facade.error() === null) {
          this.snackBar.open('Contenido reordenado.', 'Cerrar', { duration: 3000 });
        }
      }
    });
  }

  // Shared with the card variant via `./content-labels` so both layouts
  // render identical copy (extracted during the CHG-046 split).
  protected readonly typeLabel = contentTypeLabel;
  protected readonly mediaLabel = contentMediaLabel;
  protected readonly rotationSummary = contentRotationSummary;

  protected onDrop(event: CdkDragDrop<ContentItem>): void {
    const ids = this.rows().map((item) => item.id);
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
          this.snackBar.open('Contenido reordenado.', 'Cerrar', { duration: 3000 });
        }
      }
    });
  }

  protected remove(item: ContentItem): void {
    const ref = this.dialog.open({
      title: `¿Eliminar ${item.title}?`,
      message: 'Este contenido se eliminará de la rotación. La acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      destructive: true
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed !== true) {
        return;
      }
      this.facade.remove(item.id).subscribe(() => {
        if (this.facade.error() === null) {
          this.snackBar.open(`${item.title} eliminado.`, 'Cerrar', { duration: 3000 });
        }
      });
    });
  }

  /**
   * Spec 014 addendum 2 (FR-020) / spec 009 addendum: posts a `jump_to`
   * navigation command so the kiosk rotation cursor lands on this
   * content id on the next poll.
   */
  protected showOnScreen(item: ContentItem): void {
    this.facade.showOnScreen(item.id).subscribe(() => {
      if (this.facade.error() === null) {
        this.snackBar.open(
          `Mostrando ${item.title} en pantalla.`,
          'Cerrar',
          { duration: 3000 }
        );
      } else {
        this.snackBar.open(
          `No se pudo mostrar ${item.title}: ${this.facade.error()?.message ?? 'error desconocido'}.`,
          'Cerrar',
          { duration: 5000 }
        );
      }
    });
  }
}
