import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ReadinessApiService, ReadinessReport } from './readiness-api.service';
import { mapAdminError } from '../shared/admin-error-mapper';

@Component({
  selector: 'app-readiness',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page-panel">
      <h1>Readiness</h1>
      <p role="alert" *ngIf="error">{{ error }}</p>
      <strong>{{ report?.ready ? 'Ready' : 'Blocked' }}</strong>
      <h2>Blockers</h2>
      <ul><li *ngFor="let blocker of report?.blockers">{{ blocker }} <a [routerLink]="resolveRoute(blocker)">Resolve</a></li></ul>
      <h2>Warnings</h2>
      <ul><li *ngFor="let warning of report?.warnings">{{ warning }} <a [routerLink]="resolveRoute(warning)">Review</a></li></ul>
    </section>
  `
})
export class ReadinessComponent implements OnInit {
  private readonly api = inject(ReadinessApiService);
  report: ReadinessReport | null = null;
  error = '';

  ngOnInit(): void {
    this.api.getReadiness().subscribe({
      next: (report) => {
        this.report = report;
      },
      error: (error) => {
        this.error = mapAdminError(error, 'Readiness could not be loaded.');
      }
    });
  }

  resolveRoute(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('content')) return '/admin/content';
    if (lower.includes('ad')) return '/admin/ads';
    if (lower.includes('client')) return '/admin/clients';
    if (lower.includes('domain') || lower.includes('iframe') || lower.includes('embedded')) return '/admin/domains';
    if (lower.includes('configuration') || lower.includes('display')) return '/admin/configuration';
    if (lower.includes('user') || lower.includes('role')) return '/admin/users';
    return '/admin';
  }
}
