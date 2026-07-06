import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { BreakpointService } from '../../../core/layout/breakpoint.service';
import { ADMIN_COPY } from './admin-copy';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule],
  template: `
    <header class="admin-page" [class.admin-page--compact]="isCompact()">
      <p class="admin-page__eyebrow">{{ eyebrow() }}</p>
      <h1 class="admin-page__title">{{ title() }}</h1>
      @if (description()) {
        <p class="admin-page__description">{{ description() }}</p>
      }
    </header>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .admin-page {
        display: grid;
        gap: 6px;
        margin-bottom: 12px;
      }
      .admin-page__eyebrow {
        margin: 0;
        font: var(--mat-sys-label-large);
        letter-spacing: 0.08em;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--mat-sys-primary);
      }
      .admin-page__title {
        margin: 0;
        font: var(--mat-sys-headline-small);
        letter-spacing: var(--mat-sys-headline-small-tracking);
        color: var(--mat-sys-on-surface);
      }
      .admin-page--compact .admin-page__title {
        font: var(--mat-sys-title-large);
        letter-spacing: var(--mat-sys-title-large-tracking);
      }
      .admin-page__description {
        margin: 0;
        max-width: 760px;
        font: var(--mat-sys-body-medium);
        letter-spacing: var(--mat-sys-body-medium-tracking);
        color: var(--mat-sys-on-surface-variant);
      }
      .admin-page--compact .admin-page__description {
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
      }
    `
  ]
})
export class AdminPageComponent {
  private readonly breakpoint = inject(BreakpointService);
  protected readonly isCompact = this.breakpoint.isCompact;

  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly eyebrow = input<string>(ADMIN_COPY.eyebrow);
}
