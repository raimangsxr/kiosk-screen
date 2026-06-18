import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

import { DomainsFacade } from './domains.facade';
import { ApprovedDomain } from '../../core/api/admin.api';
import { DataListComponent } from '../../shared/ui/data-list/data-list.component';
import { StatusChipComponent } from '../../shared/ui/status-chip.component';
import { ConfirmDialogService } from '../../shared/ui/confirm-dialog/confirm-dialog.service';

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
      errorTitle="Approved domains unavailable"
      [empty]="facade.empty()"
      [primaryAction]="primaryAction"
      [refreshAction]="refreshAction"
      emptyTitle="No approved domains yet"
      emptyMessage="Add a host before publishing iframe content from it."
      emptyActionLabel="Approve domain"
      emptyActionRoute="/admin/domains/new"
      emptyIcon="public"
    >
      <ng-template #dataListTable>
        <table mat-table [dataSource]="facade.domains()" aria-label="Approved domains" class="domain-list__table">
          <ng-container matColumnDef="domain">
            <th mat-header-cell *matHeaderCellDef>Domain</th>
            <td mat-cell *matCellDef="let domain">{{ domain.domain }}</td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let domain">
              <app-status-chip
                [label]="domain.isActive ? 'Active' : 'Inactive'"
                [kind]="domain.isActive ? 'success' : 'neutral'"
              />
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let domain">
              <a
                mat-button
                color="primary"
                [routerLink]="['/admin/domains', domain.id, 'edit']"
                [attr.aria-label]="'Edit ' + domain.domain"
              >
                <mat-icon aria-hidden="true">edit</mat-icon>
                Edit
              </a>
              <button
                mat-button
                color="warn"
                type="button"
                (click)="remove(domain)"
                [disabled]="facade.saving()"
                [attr.aria-label]="'Delete ' + domain.domain"
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
        @for (domain of facade.domains(); track domain.id) {
          <mat-card appearance="outlined" class="domain-list__card-item">
            <mat-card-content>
              <div class="domain-list__card-header">
                <h3 class="domain-list__card-title">{{ domain.domain }}</h3>
                <app-status-chip
                  [label]="domain.isActive ? 'Active' : 'Inactive'"
                  [kind]="domain.isActive ? 'success' : 'neutral'"
                />
              </div>
            </mat-card-content>
            <mat-card-actions class="domain-list__card-actions">
              <a
                mat-button
                color="primary"
                [routerLink]="['/admin/domains', domain.id, 'edit']"
                [attr.aria-label]="'Edit ' + domain.domain"
              >
                <mat-icon aria-hidden="true">edit</mat-icon>
                Edit
              </a>
              <button
                mat-button
                color="warn"
                type="button"
                (click)="remove(domain)"
                [disabled]="facade.saving()"
                [attr.aria-label]="'Delete ' + domain.domain"
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
      .domain-list__table {
        width: 100%;
        background: transparent;
      }
      .domain-list__card-item {
        display: block;
      }
      .domain-list__card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .domain-list__card-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        word-break: break-all;
      }
      .domain-list__card-actions {
        display: flex;
        gap: 8px;
        padding: 0 16px 12px;
        flex-wrap: wrap;
      }
    `
  ]
})
export class DomainListComponent implements OnInit {
  protected readonly facade = inject(DomainsFacade);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(ConfirmDialogService);

  protected readonly pageTitle = 'Approved iframe domains';
  protected readonly pageDescription =
    'Hosts that iframe content may load from. Deactivate to keep them out of the allow-list.';
  protected readonly primaryAction = {
    label: 'Approve domain',
    route: '/admin/domains/new',
    icon: 'add'
  };
  protected readonly refreshAction = { route: '/admin/domains', label: 'Refresh' };
  protected readonly displayedColumns = ['domain', 'status', 'actions'] as const;

  ngOnInit(): void {
    this.facade.refresh().subscribe();
  }

  protected remove(domain: ApprovedDomain): void {
    const ref = this.dialog.open({
      title: `Delete ${domain.domain}?`,
      message: 'Iframe content that depends on this domain will lose its source.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      destructive: true
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed !== true) {
        return;
      }
      this.facade.remove(domain.id).subscribe(() => {
        if (this.facade.error() === null) {
          this.snackBar.open(`Deleted ${domain.domain}.`, 'Dismiss', { duration: 3000 });
        }
      });
    });
  }
}
