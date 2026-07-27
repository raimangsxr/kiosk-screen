import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { ChangePasswordDialogComponent } from '../../auth/change-password-dialog.component';
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
      class="user-menu__trigger"
      [attr.aria-label]="'Account menu for ' + auth.displayName()"
      [matMenuTriggerFor]="menu"
    >
      <span class="user-menu__avatar" aria-hidden="true">{{ auth.initials() }}</span>
    </button>

    <mat-menu #menu="matMenu" xPosition="before">
      <div class="user-menu__header" mat-menu-item disabled>
        <div class="user-menu__name">{{ auth.displayName() }}</div>
        <div class="user-menu__email">{{ auth.email() }}</div>
      </div>
      <mat-divider />
        <button mat-menu-item type="button" (click)="selectTheme('light')" [disabled]="theme.isLight()">
        <mat-icon aria-hidden="true">light_mode</mat-icon>
        <span>Tema claro</span>
      </button>
      <button mat-menu-item type="button" (click)="selectTheme('dark')" [disabled]="theme.isDark()">
        <mat-icon aria-hidden="true">dark_mode</mat-icon>
        <span>Tema oscuro</span>
      </button>
      <mat-divider />
      <button mat-menu-item type="button" (click)="theme.toggleDensity()" data-testid="user-menu-density">
        <mat-icon aria-hidden="true">{{ theme.isCompact() ? 'expand' : 'compress' }}</mat-icon>
        <span>{{ theme.isCompact() ? 'Vista cómoda' : 'Vista compacta' }}</span>
      </button>
      <mat-divider />
      <button mat-menu-item type="button" (click)="openChangePassword()">
        <mat-icon aria-hidden="true">password</mat-icon>
        <span>Cambiar contraseña</span>
      </button>
      <mat-divider />
      <button mat-menu-item type="button" (click)="signOut()">
        <mat-icon aria-hidden="true">logout</mat-icon>
        <span>Cerrar sesión</span>
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
      .user-menu__trigger {
        display: inline-grid;
        place-items: center;
        width: var(--app-touch-target);
        height: var(--app-touch-target);
        padding: 0;
        line-height: 1;
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
  protected readonly theme: ThemeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  protected readonly themeIcon = computed(() =>
    this.theme.isDark() ? 'light_mode' : 'dark_mode'
  );
  protected readonly themeLabel = computed(() =>
    this.theme.isDark() ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'
  );

  protected openChangePassword(): void {
    this.dialog.open(ChangePasswordDialogComponent, { autoFocus: 'first-tabbable' });
  }

  protected signOut(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  protected selectTheme(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }
}
