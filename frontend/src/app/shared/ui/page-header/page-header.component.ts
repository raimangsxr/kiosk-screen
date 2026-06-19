import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule],
  template: `
    <header class="page-header">
      <p class="page-header__eyebrow">{{ eyebrow() }}</p>
      <h1 class="page-header__title">{{ title() }}</h1>
      @if (description()) {
        <p class="page-header__description">{{ description() }}</p>
      }
    </header>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .page-header {
        display: grid;
        gap: 6px;
        margin-bottom: 4px;
      }
      .page-header__eyebrow {
        margin: 0;
        font: var(--mat-sys-label-large);
        letter-spacing: 0.08em;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--mat-sys-primary);
      }
      .page-header__title {
        margin: 0;
        font: var(--mat-sys-headline-small);
        letter-spacing: var(--mat-sys-headline-small-tracking);
        color: var(--mat-sys-on-surface);
      }
      .page-header__description {
        margin: 0;
        max-width: 760px;
        font: var(--mat-sys-body-medium);
        letter-spacing: var(--mat-sys-body-medium-tracking);
        color: var(--mat-sys-on-surface-variant);
      }
    `
  ]
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly eyebrow = input<string>('Administration');
}
