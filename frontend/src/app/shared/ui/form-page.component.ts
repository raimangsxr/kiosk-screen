import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { BreakpointService } from '../../core/layout/breakpoint.service';

@Component({
  selector: 'app-form-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatCardModule, MatProgressBarModule],
  template: `
    <mat-card appearance="outlined" class="form-page">
      <mat-card-header class="form-page__header">
        <ng-content select="[formPageHeader]" />
        @if (title()) {
          <mat-card-title class="form-page__title">{{ title() }}</mat-card-title>
        }
        @if (subtitle()) {
          <mat-card-subtitle class="form-page__subtitle">{{ subtitle() }}</mat-card-subtitle>
        }
      </mat-card-header>

      <mat-card-content class="form-page__content">
        <mat-progress-bar
          *ngIf="loading()"
          mode="indeterminate"
          aria-label="Loading"
        />
        <ng-content />
      </mat-card-content>

      <mat-card-actions
        class="form-page__actions"
        [align]="isHandset() ? 'start' : 'end'"
        [class.form-page__actions--stacked]="isHandset()"
      >
        <ng-content select="[formPageActions]" />
      </mat-card-actions>
    </mat-card>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .form-page {
        display: block;
      }
      .form-page__header {
        padding: 20px 20px 8px;
      }
      .form-page__title {
        font-size: 20px;
        font-weight: 600;
      }
      .form-page__subtitle {
        margin-top: 4px;
        color: var(--mat-sys-on-surface-variant);
      }
      .form-page__content {
        padding: 12px 20px 16px;
        display: grid;
        gap: 12px;
      }
      .form-page__actions {
        padding: 8px 16px 16px;
        gap: 8px;
        display: flex;
        flex-wrap: wrap;
      }
      .form-page__actions--stacked {
        flex-direction: column;
        align-items: stretch;
      }
      .form-page__actions--stacked ::ng-deep > * {
        width: 100%;
        min-height: var(--app-touch-target);
      }
    `
  ]
})
export class FormPageComponent {
  private readonly breakpoint = inject(BreakpointService);
  protected readonly isHandset = this.breakpoint.isHandset;

  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly loading = input<boolean>(false);
}
