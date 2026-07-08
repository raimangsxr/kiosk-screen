import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { AdminStateComponent } from '../../../shared/admin-state.component';
import { StatusChipComponent, StatusKind } from '../../../shared/ui/status-chip.component';
import {
  adsLabel,
  displayLabel,
  modeLabel,
  relativeTime
} from '../../../shared/util/remote-control-labels';
import { LiveStatusSlice, ReadinessSlice } from '../dashboard.models';

@Component({
  selector: 'app-operations-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, AdminStateComponent, StatusChipComponent],
  template: `
    <mat-card appearance="outlined" class="hero">
      <mat-card-content class="hero__content">
        @if (liveDegraded()) {
          <app-admin-state
            kind="error"
            title="Estado en vivo no disponible"
            message="No se pudo cargar el estado del display."
          />
          <button mat-stroked-button type="button" class="hero__retry" (click)="retryLive.emit()">
            <mat-icon aria-hidden="true">refresh</mat-icon>
            Reintentar
          </button>
        } @else if (live(); as liveState) {
          <div class="hero__grid">
            <div class="hero__readiness">
              @if (readiness(); as readinessState) {
                <app-status-chip
                  [label]="readinessLabel(readinessState)"
                  [kind]="readinessKind(readinessState)"
                  [icon]="readinessIcon(readinessState)"
                />
              }
            </div>
            <div class="hero__metric">
              <span class="hero__metric-label">Display</span>
              <strong>{{ displayLabel(liveState.displaySessionActive) }}</strong>
            </div>
            <div class="hero__metric">
              <span class="hero__metric-label">Modo</span>
              <strong>{{ modeLabel(liveState.contentMode) }}</strong>
            </div>
            <div class="hero__metric">
              <span class="hero__metric-label">Anuncios</span>
              <strong>{{ adsLabel(liveState.adsVisible) }}</strong>
            </div>
            <div class="hero__metric">
              <span class="hero__metric-label">Actualizado</span>
              <strong>{{ relativeTime(liveState.updatedAt) }}</strong>
            </div>
            @if (liveState.contentMode === 'fixed') {
              <div class="hero__pinned">
                <span class="hero__metric-label">Contenido fijo</span>
                @if (liveState.pinnedContentUnresolved) {
                  <strong class="hero__pinned-unresolved">Contenido no disponible</strong>
                } @else if (liveState.pinnedContentTitle) {
                  <strong class="hero__pinned-title">{{ liveState.pinnedContentTitle }}</strong>
                }
              </div>
            }
          </div>
          <div class="hero__actions">
            <a mat-flat-button color="primary" routerLink="/display">
              <mat-icon aria-hidden="true">open_in_new</mat-icon>
              Abrir display
            </a>
            <a mat-stroked-button color="primary" routerLink="/admin/remote-control">
              <mat-icon aria-hidden="true">settings_remote</mat-icon>
              Control remoto
            </a>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .hero {
        margin-bottom: 12px;
      }
      .hero__content {
        display: grid;
        gap: 12px;
        padding: 16px;
      }
      .hero__grid {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      }
      .hero__metric,
      .hero__pinned {
        display: grid;
        gap: 2px;
        min-width: 0;
      }
      .hero__metric-label {
        font: var(--mat-sys-label-medium);
        color: var(--mat-sys-on-surface-variant);
      }
      .hero__pinned-title {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        word-break: break-word;
      }
      .hero__pinned-unresolved {
        color: var(--mat-sys-error);
      }
      .hero__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .hero__retry {
        justify-self: start;
      }
    `
  ]
})
export class OperationsHeroComponent {
  readonly readiness = input<ReadinessSlice | null>(null);
  readonly live = input<LiveStatusSlice | null>(null);
  readonly liveDegraded = input(false);
  readonly retryLive = output<void>();

  protected readonly displayLabel = displayLabel;
  protected readonly modeLabel = modeLabel;
  protected readonly adsLabel = adsLabel;
  protected readonly relativeTime = relativeTime;

  protected readinessLabel(readiness: ReadinessSlice): string {
    if (readiness.ready && readiness.warnings.length === 0) {
      return 'Listo';
    }
    if (readiness.blockers.length > 0) {
      return 'Bloqueado';
    }
    return 'Acción requerida';
  }

  protected readinessKind(readiness: ReadinessSlice): StatusKind {
    if (readiness.ready && readiness.warnings.length === 0) {
      return 'success';
    }
    if (readiness.blockers.length > 0) {
      return 'danger';
    }
    return 'warning';
  }

  protected readinessIcon(readiness: ReadinessSlice): string {
    if (readiness.ready && readiness.warnings.length === 0) {
      return 'check_circle';
    }
    if (readiness.blockers.length > 0) {
      return 'error';
    }
    return 'warning';
  }
}
