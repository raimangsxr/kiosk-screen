import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-drawer-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatDividerModule],
  template: `
    <div class="drawer-header">
      <mat-icon aria-hidden="true" class="drawer-header__brand-icon">settings</mat-icon>
      <div class="drawer-header__brand">
        <p class="drawer-header__eyebrow">Kiosk Screen</p>
        <h2 class="drawer-header__title">Administration</h2>
      </div>
    </div>
    @if (auth.user(); as user) {
      <div class="drawer-header__user" aria-label="Signed in user">
        <span class="drawer-header__avatar" aria-hidden="true">{{ auth.initials() }}</span>
        <div class="drawer-header__user-text">
          <div class="drawer-header__name">{{ user.displayName || user.email }}</div>
          <div class="drawer-header__email">{{ user.email }}</div>
        </div>
      </div>
    }
    <mat-divider />
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .drawer-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 20px 20px 10px;
        background: var(--mat-sys-surface-container);
        color: var(--mat-sys-on-surface);
      }
      .drawer-header__brand-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: var(--mat-sys-primary);
      }
      .drawer-header__brand {
        display: grid;
        gap: 2px;
      }
      .drawer-header__eyebrow {
        margin: 0;
        font: var(--mat-sys-label-small);
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--mat-sys-primary);
      }
      .drawer-header__title {
        margin: 0;
        font: var(--mat-sys-title-medium);
        letter-spacing: var(--mat-sys-title-medium-tracking);
      }
      .drawer-header__user {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 20px 16px;
        background: var(--mat-sys-surface-container);
        color: var(--mat-sys-on-surface);
      }
      .drawer-header__avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: var(--mat-sys-primary);
        color: var(--mat-sys-on-primary);
        font: var(--mat-sys-label-large);
        letter-spacing: var(--mat-sys-label-large-tracking);
        font-weight: 600;
      }
      .drawer-header__user-text {
        display: grid;
        gap: 2px;
        min-width: 0;
      }
      .drawer-header__name {
        font: var(--mat-sys-title-small);
        letter-spacing: var(--mat-sys-title-small-tracking);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .drawer-header__email {
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
        color: var(--mat-sys-on-surface-variant);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `
  ]
})
export class DrawerHeaderComponent {
  protected readonly auth = inject(AuthService);
}
