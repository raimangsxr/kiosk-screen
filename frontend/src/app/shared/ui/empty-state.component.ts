import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatIconModule, MatButtonModule, RouterLink],
  template: `
    <mat-card appearance="outlined" class="empty-state" role="status">
      <mat-card-content>
        <mat-icon aria-hidden="true" class="empty-state__icon">{{ icon() }}</mat-icon>
        <h3 class="empty-state__title">{{ title() }}</h3>
        @if (description()) {
          <p class="empty-state__message">{{ description() }}</p>
        }
        @if (actionRoute() && actionLabel()) {
          <a mat-flat-button color="primary" [routerLink]="actionRoute()">
            <mat-icon aria-hidden="true">add</mat-icon>
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
      .empty-state {
        text-align: center;
        padding: 32px 20px;
        background: var(--mat-sys-surface);
      }
      .empty-state__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 56px;
        height: 56px;
        margin-bottom: 12px;
        border-radius: var(--mat-sys-corner-large);
        background: var(--mat-sys-surface-container);
        color: var(--mat-sys-primary);
        font-size: 32px;
      }
      .empty-state__title {
        margin: 0 0 4px;
        font: var(--mat-sys-title-medium);
        letter-spacing: var(--mat-sys-title-medium-tracking);
        color: var(--mat-sys-on-surface);
      }
      .empty-state__message {
        margin: 0 auto 16px;
        max-width: 480px;
        font: var(--mat-sys-body-medium);
        letter-spacing: var(--mat-sys-body-medium-tracking);
        color: var(--mat-sys-on-surface-variant);
      }
    `
  ]
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly icon = input<string>('inbox');
  readonly actionLabel = input<string>('');
  readonly actionRoute = input<string>('');
}
