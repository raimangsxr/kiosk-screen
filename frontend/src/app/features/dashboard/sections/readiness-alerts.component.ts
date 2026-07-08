import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

import { AdminStateComponent } from '../../../shared/admin-state.component';
import { ReadinessSlice } from '../dashboard.models';

@Component({
  selector: 'app-readiness-alerts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    AdminStateComponent
  ],
  template: `
    @if (degraded()) {
      <mat-card appearance="outlined" class="alerts">
        <mat-card-content>
          <app-admin-state
            kind="error"
            title="Comprobación no disponible"
            message="No se pudo cargar el estado de preparación."
            actionLabel="Reintentar"
            actionRoute="/admin/readiness"
          />
        </mat-card-content>
      </mat-card>
    } @else if (readiness(); as readinessState) {
      @if (!readinessState.ready || readinessState.warnings.length > 0) {
        <mat-card appearance="outlined" class="alerts">
          <mat-card-content>
            @if (readinessState.blockers.length > 0) {
              <h3 class="alerts__title">Bloqueos</h3>
              <ul class="alerts__list">
                @for (blocker of readinessState.blockers; track blocker.message) {
                  <li class="alerts__item">
                    <span class="alerts__message">{{ blocker.message }}</span>
                    <a mat-stroked-button color="primary" [routerLink]="blocker.resolveRoute">
                      <mat-icon aria-hidden="true">arrow_forward</mat-icon>
                      Resolver
                    </a>
                  </li>
                }
              </ul>
            }
            @if (readinessState.warnings.length > 0) {
              @if (readinessState.blockers.length > 0) {
                <mat-divider />
              }
              <h3 class="alerts__title">Advertencias</h3>
              <ul class="alerts__list">
                @for (warning of readinessState.warnings; track warning.message) {
                  <li class="alerts__item">
                    <span class="alerts__message">{{ warning.message }}</span>
                    <a mat-stroked-button [routerLink]="warning.resolveRoute">
                      <mat-icon aria-hidden="true">arrow_forward</mat-icon>
                      Revisar
                    </a>
                  </li>
                }
              </ul>
            }
          </mat-card-content>
        </mat-card>
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .alerts {
        margin-bottom: 12px;
      }
      .alerts__title {
        margin: 0 0 8px;
        font: var(--mat-sys-title-small);
        color: var(--mat-sys-on-surface-variant);
        text-transform: uppercase;
      }
      .alerts__list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 8px;
      }
      .alerts__item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px;
        border: 1px solid var(--mat-sys-outline-variant);
        border-radius: var(--mat-sys-corner-medium);
        background: var(--mat-sys-surface);
      }
      .alerts__message {
        flex: 1;
        min-width: 0;
      }
    `
  ]
})
export class ReadinessAlertsComponent {
  readonly readiness = input<ReadinessSlice | null>(null);
  readonly degraded = input(false);
}
