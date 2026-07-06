import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, interval } from 'rxjs';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly swUpdate = inject(SwUpdate, { optional: true });

  readonly updateReady = signal(false);

  constructor() {
    this.listenForUpdates();
  }

  applyUpdate(): void {
    if (!this.swUpdate?.isEnabled || !this.updateReady()) {
      return;
    }

    void this.swUpdate.activateUpdate().then((updated) => {
      if (updated) {
        this.reloadApp();
      }
    });
  }

  protected reloadApp(): void {
    globalThis.location.reload();
  }

  private listenForUpdates(): void {
    if (!this.swUpdate?.isEnabled) {
      return;
    }

    this.swUpdate.versionUpdates
      .pipe(
        filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.updateReady.set(true));

    void this.swUpdate.checkForUpdate();

    interval(UPDATE_CHECK_INTERVAL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.swUpdate?.checkForUpdate();
      });
  }
}
