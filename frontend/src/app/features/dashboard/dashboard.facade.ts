import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ContentApiService, ContentItem } from '../../core/api/content.api';
import { DisplayEvent, EventsApiService } from '../../core/api/events.api';
import { ReadinessApiService } from '../../core/api/readiness.api';
import { RemoteControlApi } from '../remote-control/remote-control.api';
import { RemoteControlState } from '../remote-control/remote-control.models';
import { resolveReadinessRoute } from '../readiness/readiness-routes';
import {
  ActivityFeedItem,
  ActivityFeedSlice,
  ActivitySeverity,
  ContentQueueKind,
  ContentQueueSlice,
  ContextualAction,
  LiveStatusSlice,
  OperationsDashboardState,
  ReadinessAlert,
  ReadinessSlice
} from './dashboard.models';

const SECTION_READINESS = 'Comprobación';
const SECTION_LIVE = 'Estado en vivo';
const SECTION_QUEUE = 'Contenido';
const SECTION_ACTIVITY = 'Actividad';

const HERO_ROUTES = new Set(['/display', '/admin/remote-control']);

type SourceResult<T> = { ok: true; value: T } | { ok: false };

interface DashboardSnapshot {
  readonly readiness: SourceResult<ReadinessSlice>;
  readonly live: SourceResult<RemoteControlState>;
  readonly content: SourceResult<ContentItem[]>;
  readonly events: SourceResult<DisplayEvent[]>;
}

@Injectable({ providedIn: 'root' })
export class DashboardFacade {
  private readonly readinessApi = inject(ReadinessApiService);
  private readonly remoteControlApi = inject(RemoteControlApi);
  private readonly contentApi = inject(ContentApiService);
  private readonly eventsApi = inject(EventsApiService);

  load(): Observable<OperationsDashboardState> {
    return forkJoin({
      readiness: this.readinessApi.getReadiness().pipe(
        map((report) => ({
          ok: true as const,
          value: this.foldReadiness(report.blockers, report.warnings, report.ready)
        })),
        catchError(() => of({ ok: false as const }))
      ),
      live: this.remoteControlApi.getState().pipe(
        map((value) => ({ ok: true as const, value })),
        catchError(() => of({ ok: false as const }))
      ),
      content: this.contentApi.list().pipe(
        map((value) => ({ ok: true as const, value })),
        catchError(() => of({ ok: false as const }))
      ),
      events: this.eventsApi.listRecent().pipe(
        map((value) => ({ ok: true as const, value })),
        catchError(() => of({ ok: false as const }))
      )
    }).pipe(map((snap) => this.fold(snap)));
  }

  reloadLive(current: OperationsDashboardState): Observable<OperationsDashboardState> {
    return this.remoteControlApi.getState().pipe(
      map((state) => {
        const live = this.foldLive(state, current.queue);
        const degradedSections = current.degradedSections.filter((s) => s !== SECTION_LIVE);
        return {
          ...current,
          live,
          degradedSections,
          contextualActions: deriveContextualActions({
            readiness: current.readiness,
            live,
            queue: current.queue
          })
        };
      }),
      catchError(() =>
        of({
          ...current,
          live: null,
          degradedSections: current.degradedSections.includes(SECTION_LIVE)
            ? current.degradedSections
            : [...current.degradedSections, SECTION_LIVE],
          contextualActions: deriveContextualActions({
            readiness: current.readiness,
            live: null,
            queue: current.queue
          })
        })
      )
    );
  }

  private fold(snap: DashboardSnapshot): OperationsDashboardState {
    const degradedSections: string[] = [];

    const readiness = snap.readiness.ok ? snap.readiness.value : null;
    if (!snap.readiness.ok) {
      degradedSections.push(SECTION_READINESS);
    }

    const queue = snap.content.ok ? buildQueueSlice(snap.content.value, null) : null;
    if (!snap.content.ok) {
      degradedSections.push(SECTION_QUEUE);
    }

    const live = snap.live.ok ? this.foldLive(snap.live.value, queue) : null;
    if (!snap.live.ok) {
      degradedSections.push(SECTION_LIVE);
    }

    const queueWithPins =
      queue && live?.pinnedContentId
        ? buildQueueSlice(snap.content.ok ? snap.content.value : [], live.pinnedContentId)
        : queue;

    const activity = snap.events.ok ? this.foldActivity(snap.events.value) : null;
    if (!snap.events.ok) {
      degradedSections.push(SECTION_ACTIVITY);
    }

    return {
      readiness,
      live,
      queue: queueWithPins,
      activity,
      contextualActions: deriveContextualActions({ readiness, live, queue: queueWithPins }),
      degradedSections
    };
  }

