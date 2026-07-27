import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { BreakpointService } from '../../../core/layout/breakpoint.service';

@Component({
  selector: 'app-admin-form-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatProgressBarModule],
  template: `
    <mat-card appearance="outlined" class="admin-form-shell">
      <mat-card-header class="admin-form-shell__header">
        <ng-content select="[formShellHeader]" />
        @if (title()) {
          <mat-card-title class="admin-form-shell__title">{{ title() }}</mat-card-title>
        }
        @if (subtitle()) {
          <mat-card-subtitle class="admin-form-shell__subtitle">{{ subtitle() }}</mat-card-subtitle>
        }
      </mat-card-header>

      <mat-card-content class="admin-form-shell__content">
        @if (loading()) {
          <mat-progress-bar mode="indeterminate" [attr.aria-label]="'Cargando'" />
        }
        <ng-content />
      </mat-card-content>

      <mat-card-actions
        class="admin-form-shell__actions"
        [align]="isCompact() ? 'start' : 'end'"
        [class.admin-form-shell__actions--stacked]="isCompact()"
      >
        <ng-content select="[formShellActions]" />
      </mat-card-actions>
    </mat-card>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .admin-form-shell {
        display: block;
        background: var(--mat-sys-surface);
        border-radius: var(--app-radius-lg);
        box-shadow: var(--app-shadow-sm);
      }
      .admin-form-shell__header {
        padding: 24px 24px 8px;
      }
      .admin-form-shell__title {
        font: var(--mat-sys-title-large);
        letter-spacing: var(--mat-sys-title-large-tracking);
      }
      .admin-form-shell__subtitle {
        margin-top: 4px;
        font: var(--mat-sys-body-medium);
        letter-spacing: var(--mat-sys-body-medium-tracking);
        color: var(--mat-sys-on-surface-variant);
      }
      .admin-form-shell__content {
        padding: 16px 24px;
        display: grid;
        gap: 16px;
      }
      .admin-form-shell__actions {
        padding: 8px 24px 24px;
        gap: 8px;
        display: flex;
        flex-wrap: wrap;
      }
      .admin-form-shell__actions--stacked {
        flex-direction: column;
        align-items: stretch;
      }
      .admin-form-shell__actions--stacked > * {
        width: 100%;
        min-height: var(--app-touch-target);
      }
    `
  ]
})
export class AdminFormShellComponent {
  private readonly breakpoint = inject(BreakpointService);
  protected readonly isCompact = this.breakpoint.isCompact;

  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly loading = input<boolean>(false);
}
