import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

export interface SectionAction {
  readonly label: string;
  readonly route: string;
  readonly kind?: 'primary' | 'secondary' | 'danger';
  readonly icon?: string;
}

@Component({
  selector: 'app-section-actions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, RouterLink],
  template: `
    <nav class="section-actions" aria-label="Section actions">
      @for (action of actions(); track action.route) {
        @if (action.kind === 'danger') {
          <a
            mat-stroked-button
            color="warn"
            [routerLink]="action.route"
            class="section-actions__button"
          >
            @if (action.icon) {
              <mat-icon aria-hidden="true">{{ action.icon }}</mat-icon>
            }
            {{ action.label }}
          </a>
        } @else if (action.kind === 'secondary') {
          <a
            mat-stroked-button
            color="primary"
            [routerLink]="action.route"
            class="section-actions__button"
          >
            @if (action.icon) {
              <mat-icon aria-hidden="true">{{ action.icon }}</mat-icon>
            }
            {{ action.label }}
          </a>
        } @else {
          <a
            mat-flat-button
            color="primary"
            [routerLink]="action.route"
            class="section-actions__button"
          >
            @if (action.icon) {
              <mat-icon aria-hidden="true">{{ action.icon }}</mat-icon>
            }
            {{ action.label }}
          </a>
        }
      }
    </nav>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .section-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .section-actions__button {
        min-height: var(--app-touch-target);
      }
    `
  ]
})
export class SectionActionsComponent {
  readonly actions = input<readonly SectionAction[]>([]);
}
