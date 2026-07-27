import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { filter, map, startWith } from 'rxjs/operators';

import { BreakpointService } from '../../../core/layout/breakpoint.service';
import { AdminNavigationService } from '../../../features/admin-shell/admin-navigation.service';
import { ADMIN_COPY } from './admin-copy';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule],
  template: `
    <header class="admin-page" [class.admin-page--compact]="isCompact()">
      <p class="admin-page__eyebrow">{{ resolvedEyebrow() }}</p>
      <h1 class="admin-page__title">{{ title() }}</h1>
      @if (description()) {
        <p class="admin-page__description">{{ description() }}</p>
      }
    </header>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .admin-page {
        display: grid;
        gap: 6px;
        margin-bottom: 20px;
      }
      .admin-page__eyebrow {
        margin: 0 0 2px;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.12em;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--app-text-dim);
      }
      .admin-page__title {
        margin: 0;
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.01em;
        color: var(--app-text);
      }
      .admin-page--compact .admin-page__title {
        font-size: 22px;
      }
      .admin-page__description {
        margin: 4px 0 0;
        max-width: 62ch;
        font-size: 14px;
        color: var(--app-text-dim);
      }
      .admin-page--compact .admin-page__description {
        font-size: 13px;
      }
    `
  ]
})
export class AdminPageComponent {
  private readonly breakpoint = inject(BreakpointService);
  private readonly navigation = inject(AdminNavigationService);
  private readonly router = inject(Router);
  protected readonly isCompact = this.breakpoint.isCompact;

  readonly title = input.required<string>();
  readonly description = input<string>('');
  /** When empty, the eyebrow defaults to the current navigation group. */
  readonly eyebrow = input<string>('');

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  protected readonly resolvedEyebrow = computed(
    () => this.eyebrow() || this.navigation.groupLabelFor(this.currentUrl())
  );
}
