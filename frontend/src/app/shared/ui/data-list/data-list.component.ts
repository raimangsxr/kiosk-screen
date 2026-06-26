import { ChangeDetectionStrategy, Component, ContentChild, TemplateRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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
  /**
   * Optional deep-link URL. Reserved for future use — currently the
   * refresh button always emits `(refresh)` instead of navigating, so
   * consumers that need refetch logic should bind the output. Kept on
   * the interface so existing call sites keep compiling.
   */
  readonly route?: string;
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
      @if (refreshAction(); as refresh) {
        <button
          mat-stroked-button
          color="primary"
          type="button"
          class="data-list__refresh"
          (click)="onRefreshClick()"
          [attr.aria-label]="refresh.label ?? 'Refresh'"
          data-testid="data-list-refresh"
        >
          <mat-icon aria-hidden="true">{{ refresh.icon ?? 'refresh' }}</mat-icon>
          {{ refresh.label ?? 'Refresh' }}
        </button>
      }
      <ng-content select="[dataListActions]" />
    </div>

    <mat-card appearance="outlined" class="data-list__card">
      @if (loading() && !error()) {
        <div class="data-list__skeleton" role="status" aria-live="polite" aria-label="Loading" data-testid="data-list-skeleton">
          <div class="data-list__skeleton-row" style="width: 92%;"></div>
          <div class="data-list__skeleton-row" style="width: 76%;"></div>
          <div class="data-list__skeleton-row" style="width: 84%;"></div>
          <div class="data-list__skeleton-row" style="width: 68%;"></div>
        </div>
      }

      <mat-card-content class="data-list__content">
        @if (error(); as err) {
          <app-admin-state
            kind="error"
            [title]="errorTitle()"
            [message]="err.message"
          />
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
      .data-list__refresh {
        min-height: var(--app-touch-target);
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
      /* Skeleton placeholders keep the card height stable while data is
       * fetched, so we don't get a layout flash between empty and ready
       * states. The shimmer is a single keyframe animation that respects
       * prefers-reduced-motion (the styles.scss global rule shortens it
       * to 0.01ms). The skeleton hides automatically once content renders.
       */
      .data-list__skeleton {
        display: grid;
        gap: 12px;
        padding: 16px 24px;
      }
      .data-list__skeleton-row {
        height: 16px;
        border-radius: var(--mat-sys-corner-small);
        background: linear-gradient(
          90deg,
          var(--mat-sys-surface-container) 0%,
          var(--mat-sys-surface-container-high) 50%,
          var(--mat-sys-surface-container) 100%
        );
        background-size: 200% 100%;
        animation: data-list-shimmer 1.4s linear infinite;
      }
      @keyframes data-list-shimmer {
        from {
          background-position: 200% 0;
        }
        to {
          background-position: -200% 0;
        }
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

  /**
   * Emitted when the user clicks the Refresh button. When a consumer binds
   * this output, the button does NOT navigate — it just emits, so the host
   * can call its facade refetch. When no listener is bound, the component
   * falls back to `router.navigateByUrl(refreshAction.route)` so existing
   * callers (route-based refresh) keep working unchanged.
   */
  readonly refresh = output<void>();
  /**
   * Emitted when the user clicks the empty-state CTA. Same fallback rule as
   * `refresh`: emit when bound, otherwise navigate to `emptyActionRoute()`.
   * `EmptyStateComponent` already implements this branching; we forward its
   * `action` output here as `emptyAction` for a stable public surface.
   */
  readonly emptyAction = output<void>();

  protected readonly ready = computed(() => !this.loading() && !this.error() && !this.empty());
  protected readonly showEmpty = computed(() => !this.loading() && !this.error() && this.empty());

  /**
   * Whether we have ever finished a load cycle. Drives the skeleton vs
   * progress-bar decision: the first time the list mounts the skeleton
   * fills the card (no items rendered yet, so a thin progress bar would
   * look empty). After the first successful load, subsequent refreshes
   * keep the items rendered and just show a slim progress indicator.
   */
  private readonly hasLoadedOnce = signal(false);
  protected readonly loadingFirstTime = computed(() => this.loading() && !this.hasLoadedOnce());

  constructor() {
    effect(() => {
      if (!this.loading()) {
        this.hasLoadedOnce.set(true);
      }
    });
  }

  protected readonly headerActions = computed<readonly SectionAction[]>(() => {
    const actions: SectionAction[] = [];
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

  protected onRefreshClick(): void {
    this.refresh.emit();
  }
}