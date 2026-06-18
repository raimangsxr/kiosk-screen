import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';

import { ReadinessFacade } from './readiness.facade';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { AdminStateComponent } from '../../shared/admin-state.component';

@Component({
  selector: 'app-readiness',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatDividerModule,
    PageHeaderComponent,
    AdminStateComponent
  ],
  template: `
    <app-page-header
      eyebrow="Administration"
      title="Readiness"
      description="Kiosk setup blockers and warnings. Resolve each item before opening the display."
    />

    <mat-card appearance="outlined" class="readiness__card">
      <mat-card-content>
        <mat-progress-bar *ngIf="facade.loading()" mode="indeterminate" aria-label="Loading readiness" />
        <app-admin-state
          *ngIf="facade.error() as error"
          type="error"
          title="Readiness unavailable"
          [message]="error.message"
        />

        <div *ngIf="facade.ready()" class="readiness__ready">
          <span class="readiness__pill readiness__pill--ready">Ready to open kiosk</span>
          <p>All required setup items are present. You can open kiosk mode from the hall.</p>
        </div>

        <div *ngIf="facade.blocked()" class="readiness__blocked">
          <span class="readiness__pill readiness__pill--blocked">Blocked</span>
          <p>Resolve each blocker below before opening kiosk mode.</p>
        </div>

        <ng-container *ngIf="facade.blockers().length > 0">
          <h3>Blockers</h3>
          <ul class="readiness__list">
            <li *ngFor="let blocker of facade.blockers()">
              <span class="readiness__message">{{ blocker }}</span>
              <a mat-stroked-button color="primary" [routerLink]="resolveRoute(blocker)">
                <mat-icon aria-hidden="true">arrow_forward</mat-icon>
                Resolve
              </a>
            </li>
          </ul>
        </ng-container>

        <ng-container *ngIf="facade.warnings().length > 0">
          <mat-divider />
          <h3>Warnings</h3>
          <ul class="readiness__list">
            <li *ngFor="let warning of facade.warnings()">
              <span class="readiness__message">{{ warning }}</span>
              <a mat-stroked-button [routerLink]="resolveRoute(warning)">
                <mat-icon aria-hidden="true">arrow_forward</mat-icon>
                Review
              </a>
            </li>
          </ul>
        </ng-container>

        <ng-container *ngIf="!facade.loading() && !facade.error() && !facade.report()">
          <app-admin-state
            type="empty"
            title="No readiness report"
            message="Readiness has not been computed yet."
          />
        </ng-container>
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      .readiness__card {
        margin-top: 16px;
      }
      .readiness__ready,
      .readiness__blocked {
        margin-bottom: 16px;
      }
      .readiness__pill {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      .readiness__pill--ready {
        background: #dcfce7;
        color: #166534;
      }
      .readiness__pill--blocked {
        background: #fee2e2;
        color: #991b1b;
      }
      .readiness__list {
        list-style: none;
        padding: 0;
        margin: 8px 0;
      }
      .readiness__list li {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        margin-bottom: 8px;
        background: #fff;
      }
      .readiness__message {
        flex: 1;
      }
      h3 {
        font-size: 14px;
        font-weight: 600;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 16px 0 8px;
      }
    `
  ]
})
export class ReadinessComponent implements OnInit {
  protected readonly facade = inject(ReadinessFacade);

  ngOnInit(): void {
    this.facade.refresh().subscribe();
  }

  resolveRoute(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('content')) {
      return '/admin/content';
    }
    if (lower.includes('ad')) {
      return '/admin/ads';
    }
    if (lower.includes('client')) {
      return '/admin/clients';
    }
    if (lower.includes('domain') || lower.includes('iframe') || lower.includes('embedded')) {
      return '/admin/domains';
    }
    if (lower.includes('configuration') || lower.includes('display')) {
      return '/admin/configuration';
    }
    if (lower.includes('user') || lower.includes('role')) {
      return '/admin/users';
    }
    return '/admin';
  }
}
