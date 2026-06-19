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
import { DataListComponent } from '../../shared/ui/data-list/data-list.component';
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
    DataListComponent,
    StatusChipComponent
  ],
  template: `
    <app-data-list
      [title]="pageTitle"
      [description]="pageDescription"
      [loading]="facade.loading()"
      [error]="facade.error()"
      errorTitle="Ads unavailable"
      [empty]="facade.empty()"
      [primaryAction]="primaryAction"
      [refreshAction]="refreshAction"
      emptyTitle="No ads yet"
      emptyMessage="Upload client image ads for the bottom region."
      emptyActionLabel="Add ad"
      emptyActionRoute="/admin/ads/new"
      emptyIcon="campaign"
    >
      <ng-template #dataListTable>
        <div
          cdkDropList
          class="ad-list__drop"
          (cdkDropListDropped)="onDrop($event)"
          aria-label="Drag to reorder ads"
        >
          <table mat-table [dataSource]="facade.ads()" aria-label="Ads" class="app-table ad-list__table">
            <ng-container matColumnDef="select">
              <th mat-header-cell *matHeaderCellDef class="ad-list__select-cell"></th>
              <td mat-cell *matCellDef="let ad" class="ad-list__select-cell">
                <mat-checkbox
                  [checked]="isSelected(ad.id)"
                  (change)="toggleSelection(ad.id, $event.checked)"
                  [attr.aria-label]="'Select ad for bulk reorder'"
                  data-testid="ad-select"
                />
              </td>
            </ng-container>

            <ng-container matColumnDef="order">
              <th mat-header-cell *matHeaderCellDef>Order</th>
              <td mat-cell *matCellDef="let ad">{{ ad.displayOrder }}</td>
            </ng-container>

            <ng-container matColumnDef="advertiser">
              <th mat-header-cell *matHeaderCellDef>Advertiser</th>
              <td mat-cell *matCellDef="let ad">{{ ad.advertiser || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="media">
              <th mat-header-cell *matHeaderCellDef>Media</th>
              <td mat-cell *matCellDef="let ad">{{ mediaLabel(ad) }}</td>
            </ng-container>

            <ng-container matColumnDef="rotation">
              <th mat-header-cell *matHeaderCellDef>Rotation</th>
              <td mat-cell *matCellDef="let ad">{{ rotationSummary(ad) }}</td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let ad">
                <app-status-chip
                  [label]="ad.isActive ? 'Active' : 'Inactive'"
                  [kind]="ad.isActive ? 'success' : 'neutral'"
                />
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let ad">
                <button
                  mat-button
                  color="primary"
                  type="button"
                  [routerLink]="['/admin/ads', ad.id, 'edit']"
                  [attr.aria-label]="'Edit ad ' + ad.id"
                >
                  <mat-icon aria-hidden="true">edit</mat-icon>
                  Edit
                </button>
                <button
                  mat-button
                  color="warn"
                  type="button"
                  (click)="remove(ad)"
                  [disabled]="facade.saving()"
                  [attr.aria-label]="'Delete ad ' + ad.id"
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
              class="ad-list__row"
            ></tr>
          </table>
        </div>
        @if (selection().size > 0) {
          <p class="ad-list__selection-hint" aria-live="polite">
            {{ selection().size }} ad(s) selected. Drag any selected row to move the selection as a block.
          </p>
        }
      </ng-template>

      <ng-template #dataListCards>
        @for (ad of facade.ads(); track ad.id) {
          <mat-card appearance="outlined" class="ad-list__card-item">
            <mat-card-content>
              <div class="ad-list__card-header">
                <h3 class="ad-list__card-title">Ad #{{ ad.displayOrder }}</h3>
                <app-status-chip
                  [label]="ad.isActive ? 'Active' : 'Inactive'"
                  [kind]="ad.isActive ? 'success' : 'neutral'"
                />
              </div>
            <p class="ad-list__card-meta">
              <span>{{ ad.advertiser || '—' }}</span>
              <span> · {{ mediaLabel(ad) }}</span>
              <span> · Order {{ ad.displayOrder }}</span>
            </p>
              <p class="ad-list__card-rotation">{{ rotationSummary(ad) }}</p>
            </mat-card-content>
            <mat-card-actions class="app-card-actions ad-list__card-actions">
              <a
                mat-button
                color="primary"
                [routerLink]="['/admin/ads', ad.id, 'edit']"
                [attr.aria-label]="'Edit ad ' + ad.id"
              >
                <mat-icon aria-hidden="true">edit</mat-icon>
                Edit
              </a>
              <button
                mat-button
                color="warn"
                type="button"
                (click)="remove(ad)"
                [disabled]="facade.saving()"
                [attr.aria-label]="'Delete ad ' + ad.id"
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
      .ad-list__drop {
        width: 100%;
        overflow-x: auto;
      }
      .ad-list__table {
        width: 100%;
        background: transparent;
      }
      .ad-list__select-cell {
        width: 48px;
        padding-left: 8px;
        padding-right: 0;
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
        background: var(--mat-sys-surface);
      }
      .ad-list__card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .ad-list__card-title {
        margin: 0;
        font: var(--mat-sys-title-medium);
        letter-spacing: var(--mat-sys-title-medium-tracking);
      }
      .ad-list__card-meta {
        margin: 4px 0 0;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
      }
      .ad-list__card-rotation {
        margin: 6px 0 0;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
      }
      .ad-list__card-actions {
        padding: 0 16px 12px;
      }
    `
  ]
})
export class AdListComponent implements OnInit {
  protected readonly facade = inject(AdsFacade);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(ConfirmDialogService);

  protected readonly pageTitle = 'Client ads';
  protected readonly pageDescription =
    'Image ads shown in the bottom region of the kiosk display. Drag rows to reorder.';
  protected readonly primaryAction = {
    label: 'Add ad',
    route: '/admin/ads/new',
    icon: 'add'
  };
  protected readonly refreshAction = { route: '/admin/ads', label: 'Refresh' };
  protected readonly displayedColumns = [
    'select',
    'order',
    'advertiser',
    'media',
    'rotation',
    'status',
    'actions'
  ] as const;

  protected readonly selection = signal<ReadonlySet<string>>(new Set());
  private readonly rows = computed(() => this.facade.ads());

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

  protected trackById(_index: number, ad: AdItem): string {
    return ad.id;
  }

  protected mediaLabel(ad: AdItem): string {
    if (ad.mediaFile) {
      return ad.mediaFile.originalFilename;
    }
    return ad.sourceReference ? 'External source' : 'No media';
  }

  protected rotationSummary(ad: AdItem): string {
    const duration = ad.effectiveDurationSeconds ?? ad.durationSeconds;
    const animation: RotationAnimation | null | undefined =
      ad.effectiveRotationAnimation ?? ad.rotationAnimation;
    const durationLabel = duration ? `${duration}s` : 'default';
    const animationLabel = animation ?? 'default';
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
          this.snackBar.open('Ads reordered.', 'Dismiss', { duration: 3000 });
        }
      }
    });
  }

  protected remove(ad: AdItem): void {
    const ref = this.dialog.open({
      title: `Delete ad #${ad.displayOrder}?`,
      message: 'This ad will be removed from rotation. The action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      destructive: true
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed !== true) {
        return;
      }
      this.facade.remove(ad.id).subscribe(() => {
        if (this.facade.error() === null) {
          this.snackBar.open(`Deleted ad #${ad.displayOrder}.`, 'Dismiss', { duration: 3000 });
        }
      });
    });
  }
}
