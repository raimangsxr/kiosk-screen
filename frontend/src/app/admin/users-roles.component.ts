import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminApiService, UserRecord } from './admin-api.service';
import { AdminStateComponent } from '../shared/admin-state.component';
import { mapAdminError } from '../shared/admin-error-mapper';

@Component({
  selector: 'app-users-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminStateComponent],
  template: `
    <section class="page-panel">
      <h2>Users and roles</h2>
      <form class="inline-form" (ngSubmit)="submit()">
        <label>Email <input name="email" type="email" [(ngModel)]="email" required></label>
        <label>Name <input name="displayName" [(ngModel)]="displayName" required></label>
        <label><input name="active" type="checkbox" [(ngModel)]="isActive"> Active</label>
        <fieldset>
          <legend>Roles</legend>
          <label *ngFor="let role of availableRoles">
            <input type="checkbox" [name]="role" [checked]="roles.includes(role)" (change)="setRole(role, $event)">
            {{ role }}
          </label>
        </fieldset>
        <button type="submit">{{ editingId ? 'Save user' : 'Create user' }}</button>
        <button *ngIf="editingId" type="button" (click)="resetForm()">Cancel</button>
      </form>
      <p role="status" *ngIf="saved">Saved</p>
      <p role="alert" *ngIf="error">{{ error }}</p>
      <app-admin-state *ngIf="!error && !users.length" type="empty" title="No users yet" message="Create an administrator or operator account." />
      <table *ngIf="users.length" aria-label="Users and roles">
        <tr><th>Email</th><th>Name</th><th>Status</th><th>Roles</th><th>Actions</th></tr>
        <tr *ngFor="let user of users">
          <td>{{ user.email }}</td>
          <td>{{ user.displayName }}</td>
          <td>{{ user.isActive ? 'Active' : 'Inactive' }}</td>
          <td>{{ user.roles.join(', ') }}</td>
          <td><button type="button" (click)="edit(user)">Edit</button></td>
        </tr>
      </table>
    </section>
  `
})
export class UsersRolesComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  readonly availableRoles = ['administrator', 'content_manager', 'advertising_manager', 'event_operator', 'display_viewer'];
  users: UserRecord[] = [];
  editingId = '';
  email = '';
  displayName = '';
  isActive = true;
  roles: string[] = ['display_viewer'];
  saved = false;
  error = '';

  ngOnInit(): void {
    this.load();
  }

  submit(): void {
    this.saved = false;
    this.error = '';
    const payload = { email: this.email, displayName: this.displayName, isActive: this.isActive, roles: this.roles };
    const request = this.editingId ? this.api.updateUser(this.editingId, payload) : this.api.createUser(payload);
    request.subscribe({
      next: () => {
        this.saved = true;
        this.resetForm();
        this.load();
      },
      error: (error) => {
        this.error = mapAdminError(error, 'User could not be saved.');
      }
    });
  }

  edit(user: UserRecord): void {
    this.editingId = user.id;
    this.email = user.email;
    this.displayName = user.displayName;
    this.isActive = user.isActive;
    this.roles = [...user.roles];
  }

  setRole(role: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.roles = checked ? [...new Set([...this.roles, role])] : this.roles.filter((item) => item !== role);
  }

  resetForm(): void {
    this.editingId = '';
    this.email = '';
    this.displayName = '';
    this.isActive = true;
    this.roles = ['display_viewer'];
  }

  private load(): void {
    this.api.listUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (error) => {
        this.error = mapAdminError(error, 'Users could not be loaded.');
      }
    });
  }
}
