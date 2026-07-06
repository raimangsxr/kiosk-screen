import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { EventBranding } from '../api/event-branding.api';
import { EventBrandingService } from '../event-branding.service';
import { EventConfigSyncService } from '../event-config-sync.service';
import { DEFAULT_PWA_ICON } from './pwa-branding-icon';
import { PwaBrandingIconService } from './pwa-branding-icon.service';

describe('PwaBrandingIconService', () => {
  const emptyBranding: EventBranding = {
    eventName: '',
    organizerName: '',
    organizerLogoUrl: null,
    logoLayout: null,
    eventNameLayout: null,
  };
  const demoBranding: EventBranding = {
    eventName: 'Demo Event',
    organizerName: 'Organizer',
    organizerLogoUrl: null,
    logoLayout: null,
    eventNameLayout: null,
  };

  let brandingSignal = signal<EventBranding>(demoBranding);
  let brandingService: Pick<EventBrandingService, 'branding' | 'refresh'>;
  let eventConfigSync: EventConfigSyncService;

  beforeEach(() => {
    document.head.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((node) => {
      node.remove();
    });
    document.title = '';

    brandingSignal = signal(demoBranding);
    brandingService = {
      branding: brandingSignal.asReadonly(),
      refresh: jasmine.createSpy('refresh').and.returnValue(of(demoBranding)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: EventBrandingService, useValue: brandingService },
        EventConfigSyncService,
      ],
    });

    eventConfigSync = TestBed.inject(EventConfigSyncService);
  });

  async function createService(): Promise<PwaBrandingIconService> {
    const service = TestBed.inject(PwaBrandingIconService);
    TestBed.flushEffects();
    await Promise.resolve();
    return service;
  }

  it('loads branding on startup and applies default icons', async () => {
    await createService();

    expect(brandingService.refresh).toHaveBeenCalled();
    expect(document.title).toBe('Demo Event · Kiosk Screen');
    expect(document.head.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe(DEFAULT_PWA_ICON);
  });

  it('refreshes branding when event configuration changes in another tab', async () => {
    await createService();
    (brandingService.refresh as jasmine.Spy).calls.reset();

    eventConfigSync.notifyEventConfigChanged();

    expect(brandingService.refresh).toHaveBeenCalled();
  });

  it('restores the default title when event name is empty', async () => {
    brandingSignal.set(emptyBranding);

    await createService();

    expect(document.title).toBe('Kiosk Screen');
    expect(document.head.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe(DEFAULT_PWA_ICON);
  });
});
