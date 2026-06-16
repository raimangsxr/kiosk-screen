import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  template: `
    <section class="page-panel">
      <h1>Administration</h1>
      <nav aria-label="Admin sections">
        <a routerLink="/admin/domains">Approved domains</a>
        <a routerLink="/admin/configuration">Display configuration</a>
        <a routerLink="/admin/users">Users and roles</a>
      </nav>
      <router-outlet />
    </section>
  `
})
export class AdminShellComponent {}
