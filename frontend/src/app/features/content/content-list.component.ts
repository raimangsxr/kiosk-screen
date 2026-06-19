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
import { MatTableModule } from '@angular/material/table';

import { ContentFacade } from './content.facade';
import { ContentItem } from '../../core/api/content.api';
import { RotationAnimation } from '../../shared/media-upload.models';
import { DataListComponent } from '../../shared/ui/data-list/data-list.component';
import { StatusChipComponent } from '../../shared/ui/status-chip.component';
import { ConfirmDialogService } from '../../shared/ui/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'app-content-list',
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
    MatChipsModule,
    MatSnackBarModule,
    CdkDropList,
    CdkDrag,
    DataListComponent,
    StatusChipComponent
  ],
  template: `
    <app-data-list
      [title]="pageTitle"
      [description]="pageDescription"
      [loading]="facade.loading()"
      [error]="facade.error()"
      errorTitle="Content unavailable"
      [empty]="facade.empty()"
      [primaryAction]="primaryAction"
      [refreshAction]="refreshAction"
      emptyTitle="No content yet"
      emptyMessage="Add photos, videos, or iframe content for the top region."
      emptyActionLabel="Add content"
      emptyActionRoute="/admin/content/new"
      emptyIcon="photo_library"
    >
      <ng-template #dataListTable>
        <div
          cdkDropList
          class="content-list__drop"
          (cdkDropListDropped)="onDrop($event)"
          aria-label="Drag to reorder content items"
        >
          <table mat-table [dataSource]="facade.items()" aria-label="Top content items" class="app-table content-list__table">
            <ng-container matColumnDef="select">
              <th mat-header-cell *matHeaderCellDef class="content-list__select-cell"></th>
              <td mat-cell *matCellDef="let item" class="content-list__select-cell">
                <mat-checkbox
                  [checked]="isSelected(item.id)"
                  (change)="toggleSelection(item.id, $event.checked)"
                  [attr.aria-label]="'Select content for bulk reorder'"
                  data-testid="content-select"
                />
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
              <td mat-cell *matCellDef="let item">{{ rotationSummary(item) }}</td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let item">
                <app-status-chip
                  [label]="item.isActive ? 'Active' : 'Inactive'"
                  [kind]="item.isActive ? 'success' : 'neutral'"
                />
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let item">
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
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: displayedColumns; trackBy: trackById"
              cdkDrag
              [cdkDragData]="row"
              class="content-list__row"
            ></tr>
          </table>
        </div>
        @if (selection().size > 0) {
          <p class="content-list__selection-hint" aria-live="polite">
            {{ selection().size }} item(s) selected. Drag any selected row to move the selection as a block.
          </p>
        }
      </ng-template>

      <ng-template #dataListCards>
        @for (item of facade.items(); track item.id) {
          <mat-card appearance="outlined" class="content-list__card-item">
            <mat-card-content>
              <div class="content-list__card-header">
                <h3 class="content-list__card-title">{{ item.title }}</h3>
                <app-status-chip
                  [label]="item.isActive ? 'Active' : 'Inactive'"
                  [kind]="item.isActive ? 'success' : 'neutral'"
                />
              </div>
              <p class="content-list__card-meta">
                <span>{{ typeLabel(item.contentType) }}</span>
                <span> · {{ mediaLabel(item) }}</span>
                <span> · Order {{ item.displayOrder }}</span>
              </p>
              <p class="content-list__card-rotation">{{ rotationSummary(item) }}</p>
            </mat-card-content>
            <mat-card-actions class="app-card-actions content-list__card-actions">
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
    </app-data-list>
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
      .content-list__row {
        cursor: grab;
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
      .content-list__card-item {
        display: block;
        background: var(--mat-sys-surface);
      }
      .content-list__card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
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
      }
      .content-list__card-actions {
        padding: 0 16px 12px;
      }
    `
  ]
})
export class ContentListComponent implements OnInit {
  protected readonly facade = inject(ContentFacade);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(ConfirmDialogService);

  protected readonly pageTitle = 'Top content';
  protected readonly pageDescription =
    'Photos, videos, and embedded web content shown in the top region. Drag rows to reorder.';
  protected readonly primaryAction = {
    label: 'Add content',
    route: '/admin/content/new',
    icon: 'add'
  };
  protected readonly refreshAction = { route: '/admin/content', label: 'Refresh' };
  protected readonly displayedColumns = [
    'select',
    'order',
    'title',
    'type',
    'media',
    'rotation',
    'status',
    'actions'
  ] as const;

  protected readonly selection = signal<ReadonlySet<string>>(new Set());
  private readonly rows = computed(() => this.facade.items());

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

  protected trackById(_index: number, item: ContentItem): string {
    return item.id;
  }

  protected typeLabel(type: ContentItem['contentType']): string {
    switch (type) {
      case 'photo':
        return 'Photo';
      case 'video':
        return 'Video';
      case 'embedded_web':
        return 'Iframe';
      default:
        return type;
    }
  }

  protected mediaLabel(item: ContentItem): string {
    if (item.mediaFile) {
      return item.mediaFile.originalFilename;
    }
    if (item.contentType === 'embedded_web') {
      return 'Iframe';
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
}
