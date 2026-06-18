import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { AdminDashboardService } from '../../admin/admin-dashboard.service';
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

    <app-admin-state
      *ngIf="error() as err"
      kind="error"
      title="Dashboard unavailable"
      [message]="err"
    />

    <ng-container *ngIf="state() as s">
      <div class="dashboard__status">
        <app-status-chip
          [label]="setupLabel(s.setupStatus)"
          [kind]="setupKind(s.setupStatus)"
          [icon]="setupIcon(s.setupStatus)"
        />
        <a mat-button color="primary" routerLink="/admin/readiness">
          <mat-icon aria-hidden="true">fact_check</mat-icon>
          Review readiness
        </a>
      </div>

      <section
        class="dashboard__grid"
        [class.dashboard__grid--two]="isTwoColumns()"
        [class.dashboard__grid--three]="isThreeColumns()"
        aria-label="Section summaries"
      >
        @for (summary of s.sectionSummaries; track summary.route) {
          <a mat-card appearance="outlined" [routerLink]="summary.route" class="dashboard__tile">
            <mat-card-header>
              <mat-icon mat-card-avatar aria-hidden="true">{{ iconFor(summary.route) }}</mat-icon>
              <mat-card-title>{{ summary.label }}</mat-card-title>
              <mat-card-subtitle>{{ summary.value }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-actions align="end">
              <app-status-chip
                [label]="summary.status | titlecase"
                [kind]="statusKind(summary.status)"
                [icon]="statusIcon(summary.status)"
              />
            </mat-card-actions>
          </a>
        }
      </section>

      <section *ngIf="s.blockers.length || s.warnings.length" class="dashboard__alerts">
        <h3 class="dashboard__alerts-title">Readiness</h3>
        <ul class="dashboard__alerts-list">
          <li *ngFor="let blocker of s.blockers" class="dashboard__alert dashboard__alert--blocked">
            <mat-icon aria-hidden="true">error</mat-icon>
            <span>{{ blocker }}</span>
          </li>
          <li *ngFor="let warning of s.warnings" class="dashboard__alert dashboard__alert--warning">
            <mat-icon aria-hidden="true">warning</mat-icon>
            <span>{{ warning }}</span>
          </li>
        </ul>
      </section>

      <section *ngIf="s.quickActions.length" class="dashboard__actions" aria-label="Quick actions">
        <h3 class="dashboard__actions-title">Quick actions</h3>
        <div
          class="dashboard__actions-grid"
          [class.dashboard__actions-grid--two]="isTwoColumns()"
          [class.dashboard__actions-grid--three]="isThreeColumns()"
        >
          @for (action of s.quickActions; track action.route) {
            <a mat-card appearance="outlined" [routerLink]="action.route" class="dashboard__action">
              <mat-card-content>
                <strong>{{ action.label }}</strong>
                <p>{{ action.description }}</p>
              </mat-card-content>
              <mat-card-actions align="end">
                <button mat-button color="primary" type="button">
                  <mat-icon aria-hidden="true">arrow_forward</mat-icon>
                  Open
                </button>
              </mat-card-actions>
            </a>
          }
        </div>
      </section>
    </ng-container>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .dashboard__status {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .dashboard__grid,
      .dashboard__actions-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: 1fr;
        margin-bottom: 16px;
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
        text-decoration: none;
        color: inherit;
        display: block;
        transition: transform 120ms ease, box-shadow 120ms ease;
      }
      .dashboard__tile:hover,
      .dashboard__action:hover {
        transform: translateY(-2px);
      }
      .dashboard__action p {
        margin: 4px 0 0;
        color: var(--mat-sys-on-surface-variant);
        font-size: 13px;
      }
      .dashboard__alerts {
        margin: 16px 0;
        padding: 16px;
        background: var(--mat-sys-surface-container-low);
        border-radius: 8px;
      }
      .dashboard__alerts-title,
      .dashboard__actions-title {
        margin: 0 0 8px;
        font-size: 14px;
        font-weight: 600;
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
        border-radius: 6px;
        font-size: 14px;
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
    if (route.startsWith('/admin/clients')) return 'business';
    if (route.startsWith('/admin/domains')) return 'public';
    if (route.startsWith('/admin/configuration')) return 'tune';
    if (route.startsWith('/admin/users')) return 'group';
    return 'dashboard';
  }
}
