import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';

import { ContentFacade } from './content.facade';
import { ContentItem } from '../../core/api/content.api';
import { injectExtendedColors } from '../../core/theme/extended-colors';
import { RotationAnimation } from '../../shared/media-upload.models';
import { AdminListComponent } from '../../shared/ui/admin/admin-list.component';
import { StatusChipComponent } from '../../shared/ui/status-chip.component';
import { ConfirmDialogService } from '../../shared/ui/confirm-dialog/confirm-dialog.service';

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
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatSnackBarModule,
    MatSlideToggleModule,
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
          aria-label="Drag to reorder content items"
        >
          <table mat-table [dataSource]="visibleItems()" [trackBy]="trackById" aria-label="Top content items" class="app-table content-list__table">
            <ng-container matColumnDef="select">
              <th mat-header-cell *matHeaderCellDef class="content-list__select-cell">
                <mat-checkbox
                  [checked]="allChecked()"
                  [indeterminate]="someChecked()"
                  (change)="toggleAll($event.checked)"
                  aria-label="Select all content"
                  data-testid="content-select-all"
                />
              </th>
              <td mat-cell *matCellDef="let item" class="content-list__select-cell">
                <mat-checkbox
                  [checked]="isSelected(item.id)"
                  (change)="toggleSelection(item.id, $event.checked)"
                  [attr.aria-label]="'Select content ' + item.id + ' for bulk actions'"
                  data-testid="content-select"
                />
              </td>
            </ng-container>

            <ng-container matColumnDef="thumbnail">
              <th mat-header-cell *matHeaderCellDef class="content-list__thumb-cell" scope="col">Preview</th>
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
              <th mat-header-cell *matHeaderCellDef>Order</th>
              <td mat-cell *matCellDef="let item">{{ item.displayOrder }}</td>
            </ng-container>

            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef>Title</th>
              <td mat-cell *matCellDef="let item">{{ item.title }}</td>
            </ng-container>

            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Type</th>
              <td mat-cell *matCellDef="let item">{{ typeLabel(item.contentType) }}</td>
            </ng-container>

            <ng-container matColumnDef="media">
              <th mat-header-cell *matHeaderCellDef>Media</th>
              <td mat-cell *matCellDef="let item">{{ mediaLabel(item) }}</td>
            </ng-container>

            <ng-container matColumnDef="rotation">
              <th mat-header-cell *matHeaderCellDef>Rotation</th>
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
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let item">
                <app-status-chip
                  [label]="item.isActive ? 'Activo' : 'Inactivo'"
                  [kind]="item.isActive ? 'success' : 'neutral'"
                />
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let item">
                <button
                  mat-button
                  color="primary"
                  type="button"
                  (click)="showOnScreen(item)"
                  [disabled]="facade.saving() || !item.isActive || item.isFixed === true"
                  [attr.aria-label]="'Show content ' + item.title + ' on screen now'"
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
            {{ selection().size }} item(s) selected. Drag any selected row to move the selection as a block.
          </p>
        }
      </ng-template>

      <ng-template #adminListCards>
        @for (item of visibleItems(); track item.id) {
          <mat-card
            appearance="outlined"
            class="content-list__card-item"
            [class.content-list__card-item--novelty]="item.isNovelty"
          >
            @if (item.mediaFile?.mediaUrl) {
              @if (item.contentType === 'video') {
                <video
                  class="content-list__card-thumb"
                  [src]="item.mediaFile?.mediaUrl ?? ''"
                  preload="metadata"
                  muted
                  aria-hidden="true"
                ></video>
              } @else {
                <img
                  class="content-list__card-thumb"
                  [src]="item.mediaFile?.mediaUrl ?? ''"
                  alt=""
                  loading="lazy"
                />
              }
            }
            <mat-card-content>
              <div class="content-list__card-select">
                <mat-checkbox
                  [checked]="isSelected(item.id)"
                  (change)="toggleSelection(item.id, $event.checked)"
                  [attr.aria-label]="'Seleccionar ' + item.title"
                />
                @if (!noveltyFilterOnly()) {
                  <div class="content-list__card-reorder">
                    <button
                      mat-icon-button
                      type="button"
                      [disabled]="!canMove(item, -1)"
                      (click)="moveItem(item, -1)"
                      aria-label="Subir"
                    >
                      <mat-icon aria-hidden="true">arrow_upward</mat-icon>
                    </button>
                    <button
                      mat-icon-button
                      type="button"
                      [disabled]="!canMove(item, 1)"
                      (click)="moveItem(item, 1)"
                      aria-label="Bajar"
                    >
                      <mat-icon aria-hidden="true">arrow_downward</mat-icon>
                    </button>
                  </div>
                }
              </div>
              <div class="content-list__card-header">
                <h3 class="content-list__card-title">{{ item.title }}</h3>
                <app-status-chip
                  [label]="item.isActive ? 'Activo' : 'Inactivo'"
                  [kind]="item.isActive ? 'success' : 'neutral'"
                />
              </div>
              <p class="content-list__card-meta">
                <span>{{ typeLabel(item.contentType) }}</span>
                <span> · {{ mediaLabel(item) }}</span>
                <span> · Order {{ item.displayOrder }}</span>
              </p>
              <p class="content-list__card-rotation">
                {{ rotationSummary(item) }}
                @if (item.isNovelty) {
                  <app-status-chip label="Novedad" kind="warning" icon="new_releases" />
                }
              </p>
            </mat-card-content>
            <mat-card-actions class="app-card-actions content-list__card-actions">
              <button
                mat-button
                color="primary"
                type="button"
                (click)="showOnScreen(item)"
                [disabled]="facade.saving() || !item.isActive || item.isFixed === true"
              >
                <mat-icon aria-hidden="true">play_circle</mat-icon>
                Show on screen
              </button>
              <a
                mat-button
                color="primary"
                [routerLink]="['/admin/content', item.id, 'edit']"
                [attr.aria-label]="'Edit content ' + item.id"
              >
                <mat-icon aria-hidden="true">edit</mat-icon>
                Edit
              </a>
              <button
                mat-button
                color="warn"
                type="button"
                (click)="remove(item)"
                [disabled]="facade.saving()"
                [attr.aria-label]="'Delete content ' + item.id"
              >
                <mat-icon aria-hidden="true">delete</mat-icon>
                Delete
              </button>
            </mat-card-actions>
          </mat-card>
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
      .content-list__card-item {
        display: block;
        background: var(--mat-sys-surface);
      }
      .content-list__card-item--novelty {
        border-color: var(--status-warning-container);
        background: color-mix(in srgb, var(--status-warning-container) 20%, var(--mat-sys-surface));
      }
      .content-list__card-thumb {
        width: 100%;
        height: 160px;
        object-fit: cover;
        display: block;
        background: var(--mat-sys-surface-container);
        border-top-left-radius: inherit;
        border-top-right-radius: inherit;
      }
      .content-list__card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .content-list__card-select {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }
      .content-list__card-reorder {
        display: inline-flex;
        gap: 4px;
      }
      .content-list__card-title {
        margin: 0;
        font: var(--mat-sys-title-medium);
        letter-spacing: var(--mat-sys-title-medium-tracking);
      }
      .content-list__card-meta {
        margin: 4px 0 0;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
      }
      .content-list__card-rotation {
        margin: 6px 0 0;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
        display: inline-flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
      }
      .content-list__card-actions {
        padding: 0 16px 12px;
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
      title: `Delete ${ids.length} item${ids.length === 1 ? '' : 's'}?`,
      message: 'These items will be removed from rotation. The action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
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
            `Deleted ${ids.length} item${ids.length === 1 ? '' : 's'}.`,
            'Dismiss',
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
      title: `${isActive ? 'Activate' : 'Deactivate'} ${items.length} item${items.length === 1 ? '' : 's'}?`,
      message: isActive
        ? 'Selected items will start appearing in the kiosk rotation on the next poll.'
        : 'Selected items will be skipped by the kiosk rotation until reactivated.',
      confirmLabel: isActive ? 'Activate' : 'Deactivate',
      cancelLabel: 'Cancel'
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed !== true) {
        return;
      }
      this.facade.setActiveMany(items, isActive).subscribe(() => {
        this.selection.set(new Set());
        if (this.facade.error() === null) {
          this.snackBar.open(
            `${isActive ? 'Activated' : 'Deactivated'} ${items.length} item${items.length === 1 ? '' : 's'}.`,
            'Dismiss',
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

  protected typeLabel(type: ContentItem['contentType']): string {
    switch (type) {
      case 'photo':
        return 'Photo';
      case 'video':
        return 'Video';
      default:
        return type;
    }
  }

  protected mediaLabel(item: ContentItem): string {
    if (item.mediaFile) {
      return item.mediaFile.originalFilename;
    }
    return 'External source';
  }

  protected rotationSummary(item: ContentItem): string {
    const duration = item.effectiveDurationSeconds ?? item.durationSeconds;
    const animation: RotationAnimation | null | undefined =
      item.effectiveRotationAnimation ?? item.rotationAnimation;
    const durationLabel = duration ? `${duration}s` : 'default';
    const animationLabel = animation ?? 'default';
    return `${durationLabel}, ${animationLabel}`;
  }

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
          this.snackBar.open('Content reordered.', 'Dismiss', { duration: 3000 });
        }
      }
    });
  }

  protected remove(item: ContentItem): void {
    const ref = this.dialog.open({
      title: `Delete ${item.title}?`,
      message: 'This content will be removed from rotation. The action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      destructive: true
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed !== true) {
        return;
      }
      this.facade.remove(item.id).subscribe(() => {
        if (this.facade.error() === null) {
          this.snackBar.open(`Deleted ${item.title}.`, 'Dismiss', { duration: 3000 });
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
          `Showing ${item.title} on screen now.`,
          'Dismiss',
          { duration: 3000 }
        );
      } else {
        this.snackBar.open(
          `Could not show ${item.title}: ${this.facade.error()?.message ?? 'unknown error'}.`,
          'Dismiss',
          { duration: 5000 }
        );
      }
    });
  }
}
