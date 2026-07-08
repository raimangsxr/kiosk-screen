import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AdminPageComponent } from '../../shared/ui/admin/admin-page.component';
import { AdminStateComponent } from '../../shared/admin-state.component';
import { DashboardFacade } from './dashboard.facade';
import { OperationsDashboardState } from './dashboard.models';
import { OperationsHeroComponent } from './sections/operations-hero.component';
import { ReadinessAlertsComponent } from './sections/readiness-alerts.component';
import { ContextualActionsComponent } from './sections/contextual-actions.component';
import { ActivityFeedComponent } from './sections/activity-feed.component';
import { ContentQueueComponent } from './sections/content-queue.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    AdminPageComponent,
    AdminStateComponent,
    OperationsHeroComponent,
    ReadinessAlertsComponent,
    ContextualActionsComponent,
    ActivityFeedComponent,
    ContentQueueComponent
  ],
  template: `
    <app-admin-page
      title="Panel"
      description="Centro de operaciones del quiosco: preparación, estado en vivo, cola y actividad reciente."
    />

    <div class="dashboard__toolbar">
      <button mat-stroked-button type="button" (click)="refresh()" [disabled]="loading()">
        <mat-icon aria-hidden="true">refresh</mat-icon>
        Actualizar
      </button>
    </div>

    @if (loading() && !state()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando panel" />
    }

    @if (allSectionsFailed()) {
      <app-admin-state
        kind="error"
        title="Panel no disponible"
        message="No se pudo cargar ninguna sección del panel. Comprueba la conexión e inténtalo de nuevo."
      />
    }

    @if (state(); as s) {
      <app-operations-hero
        [readiness]="s.readiness"
        [live]="s.live"
        [liveDegraded]="isLiveDegraded()"
        (retryLive)="retryLive()"
      />

      <app-readiness-alerts [readiness]="s.readiness" [degraded]="isReadinessDegraded()" />

      <app-contextual-actions [contextualActions]="s.contextualActions" />

      <app-content-queue [queue]="s.queue" [degraded]="isQueueDegraded()" />

      <app-activity-feed [activity]="s.activity" [degraded]="isActivityDegraded()" />
    }
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
        overflow-x: clip;
      }
      .dashboard__toolbar {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 8px;
      }
    `
  ]
})
export class AdminDashboardComponent implements OnInit {
  private readonly facade = inject(DashboardFacade);

  protected readonly state = signal<OperationsDashboardState | null>(null);
  protected readonly loading = signal(false);

  protected readonly allSectionsFailed = computed(() => {
    const s = this.state();
    if (!s) {
      return false;
    }
    return !s.readiness && !s.live && !s.queue && !s.activity;
  });

  ngOnInit(): void {
    this.refresh();
  }

  protected refresh(): void {
    this.loading.set(true);
    this.facade.load().subscribe({
      next: (next) => {
        this.state.set(next);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  protected retryLive(): void {
    const current = this.state();
    if (!current) {
      return;
    }
    this.facade.reloadLive(current).subscribe({
      next: (next) => this.state.set(next)
    });
  }

  protected isReadinessDegraded(): boolean {
    const s = this.state();
    return Boolean(s && !s.readiness && s.degradedSections.includes('Comprobación'));
  }

  protected isLiveDegraded(): boolean {
    const s = this.state();
    return Boolean(s && !s.live && s.degradedSections.includes('Estado en vivo'));
  }

  protected isQueueDegraded(): boolean {
    const s = this.state();
    return Boolean(s && !s.queue && s.degradedSections.includes('Contenido'));
  }

  protected isActivityDegraded(): boolean {
    const s = this.state();
    return Boolean(s && !s.activity && s.degradedSections.includes('Actividad'));
  }
}
