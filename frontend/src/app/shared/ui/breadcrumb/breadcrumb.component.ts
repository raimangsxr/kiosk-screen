import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { filter, map, startWith } from 'rxjs/operators';

import { AdminNavigationItem } from '../../../shared/admin-ui.models';
import { AdminNavigationService } from '../../../features/admin-shell/admin-navigation.service';

interface BreadcrumbCrumb {
  readonly label: string;
  readonly route: string;
  readonly isLast: boolean;
}

/**
 * Builds a trail for the active admin route by matching the current URL
 * against the `AdminNavigationService` entries. Section roots (e.g.
 * `/admin/content`) map to the section label; deep links (e.g.
 * `/admin/content/:id/edit`) append a synthetic "Edit" crumb so operators
 * never lose orientation when they navigate into a detail screen.
 *
 * The route parsing is intentionally simple — when the project adds a
 * detail screen beyond edit/create, extend `lookupTrailFor` with a
 * dedicated resolver instead of overloading this component.
 */
@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule],
  template: `
    @if (crumbs().length > 0) {
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <ol class="breadcrumb__list">
          @for (crumb of crumbs(); track crumb.route; let isLast = $last) {
            <li class="breadcrumb__item" [class.breadcrumb__item--last]="isLast">
              @if (!isLast) {
                <a [routerLink]="crumb.route" class="breadcrumb__link">{{ crumb.label }}</a>
                <mat-icon aria-hidden="true" class="breadcrumb__separator">chevron_right</mat-icon>
              } @else {
                <span class="breadcrumb__current" aria-current="page">{{ crumb.label }}</span>
              }
            </li>
          }
        </ol>
      </nav>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .breadcrumb {
        margin: 0 0 12px;
        font: var(--mat-sys-body-small);
        letter-spacing: var(--mat-sys-body-small-tracking);
        color: var(--mat-sys-on-surface-variant);
      }
      .breadcrumb__list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px;
      }
      .breadcrumb__item {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .breadcrumb__link {
        color: var(--mat-sys-on-surface-variant);
        text-decoration: none;
        border-radius: var(--mat-sys-corner-extra-small);
      }
      .breadcrumb__link:hover,
      .breadcrumb__link:focus-visible {
        color: var(--mat-sys-primary);
        text-decoration: underline;
      }
      .breadcrumb__current {
        color: var(--mat-sys-on-surface);
        font-weight: 600;
      }
      .breadcrumb__separator {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--mat-sys-on-surface-variant);
      }
    `
  ]
})
export class BreadcrumbComponent {
  private readonly router = inject(Router);
  private readonly navigation = inject(AdminNavigationService);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  protected readonly crumbs = computed<BreadcrumbCrumb[]>(() => this.buildTrail(this.currentUrl()));

  private buildTrail(url: string): BreadcrumbCrumb[] {
    if (!url.startsWith('/admin')) {
      return [];
    }
    const segments = url.split('?')[0].split('/').filter(Boolean);
    if (segments.length === 0) {
      return [];
    }
    // Find the DEEPEST navigation entry that is a prefix of the current
    // URL. Matching the longest prefix keeps the breadcrumb scoped to the
    // most specific section (e.g. /admin/content/:id/edit should resolve
    // to the "Content" crumb, not the "Dashboard" root).
    let matchedItem: AdminNavigationItem | null = null;
    let matchedSegments = 0;
    for (const entry of this.navigation.items) {
      const entrySegments = entry.route.split('/').filter(Boolean);
      if (entrySegments.length > segments.length) {
        continue;
      }
      const prefix = entrySegments.join('/');
      const urlPrefix = segments.slice(0, entrySegments.length).join('/');
      if (prefix !== urlPrefix) {
        continue;
      }
      // Prefer the deepest match. Exact-match entries win over prefix-matches.
      const isExact = entrySegments.length === segments.length;
      const betterDepth = entrySegments.length > matchedSegments;
      const equalDepthExact =
        entrySegments.length === matchedSegments && matchedItem && !matchedItem.exact && entry.exact;
      if (isExact) {
        matchedItem = entry;
        matchedSegments = entrySegments.length;
        break;
      }
      if (betterDepth || equalDepthExact) {
        matchedItem = entry;
        matchedSegments = entrySegments.length;
      }
    }
    if (!matchedItem) {
      return [];
    }

    const trail: BreadcrumbCrumb[] = [
      { label: matchedItem.label, route: matchedItem.route, isLast: false }
    ];
    // Append synthetic crumbs for every deeper segment. The rule of
    // thumb: if a segment is immediately followed by an action (`new`,
    // `edit`), it's an id and gets collapsed; otherwise it's a meaningful
    // step (e.g. `/admin/content/new` keeps "New" visible, while
    // `/admin/content/abc-1/edit` shows only "Content → Edit").
    for (let i = matchedSegments; i < segments.length; i++) {
      const segment = segments[i];
      const nextSegment = segments[i + 1];
      const isLast = i === segments.length - 1;
      const isAction = segment === 'new' || segment === 'edit';
      const followedByAction = nextSegment === 'new' || nextSegment === 'edit';
      if (!isAction && followedByAction) {
        // Collapse the id segment and let the action segment show below.
        continue;
      }
      if (!isAction && isLast) {
        // Trailing id segment (e.g. /admin/content/abc-1). The current
        // page IS the item — surface the section as the current crumb.
        trail[trail.length - 1] = { ...trail[trail.length - 1], isLast: true };
        return trail;
      }
      const route = '/' + segments.slice(0, i + 1).join('/');
      const label = this.labelForSegment(segment);
      trail.push({ label, route, isLast });
    }
    if (trail.length > 0) {
      const last = trail[trail.length - 1];
      trail[trail.length - 1] = { ...last, isLast: true };
    }
    return trail;
  }

  private labelForSegment(segment: string): string {
    if (segment === 'new') {
      return 'Nuevo';
    }
    if (segment === 'edit') {
      return 'Editar';
    }
    return segment;
  }
}