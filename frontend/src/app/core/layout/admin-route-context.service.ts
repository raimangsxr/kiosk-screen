import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';

import { AdminBreadcrumbCrumb, AdminRouteContext } from '../../shared/admin-ui.models';
import { ADMIN_COPY } from '../../shared/ui/admin/admin-copy';
import { AdminNavigationService } from '../../features/admin-shell/admin-navigation.service';

@Injectable({ providedIn: 'root' })
export class AdminRouteContextService {
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

  readonly context = computed<AdminRouteContext>(() => {
    const url = this.currentUrl();
    const breadcrumbs = this.buildTrail(url);
    const matched = this.matchSection(url);
    const subtitle = this.resolveSubtitle(url, matched?.route ?? null);
    return {
      title: matched?.label ?? ADMIN_COPY.brandTitle,
      subtitle,
      breadcrumbs
    };
  });

  readonly title = computed(() => this.context().title);
  readonly subtitle = computed(() => this.context().subtitle);
  readonly breadcrumbs = computed(() => this.context().breadcrumbs);

  private matchSection(url: string) {
    let best: { label: string; route: string; depth: number; exact: boolean } | null = null;
    for (const item of this.navigation.allItems) {
      const segments = item.route.split('/').filter(Boolean);
      const urlSegments = url.split('?')[0].split('/').filter(Boolean);
      if (segments.length > urlSegments.length) {
        continue;
      }
      const prefix = segments.join('/');
      const urlPrefix = urlSegments.slice(0, segments.length).join('/');
      if (prefix !== urlPrefix) {
        continue;
      }
      const isExact = segments.length === urlSegments.length;
      const better =
        !best ||
        segments.length > best.depth ||
        (segments.length === best.depth && isExact && !best.exact);
      if (better) {
        best = { label: item.label, route: item.route, depth: segments.length, exact: isExact };
      }
      if (isExact) {
        break;
      }
    }
    return best;
  }

  private resolveSubtitle(url: string, sectionRoute: string | null): string | null {
    const segments = url.split('?')[0].split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last === 'new') {
      return ADMIN_COPY.routeSubtitles.new;
    }
    if (last === 'edit') {
      return ADMIN_COPY.routeSubtitles.edit;
    }
    if (sectionRoute && url !== sectionRoute && !url.endsWith('/new') && !url.endsWith('/edit')) {
      const tail = segments[segments.length - 1];
      if (tail && tail !== 'admin') {
        return tail;
      }
    }
    return null;
  }

  private buildTrail(url: string): AdminBreadcrumbCrumb[] {
    if (!url.startsWith('/admin')) {
      return [];
    }
    const segments = url.split('?')[0].split('/').filter(Boolean);
    const matched = this.matchSection(url);
    if (!matched) {
      return [];
    }
    const matchedSegments = matched.route.split('/').filter(Boolean).length;
    const trail: AdminBreadcrumbCrumb[] = [
      { label: matched.label, route: matched.route, isLast: false }
    ];
    for (let i = matchedSegments; i < segments.length; i++) {
      const segment = segments[i];
      const nextSegment = segments[i + 1];
      const isLast = i === segments.length - 1;
      const isAction = segment === 'new' || segment === 'edit';
      const followedByAction = nextSegment === 'new' || nextSegment === 'edit';
      if (!isAction && followedByAction) {
        continue;
      }
      if (!isAction && isLast) {
        trail[trail.length - 1] = { ...trail[trail.length - 1], isLast: true };
        return trail;
      }
      const route = '/' + segments.slice(0, i + 1).join('/');
      trail.push({ label: this.labelForSegment(segment), route, isLast });
    }
    if (trail.length > 0) {
      const last = trail[trail.length - 1];
      trail[trail.length - 1] = { ...last, isLast: true };
    }
    return trail;
  }

  private labelForSegment(segment: string): string {
    if (segment === 'new') {
      return ADMIN_COPY.routeSubtitles.new;
    }
    if (segment === 'edit') {
      return ADMIN_COPY.routeSubtitles.edit;
    }
    return segment;
  }
}
