import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

import { UsersFacade } from './users.facade';
import { UserRecord } from '../../core/api/admin.api';
import { DataListComponent } from '../../shared/ui/data-list/data-list.component';
import { StatusChipComponent } from '../../shared/ui/status-chip.component';

@Component({
  selector: 'app-users-list',
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
      [empty]="facade.empty()"
      [primaryAction]="primaryAction"
      [refreshAction]="refreshAction"
      emptyTitle="No users yet"
      emptyMessage="Create an administrator or operator account."
      emptyActionLabel="Add user"
      emptyActionRoute="/admin/users/new"
      emptyIcon="group"
    >
      <ng-template #dataListTable>
        <table mat-table [dataSource]="facade.users()" aria-label="Users and roles" class="app-table users-list__table">
          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Email</th>
            <td mat-cell *matCellDef="let user">{{ user.email }}</td>
          </ng-container>

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let user">{{ user.displayName }}</td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let user">
              <app-status-chip
                [label]="user.isActive ? 'Active' : 'Inactive'"
                [kind]="user.isActive ? 'success' : 'neutral'"
              />
            </td>
          </ng-container>

          <ng-container matColumnDef="roles">
            <th mat-header-cell *matHeaderCellDef>Roles</th>
            <td mat-cell *matCellDef="let user">
              <mat-chip-set>
                <mat-chip *ngFor="let role of user.roles">{{ role }}</mat-chip>
              </mat-chip-set>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let user">
              <a
                mat-button
                color="primary"
                [routerLink]="['/admin/users', user.id, 'edit']"
                [attr.aria-label]="'Edit ' + user.email"
              >
                <mat-icon aria-hidden="true">edit</mat-icon>
                Edit
              </a>
              <button
                mat-button
                type="button"
                (click)="toggle(user)"
                [disabled]="facade.saving()"
                [attr.aria-label]="(user.isActive ? 'Deactivate ' : 'Reactivate ') + user.email"
              >
                <mat-icon aria-hidden="true">{{ user.isActive ? 'pause' : 'play_arrow' }}</mat-icon>
                {{ user.isActive ? 'Deactivate' : 'Reactivate' }}
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </ng-template>

      <ng-template #dataListCards>
        @for (user of facade.users(); track user.id) {
          <mat-card appearance="outlined" class="users-list__card-item">
            <mat-card-content>
              <div class="users-list__card-header">
                <div class="users-list__card-id">
                  <h3 class="users-list__card-name">{{ user.displayName || user.email }}</h3>
                  <p class="users-list__card-email">{{ user.email }}</p>
                </div>
                <app-status-chip
                  [label]="user.isActive ? 'Active' : 'Inactive'"
                  [kind]="user.isActive ? 'success' : 'neutral'"
                />
              </div>
              <mat-chip-set class="users-list__card-roles">
                <mat-chip *ngFor="let role of user.roles">{{ role }}</mat-chip>
              </mat-chip-set>
            </mat-card-content>
            <mat-card-actions class="app-card-actions users-list__card-actions">
              <a
                mat-button
                color="primary"
                [routerLink]="['/admin/users', user.id, 'edit']"
                [attr.aria-label]="'Edit ' + user.email"
              >
                <mat-icon aria-hidden="true">edit</mat-icon>
                Edit
              </a>
              <button
                mat-button
                type="button"
                (click)="toggle(user)"
                [disabled]="facade.saving()"
                [attr.aria-label]="(user.isActive ? 'Deactivate ' : 'Reactivate ') + user.email"
              >
                <mat-icon aria-hidden="true">{{ user.isActive ? 'pause' : 'play_arrow' }}</mat-icon>
                {{ user.isActive ? 'Deactivate' : 'Reactivate' }}
              </button>
            </mat-card-actions>
          </mat-card>
        }
      </ng-template>
    </app-data-list>
  `,
  styles: [
    `
      .users-list__table {
        width: 100%;
        background: transparent;
      }
      .users-list__card-item {
        display: block;
        background: var(--mat-sys-surface);
      }
      .users-list__card-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .users-list__card-name {
        margin: 0;
        font: var(--mat-sys-title-medium);
        letter-spacing: var(--mat-sys-title-medium-tracking);
      }
      .users-list__card-email {
        margin: 2px 0 0;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
      }
      .users-list__card-roles {
        margin-top: 8px;
      }
      .users-list__card-actions {
        padding: 0 16px 12px;
      }
    `
  ]
})
export class UsersListComponent implements OnInit {
  protected readonly facade = inject(UsersFacade);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly pageTitle = 'Users and roles';
  protected readonly pageDescription =
    'Authorized accounts and their role assignment. Existing role types only.';
  protected readonly primaryAction = {
    label: 'Add user',
    route: '/admin/users/new',
    icon: 'person_add'
  };
  protected readonly refreshAction = { route: '/admin/users', label: 'Refresh' };
  protected readonly displayedColumns = ['email', 'name', 'status', 'roles', 'actions'] as const;

  ngOnInit(): void {
    this.facade.refresh().subscribe();
  }

  protected toggle(user: UserRecord): void {
    this.facade.toggleActive(user).subscribe(() => {
      if (this.facade.error() === null) {
        const next = !user.isActive;
        this.snackBar.open(
          `${user.email} ${next ? 'reactivated' : 'deactivated'}.`,
          'Dismiss',
          { duration: 3000 }
        );
      }
    });
  }
}
