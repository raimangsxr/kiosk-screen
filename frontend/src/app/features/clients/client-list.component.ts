import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ClientsFacade } from './clients.facade';
import { AdminStateComponent } from '../../shared/admin-state.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SectionActionsComponent } from '../../shared/ui/section-actions/section-actions.component';
import { Client } from '../../ads/ads-api.service';

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
    MatProgressBarModule,
    MatSnackBarModule,
    AdminStateComponent,
    PageHeaderComponent,
    SectionActionsComponent
  ],
  template: `
    <app-page-header
      eyebrow="Administration"
      title="Clients"
      description="Clients own the ads shown in the bottom region. Deactivate a client to keep its ads out of rotation."
    />

    <app-section-actions [actions]="headerActions" />

    <mat-card appearance="outlined" class="client-list__card">
      <mat-card-header>
        <mat-card-title>{{ facade.clients().length }} client{{ facade.clients().length === 1 ? '' : 's' }}</mat-card-title>
        <mat-card-subtitle>Delete is blocked when ads depend on a client. Use deactivate instead.</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <mat-progress-bar *ngIf="facade.loading()" mode="indeterminate" aria-label="Loading clients" />
        <app-admin-state
          *ngIf="facade.error() as error"
          type="error"
          title="Clients unavailable"
          [message]="error.message"
        />
        <app-admin-state
          *ngIf="facade.empty()"
          type="empty"
          title="No clients yet"
          message="Create a client before uploading ads."
          actionLabel="Add client"
          actionRoute="/admin/clients/new"
        />

        <table
          *ngIf="facade.ready()"
          mat-table
          [dataSource]="facade.clients()"
          aria-label="Clients"
          class="client-list__table"
        >
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let client">{{ client.name }}</td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let client">
              <span class="status-pill" [class.blocked]="!client.isActive">
                {{ client.isActive ? 'Active' : 'Inactive' }}
              </span>
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
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      .client-list__card {
        margin-top: 16px;
      }
      .client-list__table {
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
export class ClientListComponent implements OnInit {
  protected readonly facade = inject(ClientsFacade);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly displayedColumns = ['name', 'status', 'actions'] as const;

  protected readonly headerActions = [
    { label: 'Refresh', route: '/admin/clients', kind: 'secondary' as const },
    { label: 'Add client', route: '/admin/clients/new', kind: 'primary' as const }
  ];

  ngOnInit(): void {
    this.facade.refresh().subscribe();
  }

  protected toggle(client: Client): void {
    this.facade.toggleActive(client).subscribe(() => {
      if (this.facade.error() === null) {
        const next = !client.isActive;
        this.snackBar.open(`${client.name} ${next ? 'reactivated' : 'deactivated'}.`, 'Dismiss', { duration: 3000 });
      }
    });
  }

  protected remove(client: Client): void {
    if (!window.confirm(`Delete ${client.name}? Deactivate it instead if it has active ads.`)) {
      return;
    }
    this.facade.remove(client.id).subscribe(() => {
      if (this.facade.error() === null) {
        this.snackBar.open(`Deleted ${client.name}.`, 'Dismiss', { duration: 3000 });
      }
    });
  }
}
