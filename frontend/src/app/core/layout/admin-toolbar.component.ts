import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';

import { ADMIN_COPY } from '../../shared/ui/admin/admin-copy';

@Component({
  selector: 'app-admin-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatToolbarModule, MatButtonModule, MatIconModule],
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

      <a class="admin-toolbar__brand" routerLink="/admin" [attr.aria-label]="ADMIN_COPY.brandEyebrow">
        <mat-icon aria-hidden="true" class="admin-toolbar__brand-icon">television</mat-icon>
        <span class="admin-toolbar__wordmark">{{ ADMIN_COPY.brandEyebrow }}</span>
      </a>

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
      .admin-toolbar__brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        text-decoration: none;
        color: inherit;
        border-radius: var(--mat-sys-corner-small);
        padding: 4px 6px;
      }
      .admin-toolbar__brand:hover .admin-toolbar__wordmark {
        color: var(--mat-sys-primary);
      }
      .admin-toolbar__brand-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: var(--mat-sys-primary);
      }
      .admin-toolbar__wordmark {
        font: var(--mat-sys-title-medium);
        font-weight: 700;
        letter-spacing: 0.01em;
        white-space: nowrap;
      }
      .admin-toolbar--compact .admin-toolbar__wordmark {
        font: var(--mat-sys-title-small);
        font-weight: 700;
      }
      .admin-toolbar__spacer {
        flex: 1;
      }
    `
  ]
})
export class AdminToolbarComponent {
  protected readonly ADMIN_COPY = ADMIN_COPY;

  readonly showMenu = input<boolean>(false);
  readonly menuToggled = output<void>();
}
