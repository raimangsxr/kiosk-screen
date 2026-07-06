import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { SwUpdate, VersionEvent, VersionReadyEvent } from '@angular/service-worker';

import { PwaUpdateService } from './pwa-update.service';

describe('PwaUpdateService', () => {
  let versionUpdates$: Subject<VersionEvent>;
  let swUpdate: jasmine.SpyObj<SwUpdate>;

  beforeEach(() => {
    versionUpdates$ = new Subject<VersionEvent>();

    swUpdate = jasmine.createSpyObj<SwUpdate>('SwUpdate', ['checkForUpdate', 'activateUpdate'], {
      isEnabled: true,
      versionUpdates: versionUpdates$.asObservable(),
    });
    swUpdate.checkForUpdate.and.returnValue(Promise.resolve(false));
    swUpdate.activateUpdate.and.returnValue(Promise.resolve(true));

    TestBed.configureTestingModule({
      providers: [{ provide: SwUpdate, useValue: swUpdate }],
    });
  });

  it('marks an update as ready when a new version is available', () => {
    const service = TestBed.inject(PwaUpdateService);

    expect(service.updateReady()).toBeFalse();

    versionUpdates$.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old' },
      latestVersion: { hash: 'new' },
    } satisfies VersionReadyEvent);

    expect(service.updateReady()).toBeTrue();
  });

  it('activates the waiting service worker', async () => {
    const service = TestBed.inject(PwaUpdateService);
    const reloadSpy = spyOn(service as unknown as { reloadApp: () => void }, 'reloadApp');

    versionUpdates$.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old' },
      latestVersion: { hash: 'new' },
    } satisfies VersionReadyEvent);
    service.applyUpdate();

    await Promise.resolve();

    expect(swUpdate.activateUpdate).toHaveBeenCalled();
    expect(reloadSpy).toHaveBeenCalled();
  });
});
