import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { AppLocale, LocaleService } from '../i18n/locale.service';
import { ThemeMode, ThemeService } from '../theme/theme.service';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatDividerModule],
  template: `
    <button
      mat-icon-button
      type="button"
      class="user-menu__icon-button"
      (click)="theme.toggle()"
      [attr.aria-label]="themeLabel()"
      data-testid="user-menu-theme"
    >
      <mat-icon aria-hidden="true">{{ themeIcon() }}</mat-icon>
    </button>

    <button
      mat-icon-button
      type="button"
      class="user-menu__locale-trigger"
      [matMenuTriggerFor]="localeMenu"
      [attr.aria-label]="localeLabel()"
      data-testid="user-menu-locale"
    >
      <span class="user-menu__locale-flag" aria-hidden="true">{{ localeShort() }}</span>
    </button>

    <button
      mat-icon-button
      type="button"
      class="user-menu__trigger"
      [attr.aria-label]="'Account menu for ' + auth.displayName()"
      [matMenuTriggerFor]="menu"
    >
      <span class="user-menu__avatar" aria-hidden="true">{{ auth.initials() }}</span>
    </button>

    <mat-menu #localeMenu="matMenu" xPosition="before">
      <div class="user-menu__header" mat-menu-item disabled>
        <div class="user-menu__name">Language</div>
        <div class="user-menu__email">Reload required after switching.</div>
      </div>
      @for (option of availableLocales; track option.code) {
        <button
          mat-menu-item
          type="button"
          (click)="selectLocale(option.code)"
          [class.user-menu__locale-active]="locale.locale() === option.code"
          [attr.aria-label]="option.label"
          [attr.data-testid]="'user-menu-locale-' + option.code"
        >
          <mat-icon aria-hidden="true">
            {{ locale.locale() === option.code ? 'check' : 'language' }}
          </mat-icon>
          <span>{{ option.label }}</span>
        </button>
      }
    </mat-menu>

    <mat-menu #menu="matMenu" xPosition="before">
      <div class="user-menu__header" mat-menu-item disabled>
        <div class="user-menu__name">{{ auth.displayName() }}</div>
        <div class="user-menu__email">{{ auth.email() }}</div>
      </div>
      <mat-divider />
      <button mat-menu-item type="button" (click)="selectTheme('light')" [disabled]="theme.isLight()">
        <mat-icon aria-hidden="true">light_mode</mat-icon>
        <span>Light theme</span>
      </button>
      <button mat-menu-item type="button" (click)="selectTheme('dark')" [disabled]="theme.isDark()">
        <mat-icon aria-hidden="true">dark_mode</mat-icon>
        <span>Dark theme</span>
      </button>
      <mat-divider />
      <button mat-menu-item type="button" (click)="signOut()">
        <mat-icon aria-hidden="true">logout</mat-icon>
        <span>Sign out</span>
      </button>
    </mat-menu>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .user-menu__icon-button,
      .user-menu__locale-trigger,
      .user-menu__trigger {
        display: inline-grid;
        place-items: center;
        width: var(--app-touch-target);
        height: var(--app-touch-target);
        padding: 0;
        line-height: 1;
      }
      .user-menu__locale-flag {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 36px;
        height: 36px;
        padding: 0 8px;
        border-radius: 18px;
        background: var(--mat-sys-surface-container);
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-label-large);
        letter-spacing: var(--mat-sys-label-large-tracking);
        font-weight: 600;
        line-height: 1;
      }
      .user-menu__locale-active {
        background: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container);
      }
      .user-menu__avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        line-height: 1;
        border-radius: 50%;
        background: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container);
        font: var(--mat-sys-label-large);
        letter-spacing: var(--mat-sys-label-large-tracking);
        font-weight: 600;
      }
      .user-menu__header {
        pointer-events: none;
        display: grid;
        gap: 2px;
        min-width: 200px;
      }
      .user-menu__name {
        font-weight: 600;
      }
      .user-menu__email {
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
        color: var(--mat-sys-on-surface-variant);
      }
    `
  ]
})
export class UserMenuComponent {
  protected readonly auth: AuthService = inject(AuthService);
  protected readonly locale: LocaleService = inject(LocaleService);
  protected readonly theme: ThemeService = inject(ThemeService);
  private readonly router = inject(Router);

  protected readonly availableLocales: ReadonlyArray<{ code: AppLocale; label: string }> = [
    { code: 'es-ES', label: 'Español' },
    { code: 'en-US', label: 'English' }
  ];

  protected readonly localeShort = computed(() => (this.locale.locale() === 'es-ES' ? 'ES' : 'EN'));
  protected readonly localeLabel = computed(
    () => `Language: ${this.locale.locale() === 'es-ES' ? 'Español' : 'English'} (change)`
  );

  protected readonly themeIcon = computed(() =>
    this.theme.isDark() ? 'light_mode' : 'dark_mode'
  );
  protected readonly themeLabel = computed(() =>
    this.theme.isDark() ? 'Switch to light theme' : 'Switch to dark theme'
  );

  protected signOut(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  protected selectLocale(locale: AppLocale): void {
    if (this.locale.locale() === locale) {
      return;
    }
    this.locale.setLocale(locale);
    // `@angular/localize` swaps strings at build time, so a full reload is
    // the only way to land the chosen locale in this SPA. The browser will
    // fetch the locale-specific bundle that nginx/serve decides from the
    // Accept-Language header / URL — this app intentionally ships two
    // independent builds rather than one runtime-translated bundle.
    if (typeof globalThis.location !== 'undefined') {
      globalThis.location.reload();
    }
  }

  protected selectTheme(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }
}