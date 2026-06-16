import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';

import { AdminApiService, UserRecord } from './admin-api.service';

@Component({
  selector: 'app-users-roles',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section>
      <h2>Users and roles</h2>
      <table aria-label="Users and roles">
        <tr><th>Email</th><th>Name</th><th>Roles</th></tr>
        <tr *ngFor="let user of users">
          <td>{{ user.email }}</td>
          <td>{{ user.displayName }}</td>
          <td>{{ user.roles.join(', ') }}</td>
        </tr>
      </table>
    </section>
  `
})
export class UsersRolesComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  users: UserRecord[] = [];

  ngOnInit(): void {
    this.api.listUsers().subscribe((users) => {
      this.users = users;
    });
  }
}
