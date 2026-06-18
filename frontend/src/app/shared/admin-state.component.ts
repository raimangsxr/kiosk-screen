import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

export type AdminStateKind = 'empty' | 'error' | 'success' | 'info' | 'warning';

@Component({
  selector: 'app-admin-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatIconModule, MatButtonModule, RouterLink],
  template: `
    <mat-card
      appearance="outlined"
      class="admin-state"
      [class.admin-state--error]="kind() === 'error'"
      [class.admin-state--success]="kind() === 'success'"
      [class.admin-state--warning]="kind() === 'warning'"
      [class.admin-state--info]="kind() === 'info'"
      [class.admin-state--empty]="kind() === 'empty'"
      [attr.role]="kind() === 'error' ? 'alert' : 'status'"
    >
      <mat-card-content class="admin-state__content">
        <mat-icon aria-hidden="true" class="admin-state__icon">{{ iconFor() }}</mat-icon>
        <div class="admin-state__text">
          <strong class="admin-state__title">{{ title() }}</strong>
          @if (message()) {
            <p class="admin-state__message">{{ message() }}</p>
          }
        </div>
        @if (actionRoute() && actionLabel()) {
          <a
            mat-flat-button
            [color]="kind() === 'error' ? 'warn' : 'primary'"
            [routerLink]="actionRoute()"
            class="admin-state__action"
          >
            <mat-icon aria-hidden="true">arrow_forward</mat-icon>
            {{ actionLabel() }}
          </a>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .admin-state__content {
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: center;
        gap: 12px;
        padding: 16px;
      }
      .admin-state__icon {
        grid-row: span 2;
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: var(--mat-sys-on-surface-variant);
      }
      .admin-state--error .admin-state__icon {
        color: var(--mat-sys-error);
      }
      .admin-state--success .admin-state__icon {
        color: var(--mat-sys-tertiary);
      }
      .admin-state--warning .admin-state__icon {
        color: var(--mat-sys-secondary);
      }
      .admin-state--info .admin-state__icon {
        color: var(--mat-sys-primary);
      }
      .admin-state__title {
        font-size: 16px;
        font-weight: 600;
      }
      .admin-state__message {
        margin: 4px 0 0;
        color: var(--mat-sys-on-surface-variant);
        font-size: 14px;
      }
      .admin-state__action {
        grid-column: 1 / -1;
        justify-self: end;
        min-height: var(--app-touch-target);
        margin-top: 4px;
      }
    `
  ]
})
export class AdminStateComponent {
  readonly kind = input<AdminStateKind>('info');
  readonly title = input<string>('');
  readonly message = input<string>('');
  readonly actionLabel = input<string>('');
  readonly actionRoute = input<string>('');

  protected iconFor(): string {
    switch (this.kind()) {
      case 'error':
        return 'error';
      case 'success':
        return 'check_circle';
      case 'warning':
        return 'warning';
      case 'empty':
        return 'inbox';
      default:
        return 'info';
    }
  }
}
