import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ContentFacade } from './content.facade';
import { AdminStateComponent } from '../../shared/admin-state.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SectionActionsComponent } from '../../shared/ui/section-actions/section-actions.component';
import { ContentItem } from '../../content/content-api.service';
import { RotationAnimation } from '../../shared/media-upload.models';

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
    MatProgressBarModule,
    MatSnackBarModule,
    MatTooltipModule,
    AdminStateComponent,
    PageHeaderComponent,
    SectionActionsComponent
  ],
  template: `
    <app-page-header
      eyebrow="Administration"
      title="Top content"
      description="Photos, videos, and embedded web content shown in the top region of the kiosk display."
    />

    <app-section-actions [actions]="headerActions" />

    <mat-card appearance="outlined" class="content-list__card">
      <mat-card-header>
        <mat-card-title>{{ facade.items().length }} item{{ facade.items().length === 1 ? '' : 's' }}</mat-card-title>
        <mat-card-subtitle>Order, type, and rotation are honored at runtime.</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <mat-progress-bar *ngIf="facade.loading()" mode="indeterminate" aria-label="Loading content" />
        <app-admin-state
          *ngIf="facade.error() as error"
          type="error"
          title="Content unavailable"
          [message]="error.message"
        />
        <app-admin-state
          *ngIf="facade.empty()"
          type="empty"
          title="No content yet"
          message="Add photos, videos, or iframe content for the top region."
          actionLabel="Add content"
          actionRoute="/admin/content/new"
        />

        <table
          *ngIf="facade.ready() && facade.items().length > 0"
          mat-table
          [dataSource]="facade.items()"
          aria-label="Top content items"
          class="content-list__table"
        >
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
              <span class="status-pill" [class.blocked]="!item.isActive">
                {{ item.isActive ? 'Active' : 'Inactive' }}
              </span>
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
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      .content-list__card {
        margin-top: 16px;
      }
      .content-list__table {
        width: 100%;
      }
      .status-pill {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 999px;
        background: #dcfce7;
        color: #166534;
        font-size: 12px;
        font-weight: 600;
      }
      .status-pill.blocked {
        background: #fee2e2;
        color: #991b1b;
      }
      mat-progress-bar {
        margin-bottom: 12px;
      }
    `
  ]
})
export class ContentListComponent implements OnInit {
  protected readonly facade = inject(ContentFacade);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly displayedColumns = [
    'order',
    'title',
    'type',
    'media',
    'rotation',
    'status',
    'actions'
  ] as const;

  protected readonly headerActions = [
    { label: 'Refresh', route: '/admin/content', kind: 'secondary' as const },
    { label: 'Add content', route: '/admin/content/new', kind: 'primary' as const }
  ];

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
    if (!window.confirm(`Delete ${item.title}?`)) {
      return;
    }
    this.facade.remove(item.id).subscribe(() => {
      if (this.facade.error() === null) {
        this.snackBar.open(`Deleted ${item.title}.`, 'Dismiss', { duration: 3000 });
      }
    });
  }
}
