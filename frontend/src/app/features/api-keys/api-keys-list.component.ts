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
import { AdminListComponent } from '../../shared/ui/admin/admin-list.component';
import { StatusChipComponent } from '../../shared/ui/status-chip.component';
import { ConfirmDialogService } from '../../shared/ui/confirm-dialog/confirm-dialog.service';

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
    AdminListComponent,
    StatusChipComponent,
  ],
  template: `
    <app-admin-list
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
      <button adminListActions mat-flat-button color="primary" type="button" (click)="onCreate()" data-testid="create-key">
        <mat-icon>add</mat-icon>
        Create key
      </button>
      <ng-template #adminListTable>
        <table mat-table [dataSource]="facade.keys()" aria-label="API keys" class="app-table api-keys-list__table">
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
              @if (key.lastRotatedAt) {
                <span>{{ key.lastRotatedAt | date: 'short' }}</span>
              } @else {
                <span class="api-keys-list__never">Never</span>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="lastUsedAt">
            <th mat-header-cell *matHeaderCellDef>Last used</th>
            <td mat-cell *matCellDef="let key">
              @if (key.lastUsedAt) {
                <span>{{ key.lastUsedAt | date: 'short' }}</span>
              } @else {
                <span class="api-keys-list__never">Never</span>
              }
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
              <button
                mat-button
                type="button"
                (click)="onDelete(key.id, key.label)"
                [disabled]="key.isActive || facade.saving()"
                data-testid="delete-key"
              >
                <mat-icon>delete_outline</mat-icon> Delete
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </ng-template>

      <ng-template #adminListCards>
        @for (key of facade.keys(); track key.id) {
          <mat-card appearance="outlined" class="api-keys-list__card-item">
            <mat-card-content>
              <div class="api-keys-list__card-header">
                <h3 class="api-keys-list__card-title">{{ key.label }}</h3>
                <app-status-chip
                  [label]="key.isActive ? 'Active' : 'Revoked'"
                  [kind]="key.isActive ? 'success' : 'neutral'"
                />
              </div>

              <dl class="api-keys-list__card-meta">
                <div>
                  <dt>Prefix</dt>
                  <dd><code>{{ key.keyPrefix }}</code></dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{{ key.createdAt | date: 'short' }}</dd>
                </div>
                <div>
                  <dt>Last rotated</dt>
                  <dd>{{ key.lastRotatedAt ? (key.lastRotatedAt | date: 'short') : 'Never' }}</dd>
                </div>
                <div>
                  <dt>Last used</dt>
                  <dd>{{ key.lastUsedAt ? (key.lastUsedAt | date: 'short') : 'Never' }}</dd>
                </div>
              </dl>
            </mat-card-content>

            <mat-card-actions class="app-card-actions api-keys-list__card-actions">
              <button
                mat-button
                type="button"
                (click)="onRotate(key.id, key.label)"
                [disabled]="!key.isActive || facade.saving()"
                data-testid="rotate-key"
              >
                <mat-icon>autorenew</mat-icon>
                Rotate
              </button>
              <button
                mat-button
                color="warn"
                type="button"
                (click)="onRevoke(key.id, key.label)"
                [disabled]="!key.isActive || facade.saving()"
                data-testid="revoke-key"
              >
                <mat-icon>block</mat-icon>
                Revoke
              </button>
              <button
                mat-button
                type="button"
                (click)="onDelete(key.id, key.label)"
                [disabled]="key.isActive || facade.saving()"
                data-testid="delete-key"
              >
                <mat-icon>delete_outline</mat-icon>
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
      .api-keys-list__table {
        width: 100%;
        min-width: 880px;
      }
      .api-keys-list__never {
        color: var(--mat-sys-on-surface-variant);
        font-style: italic;
      }
      .api-keys-list__table th {
        color: var(--mat-sys-on-surface-variant);
        font-weight: 600;
      }
      .api-keys-list__table td,
      .api-keys-list__table th {
        white-space: nowrap;
      }
      .api-keys-list__table code {
        padding: 2px 6px;
        border-radius: var(--mat-sys-corner-extra-small);
        background: var(--mat-sys-surface-container);
        color: var(--mat-sys-on-surface);
      }
      .api-keys-list__card-item {
        display: block;
        min-width: 0;
        overflow: hidden;
        background: var(--mat-sys-surface);
      }
      .api-keys-list__card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-width: 0;
      }
      .api-keys-list__card-title {
        margin: 0;
        min-width: 0;
        overflow-wrap: anywhere;
        font: var(--mat-sys-title-medium);
        letter-spacing: var(--mat-sys-title-medium-tracking);
      }
      .api-keys-list__card-meta {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(136px, 1fr));
        gap: 12px;
        margin: 16px 0 0;
        min-width: 0;
      }
      .api-keys-list__card-meta div {
        min-width: 0;
      }
      .api-keys-list__card-meta dt {
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-label-small);
        letter-spacing: var(--mat-sys-label-small-tracking);
      }
      .api-keys-list__card-meta dd {
        margin: 3px 0 0;
        min-width: 0;
        overflow-wrap: anywhere;
        color: var(--mat-sys-on-surface);
        font: var(--mat-sys-body-medium);
        letter-spacing: var(--mat-sys-body-medium-tracking);
      }
      .api-keys-list__card-meta code {
        padding: 2px 6px;
        border-radius: var(--mat-sys-corner-extra-small);
        background: var(--mat-sys-surface-container);
      }
      .api-keys-list__card-actions {
        flex-wrap: wrap;
        gap: 4px;
        padding: 0 16px 12px;
      }
    `,
  ],
})
export class ApiKeysListComponent implements OnInit {
  readonly facade = inject(ApiKeysFacade);
  private readonly dialog = inject(MatDialog);
  private readonly confirmDialog = inject(ConfirmDialogService);
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

  readonly refreshAction = { route: '/admin/api-keys', label: 'Refresh', icon: 'refresh' };

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
    this.confirmDialog
      .confirm({
        title: `Rotate ${label}?`,
        message: 'The current API key value will stop working immediately.',
        confirmLabel: 'Rotate',
        cancelLabel: 'Cancel',
        destructive: true,
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed !== true) {
          return;
        }
        this.openRotateDialog(id, label);
      });
  }

  onRevoke(id: string, label: string): void {
    this.confirmDialog
      .confirm({
        title: `Revoke ${label}?`,
        message: 'This key will no longer authorize public content uploads. This cannot be undone.',
        confirmLabel: 'Revoke',
        cancelLabel: 'Cancel',
        destructive: true,
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed !== true) {
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
      });
  }

  onDelete(id: string, label: string): void {
    this.confirmDialog
      .confirm({
        title: `Delete ${label}?`,
        message: 'This permanently removes the key from the list. The audit trail is preserved. This cannot be undone.',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        destructive: true,
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed !== true) {
          return;
        }
        this.facade.delete(id).subscribe({
          next: () => {
            this.snackBar.open('API key deleted.', 'Dismiss', { duration: 4000 });
            this.facade.refresh().subscribe();
          },
          error: () => {
            // Error already mapped to facade.error
          },
        });
      });
  }

  private openRotateDialog(id: string, label: string): void {
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
}
