import type { RemoteControlContentMode } from '../remote-control/remote-control.models';

export interface ReadinessAlert {
  readonly message: string;
  readonly resolveRoute: string;
}

export interface ReadinessSlice {
  readonly ready: boolean;
  readonly blockers: readonly ReadinessAlert[];
  readonly warnings: readonly ReadinessAlert[];
}

export interface LiveStatusSlice {
  readonly displaySessionActive: boolean;
  readonly contentMode: RemoteControlContentMode;
  readonly adsVisible: boolean;
  readonly updatedAt: string;
  readonly pinnedContentId: string | null;
  readonly pinnedContentTitle: string | null;
  readonly pinnedContentUnresolved: boolean;
}

export type ContentQueueKind = 'regular' | 'recurring' | 'fixed-eligible';

export interface ContentQueueEntry {
  readonly id: string;
  readonly title: string;
  readonly displayOrder: number;
  readonly kind: ContentQueueKind;
  readonly recurringEveryXIterations: number | null;
  readonly isPinnedNow: boolean;
}

export interface ContentQueueSlice {
  readonly entries: readonly ContentQueueEntry[];
  readonly activeContentCount: number;
}

export type ActivitySeverity = 'info' | 'warning' | 'error';

export interface ActivityFeedItem {
  readonly id: string;
  readonly eventType: string;
  readonly severity: ActivitySeverity;
  readonly message: string;
  readonly createdAt: string;
}

export interface ActivityFeedSlice {
  readonly items: readonly ActivityFeedItem[];
}

export interface ContextualAction {
  readonly label: string;
  readonly route: string;
  readonly icon: string;
  readonly priority: 'primary' | 'secondary';
}

export interface OperationsDashboardState {
  readonly readiness: ReadinessSlice | null;
  readonly live: LiveStatusSlice | null;
  readonly queue: ContentQueueSlice | null;
  readonly activity: ActivityFeedSlice | null;
  readonly contextualActions: readonly ContextualAction[];
  readonly degradedSections: readonly string[];
}
