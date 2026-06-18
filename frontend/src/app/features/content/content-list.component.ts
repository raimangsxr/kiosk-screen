import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
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
    MatChipsModule,
    MatSnackBarModule,
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
        <table mat-table [dataSource]="facade.items()" aria-label="Top content items" class="content-list__table">
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
                [attr.aria-label]="'Edit ' + item.title"
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
                [attr.aria-label]="'Delete ' + item.title"
              >
                <mat-icon aria-hidden="true">delete</mat-icon>
                Delete
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
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
            <mat-card-actions class="content-list__card-actions">
              <a
                mat-button
                color="primary"
                [routerLink]="['/admin/content', item.id, 'edit']"
                [attr.aria-label]="'Edit ' + item.title"
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
                [attr.aria-label]="'Delete ' + item.title"
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
      .content-list__table {
        width: 100%;
        background: transparent;
      }
      .content-list__card-item {
        display: block;
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
        font-size: 16px;
        font-weight: 600;
      }
      .content-list__card-meta {
        margin: 4px 0 0;
        color: var(--mat-sys-on-surface-variant);
        font-size: 13px;
      }
      .content-list__card-rotation {
        margin: 6px 0 0;
        color: var(--mat-sys-on-surface-variant);
        font-size: 13px;
      }
      .content-list__card-actions {
        display: flex;
        gap: 8px;
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
    'Photos, videos, and embedded web content shown in the top region of the kiosk display.';
  protected readonly primaryAction = {
    label: 'Add content',
    route: '/admin/content/new',
    icon: 'add'
  };
  protected readonly refreshAction = { route: '/admin/content', label: 'Refresh' };
  protected readonly displayedColumns = [
    'order',
    'title',
    'type',
    'media',
    'rotation',
    'status',
    'actions'
  ] as const;

  ngOnInit(): void {
    this.facade.refresh().subscribe();
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
