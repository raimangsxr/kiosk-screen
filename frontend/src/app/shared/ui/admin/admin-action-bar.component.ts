import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';

import { BreakpointService } from '../../../core/layout/breakpoint.service';
import { ADMIN_COPY } from './admin-copy';

export interface AdminAction {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly kind?: 'primary' | 'secondary' | 'danger';
  readonly route?: string;
  readonly disabled?: boolean;
  readonly testId?: string;
}

@Component({
  selector: 'app-admin-action-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatMenuModule, RouterLink],
  template: `
    <div class="admin-action-bar" [class.admin-action-bar--compact]="showOverflow()">
      <nav class="admin-action-bar__primary" aria-label="Acciones de sección">
        @for (action of visibleActions(); track action.id) {
          @if (action.route) {
            <a
              mat-stroked-button
              [color]="action.kind === 'danger' ? 'warn' : 'primary'"
              [routerLink]="action.route"
              class="admin-action-bar__button"
              [attr.data-testid]="action.testId"
            >
              @if (action.icon) {
                <mat-icon aria-hidden="true">{{ action.icon }}</mat-icon>
              }
              {{ action.label }}
            </a>
          } @else {
            <button
              mat-stroked-button
              type="button"
              [color]="action.kind === 'danger' ? 'warn' : action.kind === 'primary' ? 'primary' : undefined"
              class="admin-action-bar__button"
              [disabled]="action.disabled"
              [attr.data-testid]="action.testId"
              (click)="actionClick.emit(action.id)"
            >
              @if (action.icon) {
                <mat-icon aria-hidden="true">{{ action.icon }}</mat-icon>
              }
              {{ action.label }}
            </button>
          }
        }
      </nav>

      @if (showOverflow() && overflowActions().length > 0) {
        <button
          mat-stroked-button
          type="button"
          class="admin-action-bar__menu-trigger"
          [matMenuTriggerFor]="overflowMenu"
          [attr.aria-label]="ADMIN_COPY.moreActions"
        >
          <mat-icon aria-hidden="true">more_vert</mat-icon>
          {{ ADMIN_COPY.moreActions }}
        </button>
        <mat-menu #overflowMenu="matMenu">
          @for (action of overflowActions(); track action.id) {
            @if (action.route) {
              <a mat-menu-item [routerLink]="action.route" [attr.data-testid]="action.testId">
                @if (action.icon) {
                  <mat-icon aria-hidden="true">{{ action.icon }}</mat-icon>
                }
                <span>{{ action.label }}</span>
              </a>
            } @else {
              <button
                mat-menu-item
                type="button"
                [disabled]="action.disabled"
                [attr.data-testid]="action.testId"
                (click)="actionClick.emit(action.id)"
              >
                @if (action.icon) {
                  <mat-icon aria-hidden="true">{{ action.icon }}</mat-icon>
                }
                <span>{{ action.label }}</span>
              </button>
            }
          }
        </mat-menu>
      }

      <div class="admin-action-bar__extra">
        <ng-content />
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .admin-action-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }
      .admin-action-bar__primary {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        flex: 1 1 auto;
      }
      .admin-action-bar__button,
      .admin-action-bar__menu-trigger {
        min-height: var(--app-touch-target);
      }
      .admin-action-bar__extra {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
      .admin-action-bar--compact .admin-action-bar__extra {
        width: 100%;
      }
    `
  ]
})
export class AdminActionBarComponent {
  protected readonly ADMIN_COPY = ADMIN_COPY;
  private readonly breakpoint = inject(BreakpointService);
  private readonly maxVisible = 2;

  readonly actions = input<readonly AdminAction[]>([]);
  readonly actionClick = output<string>();

  protected readonly showOverflow = this.breakpoint.showOverlayNav;

  protected readonly visibleActions = computed(() => {
    const all = this.actions();
    if (!this.showOverflow()) {
      return all;
    }
    return all.slice(0, this.maxVisible);
  });

  protected readonly overflowActions = computed(() => {
    const all = this.actions();
    if (!this.showOverflow()) {
      return [];
    }
    return all.slice(this.maxVisible);
  });
}
