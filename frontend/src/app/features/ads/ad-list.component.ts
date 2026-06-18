import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AdsFacade } from './ads.facade';
import { AdminStateComponent } from '../../shared/admin-state.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SectionActionsComponent } from '../../shared/ui/section-actions/section-actions.component';
import { AdItem } from '../../ads/ads-api.service';
import { RotationAnimation } from '../../shared/media-upload.models';

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
    MatProgressBarModule,
    MatSnackBarModule,
    AdminStateComponent,
    PageHeaderComponent,
    SectionActionsComponent
  ],
  template: `
    <app-page-header
      eyebrow="Administration"
      title="Client ads"
      description="Image ads shown in the bottom region of the kiosk display, ordered by display order."
    />

    <app-section-actions [actions]="headerActions" />

    <mat-card appearance="outlined" class="ad-list__card">
      <mat-card-header>
        <mat-card-title>{{ facade.ads().length }} ad{{ facade.ads().length === 1 ? '' : 's' }}</mat-card-title>
        <mat-card-subtitle>Each ad belongs to a client and uses its own rotation settings.</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <mat-progress-bar *ngIf="facade.loading()" mode="indeterminate" aria-label="Loading ads" />
        <app-admin-state
          *ngIf="facade.error() as error"
          type="error"
          title="Ads unavailable"
          [message]="error.message"
        />
        <app-admin-state
          *ngIf="facade.empty()"
          type="empty"
          title="No ads yet"
          message="Upload client image ads for the bottom region."
          actionLabel="Add ad"
          actionRoute="/admin/ads/new"
        />

        <table
          *ngIf="facade.ready()"
          mat-table
          [dataSource]="facade.ads()"
          aria-label="Ads"
          class="ad-list__table"
        >
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
              <span class="status-pill" [class.blocked]="!ad.isActive">
                {{ ad.isActive ? 'Active' : 'Inactive' }}
              </span>
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
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      .ad-list__card {
        margin-top: 16px;
      }
      .ad-list__table {
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
export class AdListComponent implements OnInit {
  protected readonly facade = inject(AdsFacade);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly displayedColumns = [
    'order',
    'label',
    'client',
    'media',
    'rotation',
    'status',
    'actions'
  ] as const;

  protected readonly headerActions = [
    { label: 'Refresh', route: '/admin/ads', kind: 'secondary' as const },
    { label: 'Add ad', route: '/admin/ads/new', kind: 'primary' as const }
  ];

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
    if (!window.confirm(`Delete ${ad.label}?`)) {
      return;
    }
    this.facade.remove(ad.id).subscribe(() => {
      if (this.facade.error() === null) {
        this.snackBar.open(`Deleted ${ad.label}.`, 'Dismiss', { duration: 3000 });
      }
    });
  }
}
