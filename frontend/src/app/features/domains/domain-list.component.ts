import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { DomainsFacade } from './domains.facade';
import { AdminStateComponent } from '../../shared/admin-state.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SectionActionsComponent } from '../../shared/ui/section-actions/section-actions.component';
import { ApprovedDomain } from '../../admin/admin-api.service';

@Component({
  selector: 'app-domain-list',
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
      title="Approved iframe domains"
      description="Hosts that iframe content may load from. Deactivate to keep them out of the allow-list."
    />

    <app-section-actions [actions]="headerActions" />

    <mat-card appearance="outlined" class="domain-list__card">
      <mat-card-header>
        <mat-card-title>{{ facade.domains().length }} domain{{ facade.domains().length === 1 ? '' : 's' }}</mat-card-title>
        <mat-card-subtitle>Delete is blocked when iframe content depends on a domain. Use deactivate instead.</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <mat-progress-bar *ngIf="facade.loading()" mode="indeterminate" aria-label="Loading domains" />
        <app-admin-state
          *ngIf="facade.error() as error"
          type="error"
          title="Approved domains unavailable"
          [message]="error.message"
        />
        <app-admin-state
          *ngIf="facade.empty()"
          type="empty"
          title="No approved domains yet"
          message="Approve a domain before creating iframe content."
          actionLabel="Add domain"
          actionRoute="/admin/domains/new"
        />

        <table
          *ngIf="facade.ready()"
          mat-table
          [dataSource]="facade.domains()"
          aria-label="Approved domains"
          class="domain-list__table"
        >
          <ng-container matColumnDef="domain">
            <th mat-header-cell *matHeaderCellDef>Domain</th>
            <td mat-cell *matCellDef="let item">{{ item.domain }}</td>
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
              <a mat-button color="primary" [routerLink]="['/admin/domains', item.id, 'edit']" [attr.aria-label]="'Edit ' + item.domain">
                <mat-icon aria-hidden="true">edit</mat-icon> Edit
              </a>
              <button mat-button type="button" (click)="toggle(item)" [disabled]="facade.saving()" [attr.aria-label]="(item.isActive ? 'Deactivate ' : 'Reactivate ') + item.domain">
                <mat-icon aria-hidden="true">{{ item.isActive ? 'pause' : 'play_arrow' }}</mat-icon>
                {{ item.isActive ? 'Deactivate' : 'Reactivate' }}
              </button>
              <button mat-button color="warn" type="button" (click)="remove(item)" [disabled]="facade.saving()" [attr.aria-label]="'Delete ' + item.domain">
                <mat-icon aria-hidden="true">delete</mat-icon> Delete
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
      .domain-list__card { margin-top: 16px; }
      .domain-list__table { width: 100%; }
      .status-pill {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 999px;
        background: #dcfce7;
        color: #166534;
        font-size: 12px;
        font-weight: 600;
      }
      .status-pill.blocked { background: #fee2e2; color: #991b1b; }
      mat-progress-bar { margin-bottom: 12px; }
    `
  ]
})
export class DomainListComponent implements OnInit {
  protected readonly facade = inject(DomainsFacade);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly displayedColumns = ['domain', 'status', 'actions'] as const;

  protected readonly headerActions = [
    { label: 'Refresh', route: '/admin/domains', kind: 'secondary' as const },
    { label: 'Add domain', route: '/admin/domains/new', kind: 'primary' as const }
  ];

  ngOnInit(): void {
    this.facade.refresh().subscribe();
  }

  protected toggle(item: ApprovedDomain): void {
    this.facade.toggleActive(item).subscribe(() => {
      if (this.facade.error() === null) {
        const next = !item.isActive;
        this.snackBar.open(`${item.domain} ${next ? 'reactivated' : 'deactivated'}.`, 'Dismiss', { duration: 3000 });
      }
    });
  }

  protected remove(item: ApprovedDomain): void {
    if (!window.confirm(`Delete ${item.domain}? Deactivate it instead if active iframe content depends on it.`)) {
      return;
    }
    this.facade.remove(item.id).subscribe(() => {
      if (this.facade.error() === null) {
        this.snackBar.open(`Deleted ${item.domain}.`, 'Dismiss', { duration: 3000 });
      }
    });
  }
}
