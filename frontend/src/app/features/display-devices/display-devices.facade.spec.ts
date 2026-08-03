import { DestroyRef } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { DisplayDeviceApiService } from '../../core/api/display-device.api';
import { LiveKiosksApiService } from '../../core/api/live-kiosks.api';
import { DisplayDevicesFacade } from './display-devices.facade';

describe('DisplayDevicesFacade', () => {
  const devices = [
    {
      id: 'device-b',
      organizationId: 'org-1',
      label: 'Sala B',
      lastSeenAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'device-a',
      organizationId: 'org-1',
      label: 'Sala A',
      lastSeenAt: '2026-01-02T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    },
  ];

  let facade: DisplayDevicesFacade;
  let displayDevicesApi: jasmine.SpyObj<DisplayDeviceApiService>;
  let liveKiosksApi: jasmine.SpyObj<LiveKiosksApiService>;

  beforeEach(() => {
    displayDevicesApi = jasmine.createSpyObj('DisplayDeviceApiService', ['list', 'create', 'rename', 'delete']);
    liveKiosksApi = jasmine.createSpyObj('LiveKiosksApiService', ['listLive']);

    TestBed.configureTestingModule({
      providers: [
        DisplayDevicesFacade,
        { provide: DisplayDeviceApiService, useValue: displayDevicesApi },
        { provide: LiveKiosksApiService, useValue: liveKiosksApi },
      ],
    });

    facade = TestBed.inject(DisplayDevicesFacade);
    displayDevicesApi.list.and.returnValue(of(devices));
    liveKiosksApi.listLive.and.resolveTo([
      { kioskId: 'kiosk-1', displayLabel: 'Sala A' },
      { kioskId: 'kiosk-2', displayLabel: null },
    ]);
  });

  it('merges connected state and sorts labels in Spanish locale', (done) => {
    facade.refresh().subscribe((rows) => {
      expect(rows.map((row) => row.label)).toEqual(['Sala A', 'Sala B']);
      expect(rows[0]?.connected).toBeTrue();
      expect(rows[1]?.connected).toBeFalse();
      done();
    });
  });

  it('updates connected state on polling tick', fakeAsync(() => {
    displayDevicesApi.list.and.returnValue(of(devices));
    liveKiosksApi.listLive.and.resolveTo([{ kioskId: 'kiosk-1', displayLabel: 'Sala B' }]);

    facade.startPolling(TestBed.inject(DestroyRef), 30_000);
    tick();
    expect(facade.devices().find((row) => row.label === 'Sala A')?.connected).toBeFalse();

    liveKiosksApi.listLive.and.resolveTo([
      { kioskId: 'kiosk-1', displayLabel: 'Sala A' },
      { kioskId: 'kiosk-2', displayLabel: 'Sala B' },
    ]);
    tick(30_000);

    expect(facade.devices().find((row) => row.label === 'Sala A')?.connected).toBeTrue();
    expect(facade.devices().find((row) => row.label === 'Sala B')?.connected).toBeTrue();
  }));

  it('maps API errors via adaptApiError on refresh failure', (done) => {
    displayDevicesApi.list.and.returnValue(throwError(() => ({ status: 403, error: { message: 'Forbidden' } })));
    liveKiosksApi.listLive.and.resolveTo([]);

    facade.refresh().subscribe({
      error: () => {
        expect(facade.error()?.message).toBeTruthy();
        done();
      },
    });
  });
});
