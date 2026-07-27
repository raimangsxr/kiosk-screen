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
import { AdminListComponent } from '../../shared/ui/admin/admin-list.component';
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
    AdminListComponent,
    StatusChipComponent
  ],
  template: `
    <app-admin-list
      [title]="pageTitle"
      [description]="pageDescription"
      [loading]="facade.loading()"
      [error]="facade.error()"
      [empty]="facade.empty()"
      [primaryAction]="primaryAction"
      [refreshAction]="refreshAction"
      emptyTitle="Aún no hay usuarios"
      emptyMessage="Crea una cuenta de administrador u operador."
      emptyActionLabel="Añadir usuario"
      emptyActionRoute="/admin/users/new"
      emptyIcon="group"
    >
      <ng-template #adminListTable>
        <table mat-table [dataSource]="facade.users()" aria-label="Usuarios y roles" class="app-table users-list__table">
          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Correo electrónico</th>
            <td mat-cell *matCellDef="let user">{{ user.email }}</td>
          </ng-container>

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Nombre</th>
            <td mat-cell *matCellDef="let user">{{ user.displayName }}</td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let user">
              <app-status-chip
                [label]="user.isActive ? 'Activo' : 'Inactivo'"
                [kind]="user.isActive ? 'success' : 'neutral'"
              />
            </td>
          </ng-container>

          <ng-container matColumnDef="roles">
            <th mat-header-cell *matHeaderCellDef>Roles</th>
            <td mat-cell *matCellDef="let user">
<mat-chip-set>
               @for (role of user.roles; track role) {
                 <mat-chip>{{ role }}</mat-chip>
               }
             </mat-chip-set>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let user">
              <a
                mat-button
                color="primary"
                [routerLink]="['/admin/users', user.id, 'edit']"
                [attr.aria-label]="'Edit ' + user.email"
              >
                <mat-icon aria-hidden="true">edit</mat-icon>
                Editar
              </a>
              <button
                mat-button
                type="button"
                (click)="toggle(user)"
                [disabled]="facade.saving()"
                [attr.aria-label]="(user.isActive ? 'Desactivar ' : 'Reactivar ') + user.email"
              >
                <mat-icon aria-hidden="true">{{ user.isActive ? 'pause' : 'play_arrow' }}</mat-icon>
                {{ user.isActive ? 'Desactivar' : 'Reactivar' }}
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </ng-template>

      <ng-template #adminListCards>
        @for (user of facade.users(); track user.id) {
          <mat-card appearance="outlined" class="users-list__card-item">
            <mat-card-content>
              <div class="users-list__card-header">
                <div class="users-list__card-id">
                  <h3 class="users-list__card-name">{{ user.displayName || user.email }}</h3>
                  <p class="users-list__card-email">{{ user.email }}</p>
                </div>
                <app-status-chip
                  [label]="user.isActive ? 'Activo' : 'Inactivo'"
                  [kind]="user.isActive ? 'success' : 'neutral'"
                />
              </div>
              <mat-chip-set class="users-list__card-roles">
                @for (role of user.roles; track role) {
                  <mat-chip>{{ role }}</mat-chip>
                }
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
                Editar
              </a>
              <button
                mat-button
                type="button"
                (click)="toggle(user)"
                [disabled]="facade.saving()"
                [attr.aria-label]="(user.isActive ? 'Desactivar ' : 'Reactivar ') + user.email"
              >
                <mat-icon aria-hidden="true">{{ user.isActive ? 'pause' : 'play_arrow' }}</mat-icon>
                {{ user.isActive ? 'Desactivar' : 'Reactivar' }}
              </button>
            </mat-card-actions>
          </mat-card>
        }
      </ng-template>
    </app-admin-list>
  `,
  styles: [
    `
      .users-list__table {
        width: 100%;
        background: transparent;
        table-layout: fixed;
      }
      .users-list__table td,
      .users-list__table th {
        overflow-wrap: anywhere;
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
        overflow-wrap: anywhere;
        font: var(--mat-sys-title-medium);
        letter-spacing: var(--mat-sys-title-medium-tracking);
      }
      .users-list__card-email {
        margin: 2px 0 0;
        overflow-wrap: anywhere;
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

  protected readonly pageTitle = 'Usuarios y roles';
  protected readonly pageDescription =
    'Cuentas autorizadas y su asignación de roles. Solo tipos de rol existentes.';
  protected readonly primaryAction = {
    label: 'Añadir usuario',
    route: '/admin/users/new',
    icon: 'person_add'
  };
  protected readonly refreshAction = { route: '/admin/users', label: 'Actualizar' };
  protected readonly displayedColumns = ['email', 'name', 'status', 'roles', 'actions'] as const;

  ngOnInit(): void {
    this.facade.refresh().subscribe();
  }

  protected toggle(user: UserRecord): void {
    this.facade.toggleActive(user).subscribe(() => {
      if (this.facade.error() === null) {
        const next = !user.isActive;
        this.snackBar.open(
          `${user.email} ${next ? 'reactivado' : 'desactivado'}.`,
          'Cerrar',
          { duration: 3000 }
        );
      }
    });
  }
}
