import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { UserMenuComponent } from '../../core/layout/user-menu.component';
import { AuthService } from '../../core/auth/auth.service';
import { AdminToolbarComponent } from '../../core/layout/admin-toolbar.component';
import { APP_VERSION } from '../../core/app-version';

@Component({
  selector: 'app-hall',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    AdminToolbarComponent,
    UserMenuComponent
  ],
  template: `
    <app-admin-toolbar title="Hall">
      <app-user-menu />
    </app-admin-toolbar>

    <main class="hall" aria-label="Application hall">
      <header class="hall__header">
        <p class="hall__eyebrow">Choose where to go</p>
        <h1 class="hall__title">Welcome{{ auth.displayName() ? ', ' + auth.displayName() : '' }}</h1>
        <p class="hall__subtitle">Open the kiosk display or administration panel.</p>
      </header>

      <section class="hall__grid" aria-label="Hall destinations">
        <mat-card appearance="outlined" class="hall__tile hall__tile--primary">
          <mat-card-header>
            <span mat-card-avatar class="hall__tile-avatar hall__tile-avatar--primary">
              <mat-icon aria-hidden="true" class="hall__tile-icon">
              play_circle
              </mat-icon>
            </span>
            <mat-card-title>Enter kiosk mode</mat-card-title>
            <mat-card-subtitle>Open the fullscreen display for the venue.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>Launch the rotation of approved content and ads for the top and bottom regions.</p>
          </mat-card-content>
          <mat-card-actions align="end">
            <a mat-flat-button color="primary" routerLink="/display">
              <mat-icon aria-hidden="true">arrow_forward</mat-icon>
              Open display
            </a>
          </mat-card-actions>
        </mat-card>

        <mat-card appearance="outlined" class="hall__tile">
          <mat-card-header>
            <span mat-card-avatar class="hall__tile-avatar">
              <mat-icon aria-hidden="true" class="hall__tile-icon">settings</mat-icon>
            </span>
            <mat-card-title>Open administration</mat-card-title>
            <mat-card-subtitle>Configure content, ads, display, and users.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>Manage the top content, client ads, approved iframe domains, and operator accounts.</p>
          </mat-card-content>
          <mat-card-actions align="end">
            <a mat-stroked-button color="primary" routerLink="/admin">
              <mat-icon aria-hidden="true">arrow_forward</mat-icon>
              Open admin
            </a>
          </mat-card-actions>
        </mat-card>

      </section>
    </main>

    <footer class="hall__footer">
      <p class="hall__version">Versión {{ appVersion }}</p>
    </footer>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background: var(--mat-sys-surface-container-lowest);
      }
      .hall {
        flex: 1;
        width: min(100% - 32px, 1120px);
        margin: 0 auto;
        padding: clamp(48px, 8vh, 84px) 0 64px;
        display: grid;
        gap: 28px;
      }
      .hall__header {
        display: grid;
        gap: 8px;
        max-width: 720px;
      }
      .hall__eyebrow {
        margin: 0;
        font: var(--mat-sys-label-large);
        letter-spacing: 0.08em;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--mat-sys-primary);
      }
      .hall__title {
        margin: 0;
        font: var(--mat-sys-display-small);
        letter-spacing: var(--mat-sys-display-small-tracking);
        color: var(--mat-sys-on-surface);
      }
      .hall__subtitle {
        margin: 0;
        font: var(--mat-sys-body-large);
        letter-spacing: var(--mat-sys-body-large-tracking);
        color: var(--mat-sys-on-surface-variant);
      }
      .hall__grid {
        display: grid;
        gap: 20px;
        grid-template-columns: 1fr;
      }
      .hall__tile {
        display: grid;
        grid-template-rows: auto 1fr auto;
        min-height: 252px;
        background: var(--mat-sys-surface);
      }
      .hall__tile mat-card-header {
        padding: 24px 24px 0;
      }
      .hall__tile mat-card-content {
        padding: 16px 24px 0;
      }
      .hall__tile mat-card-content p {
        margin: 0;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-medium);
        letter-spacing: var(--mat-sys-body-medium-tracking);
      }
      .hall__tile mat-card-actions {
        padding: 16px 24px 24px;
      }
      .hall__tile-avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--mat-sys-surface-container-high);
        color: var(--mat-sys-primary);
      }
      .hall__tile-avatar--primary {
        background: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container);
      }
      .hall__tile-icon {
        font-size: 26px;
        width: 26px;
        height: 26px;
      }
      @media (min-width: 720px) {
        .hall__grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 599.98px) {
        .hall {
          width: min(100% - 24px, 1120px);
          padding-top: 32px;
        }
        .hall__title {
          font: var(--mat-sys-headline-large);
          letter-spacing: var(--mat-sys-headline-large-tracking);
        }
      }
      .hall__footer {
        padding: 0 16px calc(16px + var(--admin-safe-bottom, 0px));
        text-align: center;
      }
      .hall__version {
        margin: 0;
        font: var(--mat-sys-label-medium);
        color: var(--mat-sys-on-surface-variant);
      }
    `
  ]
})
export class HallComponent {
  protected readonly auth = inject(AuthService);
  protected readonly appVersion = APP_VERSION;
}
