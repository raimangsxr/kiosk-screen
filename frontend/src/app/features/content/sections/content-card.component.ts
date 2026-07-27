import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';

import { ContentItem } from '../../../core/api/content.api';
import { StatusChipComponent } from '../../../shared/ui/status-chip.component';
import {
  contentMediaLabel,
  contentRotationSummary,
  contentTypeLabel
} from '../content-labels';

/**
 * Presentational card for one content item (compact/card layout of the
 * content list). All state and side effects live in `ContentListComponent`;
 * this component only renders inputs and emits user intent. Extracted during
 * the CHG-046 structural split — markup and styles are moved verbatim so the
 * rendered output is identical to the previous inline template.
 */
@Component({
  selector: 'app-content-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatCheckboxModule, MatIconModule, StatusChipComponent],
  template: `
    <mat-card
      appearance="outlined"
      class="content-list__card-item"
      [class.content-list__card-item--novelty]="item().isNovelty"
    >
      @if (item().mediaFile?.mediaUrl) {
        @if (item().contentType === 'video') {
          <video
            class="content-list__card-thumb"
            [src]="item().mediaFile?.mediaUrl ?? ''"
            preload="metadata"
            muted
            aria-hidden="true"
          ></video>
        } @else {
          <img
            class="content-list__card-thumb"
            [src]="item().mediaFile?.mediaUrl ?? ''"
            alt=""
            loading="lazy"
          />
        }
      }
      <mat-card-content>
        <div class="content-list__card-select">
          <mat-checkbox
            [checked]="selected()"
            (change)="toggleSelect.emit($event.checked)"
            [attr.aria-label]="'Seleccionar ' + item().title"
          />
          @if (reorderEnabled()) {
            <div class="content-list__card-reorder">
              <button
                mat-icon-button
                type="button"
                [disabled]="!canMoveUp()"
                (click)="moveUp.emit()"
                aria-label="Subir"
              >
                <mat-icon aria-hidden="true">arrow_upward</mat-icon>
              </button>
              <button
                mat-icon-button
                type="button"
                [disabled]="!canMoveDown()"
                (click)="moveDown.emit()"
                aria-label="Bajar"
              >
                <mat-icon aria-hidden="true">arrow_downward</mat-icon>
              </button>
            </div>
          }
        </div>
        <div class="content-list__card-header">
          <h3 class="content-list__card-title">{{ item().title }}</h3>
          <app-status-chip
            [label]="item().isActive ? 'Activo' : 'Inactivo'"
            [kind]="item().isActive ? 'success' : 'neutral'"
          />
        </div>
        <p class="content-list__card-meta">
          <span>{{ typeLabel(item().contentType) }}</span>
          <span> · {{ mediaLabel(item()) }}</span>
          <span> · Orden {{ item().displayOrder }}</span>
        </p>
        <p class="content-list__card-rotation">
          {{ rotationSummary(item()) }}
          @if (item().isNovelty) {
            <app-status-chip label="Novedad" kind="warning" icon="new_releases" />
          }
        </p>
      </mat-card-content>
      <mat-card-actions class="app-card-actions content-list__card-actions">
        <button
          mat-button
          color="primary"
          type="button"
          (click)="showOnScreen.emit()"
          [disabled]="saving() || !item().isActive || item().isFixed === true"
        >
          <mat-icon aria-hidden="true">play_circle</mat-icon>
          Mostrar en pantalla
        </button>
        <a
          mat-button
          color="primary"
          [routerLink]="['/admin/content', item().id, 'edit']"
          [attr.aria-label]="'Editar contenido ' + item().id"
        >
          <mat-icon aria-hidden="true">edit</mat-icon>
          Editar
        </a>
        <button
          mat-button
          color="warn"
          type="button"
          (click)="remove.emit()"
          [disabled]="saving()"
          [attr.aria-label]="'Eliminar contenido ' + item().id"
        >
          <mat-icon aria-hidden="true">delete</mat-icon>
          Eliminar
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .content-list__card-item {
        display: block;
        background: var(--mat-sys-surface);
      }
      .content-list__card-item--novelty {
        border-color: var(--status-warning-container);
        background: color-mix(in srgb, var(--status-warning-container) 20%, var(--mat-sys-surface));
      }
      .content-list__card-thumb {
        width: 100%;
        height: 160px;
        object-fit: cover;
        display: block;
        background: var(--mat-sys-surface-container);
        border-top-left-radius: inherit;
        border-top-right-radius: inherit;
      }
      .content-list__card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .content-list__card-select {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }
      .content-list__card-reorder {
        display: inline-flex;
        gap: 4px;
      }
      .content-list__card-title {
        margin: 0;
        font: var(--mat-sys-title-medium);
        letter-spacing: var(--mat-sys-title-medium-tracking);
      }
      .content-list__card-meta {
        margin: 4px 0 0;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
      }
      .content-list__card-rotation {
        margin: 6px 0 0;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
        display: inline-flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
      }
      .content-list__card-actions {
        padding: 0 16px 12px;
      }
    `
  ]
})
export class ContentCardComponent {
  readonly item = input.required<ContentItem>();
  readonly selected = input<boolean>(false);
  readonly saving = input<boolean>(false);
  readonly reorderEnabled = input<boolean>(true);
  readonly canMoveUp = input<boolean>(false);
  readonly canMoveDown = input<boolean>(false);

  readonly toggleSelect = output<boolean>();
  readonly moveUp = output<void>();
  readonly moveDown = output<void>();
  readonly showOnScreen = output<void>();
  readonly remove = output<void>();

  protected readonly typeLabel = contentTypeLabel;
  protected readonly mediaLabel = contentMediaLabel;
  protected readonly rotationSummary = contentRotationSummary;
}
