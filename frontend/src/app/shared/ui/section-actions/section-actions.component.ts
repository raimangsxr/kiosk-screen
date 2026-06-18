import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

export interface SectionAction {
  readonly label: string;
  readonly route: string;
  readonly icon?: string;
  readonly kind?: 'primary' | 'secondary';
}

@Component({
  selector: 'app-section-actions',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="section-actions" aria-label="Section actions">
      @for (action of actions(); track action.route) {
        @if (action.kind === 'primary') {
          <a mat-flat-button color="primary" [routerLink]="action.route" class="primary-action">
            @if (action.icon) {
              <mat-icon aria-hidden="true">{{ action.icon }}</mat-icon>
            }
            {{ action.label }}
          </a>
        } @else {
          <a mat-stroked-button [routerLink]="action.route" class="secondary-action">
            @if (action.icon) {
              <mat-icon aria-hidden="true">{{ action.icon }}</mat-icon>
            }
            {{ action.label }}
          </a>
        }
      }
    </nav>
  `
})
export class SectionActionsComponent {
  readonly actions = input<readonly SectionAction[]>([]);
}
