import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { ContextualAction } from '../dashboard.models';

const HERO_ROUTES = new Set(['/display', '/admin/remote-control']);

@Component({
  selector: 'app-contextual-actions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    @if (visibleActions().length > 0) {
      <mat-card appearance="outlined" class="actions">
        <mat-card-content>
          <h3 class="actions__title">Acciones sugeridas</h3>
          <div class="actions__grid">
            @for (action of visibleActions(); track action.route + action.label) {
              @if (action.priority === 'primary') {
                <a mat-flat-button color="primary" [routerLink]="action.route">
                  <mat-icon aria-hidden="true">{{ action.icon }}</mat-icon>
                  {{ action.label }}
                </a>
              } @else {
                <a mat-stroked-button color="primary" [routerLink]="action.route">
                  <mat-icon aria-hidden="true">{{ action.icon }}</mat-icon>
                  {{ action.label }}
                </a>
              }
            }
          </div>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .actions {
        margin-bottom: 12px;
      }
      .actions__title {
        margin: 0 0 8px;
        font: var(--mat-sys-title-small);
      }
      .actions__grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
    `
  ]
})
export class ContextualActionsComponent {
  readonly contextualActions = input<readonly ContextualAction[]>([]);

  protected visibleActions(): readonly ContextualAction[] {
    return this.contextualActions()
      .filter((action) => !HERO_ROUTES.has(action.route))
      .slice(0, 4);
  }
}
