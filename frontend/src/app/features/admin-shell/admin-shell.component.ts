import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';

import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';

import { AdminToolbarComponent } from '../../core/layout/admin-toolbar.component';
import { AdminRouteContextService } from '../../core/layout/admin-route-context.service';
import { BreakpointService } from '../../core/layout/breakpoint.service';
import { UserMenuComponent } from '../../core/layout/user-menu.component';
import { BreadcrumbComponent } from '../../shared/ui/breadcrumb/breadcrumb.component';
import { AdminNavDrawerComponent } from './admin-nav-drawer.component';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    MatSidenavModule,
    AdminToolbarComponent,
    UserMenuComponent,
    BreadcrumbComponent,
    AdminNavDrawerComponent
  ],
  template: `
    <app-admin-toolbar
      [title]="routeContext.title()"
      [subtitle]="routeContext.subtitle()"
      [showMenu]="showOverlayNav()"
      (menuToggled)="toggleSidenav()"
    >
      <app-user-menu />
    </app-admin-toolbar>

    <mat-sidenav-container class="admin-shell" [hasBackdrop]="showOverlayNav()">
      <mat-sidenav
        #sidenav
        class="admin-shell__sidenav"
        [mode]="sidenavMode()"
        [opened]="sidenavOpened()"
        [autoFocus]="showOverlayNav() ? 'first-tabbable' : false"
        [disableClose]="!showOverlayNav()"
      >
        <app-admin-nav-drawer
          [currentUrl]="currentUrl()"
          (navigate)="onNavItemClick()"
        />
      </mat-sidenav>

      <mat-sidenav-content>
        <main class="admin-shell__main app-page" tabindex="-1">
          @if (!showOverlayNav()) {
            <app-breadcrumb />
          }
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styleUrl: './admin-shell.component.scss'
})
export class AdminShellComponent implements OnInit {
  private readonly breakpoint = inject(BreakpointService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly routeContext = inject(AdminRouteContextService);
  private readonly sidenav = viewChild<MatSidenav>('sidenav');

  protected readonly showOverlayNav = this.breakpoint.showOverlayNav;
  protected readonly sidenavMode = computed<'over' | 'side'>(() =>
    this.showOverlayNav() ? 'over' : 'side'
  );
  protected readonly sidenavOpened = computed(() => !this.showOverlayNav());
  protected readonly currentUrl = signal(this.router.url);

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        if (this.showOverlayNav()) {
          this.sidenav()?.close();
        }
      });
  }

  protected toggleSidenav(): void {
    this.sidenav()?.toggle();
  }

  protected onNavItemClick(): void {
    if (this.showOverlayNav()) {
      this.sidenav()?.close();
    }
  }
}
