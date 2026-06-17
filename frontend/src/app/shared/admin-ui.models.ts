export type AdminSetupStatus = 'ready' | 'blocked' | 'warning';

export interface AdminNavigationItem {
  label: string;
  route: string;
  summary: string;
  exact?: boolean;
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
}
