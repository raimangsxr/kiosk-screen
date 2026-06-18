import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminNavigationService } from './admin-navigation.service';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, MatButtonModule, MatDividerModule, MatListModule, MatSidenavModule, MatToolbarModule],
  template: `
    <mat-sidenav-container class="admin-layout">
      <mat-sidenav class="admin-sidebar" mode="side" opened>
        <mat-toolbar color="primary">Administration</mat-toolbar>
        <a class="kiosk-link" mat-raised-button routerLink="/display">Enter kiosk mode</a>
        <mat-divider />
        <nav aria-label="Admin sections">
          <mat-nav-list>
            <a mat-list-item
              *ngFor="let item of navigation.items"
              [routerLink]="item.route"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.exact ?? false }">
              <span matListItemTitle>{{ item.label }}</span>
              <span matListItemLine>{{ item.summary }}</span>
            </a>
          </mat-nav-list>
        </nav>
      </mat-sidenav>
      <mat-sidenav-content>
        <main class="admin-main">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `
})
export class AdminShellComponent {
  readonly navigation = inject(AdminNavigationService);
}
