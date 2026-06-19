import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

import { ApiKeysFacade } from './api-keys.facade';
import { ApiKeysApiKeyCreateDialogComponent } from './api-keys-create-dialog.component';
import { DataListComponent } from '../../shared/ui/data-list/data-list.component';
import { StatusChipComponent } from '../../shared/ui/status-chip.component';

@Component({
  selector: 'app-api-keys-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatSnackBarModule,
    DataListComponent,
    StatusChipComponent,
  ],
  template: `
    <app-data-list
      [title]="pageTitle"
      [description]="pageDescription"
      [loading]="facade.loading()"
      [error]="facade.error()"
      [empty]="facade.empty()"
      [refreshAction]="refreshAction"
      emptyTitle="No API keys yet"
      emptyMessage="Create a key to let external systems upload content to your kiosk."
      emptyActionLabel="Create key"
      emptyIcon="vpn_key"
      (refresh)="onRefresh()"
      (emptyAction)="onCreate()"
    >
      <button mat-flat-button color="primary" type="button" (click)="onCreate()" data-testid="create-key">
        <mat-icon>add</mat-icon>
        Create key
      </button>
      <ng-template #dataListTable>
        <table mat-table [dataSource]="facade.keys()" aria-label="API keys" class="api-keys-list__table">
          <ng-container matColumnDef="label">
            <th mat-header-cell *matHeaderCellDef>Label</th>
            <td mat-cell *matCellDef="let key">{{ key.label }}</td>
          </ng-container>

          <ng-container matColumnDef="prefix">
            <th mat-header-cell *matHeaderCellDef>Prefix</th>
            <td mat-cell *matCellDef="let key">
              <code>{{ key.keyPrefix }}</code>
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let key">
              <app-status-chip
                [label]="key.isActive ? 'Active' : 'Revoked'"
                [kind]="key.isActive ? 'success' : 'neutral'"
              />
            </td>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>Created</th>
            <td mat-cell *matCellDef="let key">{{ key.createdAt | date: 'short' }}</td>
          </ng-container>

          <ng-container matColumnDef="lastRotatedAt">
            <th mat-header-cell *matHeaderCellDef>Last rotated</th>
            <td mat-cell *matCellDef="let key">
              <span *ngIf="key.lastRotatedAt; else neverRotated">{{ key.lastRotatedAt | date: 'short' }}</span>
              <ng-template #neverRotated><span class="api-keys-list__never">Never</span></ng-template>
            </td>
          </ng-container>

          <ng-container matColumnDef="lastUsedAt">
            <th mat-header-cell *matHeaderCellDef>Last used</th>
            <td mat-cell *matCellDef="let key">
              <span *ngIf="key.lastUsedAt; else neverUsed">{{ key.lastUsedAt | date: 'short' }}</span>
              <ng-template #neverUsed><span class="api-keys-list__never">Never</span></ng-template>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let key">
              <button
                mat-button
                type="button"
                (click)="onRotate(key.id, key.label)"
                [disabled]="!key.isActive || facade.saving()"
                data-testid="rotate-key"
              >
                <mat-icon>autorenew</mat-icon> Rotate
              </button>
              <button
                mat-button
                color="warn"
                type="button"
                (click)="onRevoke(key.id, key.label)"
                [disabled]="!key.isActive || facade.saving()"
                data-testid="revoke-key"
              >
                <mat-icon>block</mat-icon> Revoke
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </ng-template>
    </app-data-list>
  `,
  styles: [
    `
      .api-keys-list__table {
        width: 100%;
      }
      .api-keys-list__never {
        color: rgba(0, 0, 0, 0.5);
        font-style: italic;
      }
    `,
  ],
})
export class ApiKeysListComponent implements OnInit {
  readonly facade = inject(ApiKeysFacade);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly pageTitle = 'API Keys';
  readonly pageDescription =
    'Manage bearer tokens that external systems use to upload images and videos to your kiosk.';

  readonly displayedColumns = [
    'label',
    'prefix',
    'status',
    'createdAt',
    'lastRotatedAt',
    'lastUsedAt',
    'actions',
  ];

  readonly refreshAction = { label: 'Refresh', icon: 'refresh' };

  ngOnInit(): void {
    this.facade.refresh().subscribe();
  }

  onRefresh(): void {
    this.facade.refresh().subscribe();
  }

  onCreate(): void {
    this.dialog
      .open(ApiKeysApiKeyCreateDialogComponent, {
        width: '480px',
        disableClose: true,
        data: { mode: 'create' },
      })
      .afterClosed()
      .subscribe((result: { action: 'created' | 'cancelled' } | undefined) => {
        if (result?.action === 'created') {
          this.snackBar.open('API key created.', 'Dismiss', { duration: 4000 });
          this.facade.refresh().subscribe();
        }
      });
  }

  onRotate(id: string, label: string): void {
    if (!window.confirm(`Rotate "${label}"? The current value will stop working immediately.`)) {
      return;
    }
    this.dialog
      .open(ApiKeysApiKeyCreateDialogComponent, {
        width: '480px',
        disableClose: true,
        data: { mode: 'rotate', keyId: id, keyLabel: label },
      })
      .afterClosed()
      .subscribe((result: { action: 'rotated' | 'cancelled' } | undefined) => {
        if (result?.action === 'rotated') {
          this.snackBar.open('API key rotated.', 'Dismiss', { duration: 4000 });
          this.facade.refresh().subscribe();
        }
      });
  }

  onRevoke(id: string, label: string): void {
    if (!window.confirm(`Revoke "${label}"? This cannot be undone.`)) {
      return;
    }
    this.facade.revoke(id).subscribe({
      next: () => {
        this.snackBar.open('API key revoked.', 'Dismiss', { duration: 4000 });
        this.facade.refresh().subscribe();
      },
      error: () => {
        // Error already mapped to facade.error
      },
    });
  }
}
