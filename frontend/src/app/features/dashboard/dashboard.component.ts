import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { AdminDashboardService } from './dashboard.service';
import { AdminDashboardState, AdminNavigationItem, AdminQuickAction, AdminSectionSummary } from '../../shared/admin-ui.models';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { AdminStateComponent } from '../../shared/admin-state.component';
import { StatusChipComponent, StatusKind } from '../../shared/ui/status-chip.component';
import { BreakpointService } from '../../core/layout/breakpoint.service';
import { adaptApiError } from '../../core/errors/api-error-adapter';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    PageHeaderComponent,
    AdminStateComponent,
    StatusChipComponent
  ],
  template: `
    <app-page-header
      eyebrow="Administration"
      title="Dashboard"
      description="Kiosk setup status, section summaries, and quick actions."
    />

    @if (error(); as err) {
      <app-admin-state
        kind="error"
        title="Dashboard unavailable"
        [message]="err"
      />
    }

    @if (state(); as s) {
      <div class="dashboard__status">
        <app-status-chip
          [label]="setupLabel(s.setupStatus)"
          [kind]="setupKind(s.setupStatus)"
          [icon]="setupIcon(s.setupStatus)"
        />
        <a mat-button color="primary" routerLink="/admin/readiness">
          <mat-icon aria-hidden="true">fact_check</mat-icon>
          Run setup check
        </a>
      </div>

      <section
        class="dashboard__grid"
        [class.dashboard__grid--two]="isTwoColumns()"
        [class.dashboard__grid--three]="isThreeColumns()"
        aria-label="Section summaries"
      >
        @for (summary of s.sectionSummaries; track summary.route) {
          <mat-card appearance="outlined" class="dashboard__tile">
            <mat-card-header>
              <span mat-card-avatar class="dashboard__tile-avatar">
                <mat-icon aria-hidden="true">{{ iconFor(summary.route) }}</mat-icon>
              </span>
              <mat-card-title>{{ summary.label }}</mat-card-title>
              <mat-card-subtitle>{{ summary.value }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-actions align="end">
              <app-status-chip
                [label]="summary.status | titlecase"
                [kind]="statusKind(summary.status)"
                [icon]="statusIcon(summary.status)"
              />
              <a mat-button color="primary" [routerLink]="summary.route">
                <mat-icon aria-hidden="true">arrow_forward</mat-icon>
                Open
              </a>
            </mat-card-actions>
          </mat-card>
        }
      </section>

      @if (s.blockers.length || s.warnings.length) {
        <section class="dashboard__alerts">
          <h3 class="dashboard__alerts-title">Setup check</h3>
          <ul class="dashboard__alerts-list">
            @for (blocker of s.blockers; track blocker) {
              <li class="dashboard__alert dashboard__alert--blocked">
                <mat-icon aria-hidden="true">error</mat-icon>
                <span>{{ blocker }}</span>
              </li>
            }
            @for (warning of s.warnings; track warning) {
              <li class="dashboard__alert dashboard__alert--warning">
                <mat-icon aria-hidden="true">warning</mat-icon>
                <span>{{ warning }}</span>
              </li>
            }
          </ul>
        </section>
      }

      @if (s.quickActions.length) {
        <section class="dashboard__actions" aria-label="Quick actions">
          <h3 class="dashboard__actions-title">Quick actions</h3>
          <div
            class="dashboard__actions-grid"
            [class.dashboard__actions-grid--two]="isTwoColumns()"
            [class.dashboard__actions-grid--three]="isThreeColumns()"
          >
            @for (action of s.quickActions; track action.route) {
              <mat-card appearance="outlined" class="dashboard__action">
                <mat-card-content>
                  <strong>{{ action.label }}</strong>
                  <p>{{ action.description }}</p>
                </mat-card-content>
                <mat-card-actions align="end">
                  <a mat-button color="primary" [routerLink]="action.route">
                    <mat-icon aria-hidden="true">arrow_forward</mat-icon>
                    Open
                  </a>
                </mat-card-actions>
              </mat-card>
            }
          </div>
        </section>
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .dashboard__status {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 10px;
      }
      .dashboard__grid,
      .dashboard__actions-grid {
        display: grid;
        gap: 8px;
        grid-template-columns: 1fr;
        margin-bottom: 10px;
      }
      .dashboard__grid--two,
      .dashboard__actions-grid--two {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .dashboard__grid--three,
      .dashboard__actions-grid--three {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .dashboard__tile,
      .dashboard__action {
        display: grid;
        background: var(--mat-sys-surface);
      }
      .dashboard__tile-avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--mat-sys-primary-container);
        color: var(--mat-sys-primary);
      }
      .dashboard__tile .mat-mdc-card-content,
      .dashboard__action .mat-mdc-card-content {
        padding: 10px 14px;
      }
      .dashboard__tile .mat-mdc-card-actions,
      .dashboard__action .mat-mdc-card-actions {
        padding: 4px 12px 10px;
        gap: 8px;
      }
      .dashboard__action p {
        margin: 4px 0 0;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
      }
      .dashboard__alerts {
        margin: 10px 0;
        padding: 12px;
        background: var(--mat-sys-surface-container-low);
        border-radius: var(--mat-sys-corner-medium);
      }
      .dashboard__alerts-title,
      .dashboard__actions-title {
        margin: 0 0 8px;
        font: var(--mat-sys-title-small);
        letter-spacing: var(--mat-sys-title-small-tracking);
        color: var(--mat-sys-on-surface);
      }
      .dashboard__alerts-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 8px;
      }
      .dashboard__alert {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: var(--mat-sys-corner-small);
        font: var(--mat-sys-body-medium);
        letter-spacing: var(--mat-sys-body-medium-tracking);
      }
      .dashboard__alert--blocked {
        background: var(--mat-sys-error-container);
        color: var(--mat-sys-on-error-container);
      }
      .dashboard__alert--warning {
        background: var(--mat-sys-secondary-container);
        color: var(--mat-sys-on-secondary-container);
      }
    `
  ]
})
export class AdminDashboardComponent implements OnInit {
  private readonly dashboard = inject(AdminDashboardService);
  private readonly breakpoint = inject(BreakpointService);

