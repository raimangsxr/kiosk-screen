import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';

import { AdsApiService } from '../../core/api/ads.api';
import { AdminApiService } from '../../core/api/admin.api';
import { ContentApiService } from '../../core/api/content.api';
import { EventConfigurationApiService } from '../../core/api/event-config.api';
import { IframeApiService } from '../../core/api/iframe.api';
import { ReadinessApiService } from '../../core/api/readiness.api';
import { AdminDashboardState } from '../../shared/admin-ui.models';
import { AdminNavigationService } from '../admin-shell/admin-navigation.service';

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly adminApi = inject(AdminApiService);
  private readonly contentApi = inject(ContentApiService);
  private readonly iframeApi = inject(IframeApiService);
  private readonly adsApi = inject(AdsApiService);
  private readonly readinessApi = inject(ReadinessApiService);
  private readonly eventConfigApi = inject(EventConfigurationApiService);
  private readonly navigation = inject(AdminNavigationService);

  load(): Observable<AdminDashboardState> {
    return forkJoin({
      readiness: this.readinessApi.getReadiness(),
      configuration: this.adminApi.getConfiguration(),
      content: this.contentApi.list(),
      ads: this.adsApi.listAds(),
      iframes: this.iframeApi.list(),
      eventConfig: this.eventConfigApi.get(),
      users: this.adminApi.listUsers()
    }).pipe(map(({ readiness, configuration, content, ads, iframes, eventConfig, users }) => ({
      setupStatus: readiness.ready ? 'ready' : readiness.blockers.length ? 'blocked' : 'warning',
      blockers: readiness.blockers,
      warnings: readiness.warnings,
      quickActions: this.navigation.quickActions,
      sectionSummaries: [
        { label: 'Content', value: `${content.length} items`, route: '/admin/content', status: content.some((item) => item.isActive) ? 'ready' : 'blocked' },
        { label: 'Ads', value: `${ads.length} ads`, route: '/admin/ads', status: ads.some((ad) => ad.isActive) ? 'ready' : 'warning' },
        { label: 'Event', value: eventConfig.eventName || 'Not set', route: '/admin/event', status: eventConfig.eventName ? 'ready' : 'warning' },
        { label: 'Iframes', value: `${iframes.items.length} iframes`, route: '/admin/iframes', status: iframes.items.length ? 'ready' : 'warning' },
        { label: 'Display', value: configuration.isEnabled ? 'Enabled' : 'Disabled', route: '/admin/configuration', status: configuration.isEnabled ? 'ready' : 'blocked' },
        { label: 'Users', value: `${users.length} users`, route: '/admin/users', status: users.length ? 'ready' : 'warning' }
      ]
    })));
  }
}
