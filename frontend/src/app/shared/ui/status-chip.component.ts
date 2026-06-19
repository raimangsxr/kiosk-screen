import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

import { injectExtendedColors, ExtendedColor } from '../../core/theme/extended-colors';

export type StatusKind = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

@Component({
  selector: 'app-status-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatChipsModule, MatIconModule],
  template: `
    <span
      class="status-chip"
      [class.status-chip--success]="kind() === 'success'"
      [class.status-chip--warning]="kind() === 'warning'"
      [class.status-chip--danger]="kind() === 'danger'"
      [class.status-chip--info]="kind() === 'info'"
      [class.status-chip--neutral]="kind() === 'neutral'"
    >
      @if (icon()) {
        <mat-icon aria-hidden="true" class="status-chip__icon">{{ icon() }}</mat-icon>
      }
      <span class="status-chip__label">{{ label() }}</span>
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .status-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 12px;
        border-radius: 999px;
        font: var(--mat-sys-label-medium);
        letter-spacing: var(--mat-sys-label-medium-tracking);
        font-weight: 600;
        line-height: 20px;
      }
      .status-chip__icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      .status-chip--success {
        background: var(--status-success-container);
        color: var(--status-on-success-container);
      }
      .status-chip--warning {
        background: var(--status-warning-container);
        color: var(--status-on-warning-container);
      }
      .status-chip--danger {
        background: var(--mat-sys-error-container);
        color: var(--mat-sys-on-error-container);
      }
      .status-chip--info {
        background: var(--status-info-container);
        color: var(--status-on-info-container);
      }
      .status-chip--neutral {
        background: var(--mat-sys-surface-container);
        color: var(--mat-sys-on-surface-variant);
      }
    `
  ],
  host: {
    '[style.--status-success-container]': 'colors.success.container',
    '[style.--status-on-success-container]': 'colors.success.onContainer',
    '[style.--status-warning-container]': 'colors.warning.container',
    '[style.--status-on-warning-container]': 'colors.warning.onContainer',
    '[style.--status-info-container]': 'colors.info.container',
    '[style.--status-on-info-container]': 'colors.info.onContainer'
  }
})
export class StatusChipComponent {
  protected readonly colors: ReturnType<typeof injectExtendedColors> = injectExtendedColors();

  readonly label = input.required<string>();
  readonly kind = input<StatusKind>('neutral');
  readonly icon = input<string>('');
}
