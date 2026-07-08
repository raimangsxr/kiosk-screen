import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';

import { AdminStateComponent } from '../../../shared/admin-state.component';
import { ContentQueueEntry, ContentQueueSlice } from '../dashboard.models';

@Component({
  selector: 'app-content-queue',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatChipsModule, AdminStateComponent],
  template: `
    <mat-card appearance="outlined" class="queue">
      <mat-card-header>
        <mat-card-title>Cola de contenido</mat-card-title>
        <mat-card-subtitle>Orden de reproducción activo</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        @if (degraded()) {
          <app-admin-state
            kind="error"
            title="Cola no disponible"
            message="No se pudo cargar la lista de contenido activo."
          />
        } @else if (queue(); as queueState) {
          @if (queueState.entries.length === 0) {
            <app-admin-state
              kind="empty"
              title="Sin contenido activo"
              message="No hay elementos activos en la cola de reproducción."
            />
          } @else {
            <ol class="queue__list">
              @for (entry of queueState.entries; track entry.id; let index = $index) {
                <li class="queue__item" [class.queue__item--pinned]="entry.isPinnedNow">
                  <span class="queue__position">{{ index + 1 }}</span>
                  <div class="queue__body">
                    <p class="queue__title">{{ entry.title }}</p>
                    <mat-chip-set>
                      <mat-chip>{{ kindLabel(entry) }}</mat-chip>
                      @if (entry.isPinnedNow) {
                        <mat-chip highlighted>Fijado ahora</mat-chip>
                      }
                    </mat-chip-set>
                  </div>
                </li>
              }
            </ol>
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
      .queue {
        margin-bottom: 12px;
      }
      .queue__list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 8px;
      }
      .queue__item {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 10px;
        align-items: start;
        padding: 10px 12px;
        border: 1px solid var(--mat-sys-outline-variant);
        border-radius: var(--mat-sys-corner-medium);
      }
      .queue__item--pinned {
        border-color: var(--mat-sys-primary);
        background: var(--mat-sys-primary-container);
      }
      .queue__position {
        font: var(--mat-sys-title-medium);
        color: var(--mat-sys-on-surface-variant);
        min-width: 1.5rem;
        text-align: center;
      }
      .queue__title {
        margin: 0 0 6px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `
  ]
})
export class ContentQueueComponent {
  readonly queue = input<ContentQueueSlice | null>(null);
  readonly degraded = input(false);

  protected kindLabel(entry: ContentQueueEntry): string {
    if (entry.kind === 'recurring' && entry.recurringEveryXIterations) {
      return `Recurrente cada ${entry.recurringEveryXIterations}`;
    }
    if (entry.kind === 'fixed-eligible') {
      return 'Fijo elegible';
    }
    return 'Regular';
  }
}
