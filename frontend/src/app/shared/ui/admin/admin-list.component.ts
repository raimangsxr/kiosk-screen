import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  TemplateRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { BreakpointService } from '../../../core/layout/breakpoint.service';
import { AdminStateComponent } from '../../admin-state.component';
import { EmptyStateComponent } from '../empty-state.component';
import { AdminAction, AdminActionBarComponent } from './admin-action-bar.component';
import { AdminPageComponent } from './admin-page.component';
import { ADMIN_COPY } from './admin-copy';

export interface AdminListPrimaryAction {
  readonly label: string;
  readonly route: string;
  readonly icon?: string;
}

export interface AdminListRefreshAction {
  readonly route?: string;
  readonly label?: string;
  readonly icon?: string;
}

@Component({
  selector: 'app-admin-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    AdminPageComponent,
    AdminActionBarComponent,
    AdminStateComponent,
    EmptyStateComponent
  ],
  template: `
    <app-admin-page [title]="title()" [description]="description()" />

    @if (selectedCount() > 0) {
      <div class="admin-list__bulk" role="status" aria-live="polite" data-testid="admin-list-bulk-bar">
        <span>{{ selectedCount() }} seleccionado(s)</span>
        <ng-content select="[adminListBulk]" />
      </div>
    }

    <app-admin-action-bar [actions]="headerActions()" (actionClick)="headerActionClick.emit($event)">
      @if (refreshAction(); as refresh) {
        <button
          mat-stroked-button
          color="primary"
          type="button"
          class="admin-list__refresh"
          (click)="onRefreshClick()"
          [attr.aria-label]="refresh.label ?? ADMIN_COPY.refresh"
          data-testid="admin-list-refresh"
        >
          <mat-icon aria-hidden="true">{{ refresh.icon ?? 'refresh' }}</mat-icon>
          {{ refresh.label ?? ADMIN_COPY.refresh }}
        </button>
      }
      <ng-content select="[adminListActions]" />
    </app-admin-action-bar>

    <mat-card appearance="outlined" class="admin-list__card">
      @if (loading() && !error()) {
        <div class="admin-list__skeleton" role="status" aria-live="polite" [attr.aria-label]="ADMIN_COPY.loading" data-testid="admin-list-skeleton">
          <div class="admin-list__skeleton-row" style="width: 92%;"></div>
          <div class="admin-list__skeleton-row" style="width: 76%;"></div>
          <div class="admin-list__skeleton-row" style="width: 84%;"></div>
        </div>
      }

      <mat-card-content class="admin-list__content">
        @if (error(); as err) {
          <app-admin-state kind="error" [title]="errorTitle()" [message]="err.message" />
        }

        @if (showEmpty()) {
          <app-empty-state
            [title]="emptyTitle()"
            [description]="emptyMessage()"
            [icon]="emptyIcon()"
            [actionLabel]="emptyActionLabel()"
            [actionRoute]="emptyActionRoute()"
            (action)="emptyAction.emit()"
          />
        }

        @if (ready()) {
          @if (!useCards()) {
            <div class="admin-list__table">
              <ng-container *ngTemplateOutlet="tableTpl ?? null" />
            </div>
          } @else if (cardsTpl) {
            <div class="admin-list__cards">
              <ng-container *ngTemplateOutlet="cardsTpl" />
            </div>
          } @else {
            <div class="admin-list__table">
              <ng-container *ngTemplateOutlet="tableTpl ?? null" />
            </div>
          }
        }
      </mat-card-content>
    </mat-card>

    @if (showFab() && primaryAction(); as action) {
      <a
        mat-fab
        color="primary"
        [routerLink]="action.route"
        [attr.aria-label]="action.label"
        class="admin-list__fab"
        data-testid="admin-list-fab"
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
      .admin-list__bulk {
        position: sticky;
        top: var(--app-touch-target);
        z-index: 4;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        margin-bottom: 8px;
        background: var(--mat-sys-secondary-container);
        color: var(--mat-sys-on-secondary-container);
        border-radius: var(--mat-sys-corner-medium);
        font: var(--mat-sys-label-large);
      }
      .admin-list__card {
        margin-top: 4px;
        min-width: 0;
      }
      .admin-list__refresh {
        min-height: var(--app-touch-target);
      }
      .admin-list__content {
        display: block;
        padding: 0;
        min-width: 0;
      }
      .admin-list__table {
        display: block;
        width: 100%;
        min-width: 0;
        overflow-x: auto;
      }
      .admin-list__cards {
        display: grid;
        gap: 12px;
        padding: 4px 16px 16px;
        min-width: 0;
      }
      .admin-list__fab {
        position: fixed;
        right: 16px;
        bottom: calc(16px + var(--admin-safe-bottom, 0px));
        z-index: 5;
      }
      .admin-list__skeleton {
        display: grid;
        gap: 12px;
        padding: 16px 24px;
      }
      .admin-list__skeleton-row {
        height: 16px;
        border-radius: var(--mat-sys-corner-small);
        background: linear-gradient(
          90deg,
          var(--mat-sys-surface-container) 0%,
          var(--mat-sys-surface-container-high) 50%,
          var(--mat-sys-surface-container) 100%
        );
        background-size: 200% 100%;
        animation: admin-list-shimmer 1.4s linear infinite;
      }
      @keyframes admin-list-shimmer {
        from {
          background-position: 200% 0;
        }
        to {
          background-position: -200% 0;
        }
      }
    `
  ]
})
export class AdminListComponent {
  protected readonly ADMIN_COPY = ADMIN_COPY;
  private readonly breakpoint = inject(BreakpointService);

  @ContentChild('adminListTable') tableTpl?: TemplateRef<unknown>;
  @ContentChild('adminListCards') cardsTpl?: TemplateRef<unknown>;

  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly loading = input<boolean>(false);
  readonly error = input<{ message: string } | null>(null);
  readonly errorTitle = input<string>(ADMIN_COPY.couldNotLoad);
  readonly empty = input<boolean>(false);
  readonly emptyTitle = input<string>(ADMIN_COPY.nothingHere);
  readonly emptyMessage = input<string>('');
  readonly emptyActionLabel = input<string>('');
  readonly emptyActionRoute = input<string>('');
  readonly emptyIcon = input<string>('inbox');
  readonly primaryAction = input<AdminListPrimaryAction | null>(null);
  readonly refreshAction = input<AdminListRefreshAction | null>(null);
  readonly selectedCount = input<number>(0);

  readonly refresh = output<void>();
  readonly emptyAction = output<void>();
  readonly headerActionClick = output<string>();

  protected readonly useCards = computed(() => this.breakpoint.prefersCards() && !!this.cardsTpl);
  protected readonly showFab = computed(() => this.breakpoint.showOverlayNav());
  protected readonly ready = computed(() => !this.loading() && !this.error() && !this.empty());
  protected readonly showEmpty = computed(() => !this.loading() && !this.error() && this.empty());

  private readonly hasLoadedOnce = signal(false);

  constructor() {
    effect(() => {
      if (!this.loading()) {
        this.hasLoadedOnce.set(true);
      }
    });
  }

  protected readonly headerActions = computed<readonly AdminAction[]>(() => {
    const actions: AdminAction[] = [];
    const primary = this.primaryAction();
    if (primary && !this.showFab()) {
      actions.push({
        id: 'primary',
        label: primary.label,
        route: primary.route,
        kind: 'primary',
        icon: primary.icon ?? 'add'
      });
    }
    return actions;
  });

  protected onRefreshClick(): void {
    this.refresh.emit();
  }
}
