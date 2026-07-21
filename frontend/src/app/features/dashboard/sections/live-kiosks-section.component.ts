import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { AdminStateComponent } from '../../../shared/admin-state.component';
import { LiveKiosksSlice } from '../dashboard.models';

@Component({
  selector: 'app-live-kiosks-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, AdminStateComponent],
  template: `
    <mat-card appearance="outlined" class="live-kiosks">
      <mat-card-header>
        <mat-card-title>Pantallas conectadas</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        @if (degraded()) {
          <app-admin-state
            kind="warning"
            title="Estado en vivo no disponible"
            message="No se pudo cargar el estado de las pantallas conectadas."
          />
        } @else if (slice(); as data) {
          @if (data.items.length) {
            <ul class="live-kiosks__list">
              @for (item of data.items; track item.kioskId) {
                <li class="live-kiosks__row">
                  <strong>{{ item.displayLabel ?? 'Sin etiqueta' }}</strong>
                  <span class="live-kiosks__id">{{ item.kioskId }}</span>
                </li>
              }
            </ul>
          } @else {
            <p class="live-kiosks__empty">No hay quioscos conectados al stream.</p>
          }
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .live-kiosks { margin-bottom: 12px; }
    .live-kiosks__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    .live-kiosks__row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .live-kiosks__id { color: var(--mat-sys-on-surface-variant); font-size: 0.875rem; }
    .live-kiosks__empty { margin: 0; color: var(--mat-sys-on-surface-variant); }
  `,
})
export class LiveKiosksSectionComponent {
  readonly slice = input<LiveKiosksSlice | null>(null);
  readonly degraded = input(false);
}
