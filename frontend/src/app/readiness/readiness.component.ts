import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';

import { ReadinessApiService, ReadinessReport } from './readiness-api.service';

@Component({
  selector: 'app-readiness',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page-panel">
      <h1>Readiness</h1>
      <strong>{{ report?.ready ? 'Ready' : 'Blocked' }}</strong>
      <h2>Blockers</h2>
      <ul><li *ngFor="let blocker of report?.blockers">{{ blocker }}</li></ul>
      <h2>Warnings</h2>
      <ul><li *ngFor="let warning of report?.warnings">{{ warning }}</li></ul>
    </section>
  `
})
export class ReadinessComponent implements OnInit {
  private readonly api = inject(ReadinessApiService);
  report: ReadinessReport | null = null;

  ngOnInit(): void {
    this.api.getReadiness().subscribe((report) => {
      this.report = report;
    });
  }
}
