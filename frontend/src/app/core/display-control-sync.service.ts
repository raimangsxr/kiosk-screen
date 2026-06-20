import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

const CHANNEL_NAME = 'kiosk-display-control-sync';
const STORAGE_KEY = 'kiosk-display-control-sync-event';

@Injectable({ providedIn: 'root' })
export class DisplayControlSyncService implements OnDestroy {
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

  notifyDisplayStateChanged(): void {
    this.changesSubject.next();
    this.channel?.postMessage({ type: 'display-state-changed', at: Date.now() });
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // Browsers can deny localStorage in private or kiosk contexts; BroadcastChannel/polling still cover the flow.
    }
  }

  notifyRemoteControlChanged(): void {
    this.notifyDisplayStateChanged();
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