  private foldReadiness(blockers: string[], warnings: string[], ready: boolean): ReadinessSlice {
    const mapAlert = (message: string): ReadinessAlert => ({
      message,
      resolveRoute: resolveReadinessRoute(message)
    });
    return {
      ready,
      blockers: blockers.map(mapAlert),
      warnings: warnings.map(mapAlert)
    };
  }

  private foldLive(state: RemoteControlState, queue: ContentQueueSlice | null): LiveStatusSlice {
    const pinnedContentId =
      state.contentMode === 'fixed' ? (state.selectedFixedContentId ?? null) : null;
    const pinnedEntry =
      pinnedContentId && queue
        ? queue.entries.find((entry) => entry.id === pinnedContentId)
        : undefined;
    const pinnedContentUnresolved = Boolean(pinnedContentId && !pinnedEntry);
    return {
      displaySessionActive: state.displaySessionActive === true,
      contentMode: state.contentMode,
      adsVisible: state.adsVisible !== false,
      updatedAt: state.updatedAt,
      pinnedContentId,
      pinnedContentTitle: pinnedEntry?.title ?? null,
      pinnedContentUnresolved
    };
  }

  private foldActivity(events: DisplayEvent[]): ActivityFeedSlice {
    const items = [...events]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 15)
      .map((event) => this.toActivityItem(event));
    return { items };
  }

  private toActivityItem(event: DisplayEvent): ActivityFeedItem {
    return {
      id: event.id,
      eventType: event.eventType,
      severity: normalizeSeverity(event.severity),
      message: event.message,
      createdAt: event.createdAt
    };
  }
}

export function classifyKind(item: ContentItem): ContentQueueKind {
  const recurring = item.recurringEveryXIterations;
  if (typeof recurring === 'number' && recurring > 0) {
    return 'recurring';
  }
  if (item.isFixed) {
    return 'fixed-eligible';
  }
  return 'regular';
}

export function buildQueueSlice(items: ContentItem[], pinnedContentId: string | null): ContentQueueSlice {
  const activeItems = items.filter((item) => item.isActive && !item.isNovelty);
  const entries = [...activeItems]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((item) => ({
      id: item.id,
      title: item.title,
      displayOrder: item.displayOrder,
      kind: classifyKind(item),
      recurringEveryXIterations: item.recurringEveryXIterations ?? null,
      isPinnedNow: pinnedContentId !== null && item.id === pinnedContentId
    }));
  return {
    entries,
    activeContentCount: activeItems.length
  };
}

function normalizeSeverity(severity: string): ActivitySeverity {
  const lower = severity.toLowerCase();
  if (lower === 'error') {
    return 'error';
  }
  if (lower === 'warning') {
    return 'warning';
  }
  return 'info';
}

export function deriveContextualActions(input: {
  readiness: ReadinessSlice | null;
  live: LiveStatusSlice | null;
  queue: ContentQueueSlice | null;
}): ContextualAction[] {
  const actions: ContextualAction[] = [];
  const firstBlocker = input.readiness?.blockers[0];

  if (firstBlocker) {
    actions.push({
      label: `Resolver: ${truncateLabel(firstBlocker.message)}`,
      route: firstBlocker.resolveRoute,
      icon: 'error',
      priority: 'primary'
    });
  }

  if (input.queue && input.queue.activeContentCount === 0) {
    actions.push({
      label: 'Añadir contenido',
      route: '/admin/content/new',
      icon: 'add_photo_alternate',
      priority: 'secondary'
    });
  }

  if (input.readiness && !input.readiness.ready) {
    actions.push({
      label: 'Ejecutar comprobación',
      route: '/admin/readiness',
      icon: 'fact_check',
      priority: 'secondary'
    });
  }

  return actions
    .filter((action) => !HERO_ROUTES.has(action.route))
    .slice(0, 4);
}

function truncateLabel(message: string, max = 40): string {
  if (message.length <= max) {
    return message;
  }
  return `${message.slice(0, max - 1)}…`;
}
