import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminNavigationService } from './admin-navigation.service';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <section class="admin-layout">
      <aside class="admin-sidebar">
        <h1>Administration</h1>
        <nav aria-label="Admin sections">
          <a *ngFor="let item of navigation.items"
             [routerLink]="item.route"
             routerLinkActive="active"
             [routerLinkActiveOptions]="{ exact: item.exact ?? false }">
            <span>{{ item.label }}</span>
            <small>{{ item.summary }}</small>
          </a>
      </nav>
      </aside>
      <main class="admin-main">
        <router-outlet />
      </main>
    </section>
  `
})
export class AdminShellComponent {
  readonly navigation = inject(AdminNavigationService);
}
