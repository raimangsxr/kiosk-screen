import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface SectionAction {
  readonly label: string;
  readonly route: string;
  readonly kind?: 'primary' | 'secondary';
}

@Component({
  selector: 'app-section-actions',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="section-actions" aria-label="Section actions">
      @for (action of actions(); track action.route) {
        <a [routerLink]="action.route" [class.primary-action]="action.kind === 'primary'" [class.secondary-action]="action.kind !== 'primary'">
          {{ action.label }}
        </a>
      }
    </nav>
  `
})
export class SectionActionsComponent {
  readonly actions = input<readonly SectionAction[]>([]);
}
