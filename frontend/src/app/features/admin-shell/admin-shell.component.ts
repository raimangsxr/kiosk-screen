import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';

import { AdminRouteContextService } from '../../core/layout/admin-route-context.service';
import { BreakpointService } from '../../core/layout/breakpoint.service';
import { UserMenuComponent } from '../../core/layout/user-menu.component';
import { AdminNavigationService } from './admin-navigation.service';
import { RemoteControlApi } from '../remote-control/remote-control.api';
import { adsLabel, modeLabel } from '../../shared/util/remote-control-labels';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, UserMenuComponent],
  template: `
    <div class="shell" [class.shell--collapsed]="collapsed()" [class.shell--railopen]="railOpen()">
      @if (railOpen()) {
        <div class="shell__scrim" (click)="railOpen.set(false)"></div>
      }

      <!-- ===== Sidebar rail ===== -->
      <aside class="rail" aria-label="Navegación de administración">
        <a class="rail__brand" routerLink="/admin" (click)="onNavigate()">
          <span class="rail__mark" aria-hidden="true"><mat-icon>connected_tv</mat-icon></span>
          <span class="rail__brandtext">
            <strong>Kiosk Screen</strong>
            <span class="mono">Consola</span>
          </span>
        </a>

        <nav class="nav">
          @for (group of navigation.groups; track group.id) {
            <div class="nav__group">
              <p class="nav__grouplabel"><span>{{ group.label }}</span></p>
              @for (item of group.items; track item.route) {
                <a
                  class="nav__item"
                  [routerLink]="item.route"
                  routerLinkActive="nav__item--active"
                  [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                  [title]="item.label"
                  (click)="onNavigate()"
                >
                  <mat-icon aria-hidden="true">{{ item.icon }}</mat-icon>
                  <span class="nav__label">{{ item.label }}</span>
                </a>
              }
            </div>
          }
        </nav>

        <!-- LIVE widget -->
        <div class="live">
          <div class="live__head">
            <span class="live__dot" aria-hidden="true"></span>
            <strong class="mono">En vivo</strong>
          </div>
          <div class="live__body">
            <div class="live__row"><span>Modo</span><b>{{ liveMode() }}</b></div>
            <div class="live__row"><span>Anuncios</span><b>{{ liveAds() }}</b></div>
          </div>
          <a class="btn btn--primary btn--sm btn--block live__cta" routerLink="/display">
            <mat-icon aria-hidden="true">play_arrow</mat-icon> Abrir display
          </a>
        </div>

        <div class="rail__foot">
          <a class="rail__foothref" routerLink="/hall" (click)="onNavigate()">
            <mat-icon aria-hidden="true">home</mat-icon>
            <span class="nav__label">Volver al hall</span>
          </a>
        </div>
      </aside>

      <!-- ===== Main column ===== -->
      <div class="main">
        <header class="topbar">
          <button class="iconbtn topbar__menu" type="button" (click)="railOpen.set(true)" aria-label="Abrir navegación">
            <mat-icon aria-hidden="true">menu</mat-icon>
          </button>
          <button class="iconbtn topbar__collapse" type="button" (click)="toggleCollapse()" aria-label="Contraer navegación">
            <mat-icon aria-hidden="true">dock_to_right</mat-icon>
          </button>

          <nav class="crumbs" aria-label="Ruta">
            <span>Administración</span>
            <span class="crumbs__sep" aria-hidden="true">/</span>
            <b>{{ routeContext.title() }}</b>
            @if (routeContext.subtitle(); as sub) {
              <span class="crumbs__sep" aria-hidden="true">/</span>
              <b>{{ sub }}</b>
            }
          </nav>

          <span class="topbar__spacer"></span>
          <div class="cmdk" aria-hidden="true">Buscar…<kbd class="mono">⌘K</kbd></div>
          <app-user-menu />
        </header>

        <main class="content app-page" tabindex="-1">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styleUrl: './admin-shell.component.scss'
})
export class AdminShellComponent implements OnInit {
  private readonly breakpoint = inject(BreakpointService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly remoteApi = inject(RemoteControlApi);
  protected readonly routeContext = inject(AdminRouteContextService);
  protected readonly navigation = inject(AdminNavigationService);

  protected readonly collapsed = signal(false);
  protected readonly railOpen = signal(false);
  protected readonly isCompact = this.breakpoint.showOverlayNav;

  private readonly live = signal<{ mode: string; ads: string } | null>(null);
  protected readonly liveMode = computed(() => this.live()?.mode ?? '—');
  protected readonly liveAds = computed(() => this.live()?.ads ?? '—');

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.railOpen.set(false));

    this.remoteApi
      .getState()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (state) =>
          this.live.set({
            mode: modeLabel(state.contentMode),
            ads: adsLabel(state.adsVisible !== false)
          }),
        error: () => this.live.set(null)
      });
  }

  protected toggleCollapse(): void {
    if (this.isCompact()) {
      this.railOpen.update((v) => !v);
    } else {
      this.collapsed.update((v) => !v);
    }
  }

  protected onNavigate(): void {
    this.railOpen.set(false);
  }
}
