import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AdminContentStreamService } from './admin-content-stream.service';
import { ContentFacade } from './content.facade';
import { ContentItem } from '../../core/api/content.api';
import { injectExtendedColors } from '../../core/theme/extended-colors';
import { RotationAnimation } from '../../shared/media-upload.models';
import {
  MediaHoverPreviewService,
  type MediaPreviewConfig
} from '../../shared/ui/media-hover-preview/media-hover-preview.component';
import { AdminListComponent } from '../../shared/ui/admin/admin-list.component';
import { StatusChipComponent } from '../../shared/ui/status-chip.component';
import { ConfirmDialogService } from '../../shared/ui/confirm-dialog/confirm-dialog.service';
import {
  CLIENT_PAGE_SIZE_OPTIONS,
  clampPageIndex,
  formatPaginationRange,
  pageCount,
  pageSizeLabel,
  slicePage,
  type ClientPageSize
} from '../../shared/util/client-pagination';
import {
  readContentListPageSize,
  writeContentListPageSize
} from '../../shared/util/client-pagination-storage';

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
    MatCardModule,
    MatIconModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule,
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
      (refresh)="onRefresh()"
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
      <div adminListActions class="content-list__actions-slot">
        <mat-slide-toggle
          [checked]="noveltyFilterOnly()"
          (change)="onNoveltyFilterChange($event.checked)"
          data-testid="content-novelty-filter"
        >
          Solo novedades
        </mat-slide-toggle>
        @if (streamStale()) {
          <p class="content-list__stale-hint" data-testid="content-stream-stale-hint">
            Los datos pueden estar desactualizados
          </p>
        }
        @if (showOffPageHint()) {
          <p class="content-list__on-air-hint" data-testid="content-on-air-hint">
            En pantalla: {{ nowPlayingTitle() }}
          </p>
        }
      </div>
      <ng-template #adminListTable>
        <div
          cdkDropList
          class="content-list__drop"
          [cdkDropListDisabled]="!reorderEnabled()"
          (cdkDropListDropped)="onDrop($event)"
          (cdkDragStarted)="onDragStarted()"
          aria-label="Drag to reorder content items"
        >
          <table mat-table [dataSource]="visibleItems()" [trackBy]="trackById" aria-label="Contenido de la zona superior" class="app-table content-list__table">
            <ng-container matColumnDef="select">
              <th mat-header-cell *matHeaderCellDef class="content-list__select-cell">
                <mat-checkbox
                  [checked]="allChecked()"
                  [indeterminate]="someChecked()"
                  (change)="toggleAll($event.checked)"
                  aria-label="Seleccionar todo en la página"
                  data-testid="content-select-all"
                />
              </th>
              <td mat-cell *matCellDef="let item" class="content-list__select-cell">
                <mat-checkbox
                  [checked]="isSelected(item.id)"
                  (change)="toggleSelection(item.id, $event.checked)"
                  [attr.aria-label]="'Seleccionar ' + item.title"
                  data-testid="content-select"
                />
              </td>
            </ng-container>

            <ng-container matColumnDef="thumbnail">
              <th mat-header-cell *matHeaderCellDef class="content-list__thumb-cell" scope="col">Vista previa</th>
              <td mat-cell *matCellDef="let item" class="content-list__thumb-cell">
                @if (item.mediaFile?.mediaUrl) {
                  <button
                    type="button"
                    class="content-list__thumb-button"
                    [attr.tabindex]="0"
                    [attr.aria-label]="'Vista ampliada de ' + item.title"
                    (mouseenter)="openPreview($event.currentTarget, item)"
                    (mouseleave)="closePreview()"
                    (focus)="openPreview($event.currentTarget, item)"
                    (blur)="closePreview()"
                    data-testid="content-thumbnail-trigger"
                  >
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
                  </button>
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
              <td mat-cell *matCellDef="let item">
                <span class="content-list__truncate" [title]="item.title">{{ item.title }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Tipo</th>
              <td mat-cell *matCellDef="let item">{{ typeLabel(item.contentType) }}</td>
            </ng-container>

            <ng-container matColumnDef="media">
              <th mat-header-cell *matHeaderCellDef>Media</th>
              <td mat-cell *matCellDef="let item">
                <span class="content-list__truncate" [title]="mediaLabel(item)">{{ mediaLabel(item) }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="rotation">
              <th mat-header-cell *matHeaderCellDef>Rotación</th>
              <td mat-cell *matCellDef="let item">
                <div class="content-list__rotation">
                  <span class="content-list__truncate" [title]="rotationSummary(item)">{{ rotationSummary(item) }}</span>
                  @if (item.isFixed) {
                    <app-status-chip label="Fijo" kind="info" ariaLabel="Contenido fijo" />
                  }
                  @if (item.recurringEveryXIterations) {
                    <span
                      [matTooltip]="'Recurrente cada ' + item.recurringEveryXIterations + ' iteraciones'"
                      matTooltipPosition="above"
                    >
                      <app-status-chip
                        [label]="'R×' + item.recurringEveryXIterations"
                        kind="warning"
                        [ariaLabel]="'Recurrente cada ' + item.recurringEveryXIterations + ' iteraciones'"
                      />
                    </span>
                  }
                  @if (item.isNovelty) {
                    <app-status-chip label="Nov." kind="warning" icon="new_releases" ariaLabel="Novedad" />
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
              <th mat-header-cell *matHeaderCellDef class="content-list__actions-header">Acciones</th>
              <td mat-cell *matCellDef="let item" class="content-list__actions-cell">
                <div class="content-list__actions">
                  <button
                    mat-icon-button
                    color="primary"
                    type="button"
                    (click)="showOnScreen(item)"
                    [disabled]="facade.saving() || !item.isActive || item.isFixed === true"
                    matTooltip="Mostrar en pantalla"
                    matTooltipPosition="above"
                    [attr.aria-label]="'Mostrar en pantalla ' + item.title"
                    data-testid="content-show-on-screen"
                  >
                    <mat-icon aria-hidden="true">play_circle</mat-icon>
                  </button>
                  <a
                    mat-icon-button
                    color="primary"
                    [routerLink]="['/admin/content', item.id, 'edit']"
                    matTooltip="Editar"
                    matTooltipPosition="above"
                    [attr.aria-label]="'Editar ' + item.title"
                  >
                    <mat-icon aria-hidden="true">edit</mat-icon>
                  </a>
                  <button
                    mat-icon-button
                    color="warn"
                    type="button"
                    (click)="remove(item)"
                    [disabled]="facade.saving()"
                    matTooltip="Eliminar"
                    matTooltipPosition="above"
                    [attr.aria-label]="'Eliminar ' + item.title"
                  >
                    <mat-icon aria-hidden="true">delete</mat-icon>
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: displayedColumns"
              cdkDrag
              [cdkDragData]="row"
              (cdkDragEnded)="onDragEnded()"
              class="content-list__row"
              [class.content-list__row--novelty]="row.isNovelty && !isNowPlaying(row.id)"
              [class.content-list__row--on-air]="isNowPlaying(row.id)"
              [attr.aria-label]="isNowPlaying(row.id) ? 'En pantalla: ' + row.title : null"
            ></tr>
          </table>
        </div>
        @if (noveltyFilterOnly()) {
          <p class="content-list__filter-hint" data-testid="content-novelty-filter-hint">
            Desactiva "Solo novedades" para reordenar.
          </p>
        } @else if (!reorderEnabled()) {
          <p class="content-list__filter-hint" data-testid="content-pagination-reorder-hint">
            Muestra todas las filas para reordenar.
          </p>
        }
        @if (selection().size > 0) {
          <p class="content-list__selection-hint" aria-live="polite">
            {{ selection().size }} seleccionado(s). Arrastra una fila seleccionada para mover el bloque.
          </p>
        }
        @if (showPaginationFooter()) {
          <ng-container *ngTemplateOutlet="paginationFooter" />
        }
      </ng-template>

      <ng-template #adminListCards>
        @for (item of visibleItems(); track item.id) {
          <mat-card
            appearance="outlined"
            class="content-list__card-item"
            [class.content-list__card-item--novelty]="item.isNovelty && !isNowPlaying(item.id)"
            [class.content-list__card-item--on-air]="isNowPlaying(item.id)"
            [attr.aria-label]="isNowPlaying(item.id) ? 'En pantalla: ' + item.title : null"
          >
            @if (item.mediaFile?.mediaUrl) {
              <button
                type="button"
                class="content-list__card-thumb-button"
                [attr.aria-label]="'Vista ampliada de ' + item.title"
                (click)="openTapPreview(item)"
              >
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
              </button>
            }
            <mat-card-content>
              <div class="content-list__card-select">
                <mat-checkbox
                  [checked]="isSelected(item.id)"
                  (change)="toggleSelection(item.id, $event.checked)"
                  [attr.aria-label]="'Seleccionar ' + item.title"
                />
                @if (reorderEnabled()) {
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
                <span> · Orden {{ item.displayOrder }}</span>
              </p>
              <p class="content-list__card-rotation">
                {{ rotationSummary(item) }}
                @if (item.isNovelty) {
                  <app-status-chip label="Nov." kind="warning" icon="new_releases" ariaLabel="Novedad" />
                }
              </p>
            </mat-card-content>
            <mat-card-actions class="app-card-actions content-list__card-actions">
              <button
                mat-icon-button
                color="primary"
                type="button"
                (click)="showOnScreen(item)"
                [disabled]="facade.saving() || !item.isActive || item.isFixed === true"
                matTooltip="Mostrar en pantalla"
                [attr.aria-label]="'Mostrar en pantalla ' + item.title"
              >
                <mat-icon aria-hidden="true">play_circle</mat-icon>
              </button>
              <a
                mat-icon-button
                color="primary"
                [routerLink]="['/admin/content', item.id, 'edit']"
                matTooltip="Editar"
                [attr.aria-label]="'Editar ' + item.title"
              >
                <mat-icon aria-hidden="true">edit</mat-icon>
              </a>
              <button
                mat-icon-button
                color="warn"
                type="button"
                (click)="remove(item)"
                [disabled]="facade.saving()"
                matTooltip="Eliminar"
                [attr.aria-label]="'Eliminar ' + item.title"
              >
                <mat-icon aria-hidden="true">delete</mat-icon>
              </button>
            </mat-card-actions>
          </mat-card>
        }
        @if (!reorderEnabled() && !noveltyFilterOnly()) {
          <p class="content-list__filter-hint" data-testid="content-pagination-reorder-hint">
            Muestra todas las filas para reordenar.
          </p>
        }
        @if (showPaginationFooter()) {
          <ng-container *ngTemplateOutlet="paginationFooter" />
        }
      </ng-template>
    </app-admin-list>

    <ng-template #paginationFooter>
      <div class="content-list__pagination" data-testid="content-pagination">
        <mat-form-field appearance="outline" class="content-list__page-size" subscriptSizing="dynamic">
          <mat-label>Filas por página</mat-label>
          <mat-select
            [value]="pageSize()"
            (selectionChange)="onPageSizeChange($event.value)"
            data-testid="content-page-size"
          >
            @for (size of pageSizeOptions; track size) {
              <mat-option [value]="size">{{ pageSizeLabel(size) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        @if (pageSize() !== 'all' && filteredTotal() > 0) {
          <span class="content-list__page-range" data-testid="content-page-range">{{ paginationLabel() }}</span>
          <button
            mat-icon-button
            type="button"
            [disabled]="!canGoPrevious()"
            (click)="goToPreviousPage()"
            aria-label="Página anterior"
            data-testid="content-page-prev"
          >
            <mat-icon aria-hidden="true">chevron_left</mat-icon>
          </button>
          <button
            mat-icon-button
            type="button"
            [disabled]="!canGoNext()"
            (click)="goToNextPage()"
            aria-label="Página siguiente"
            data-testid="content-page-next"
          >
            <mat-icon aria-hidden="true">chevron_right</mat-icon>
          </button>
        }
      </div>
    </ng-template>
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
        border-collapse: collapse;
      }
      .content-list__table .mat-mdc-cell,
      .content-list__table .mat-mdc-header-cell {
        padding-top: 4px;
        padding-bottom: 4px;
        vertical-align: middle;
      }
      .content-list__select-cell {
        width: 40px;
        padding-left: 8px;
        padding-right: 0;
      }
      .content-list__thumb-cell {
        width: 56px;
        padding-right: 4px;
        vertical-align: middle;
      }
      .content-list__thumb-button,
      .content-list__card-thumb-button {
        display: block;
        padding: 0;
        border: none;
        background: transparent;
        cursor: zoom-in;
        border-radius: 4px;
      }
      .content-list__thumb-button:focus-visible,
      .content-list__card-thumb-button:focus-visible {
        outline: 2px solid var(--mat-sys-primary);
        outline-offset: 2px;
      }
      .content-list__card-thumb-button {
        width: 100%;
        cursor: pointer;
      }
      .content-list__thumb {
        width: 48px;
        height: 48px;
        object-fit: cover;
        border-radius: 4px;
        display: block;
        background: var(--mat-sys-surface-container);
      }
      .content-list__thumb-placeholder {
        width: 48px;
        height: 48px;
        font-size: 28px;
        line-height: 48px;
        text-align: center;
        display: inline-block;
        color: var(--mat-sys-on-surface-variant);
        background: var(--mat-sys-surface-container);
        border-radius: 4px;
      }
      .content-list__truncate {
        display: inline-block;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        vertical-align: middle;
      }
      .content-list__rotation {
        display: inline-flex;
        flex-wrap: nowrap;
        align-items: center;
        gap: 4px;
        max-width: 220px;
      }
      .content-list__rotation .content-list__truncate {
        max-width: 100px;
      }
      .content-list__actions-header,
      .content-list__actions-cell {
        width: 120px;
        text-align: right;
        vertical-align: middle;
        white-space: nowrap;
      }
      .content-list__actions-slot {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
      .content-list__actions {
        display: inline-flex;
        align-items: center;
        gap: 0;
      }
      .content-list__row {
        cursor: grab;
      }
      .content-list__row--novelty {
        background: color-mix(in srgb, var(--status-warning-container) 35%, transparent);
      }
      .content-list__row--on-air {
        background: color-mix(in srgb, #facc15 32%, transparent);
      }
      .content-list__row--on-air.content-list__row--novelty {
        background: color-mix(in srgb, #facc15 32%, transparent);
      }
      .content-list__row.cdk-drag-preview {
        background: var(--mat-sys-surface-container);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
      }
      .content-list__row.cdk-drag-placeholder {
        opacity: 0.4;
      }
      .content-list__selection-hint,
      .content-list__filter-hint,
      .content-list__stale-hint,
      .content-list__on-air-hint {
        margin: 8px 4px 0;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
      }
      .content-list__pagination {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
        padding: 0 4px 4px;
      }
      .content-list__page-size {
        width: 140px;
        margin: 0;
      }
      .content-list__page-range {
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        min-width: 96px;
        text-align: center;
      }
      .content-list__card-item {
        display: block;
        background: var(--mat-sys-surface);
      }
      .content-list__card-item--novelty {
        border-color: var(--status-warning-container);
        background: color-mix(in srgb, var(--status-warning-container) 20%, var(--mat-sys-surface));
      }
      .content-list__card-item--on-air {
        border-color: #facc15;
        background: color-mix(in srgb, #facc15 24%, var(--mat-sys-surface));
      }
      .content-list__card-item--on-air.content-list__card-item--novelty {
        border-color: #facc15;
        background: color-mix(in srgb, #facc15 24%, var(--mat-sys-surface));
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
      .content-list__card-meta,
      .content-list__card-rotation {
        margin: 4px 0 0;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
      }
      .content-list__card-rotation {
        display: inline-flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        margin-top: 6px;
      }
      .content-list__card-actions {
        padding: 0 8px 8px;
        min-height: 40px;
      }
    `
  ]
})
export class ContentListComponent implements OnInit {
  protected readonly colors = injectExtendedColors();
  protected readonly facade = inject(ContentFacade);
  private readonly stream = inject(AdminContentStreamService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(ConfirmDialogService);
  private readonly previewService = inject(MediaHoverPreviewService);

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
  protected readonly pageSizeOptions = CLIENT_PAGE_SIZE_OPTIONS;
  protected readonly pageSizeLabel = pageSizeLabel;
  protected readonly streamStale = computed(() => this.stream.stale());
  protected readonly nowPlayingContentId = this.stream.nowPlayingContentId;
  protected readonly nowPlayingTitle = this.stream.nowPlayingTitle;
  protected readonly showOffPageHint = computed(() => {
    const contentId = this.nowPlayingContentId();
    const title = this.nowPlayingTitle();
    if (!contentId || !title) {
      return false;
    }
    return !this.visibleItems().some((item) => item.id === contentId);
  });

  protected readonly selection = signal<ReadonlySet<string>>(new Set());
  protected readonly noveltyFilterOnly = signal(false);
  protected readonly pageSize = signal<ClientPageSize>(readContentListPageSize());
  protected readonly pageIndex = signal(0);

  protected readonly filteredItems = computed(() => {
    const items = this.facade.items();
    return this.noveltyFilterOnly() ? items.filter((item) => item.isNovelty === true) : items;
  });
  protected readonly filteredTotal = computed(() => this.filteredItems().length);
  protected readonly paginatedItems = computed(() =>
    slicePage(this.filteredItems(), this.pageIndex(), this.pageSize())
  );
  protected readonly visibleItems = this.paginatedItems;
  protected readonly reorderEnabled = computed(
    () => this.pageSize() === 'all' && !this.noveltyFilterOnly()
  );
  protected readonly paginationLabel = computed(() =>
    formatPaginationRange(this.pageIndex(), this.pageSize(), this.filteredTotal()).label
  );

  protected readonly listEmpty = computed(() => {
    if (this.facade.loading() || this.facade.error()) {
      return false;
    }
    if (this.facade.items().length === 0) {
      return true;
    }
    return this.noveltyFilterOnly() && this.filteredItems().length === 0;
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
  private readonly rows = computed(() => this.paginatedItems());
  protected readonly allChecked = computed(() => {
    const items = this.rows();
    if (items.length === 0) return false;
    const selected = this.selection();
    return items.every((item) => selected.has(item.id));
  });
  protected readonly someChecked = computed(() => {
    const items = this.rows();
    if (items.length === 0) return false;
    const selected = this.selection();
    return items.some((item) => selected.has(item.id)) && !this.allChecked();
  });

  constructor() {
    effect(() => {
      const total = this.filteredTotal();
      const size = this.pageSize();
      const clamped = clampPageIndex(this.pageIndex(), total, size);
      if (clamped !== this.pageIndex()) {
        this.pageIndex.set(clamped);
      }
    });
  }

  ngOnInit(): void {
    this.facade.refresh().subscribe();
    this.stream.start();
    this.stream.inventoryChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reconcileFromServer());
    this.destroyRef.onDestroy(() => this.stream.stop());
  }

  protected onRefresh(): void {
    this.stream.markFresh();
    this.facade.refresh().subscribe();
  }

  private reconcileFromServer(): void {
    const previousSelection = this.selection();
    this.facade.refresh({ silent: true }).subscribe({
      next: () => {
        const itemIds = new Set(this.facade.items().map((item) => item.id));
        const pruned = new Set([...previousSelection].filter((id) => itemIds.has(id)));
        if (pruned.size !== previousSelection.size) {
          this.selection.set(pruned);
        }
      }
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.previewService.hideImmediate();
  }

  protected showPaginationFooter(): boolean {
    return this.filteredTotal() > 0;
  }

  protected canGoPrevious(): boolean {
    return this.pageIndex() > 0;
  }

  protected canGoNext(): boolean {
    const size = this.pageSize();
    if (size === 'all') {
      return false;
    }
    return this.pageIndex() < pageCount(this.filteredTotal(), size) - 1;
  }

  protected goToPreviousPage(): void {
    if (!this.canGoPrevious()) {
      return;
    }
    this.clearSelection();
    this.pageIndex.update((index) => index - 1);
  }

  protected goToNextPage(): void {
    if (!this.canGoNext()) {
      return;
    }
    this.clearSelection();
    this.pageIndex.update((index) => index + 1);
  }

  protected onPageSizeChange(size: ClientPageSize): void {
    this.pageSize.set(size);
    writeContentListPageSize(size);
    this.pageIndex.set(0);
    this.clearSelection();
  }

  protected onNoveltyFilterChange(checked: boolean): void {
    this.noveltyFilterOnly.set(checked);
    this.pageIndex.set(0);
    this.clearSelection();
  }

  protected openPreview(trigger: EventTarget | null, item: ContentItem): void {
    const config = this.previewConfig(item);
    if (!config || !(trigger instanceof HTMLElement)) {
      return;
    }
    this.previewService.showHover(trigger, config);
  }

  protected closePreview(): void {
    this.previewService.scheduleHide();
  }

  protected openTapPreview(item: ContentItem): void {
    const config = this.previewConfig(item);
    if (!config) {
      return;
    }
    this.previewService.showTap(config);
  }

  protected onDragStarted(): void {
    this.previewService.hideImmediate();
    this.stream.setDragDeferred(true);
  }

  protected onDragEnded(): void {
    this.stream.setDragDeferred(false);
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

  protected toggleAll(checked: boolean): void {
    const items = this.rows();
    if (items.length === 0) return;
    if (checked) {
      this.selection.set(new Set(items.map((item) => item.id)));
    } else {
      this.clearSelection();
    }
  }

  private clearSelection(): void {
    this.selection.set(new Set());
  }

  private previewConfig(item: ContentItem): MediaPreviewConfig | null {
    const mediaUrl = item.mediaFile?.mediaUrl;
    if (!mediaUrl) {
      return null;
    }
    return { mediaUrl, contentType: item.contentType };
  }

  protected removeSelected(): void {
    const ids = Array.from(this.selection());
    if (ids.length === 0) return;
    const ref = this.dialog.open({
      title: `¿Eliminar ${ids.length} elemento${ids.length === 1 ? '' : 's'}?`,
      message: 'Se eliminarán de la rotación. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      destructive: true
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed !== true) {
        return;
      }
      this.facade.removeMany(ids).subscribe(() => {
        this.clearSelection();
        if (this.facade.error() === null) {
          this.snackBar.open(
            `Eliminado${ids.length === 1 ? '' : 's'} ${ids.length} elemento${ids.length === 1 ? '' : 's'}.`,
            'Cerrar',
            { duration: 3000 }
          );
        }
      });
    });
  }

  protected setActiveSelected(isActive: boolean): void {
    const ids = Array.from(this.selection());
    if (ids.length === 0) {
      return;
    }
    const items = this.facade.items().filter((item) => ids.includes(item.id));
    if (items.length === 0) {
      return;
    }
    const ref = this.dialog.open({
      title: `${isActive ? 'Activar' : 'Desactivar'} ${items.length} elemento${items.length === 1 ? '' : 's'}?`,
      message: isActive
        ? 'Los elementos seleccionados aparecerán en la rotación del quiosco en la siguiente actualización.'
        : 'Los elementos seleccionados no se mostrarán hasta que se reactiven.',
      confirmLabel: isActive ? 'Activar' : 'Desactivar',
      cancelLabel: 'Cancelar'
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed !== true) {
        return;
      }
      this.facade.setActiveMany(items, isActive).subscribe(() => {
        this.clearSelection();
        if (this.facade.error() === null) {
          this.snackBar.open(
            `${isActive ? 'Activado' : 'Desactivado'}${items.length === 1 ? '' : 's'} ${items.length} elemento${items.length === 1 ? '' : 's'}.`,
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

  protected isNowPlaying(id: string): boolean {
    return this.nowPlayingContentId() === id;
  }

  protected canMove(item: ContentItem, direction: -1 | 1): boolean {
    if (!this.reorderEnabled()) {
      return false;
    }
    const items = this.filteredItems();
    const index = items.findIndex((row) => row.id === item.id);
    const target = index + direction;
    return index >= 0 && target >= 0 && target < items.length;
  }

  protected moveItem(item: ContentItem, direction: -1 | 1): void {
    if (!this.canMove(item, direction)) {
      return;
    }
    const items = this.filteredItems();
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
        return 'Foto';
      case 'video':
        return 'Vídeo';
      default:
        return type;
    }
  }

  protected mediaLabel(item: ContentItem): string {
    if (item.mediaFile) {
      return item.mediaFile.originalFilename;
    }
    return 'Fuente externa';
  }

  protected rotationSummary(item: ContentItem): string {
    const duration = item.effectiveDurationSeconds ?? item.durationSeconds;
    const animation: RotationAnimation | null | undefined =
      item.effectiveRotationAnimation ?? item.rotationAnimation;
    const durationLabel = duration ? `${duration}s` : 'predeterminado';
    const animationLabel = animation ?? 'predeterminado';
    return `${durationLabel}, ${animationLabel}`;
  }

  protected onDrop(event: CdkDragDrop<ContentItem>): void {
    if (!this.reorderEnabled()) {
      return;
    }
    const ids = this.filteredItems().map((item) => item.id);
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

    this.clearSelection();
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
      message: 'Se eliminará de la rotación. Esta acción no se puede deshacer.',
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

  protected showOnScreen(item: ContentItem): void {
    this.facade.showOnScreen(item.id).subscribe(() => {
      if (this.facade.error() === null) {
        this.snackBar.open(`Mostrando ${item.title} en pantalla.`, 'Cerrar', { duration: 3000 });
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