  protected readonly state = signal<AdminDashboardState | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly isTwoColumns = computed(() => this.breakpoint.isMedium() || this.breakpoint.isExpanded());
  protected readonly isThreeColumns = computed(() => this.breakpoint.isExpanded());

  ngOnInit(): void {
    this.dashboard.load().subscribe({
      next: (state) => {
        this.state.set(state);
        this.error.set(null);
      },
      error: (error: unknown) => {
        const result = adaptApiError(error);
        this.error.set(result.message);
      }
    });
  }

  protected setupLabel(status: AdminDashboardState['setupStatus']): string {
    if (status === 'ready') {
      return 'Ready';
    }
    if (status === 'blocked') {
      return 'Blocked';
    }
    return 'Action required';
  }

  protected setupKind(status: AdminDashboardState['setupStatus']): StatusKind {
    if (status === 'ready') {
      return 'success';
    }
    if (status === 'blocked') {
      return 'danger';
    }
    return 'warning';
  }

  protected setupIcon(status: AdminDashboardState['setupStatus']): string {
    if (status === 'ready') {
      return 'check_circle';
    }
    if (status === 'blocked') {
      return 'error';
    }
    return 'warning';
  }

  protected statusKind(status: AdminSectionSummary['status']): StatusKind {
    if (status === 'ready') {
      return 'success';
    }
    if (status === 'blocked') {
      return 'danger';
    }
    return 'warning';
  }

  protected statusIcon(status: AdminSectionSummary['status']): string {
    if (status === 'ready') {
      return 'check_circle';
    }
    if (status === 'blocked') {
      return 'error';
    }
    return 'warning';
  }

  protected iconFor(route: string): string {
    if (route.startsWith('/admin/content')) return 'photo_library';
    if (route.startsWith('/admin/ads')) return 'campaign';
    if (route.startsWith('/admin/event')) return 'event';
    if (route.startsWith('/admin/iframes')) return 'web_asset';
    if (route.startsWith('/admin/configuration')) return 'tune';
    if (route.startsWith('/admin/users')) return 'group';
    return 'dashboard';
  }
}
