import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <p class="page-header__eyebrow">{{ eyebrow() }}</p>
      <h1>{{ title() }}</h1>
      <p>{{ description() }}</p>
    </header>
  `
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly description = input('');
  readonly eyebrow = input('Administration');
}
