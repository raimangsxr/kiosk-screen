import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

const CHANNEL_NAME = 'kiosk-event-config-sync';
const STORAGE_KEY = 'kiosk-event-config-sync-event';

/**
 * Cross-tab notification channel for event configuration changes (CHG-024).
 *
 * Mirrors the BroadcastChannel + localStorage pattern from
 * `DisplayControlSyncService` so the kiosk can react to admin-form saves
 * within the same event loop turn instead of waiting for the next polling
 * cycle.
 *
 * The admin calls `notifyEventConfigChanged()` after a successful
 * `PUT /event-configuration` (either the explicit Save path or the
 * layout auto-save path). The display component subscribes to `changes$`
 * and calls `EventBrandingService.refresh()` on each emission.
 *
 * The channel name is deliberately distinct from
 * `kiosk-display-control-sync` (used by the remote-control flow) so the
 * two flows do not cross-trigger.
 */
@Injectable({ providedIn: 'root' })
export class EventConfigSyncService implements OnDestroy {
  private readonly changesSubject = new Subject<void>();
  private readonly channel: BroadcastChannel | null = this.createChannel();
  private readonly storageHandler = (event: StorageEvent): void => {
    if (event.key === STORAGE_KEY && event.newValue) {
      this.changesSubject.next();
    }
  };

  readonly changes$ = this.changesSubject.asObservable();

  constructor() {
    globalThis.addEventListener?.('storage', this.storageHandler);
  }

  notifyEventConfigChanged(): void {
    this.changesSubject.next();
    this.channel?.postMessage({ type: 'event-config-changed', at: Date.now() });
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // Browsers can deny localStorage in private or kiosk contexts;
      // BroadcastChannel still covers the flow when available.
    }
  }

  ngOnDestroy(): void {
    globalThis.removeEventListener?.('storage', this.storageHandler);
    this.channel?.close();
    this.changesSubject.complete();
  }

  private createChannel(): BroadcastChannel | null {
    if (!('BroadcastChannel' in globalThis)) {
      return null;
    }
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => this.changesSubject.next();
    return channel;
  }
}