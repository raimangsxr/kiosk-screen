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

    <app-section-actions [actions]="headerActions()" />

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
          @if (isHandset()) {
            <div class="data-list__cards">
              <ng-container *ngTemplateOutlet="cardsTpl ?? null" />
            </div>
          } @else {
            <div class="data-list__table">
              <ng-container *ngTemplateOutlet="tableTpl ?? null" />
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
      }
      .data-list__content {
        display: block;
        padding: 8px 0 0;
      }
      .data-list__table {
        display: block;
        width: 100%;
        overflow-x: auto;
      }
      .data-list__cards {
        display: grid;
        gap: 12px;
        padding: 4px 16px 16px;
      }
      .data-list__fab {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 5;
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
