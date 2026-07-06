import { DestroyRef, Injectable, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EventBrandingService } from '../event-branding.service';
import { EventConfigSyncService } from '../event-config-sync.service';
import { DEFAULT_PWA_ICON, renderSquarePwaIcon, upsertPwaIconLink } from './pwa-branding-icon';

@Injectable({ providedIn: 'root' })
export class PwaBrandingIconService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly brandingService = inject(EventBrandingService);
  private readonly eventConfigSync = inject(EventConfigSyncService);
  private latestRequestId = 0;

  constructor() {
    if (typeof document === 'undefined') {
      return;
    }

    effect(() => {
      const branding = this.brandingService.branding();
      void this.applyBranding(branding.organizerLogoUrl, branding.eventName);
    });

    this.eventConfigSync.changes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.brandingService.refresh().subscribe();
      });

    this.brandingService.refresh().subscribe();
  }

  private async applyBranding(logoUrl: string | null, eventName: string): Promise<void> {
    const requestId = ++this.latestRequestId;
    document.title = eventName.trim() ? `${eventName.trim()} · Kiosk Screen` : 'Kiosk Screen';

    const href = logoUrl
      ? await this.resolveIconHref(logoUrl).catch(() => DEFAULT_PWA_ICON)
      : DEFAULT_PWA_ICON;

    if (requestId !== this.latestRequestId) {
      return;
    }

    upsertPwaIconLink('icon', href);
    upsertPwaIconLink('apple-touch-icon', href);
  }

  private async resolveIconHref(logoUrl: string): Promise<string> {
    return renderSquarePwaIcon(logoUrl);
  }
}
