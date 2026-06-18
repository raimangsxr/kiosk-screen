import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';

import { UserMenuComponent } from '../../core/layout/user-menu.component';
import { AuthService } from '../../core/auth/auth.service';

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
    MatToolbarModule,
    UserMenuComponent
  ],
  template: `
    <mat-toolbar color="primary" class="hall__toolbar">
      <mat-icon aria-hidden="true" class="hall__brand-icon">tv</mat-icon>
      <span class="hall__brand">Kiosk Screen</span>
      <span class="hall__spacer"></span>
      <app-user-menu />
    </mat-toolbar>

    <main class="hall app-page" aria-label="Application hall">
      <header class="hall__header">
        <p class="hall__eyebrow">Choose where to go</p>
        <h1 class="hall__title">Welcome{{ auth.displayName() ? ', ' + auth.displayName() : '' }}</h1>
        <p class="hall__subtitle">Open the kiosk display or manage the administration panel.</p>
      </header>

      <section class="hall__grid" aria-label="Hall destinations">
        <a mat-card appearance="outlined" routerLink="/display" class="hall__tile hall__tile--primary">
          <mat-card-header>
            <mat-icon mat-card-avatar aria-hidden="true" class="hall__tile-icon hall__tile-icon--primary">
              play_circle
            </mat-icon>
            <mat-card-title>Enter kiosk mode</mat-card-title>
            <mat-card-subtitle>Open the fullscreen display for the venue.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>Launch the rotation of approved content and ads for the top and bottom regions.</p>
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-flat-button color="primary" type="button">
              <mat-icon aria-hidden="true">arrow_forward</mat-icon>
              Open display
            </button>
          </mat-card-actions>
        </a>

        <a mat-card appearance="outlined" routerLink="/admin" class="hall__tile">
          <mat-card-header>
            <mat-icon mat-card-avatar aria-hidden="true" class="hall__tile-icon">settings</mat-icon>
            <mat-card-title>Open administration</mat-card-title>
            <mat-card-subtitle>Configure content, ads, display, and users.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>Manage the top content, client ads, approved iframe domains, and operator accounts.</p>
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-stroked-button color="primary" type="button">
              <mat-icon aria-hidden="true">arrow_forward</mat-icon>
              Open admin
            </button>
          </mat-card-actions>
        </a>
      </section>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: var(--mat-sys-surface);
      }
      .hall__toolbar {
        position: sticky;
        top: 0;
        z-index: 10;
        min-height: var(--app-touch-target);
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .hall__brand-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
      .hall__brand {
        font-size: 18px;
        font-weight: 500;
      }
      .hall__spacer {
        flex: 1;
      }
      .hall {
        padding-top: 32px;
      }
      .hall__header {
        display: grid;
        gap: 6px;
        max-width: 720px;
      }
      .hall__eyebrow {
        margin: 0;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--mat-sys-primary);
      }
      .hall__title {
        margin: 0;
        font-size: clamp(28px, 5vw, 40px);
        font-weight: 600;
        color: var(--mat-sys-on-surface);
      }
      .hall__subtitle {
        margin: 0;
        color: var(--mat-sys-on-surface-variant);
      }
      .hall__grid {
        display: grid;
        gap: 16px;
        grid-template-columns: 1fr;
        margin-top: 8px;
      }
      .hall__tile {
        display: grid;
        text-decoration: none;
        color: inherit;
        cursor: pointer;
        min-height: 220px;
        transition: transform 120ms ease, box-shadow 120ms ease;
      }
      .hall__tile:hover {
        transform: translateY(-2px);
      }
      .hall__tile-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: var(--mat-sys-primary);
      }
      .hall__tile-icon--primary {
        color: var(--mat-sys-tertiary);
      }
      @media (min-width: 720px) {
        .hall__grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `
  ]
})
export class HallComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
}
