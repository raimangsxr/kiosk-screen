export type AdminSetupStatus = 'ready' | 'blocked' | 'warning' | 'degraded';

export interface AdminNavigationItem {
  label: string;
  route: string;
  summary: string;
  exact?: boolean;
  icon?: string;
}

export type AdminNavGroupId = 'operation' | 'configuration' | 'access';

export interface AdminNavGroup {
  readonly id: AdminNavGroupId;
  readonly label: string;
  readonly items: readonly AdminNavigationItem[];
}

export interface AdminBreadcrumbCrumb {
  readonly label: string;
  readonly route: string;
  readonly isLast: boolean;
}

export interface AdminRouteContext {
  readonly title: string;
  readonly subtitle: string | null;
  readonly breadcrumbs: readonly AdminBreadcrumbCrumb[];
}

export interface AdminQuickAction {
  label: string;
  route: string;
  description: string;
}

export interface AdminSectionSummary {
  label: string;
  value: string;
  route: string;
  status: AdminSetupStatus;
}

export interface AdminDashboardState {
  setupStatus: AdminSetupStatus;
  blockers: string[];
  warnings: string[];
  quickActions: AdminQuickAction[];
  sectionSummaries: AdminSectionSummary[];
  /** Sections whose source endpoint failed on the most recent load. */
  degradedSections: readonly string[];
}
