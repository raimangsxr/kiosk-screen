import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { UsersFacade, AVAILABLE_ROLES } from './users.facade';
import { AdminStateComponent } from '../../shared/admin-state.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SectionActionsComponent } from '../../shared/ui/section-actions/section-actions.component';
import { UserRecord } from '../../admin/admin-api.service';

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
    MatProgressBarModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatSnackBarModule,
    AdminStateComponent,
    PageHeaderComponent,
    SectionActionsComponent
  ],
  template: `
    <app-page-header
      eyebrow="Administration"
      title="Users and roles"
      description="Authorized accounts and their role assignment. Existing role types only."
    />

    <app-section-actions [actions]="headerActions" />

    <mat-card appearance="outlined" class="users-list__card">
      <mat-card-header>
        <mat-card-title>{{ facade.users().length }} user{{ facade.users().length === 1 ? '' : 's' }}</mat-card-title>
        <mat-card-subtitle>Roles determine which sections each user can access.</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <mat-progress-bar *ngIf="facade.loading()" mode="indeterminate" aria-label="Loading users" />
        <app-admin-state
          *ngIf="facade.error() as error"
          type="error"
          title="Users unavailable"
          [message]="error.message"
        />
        <app-admin-state
          *ngIf="facade.empty()"
          type="empty"
          title="No users yet"
          message="Create an administrator or operator account."
          actionLabel="Add user"
          actionRoute="/admin/users/new"
        />

        <table
          *ngIf="facade.ready()"
          mat-table
          [dataSource]="facade.users()"
          aria-label="Users and roles"
          class="users-list__table"
        >
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
              <span class="status-pill" [class.blocked]="!user.isActive">
                {{ user.isActive ? 'Active' : 'Inactive' }}
              </span>
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
              <a mat-button color="primary" [routerLink]="['/admin/users', user.id, 'edit']" [attr.aria-label]="'Edit ' + user.email">
                <mat-icon aria-hidden="true">edit</mat-icon> Edit
              </a>
              <button mat-button type="button" (click)="toggle(user)" [disabled]="facade.saving()" [attr.aria-label]="(user.isActive ? 'Deactivate ' : 'Reactivate ') + user.email">
                <mat-icon aria-hidden="true">{{ user.isActive ? 'pause' : 'play_arrow' }}</mat-icon>
                {{ user.isActive ? 'Deactivate' : 'Reactivate' }}
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
      .users-list__card { margin-top: 16px; }
      .users-list__table { width: 100%; }
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
export class UsersListComponent implements OnInit {
  protected readonly facade = inject(UsersFacade);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly displayedColumns = ['email', 'name', 'status', 'roles', 'actions'] as const;
  protected readonly availableRoles = AVAILABLE_ROLES;

  protected readonly headerActions = [
    { label: 'Refresh', route: '/admin/users', kind: 'secondary' as const },
    { label: 'Add user', route: '/admin/users/new', kind: 'primary' as const }
  ];

  ngOnInit(): void {
    this.facade.refresh().subscribe();
  }

  protected toggle(user: UserRecord): void {
    this.facade.toggleActive(user).subscribe(() => {
      if (this.facade.error() === null) {
        const next = !user.isActive;
        this.snackBar.open(`${user.email} ${next ? 'reactivated' : 'deactivated'}.`, 'Dismiss', { duration: 3000 });
      }
    });
  }
}
