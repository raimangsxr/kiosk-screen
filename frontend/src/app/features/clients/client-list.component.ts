import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

import { ClientsFacade } from './clients.facade';
import { Client } from '../../core/api/ads.api';
import { DataListComponent } from '../../shared/ui/data-list/data-list.component';
import { StatusChipComponent } from '../../shared/ui/status-chip.component';
import { ConfirmDialogService } from '../../shared/ui/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'app-client-list',
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
      [empty]="facade.empty()"
      [primaryAction]="primaryAction"
      [refreshAction]="refreshAction"
      emptyTitle="No clients yet"
      emptyMessage="Create a client before uploading ads."
      emptyActionLabel="Add client"
      emptyActionRoute="/admin/clients/new"
      emptyIcon="business"
    >
      <ng-template #dataListTable>
        <table mat-table [dataSource]="facade.clients()" aria-label="Clients" class="client-list__table">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let client">{{ client.name }}</td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let client">
              <app-status-chip
                [label]="client.isActive ? 'Active' : 'Inactive'"
                [kind]="client.isActive ? 'success' : 'neutral'"
              />
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let client">
              <a
                mat-button
                color="primary"
                [routerLink]="['/admin/clients', client.id, 'edit']"
                [attr.aria-label]="'Edit ' + client.name"
              >
                <mat-icon aria-hidden="true">edit</mat-icon>
                Edit
              </a>
              <button
                mat-button
                type="button"
                (click)="toggle(client)"
                [disabled]="facade.saving()"
                [attr.aria-label]="(client.isActive ? 'Deactivate ' : 'Reactivate ') + client.name"
              >
                <mat-icon aria-hidden="true">{{ client.isActive ? 'pause' : 'play_arrow' }}</mat-icon>
                {{ client.isActive ? 'Deactivate' : 'Reactivate' }}
              </button>
              <button
                mat-button
                color="warn"
                type="button"
                (click)="remove(client)"
                [disabled]="facade.saving()"
                [attr.aria-label]="'Delete ' + client.name"
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
        @for (client of facade.clients(); track client.id) {
          <mat-card appearance="outlined" class="client-list__card-item">
            <mat-card-content>
              <div class="client-list__card-header">
                <h3 class="client-list__card-title">{{ client.name }}</h3>
                <app-status-chip
                  [label]="client.isActive ? 'Active' : 'Inactive'"
                  [kind]="client.isActive ? 'success' : 'neutral'"
                />
              </div>
            </mat-card-content>
            <mat-card-actions class="client-list__card-actions">
              <a
                mat-button
                color="primary"
                [routerLink]="['/admin/clients', client.id, 'edit']"
                [attr.aria-label]="'Edit ' + client.name"
              >
                <mat-icon aria-hidden="true">edit</mat-icon>
                Edit
              </a>
              <button
                mat-button
                type="button"
                (click)="toggle(client)"
                [disabled]="facade.saving()"
                [attr.aria-label]="(client.isActive ? 'Deactivate ' : 'Reactivate ') + client.name"
              >
                <mat-icon aria-hidden="true">{{ client.isActive ? 'pause' : 'play_arrow' }}</mat-icon>
                {{ client.isActive ? 'Deactivate' : 'Reactivate' }}
              </button>
              <button
                mat-button
                color="warn"
                type="button"
                (click)="remove(client)"
                [disabled]="facade.saving()"
                [attr.aria-label]="'Delete ' + client.name"
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
      .client-list__table {
        width: 100%;
        background: transparent;
      }
      .client-list__card-item {
        display: block;
      }
      .client-list__card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .client-list__card-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      .client-list__card-actions {
        display: flex;
        gap: 8px;
        padding: 0 16px 12px;
        flex-wrap: wrap;
      }
    `
  ]
})
export class ClientListComponent implements OnInit {
  protected readonly facade = inject(ClientsFacade);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(ConfirmDialogService);

  protected readonly pageTitle = 'Clients';
  protected readonly pageDescription =
    'Clients own the ads shown in the bottom region. Deactivate a client to keep its ads out of rotation.';
  protected readonly primaryAction = {
    label: 'Add client',
    route: '/admin/clients/new',
    icon: 'add'
  };
  protected readonly refreshAction = { route: '/admin/clients', label: 'Refresh' };
  protected readonly displayedColumns = ['name', 'status', 'actions'] as const;

  ngOnInit(): void {
    this.facade.refresh().subscribe();
  }

  protected toggle(client: Client): void {
    this.facade.toggleActive(client).subscribe(() => {
      if (this.facade.error() === null) {
        const next = !client.isActive;
        this.snackBar.open(
          `${client.name} ${next ? 'reactivated' : 'deactivated'}.`,
          'Dismiss',
          { duration: 3000 }
        );
      }
    });
  }

  protected remove(client: Client): void {
    const ref = this.dialog.open({
      title: `Delete ${client.name}?`,
      message: 'Deactivate the client instead if it has active ads.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      destructive: true
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed !== true) {
        return;
      }
      this.facade.remove(client.id).subscribe(() => {
        if (this.facade.error() === null) {
          this.snackBar.open(`Deleted ${client.name}.`, 'Dismiss', { duration: 3000 });
        }
      });
    });
  }
}
