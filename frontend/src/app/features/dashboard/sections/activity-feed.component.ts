import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

import { AdminStateComponent } from '../../../shared/admin-state.component';
import { StatusChipComponent } from '../../../shared/ui/status-chip.component';
import { relativeTime } from '../../../shared/util/remote-control-labels';
import { ActivityFeedSlice } from '../dashboard.models';

@Component({
  selector: 'app-activity-feed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatChipsModule, MatIconModule, AdminStateComponent, StatusChipComponent],
  template: `
    <mat-card appearance="outlined" class="activity">
      <mat-card-header>
        <mat-card-title>Actividad reciente</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        @if (degraded()) {
          <app-admin-state
            kind="error"
            title="Actividad no disponible"
            message="No se pudieron cargar los eventos recientes."
          />
        } @else if (activity(); as feed) {
          @if (feed.items.length === 0) {
            <app-admin-state
              kind="empty"
              title="Sin actividad"
              message="Aún no hay eventos registrados en el display."
            />
          } @else {
            <ul class="activity__list">
              @for (item of feed.items; track item.id) {
                <li class="activity__item">
                  <app-status-chip
                    [label]="severityLabel(item.severity)"
                    [kind]="severityKind(item.severity)"
                    [icon]="severityIcon(item.severity)"
                  />
                  <div class="activity__body">
                    <p class="activity__message">{{ item.message }}</p>
                    <span class="activity__time">{{ relativeTime(item.createdAt) }}</span>
                  </div>
                </li>
              }
            </ul>
          }
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .activity {
        margin-bottom: 12px;
      }
      .activity__list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 8px;
      }
      .activity__item {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 10px;
        align-items: start;
        padding: 10px 0;
        border-bottom: 1px solid var(--mat-sys-outline-variant);
      }
      .activity__item:last-child {
        border-bottom: none;
      }
      .activity__message {
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .activity__time {
        font: var(--mat-sys-body-small);
        color: var(--mat-sys-on-surface-variant);
      }
    `
  ]
})
export class ActivityFeedComponent {
  readonly activity = input<ActivityFeedSlice | null>(null);
  readonly degraded = input(false);

  protected readonly relativeTime = relativeTime;

  protected severityLabel(severity: 'info' | 'warning' | 'error'): string {
    if (severity === 'error') {
      return 'Error';
    }
    if (severity === 'warning') {
      return 'Aviso';
    }
    return 'Info';
  }

  protected severityKind(severity: 'info' | 'warning' | 'error'): 'danger' | 'warning' | 'info' {
    if (severity === 'error') {
      return 'danger';
    }
    if (severity === 'warning') {
      return 'warning';
    }
    return 'info';
  }

  protected severityIcon(severity: 'info' | 'warning' | 'error'): string {
    if (severity === 'error') {
      return 'error';
    }
    if (severity === 'warning') {
      return 'warning';
    }
    return 'info';
  }
}
