import { ChangeDetectionStrategy, Component, ContentChild, TemplateRef, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { PageHeaderComponent } from '../page-header/page-header.component';
import { SectionActionsComponent, SectionAction } from '../section-actions/section-actions.component';
import { AdminStateComponent } from '../../admin-state.component';
import { EmptyStateComponent } from '../empty-state.component';
import { BreakpointService } from '../../../core/layout/breakpoint.service';

export interface DataListPrimaryAction {
  readonly label: string;
  readonly route: string;
  readonly icon?: string;
}

export interface DataListRefreshAction {
  readonly route: string;
  readonly label?: string;
  readonly icon?: string;
}

@Component({
  selector: 'app-data-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    PageHeaderComponent,
    SectionActionsComponent,
    AdminStateComponent,
    EmptyStateComponent
  ],
  template: `
    <app-page-header
      eyebrow="Administration"
      [title]="title()"
      [description]="description()"
    />

    <div class="data-list__actions">
      <app-section-actions [actions]="headerActions()" />
      <ng-content select="[dataListActions]" />
    </div>

    <mat-card appearance="outlined" class="data-list__card">
      <mat-progress-bar
        *ngIf="loading()"
        mode="indeterminate"
        aria-label="Loading"
      />

      <mat-card-content class="data-list__content">
        <app-admin-state
          *ngIf="error() as err"
          kind="error"
          [title]="errorTitle()"
          [message]="err.message"
        />

        <app-empty-state
          *ngIf="showEmpty()"
          [title]="emptyTitle()"
          [description]="emptyMessage()"
          [icon]="emptyIcon()"
          [actionLabel]="emptyActionLabel()"
          [actionRoute]="emptyActionRoute()"
        />

        @if (ready()) {
          <div class="data-list__table" [class.data-list__table--responsive]="cardsTpl">
            <ng-container *ngTemplateOutlet="tableTpl ?? null" />
          </div>
          @if (cardsTpl) {
            <div class="data-list__cards data-list__cards--responsive">
              <ng-container *ngTemplateOutlet="cardsTpl" />
            </div>
          }
        }
      </mat-card-content>
    </mat-card>

    @if (isHandset() && primaryAction(); as action) {
      <a
        mat-fab
        color="primary"
        [routerLink]="action.route"
        [attr.aria-label]="action.label"
        class="data-list__fab"
      >
        <mat-icon aria-hidden="true">{{ action.icon || 'add' }}</mat-icon>
      </a>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .data-list__card {
        margin-top: 8px;
        min-width: 0;
      }
      .data-list__actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 12px;
      }
      .data-list__actions app-section-actions {
        flex: 1 1 auto;
      }
      .data-list__content {
        display: block;
        padding: 0;
        min-width: 0;
        container-type: inline-size;
      }
      .data-list__table {
        display: block;
        width: 100%;
        min-width: 0;
        overflow-x: auto;
      }
      .data-list__cards {
        display: none;
        gap: 12px;
        padding: 4px 16px 16px;
        min-width: 0;
      }
      .data-list__fab {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 5;
      }
      @container (max-width: 760px) {
        .data-list__table--responsive {
          display: none;
        }
        .data-list__cards--responsive {
          display: grid;
        }
      }
    `
  ]
})
export class DataListComponent {
  protected readonly breakpoint = inject(BreakpointService);
  private readonly router = inject(Router);
  protected readonly isHandset = this.breakpoint.isHandset;

  @ContentChild('dataListTable') tableTpl?: TemplateRef<unknown>;
  @ContentChild('dataListCards') cardsTpl?: TemplateRef<unknown>;

  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly loading = input<boolean>(false);
  readonly error = input<{ message: string } | null>(null);
  readonly errorTitle = input<string>('Could not load');
  readonly empty = input<boolean>(false);
  readonly emptyTitle = input<string>('Nothing here');
  readonly emptyMessage = input<string>('');
  readonly emptyActionLabel = input<string>('');
  readonly emptyActionRoute = input<string>('');
  readonly emptyIcon = input<string>('inbox');
  readonly primaryAction = input<DataListPrimaryAction | null>(null);
  readonly refreshAction = input<DataListRefreshAction | null>(null);

  protected readonly ready = computed(() => !this.loading() && !this.error() && !this.empty());
  protected readonly showEmpty = computed(() => !this.loading() && !this.error() && this.empty());

  protected readonly headerActions = computed<readonly SectionAction[]>(() => {
    const actions: SectionAction[] = [];
    const refresh = this.refreshAction();
    if (refresh) {
      actions.push({
        label: refresh.label ?? 'Refresh',
        route: refresh.route,
        kind: 'secondary',
        icon: refresh.icon ?? 'refresh'
      });
    }
    const primary = this.primaryAction();
    if (primary && !this.isHandset()) {
      actions.push({
        label: primary.label,
        route: primary.route,
        kind: 'primary',
        icon: primary.icon ?? 'add'
      });
    }
    return actions;
  });
}
