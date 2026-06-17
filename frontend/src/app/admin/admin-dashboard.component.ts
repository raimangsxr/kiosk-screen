import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminDashboardState } from '../shared/admin-ui.models';
import { AdminStateComponent } from '../shared/admin-state.component';
import { mapAdminError } from '../shared/admin-error-mapper';
import { AdminDashboardService } from './admin-dashboard.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminStateComponent],
  template: `
    <section class="admin-dashboard">
      <header>
        <h2>Dashboard</h2>
        <strong class="status-pill" [class.blocked]="state?.setupStatus === 'blocked'" [class.warning]="state?.setupStatus === 'warning'">
          {{ state?.setupStatus || 'Loading' }}
        </strong>
      </header>

      <app-admin-state *ngIf="error" type="error" title="Dashboard unavailable" [message]="error" />

      <section *ngIf="state" class="summary-grid" aria-label="Section summaries">
        <a *ngFor="let summary of state.sectionSummaries" [routerLink]="summary.route" class="summary-card">
          <span>{{ summary.label }}</span>
          <strong>{{ summary.value }}</strong>
        </a>
      </section>

      <section *ngIf="state?.blockers?.length || state?.warnings?.length" class="readiness-summary">
        <h3>Readiness</h3>
        <ul>
          <li *ngFor="let blocker of state?.blockers">Blocker: {{ blocker }}</li>
          <li *ngFor="let warning of state?.warnings">Warning: {{ warning }}</li>
        </ul>
        <a routerLink="/admin/readiness">Review readiness</a>
      </section>

      <section *ngIf="state" class="quick-actions" aria-label="Quick actions">
        <h3>Quick actions</h3>
        <a *ngFor="let action of state.quickActions" [routerLink]="action.route">
          <strong>{{ action.label }}</strong>
          <span>{{ action.description }}</span>
        </a>
      </section>
    </section>
  `
})
export class AdminDashboardComponent implements OnInit {
  private readonly dashboard = inject(AdminDashboardService);
  state: AdminDashboardState | null = null;
  error = '';

  ngOnInit(): void {
    this.dashboard.load().subscribe({
      next: (state) => {
        this.state = state;
        this.error = '';
      },
      error: (error) => {
        this.error = mapAdminError(error, 'Dashboard could not be loaded.');
      }
    });
  }
}
