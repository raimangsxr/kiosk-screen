import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AdminToolbarComponent } from '../../core/layout/admin-toolbar.component';
import { UserMenuComponent } from '../../core/layout/user-menu.component';
import { BreakpointService } from '../../core/layout/breakpoint.service';
import { AdminNavigationService } from './admin-navigation.service';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatToolbarModule,
    MatDividerModule,
    AdminToolbarComponent,
    UserMenuComponent
  ],
  template: `
    <app-admin-toolbar
      [title]="toolbarTitle()"
      [showMenu]="isHandset()"
      (menuToggled)="toggleSidenav()"
    >
      <app-user-menu />
    </app-admin-toolbar>

    <mat-sidenav-container class="admin-shell" [hasBackdrop]="isHandset()">
      <mat-sidenav
        #sidenav
        class="admin-shell__sidenav"
        [mode]="sidenavMode()"
        [opened]="sidenavOpened()"
        [autoFocus]="isHandset() ? 'first-tabbable' : false"
        [disableClose]="!isHandset()"
      >
        <mat-nav-list aria-label="Admin sections">
          @for (item of navigation.items; track item.route) {
            <a
              mat-list-item
              class="admin-shell__nav-item"
              [routerLink]="item.route"
              [activated]="isRouteActive(item.route, item.exact)"
              [disableRipple]="true"
              routerLinkActive="admin-shell__nav-active"
              [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
              (click)="onNavItemClick()"
            >
              <mat-icon matListItemIcon aria-hidden="true">{{ iconFor(item.route) }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
              <span matListItemLine class="admin-shell__nav-summary">{{ item.summary }}</span>
            </a>
          }
        </mat-nav-list>
        <div class="admin-shell__footer">
          <mat-divider />
          <a
            mat-stroked-button
            routerLink="/hall"
            class="admin-shell__footer-button"
            (click)="onNavItemClick()"
          >
            <mat-icon aria-hidden="true">home</mat-icon>
            Back to hall
          </a>
          <a
            mat-flat-button
            color="primary"
            routerLink="/display"
            class="admin-shell__footer-button"
            (click)="onNavItemClick()"
          >
            <mat-icon aria-hidden="true">play_circle</mat-icon>
            Enter kiosk mode
          </a>
        </div>
      </mat-sidenav>

      <mat-sidenav-content>
        <main class="admin-shell__main app-page" tabindex="-1">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: var(--mat-sys-surface-container-lowest);
      }
      .admin-shell {
        min-height: calc(100vh - var(--app-touch-target));
        background: var(--mat-sys-surface-container-lowest);
      }
      .admin-shell__sidenav {
        width: 280px;
        background: var(--mat-sys-surface-container);
        border-right: 1px solid var(--mat-sys-outline-variant);
        display: flex;
        flex-direction: column;
      }
      .admin-shell__sidenav mat-nav-list {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      }
      .admin-shell__nav-item {
        margin: 3px 0;
        border-radius: 12px;
        --mat-list-list-item-container-shape: 12px;
        --mdc-list-list-item-container-shape: 12px;
        --mat-list-list-item-selected-container-color: var(--mat-sys-secondary-container);
        --mdc-list-list-item-selected-container-color: var(--mat-sys-secondary-container);
      }
      .admin-shell__nav-item:focus-visible {
        outline: 2px solid var(--mat-sys-primary);
        outline-offset: -2px;
      }
      .admin-shell__nav-summary {
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
      }
      .admin-shell__nav-active {
        color: var(--mat-sys-on-primary-container);
        box-shadow: inset 3px 0 0 var(--mat-sys-primary);
      }
      .admin-shell__nav-active mat-icon {
        color: var(--mat-sys-primary);
      }
      .admin-shell__footer {
        padding: 12px 16px 16px;
        display: grid;
        gap: 12px;
      }
      .admin-shell__footer-button {
        width: 100%;
        min-height: var(--app-touch-target);
      }
      .admin-shell__main {
        padding-top: 16px;
        padding-bottom: 32px;
      }
      @media (max-width: 599.98px) {
        .admin-shell__sidenav {
          width: min(82vw, 320px);
        }
      }
    `
  ]
})
export class AdminShellComponent implements OnInit {
  private readonly breakpoint = inject(BreakpointService);
  private readonly router = inject(Router);
  protected readonly navigation = inject(AdminNavigationService);
  private readonly sidenav = viewChild<MatSidenav>('sidenav');

  protected readonly isHandset = this.breakpoint.isHandset;
  protected readonly sidenavMode = computed<'over' | 'side'>(() => (this.breakpoint.isCompact() ? 'over' : 'side'));
  protected readonly sidenavOpened = computed(() => !this.breakpoint.isCompact());
  protected readonly toolbarTitle = signal('Administration');
  protected readonly currentUrl = signal('');

  ngOnInit(): void {
    this.currentUrl.set(this.router.url);
    this.updateToolbarTitle(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        this.updateToolbarTitle(event.urlAfterRedirects);
        if (this.isHandset()) {
          this.sidenav()?.close();
        }
      });
  }

  protected toggleSidenav(): void {
    this.sidenav()?.toggle();
  }

  protected onNavItemClick(): void {
    if (this.isHandset()) {
      this.sidenav()?.close();
    }
  }

  protected isRouteActive(route: string, exact = false): boolean {
    const url = this.currentUrl();
    return exact ? url === route : url === route || url.startsWith(route + '/');
  }

  protected iconFor(route: string): string {
    if (route === '/admin') {
      return 'dashboard';
    }
    if (route.startsWith('/admin/content')) {
      return 'photo_library';
    }
    if (route.startsWith('/admin/ads')) {
      return 'campaign';
    }
    if (route.startsWith('/admin/iframes')) {
      return 'web_asset';
    }
    if (route.startsWith('/admin/configuration')) {
      return 'tune';
    }
    if (route.startsWith('/admin/readiness')) {
      return 'fact_check';
    }
    if (route.startsWith('/admin/remote-control')) {
      return 'cast_connected';
    }
    if (route.startsWith('/admin/users')) {
      return 'group';
    }
    if (route.startsWith('/admin/api-keys')) {
      return 'vpn_key';
    }
    return 'arrow_forward';
  }

  private updateToolbarTitle(url: string): void {
    const item = this.navigation.items.find((entry) => {
      if (entry.exact) {
        return url === entry.route;
      }
      return url === entry.route || url.startsWith(entry.route + '/');
    });
    this.toolbarTitle.set(item?.label ?? 'Administration');
  }
}
