import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';

import { AdsApiService } from '../ads/ads-api.service';
import { ContentApiService } from '../content/content-api.service';
import { ReadinessApiService } from '../readiness/readiness-api.service';
import { AdminDashboardState } from '../shared/admin-ui.models';
import { AdminApiService } from './admin-api.service';
import { AdminNavigationService } from './admin-navigation.service';

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly adminApi = inject(AdminApiService);
  private readonly contentApi = inject(ContentApiService);
  private readonly adsApi = inject(AdsApiService);
  private readonly readinessApi = inject(ReadinessApiService);
  private readonly navigation = inject(AdminNavigationService);

  load(): Observable<AdminDashboardState> {
    return forkJoin({
      readiness: this.readinessApi.getReadiness(),
      configuration: this.adminApi.getConfiguration(),
      content: this.contentApi.list(),
      ads: this.adsApi.listAds(),
      clients: this.adsApi.listClients(),
      domains: this.adminApi.listDomains(),
      users: this.adminApi.listUsers()
    }).pipe(map(({ readiness, configuration, content, ads, clients, domains, users }) => ({
      setupStatus: readiness.ready ? 'ready' : readiness.blockers.length ? 'blocked' : 'warning',
      blockers: readiness.blockers,
      warnings: readiness.warnings,
      quickActions: this.navigation.quickActions,
      sectionSummaries: [
        { label: 'Content', value: `${content.length} items`, route: '/admin/content', status: content.some((item) => item.isActive) ? 'ready' : 'blocked' },
        { label: 'Ads', value: `${ads.length} ads`, route: '/admin/ads', status: ads.some((ad) => ad.isActive) ? 'ready' : 'warning' },
        { label: 'Clients', value: `${clients.length} clients`, route: '/admin/clients', status: clients.some((client) => client.isActive) ? 'ready' : 'warning' },
        { label: 'Iframe domains', value: `${domains.length} domains`, route: '/admin/domains', status: domains.some((domain) => domain.isActive) ? 'ready' : 'warning' },
        { label: 'Display', value: configuration.isEnabled ? 'Enabled' : 'Disabled', route: '/admin/configuration', status: configuration.isEnabled ? 'ready' : 'blocked' },
        { label: 'Users', value: `${users.length} users`, route: '/admin/users', status: users.length ? 'ready' : 'warning' }
      ]
    })));
  }
}
