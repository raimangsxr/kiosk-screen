import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';

import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatDividerModule],
  template: `
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
      <button mat-menu-item type="button" (click)="signOut()">
        <mat-icon aria-hidden="true">logout</mat-icon>
        <span>Sign out</span>
      </button>
    </mat-menu>
  `,
  styles: [
    `
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
  private readonly router = inject(Router);

  protected signOut(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }
}
