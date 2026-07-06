import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';

import { ADMIN_COPY } from '../../shared/ui/admin/admin-copy';

@Component({
  selector: 'app-admin-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatToolbarModule, MatButtonModule, MatIconModule],
  template: `
    <mat-toolbar class="admin-toolbar" [class.admin-toolbar--compact]="showMenu()">
      @if (showMenu()) {
        <button
          mat-icon-button
          type="button"
          (click)="menuToggled.emit()"
          [attr.aria-label]="ADMIN_COPY.openNav"
        >
          <mat-icon aria-hidden="true">menu</mat-icon>
        </button>
      }

      @if (!showMenu()) {
        <mat-icon aria-hidden="true" class="admin-toolbar__brand-icon">television</mat-icon>
        <div class="admin-toolbar__brand">
          <p class="admin-toolbar__eyebrow">{{ ADMIN_COPY.brandEyebrow }}</p>
          <h2 class="admin-toolbar__brand-title">{{ ADMIN_COPY.brandTitle }}</h2>
        </div>
        <span class="admin-toolbar__divider" aria-hidden="true"></span>
      }

      <div class="admin-toolbar__context">
        <span class="admin-toolbar__title">{{ title() }}</span>
        @if (subtitle()) {
          <span class="admin-toolbar__subtitle">{{ subtitle() }}</span>
        }
      </div>

      <span class="admin-toolbar__spacer"></span>
      <ng-content />
    </mat-toolbar>
  `,
  styles: [
    `
      :host {
        display: block;
        position: sticky;
        top: 0;
        z-index: 10;
      }
      .admin-toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: var(--app-touch-target);
        background: var(--mat-sys-surface-container);
        color: var(--mat-sys-on-surface);
        border-bottom: 1px solid var(--mat-sys-outline-variant);
      }
      .admin-toolbar__brand-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: var(--mat-sys-primary);
      }
      .admin-toolbar__brand {
        display: grid;
        gap: 0;
        line-height: 1.1;
      }
      .admin-toolbar__eyebrow {
        margin: 0;
        font: var(--mat-sys-label-small);
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--mat-sys-primary);
      }
      .admin-toolbar__brand-title {
        margin: 0;
        font: var(--mat-sys-title-small);
      }
      .admin-toolbar__divider {
        width: 1px;
        height: 28px;
        background: var(--mat-sys-outline-variant);
        margin: 0 4px;
      }
      .admin-toolbar__context {
        display: grid;
        gap: 0;
        line-height: 1.15;
        min-width: 0;
      }
      .admin-toolbar__title {
        font: var(--mat-sys-title-medium);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .admin-toolbar__subtitle {
        font: var(--mat-sys-label-medium);
        color: var(--mat-sys-on-surface-variant);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .admin-toolbar--compact .admin-toolbar__title {
        font: var(--mat-sys-title-small);
      }
      .admin-toolbar__spacer {
        flex: 1;
      }
    `
  ]
})
export class AdminToolbarComponent {
  protected readonly ADMIN_COPY = ADMIN_COPY;

  readonly title = input<string>(ADMIN_COPY.brandTitle);
  readonly subtitle = input<string | null>(null);
  readonly showMenu = input<boolean>(false);
  readonly menuToggled = output<void>();
}
