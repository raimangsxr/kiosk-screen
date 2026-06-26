import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AdsApiService } from '../../core/api/ads.api';
import { AdminApiService } from '../../core/api/admin.api';
import { ContentApiService } from '../../core/api/content.api';
import { EventConfigurationApiService } from '../../core/api/event-config.api';
import { IframeApiService } from '../../core/api/iframe.api';
import { ReadinessApiService } from '../../core/api/readiness.api';
import { AdminDashboardState, AdminSectionSummary, AdminSetupStatus } from '../../shared/admin-ui.models';
import { AdminNavigationService } from '../admin-shell/admin-navigation.service';

/**
 * Snapshot type used internally by the service. Every section is
 * optional so that a single failed endpoint does not collapse the
 * whole dashboard — the section is just marked `degraded` in the
 * final shape and the others continue to render.
 */
interface AdminDashboardSnapshot {
  readonly readiness: { ok: true; value: { ready: boolean; blockers: string[]; warnings: string[] } }
    | { ok: false };
  readonly configuration: { ok: true; value: { isEnabled: boolean } } | { ok: false };
  readonly content: { ok: true; value: { length: number; hasActive: boolean } } | { ok: false };
  readonly ads: { ok: true; value: { length: number; hasActive: boolean } } | { ok: false };
  readonly iframes: { ok: true; value: { length: number } } | { ok: false };
  readonly eventConfig: { ok: true; value: { eventName: string } } | { ok: false };
  readonly users: { ok: true; value: { length: number } } | { ok: false };
}

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly adminApi = inject(AdminApiService);
  private readonly contentApi = inject(ContentApiService);
  private readonly iframeApi = inject(IframeApiService);
  private readonly adsApi = inject(AdsApiService);
  private readonly readinessApi = inject(ReadinessApiService);
  private readonly eventConfigApi = inject(EventConfigurationApiService);
  private readonly navigation = inject(AdminNavigationService);

  /**
   * Load every section's source in parallel and fold the results into
   * the dashboard state. Each endpoint is wrapped in `catchError` so a
   * transient failure on one section degrades only that section — the
   * rest of the dashboard keeps rendering with stale-but-typed data
   * instead of going blank. The overall setup status is promoted to
   * `'degraded'` whenever any section fails, so operators see at a
   * glance that one part of the dashboard is stale.
   */
  load(): Observable<AdminDashboardState> {
    return forkJoin({
      readiness: this.readinessApi.getReadiness().pipe(
        map((value) => ({ ok: true as const, value })),
        catchError(() => of({ ok: false as const }))
      ),
      configuration: this.adminApi.getConfiguration().pipe(
        map((value) => ({ ok: true as const, value: { isEnabled: value.isEnabled } })),
        catchError(() => of({ ok: false as const }))
      ),
      content: this.contentApi.list().pipe(
        map((items) => ({
          ok: true as const,
          value: { length: items.length, hasActive: items.some((item) => item.isActive) }
        })),
        catchError(() => of({ ok: false as const }))
      ),
      ads: this.adsApi.listAds().pipe(
        map((items) => ({
          ok: true as const,
          value: { length: items.length, hasActive: items.some((ad) => ad.isActive) }
        })),
        catchError(() => of({ ok: false as const }))
      ),
      iframes: this.iframeApi.list().pipe(
        map((response) => ({ ok: true as const, value: { length: response.items.length } })),
        catchError(() => of({ ok: false as const }))
      ),
      eventConfig: this.eventConfigApi.get().pipe(
        map((config) => ({ ok: true as const, value: { eventName: config.eventName } })),
        catchError(() => of({ ok: false as const }))
      ),
      users: this.adminApi.listUsers().pipe(
        map((users) => ({ ok: true as const, value: { length: users.length } })),
        catchError(() => of({ ok: false as const }))
      )
    }).pipe(map((snap) => this.fold(snap)));
  }

  private fold(snap: AdminDashboardSnapshot): AdminDashboardState {
    const degradedSections: string[] = [];

    // Section summaries — each branch flips `degraded` if its source failed.
    const content = this.sectionContent(snap, degradedSections);
    const ads = this.sectionAds(snap, degradedSections);
    const event = this.sectionEvent(snap, degradedSections);
    const iframes = this.sectionIframes(snap, degradedSections);
    const display = this.sectionDisplay(snap, degradedSections);
    const users = this.sectionUsers(snap, degradedSections);

    const sectionSummaries: AdminSectionSummary[] = [content, ads, event, iframes, display, users];

    // Overall setup status. If the readiness endpoint failed we cannot
    // trust `blockers` / `warnings` and we collapse the status to
    // `degraded`. Otherwise we compute it from the readiness payload,
    // then promote to `degraded` if any other section failed.
    let setupStatus: AdminSetupStatus;
    let blockers: string[] = [];
    let warnings: string[] = [];
    if (snap.readiness.ok) {
      const r = snap.readiness.value;
      setupStatus = r.ready ? 'ready' : r.blockers.length ? 'blocked' : 'warning';
      blockers = r.blockers;
      warnings = r.warnings;
    } else {
      degradedSections.unshift('Readiness');
      setupStatus = 'degraded';
    }
    if (degradedSections.length > 0 && setupStatus === 'ready') {
      setupStatus = 'degraded';
    }

    return {
      setupStatus,
      blockers,
      warnings,
      quickActions: this.navigation.quickActions,
      sectionSummaries,
      degradedSections
    };
  }

  private sectionContent(snap: AdminDashboardSnapshot, degraded: string[]): AdminSectionSummary {
    if (!snap.content.ok) {
      degraded.push('Content');
      return { label: 'Content', value: '—', route: '/admin/content', status: 'degraded' };
    }
    return {
      label: 'Content',
      value: `${snap.content.value.length} items`,
      route: '/admin/content',
      status: snap.content.value.hasActive ? 'ready' : 'blocked'
    };
  }

  private sectionAds(snap: AdminDashboardSnapshot, degraded: string[]): AdminSectionSummary {
    if (!snap.ads.ok) {
      degraded.push('Ads');
      return { label: 'Ads', value: '—', route: '/admin/ads', status: 'degraded' };
    }
    return {
      label: 'Ads',
      value: `${snap.ads.value.length} ads`,
      route: '/admin/ads',
      status: snap.ads.value.hasActive ? 'ready' : 'warning'
    };
  }

  private sectionEvent(snap: AdminDashboardSnapshot, degraded: string[]): AdminSectionSummary {
    if (!snap.eventConfig.ok) {
      degraded.push('Event');
      return { label: 'Event', value: '—', route: '/admin/event', status: 'degraded' };
    }
    const name = snap.eventConfig.value.eventName;
    return {
      label: 'Event',
      value: name || 'Not set',
      route: '/admin/event',
      status: name ? 'ready' : 'warning'
    };
  }

  private sectionIframes(snap: AdminDashboardSnapshot, degraded: string[]): AdminSectionSummary {
    if (!snap.iframes.ok) {
      degraded.push('Iframes');
      return { label: 'Iframes', value: '—', route: '/admin/iframes', status: 'degraded' };
    }
    return {
      label: 'Iframes',
      value: `${snap.iframes.value.length} iframes`,
      route: '/admin/iframes',
      status: snap.iframes.value.length ? 'ready' : 'warning'
    };
  }

  private sectionDisplay(snap: AdminDashboardSnapshot, degraded: string[]): AdminSectionSummary {
    if (!snap.configuration.ok) {
      degraded.push('Display');
      return { label: 'Display', value: '—', route: '/admin/configuration', status: 'degraded' };
    }
    return {
      label: 'Display',
      value: snap.configuration.value.isEnabled ? 'Enabled' : 'Disabled',
      route: '/admin/configuration',
      status: snap.configuration.value.isEnabled ? 'ready' : 'blocked'
    };
  }

  private sectionUsers(snap: AdminDashboardSnapshot, degraded: string[]): AdminSectionSummary {
    if (!snap.users.ok) {
      degraded.push('Users');
      return { label: 'Users', value: '—', route: '/admin/users', status: 'degraded' };
    }
    return {
      label: 'Users',
      value: `${snap.users.value.length} users`,
      route: '/admin/users',
      status: snap.users.value.length ? 'ready' : 'warning'
    };
  }
}