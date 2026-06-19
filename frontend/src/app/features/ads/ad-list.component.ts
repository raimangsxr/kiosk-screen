import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
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
        <table mat-table [dataSource]="facade.ads()" aria-label="Ads" class="app-table ad-list__table">
          <ng-container matColumnDef="order">
            <th mat-header-cell *matHeaderCellDef>Order</th>
            <td mat-cell *matCellDef="let ad">{{ ad.displayOrder }}</td>
          </ng-container>

          <ng-container matColumnDef="label">
            <th mat-header-cell *matHeaderCellDef>Label</th>
            <td mat-cell *matCellDef="let ad">{{ ad.label }}</td>
          </ng-container>

          <ng-container matColumnDef="client">
            <th mat-header-cell *matHeaderCellDef>Client</th>
            <td mat-cell *matCellDef="let ad">{{ clientName(ad.clientId) }}</td>
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
              <a
                mat-button
                color="primary"
                [routerLink]="['/admin/ads', ad.id, 'edit']"
                [attr.aria-label]="'Edit ' + ad.label"
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
                [attr.aria-label]="'Delete ' + ad.label"
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
        @for (ad of facade.ads(); track ad.id) {
          <mat-card appearance="outlined" class="ad-list__card-item">
            <mat-card-content>
              <div class="ad-list__card-header">
                <h3 class="ad-list__card-title">{{ ad.label }}</h3>
                <app-status-chip
                  [label]="ad.isActive ? 'Active' : 'Inactive'"
                  [kind]="ad.isActive ? 'success' : 'neutral'"
                />
              </div>
              <p class="ad-list__card-meta">
                <span>{{ clientName(ad.clientId) }}</span>
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
                [attr.aria-label]="'Edit ' + ad.label"
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
                [attr.aria-label]="'Delete ' + ad.label"
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
      .ad-list__table {
        width: 100%;
        background: transparent;
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
    'Image ads shown in the bottom region of the kiosk display, ordered by display order.';
  protected readonly primaryAction = {
    label: 'Add ad',
    route: '/admin/ads/new',
    icon: 'add'
  };
  protected readonly refreshAction = { route: '/admin/ads', label: 'Refresh' };
  protected readonly displayedColumns = [
    'order',
    'label',
    'client',
    'media',
    'rotation',
    'status',
    'actions'
  ] as const;

  ngOnInit(): void {
    this.facade.refresh().subscribe();
    this.facade.loadClients().subscribe();
  }

  protected clientName(clientId: string): string {
    const client = this.facade.clients().find((c) => c.id === clientId);
    return client ? client.name : clientId;
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

  protected remove(ad: AdItem): void {
    const ref = this.dialog.open({
      title: `Delete ${ad.label}?`,
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
          this.snackBar.open(`Deleted ${ad.label}.`, 'Dismiss', { duration: 3000 });
        }
      });
    });
  }
}
