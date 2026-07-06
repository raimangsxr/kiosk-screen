import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-admin-entity-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule],
  template: `
    <mat-card appearance="outlined" class="admin-entity-card" [class.admin-entity-card--highlight]="highlight()">
      @if (hasMedia()) {
        <div class="admin-entity-card__media">
          <ng-content select="[entityMedia]" />
        </div>
      }
      <mat-card-content class="admin-entity-card__content">
        <div class="admin-entity-card__header">
          <div class="admin-entity-card__titles">
            @if (title()) {
              <h3 class="admin-entity-card__title">{{ title() }}</h3>
            }
            @if (subtitle()) {
              <p class="admin-entity-card__subtitle">{{ subtitle() }}</p>
            }
          </div>
          <div class="admin-entity-card__status">
            <ng-content select="[entityStatus]" />
          </div>
        </div>
        <div class="admin-entity-card__meta">
          <ng-content select="[entityMeta]" />
        </div>
      </mat-card-content>
      <mat-card-actions class="admin-entity-card__actions app-card-actions">
        <ng-content select="[entityActions]" />
      </mat-card-actions>
    </mat-card>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .admin-entity-card {
        display: block;
        background: var(--mat-sys-surface);
      }
      .admin-entity-card--highlight {
        border-color: var(--mat-sys-primary);
      }
      .admin-entity-card__media {
        display: block;
      }
      .admin-entity-card__media :ng-deep img,
      .admin-entity-card__media :ng-deep video {
        width: 100%;
        height: 160px;
        object-fit: cover;
        display: block;
        background: var(--mat-sys-surface-container);
        border-top-left-radius: inherit;
        border-top-right-radius: inherit;
      }
      .admin-entity-card__content {
        padding-top: 12px;
      }
      .admin-entity-card__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .admin-entity-card__title {
        margin: 0;
        font: var(--mat-sys-title-medium);
        letter-spacing: var(--mat-sys-title-medium-tracking);
      }
      .admin-entity-card__subtitle {
        margin: 4px 0 0;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
        word-break: break-word;
      }
      .admin-entity-card__meta {
        margin-top: 8px;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
      }
      .admin-entity-card__actions {
        padding: 0 16px 12px;
        flex-wrap: wrap;
      }
      .admin-entity-card__actions [mat-button],
      .admin-entity-card__actions [mat-stroked-button],
      .admin-entity-card__actions [mat-flat-button] {
        min-height: var(--app-touch-target);
      }
    `
  ]
})
export class AdminEntityCardComponent {
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly highlight = input<boolean>(false);
  readonly hasMedia = input<boolean>(false);
}
