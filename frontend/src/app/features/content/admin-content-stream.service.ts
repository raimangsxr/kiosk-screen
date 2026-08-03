import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, debounceTime, firstValueFrom } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';

// ngsw-bypass: keep admin SSE out of the Angular service worker fetch handler.
const STREAM_URL = '/api/admin/content/stream?ngsw-bypass=true';
const DEBOUNCE_MS = 1_000;
const STALE_AFTER_MS = 30_000;

export interface ContentInventoryChangedEvent {
  readonly v: number;
  readonly type: 'content_inventory_changed';
  readonly at: string;
  readonly reason?: string;
}

export interface NowPlayingChangedEvent {
  readonly v: number;
  readonly type: 'now_playing_changed';
  readonly at: string;
  readonly contentId: string | null;
  readonly title?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminContentStreamService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly inventorySubject = new Subject<void>();
  private readonly dragDeferredState = signal(false);

  readonly inventoryChanged$ = this.inventorySubject.pipe(debounceTime(DEBOUNCE_MS));
  readonly connected = signal(false);
  readonly stale = signal(false);
  readonly nowPlayingContentId = signal<string | null>(null);
  readonly nowPlayingTitle = signal<string | null>(null);

  private eventSource: EventSource | null = null;
  private started = false;
  private hadOpen = false;
  private pendingWhileDrag = false;
  private staleTimer: ReturnType<typeof setTimeout> | null = null;

  start(): void {
    if (this.started || !this.canStream()) {
      return;
    }
    this.started = true;
    this.connect();
  }

  stop(): void {
    this.started = false;
    this.hadOpen = false;
    this.pendingWhileDrag = false;
    this.disconnect();
    this.connected.set(false);
    this.stale.set(false);
    this.nowPlayingContentId.set(null);
    this.nowPlayingTitle.set(null);
  }

  markFresh(): void {
    this.clearStaleTimer();
  }

  setDragDeferred(deferred: boolean): void {
    this.dragDeferredState.set(deferred);
    if (!deferred && this.pendingWhileDrag) {
      this.pendingWhileDrag = false;
      this.inventorySubject.next();
    }
  }

  /** @internal test hook */
  notifyInventoryChangedForTests(): void {
    this.handleInventorySignal();
  }

  private canStream(): boolean {
    return this.auth.user() !== null;
  }

  private connect(): void {
    this.disconnect();
    const source = new EventSource(STREAM_URL, { withCredentials: true });
    this.eventSource = source;

    source.onopen = () => {
      this.connected.set(true);
      this.clearStaleTimer();
      if (this.hadOpen) {
        this.inventorySubject.next();
      }
      this.hadOpen = true;
    };

    source.onerror = () => {
      this.connected.set(false);
      if (!this.started) {
        return;
      }
      this.armStaleTimer();
      void this.verifyAuthOrRedirect();
    };

    source.addEventListener('content_inventory_changed', () => {
      this.handleInventorySignal();
    });

    source.addEventListener('now_playing_changed', (event) => {
      this.handleNowPlayingChanged(event as MessageEvent<string>);
    });
  }

  private handleNowPlayingChanged(event: MessageEvent<string>): void {
    try {
      const payload = JSON.parse(event.data) as NowPlayingChangedEvent;
      const contentId = payload.contentId ?? null;
      this.nowPlayingContentId.set(contentId);
      this.nowPlayingTitle.set(contentId ? (payload.title ?? null) : null);
    } catch {
      this.nowPlayingContentId.set(null);
      this.nowPlayingTitle.set(null);
    }
  }

  private handleInventorySignal(): void {
    if (this.dragDeferredState()) {
      this.pendingWhileDrag = true;
      return;
    }
    this.inventorySubject.next();
  }

  private disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.clearStaleTimer();
  }

  private armStaleTimer(): void {
    if (this.staleTimer !== null || this.stale()) {
      return;
    }
    this.staleTimer = setTimeout(() => {
      this.staleTimer = null;
      if (!this.connected() && this.started) {
        this.stale.set(true);
      }
    }, STALE_AFTER_MS);
  }

  private clearStaleTimer(): void {
    if (this.staleTimer !== null) {
      clearTimeout(this.staleTimer);
      this.staleTimer = null;
    }
    this.stale.set(false);
  }

  private async verifyAuthOrRedirect(): Promise<void> {
    const user = await firstValueFrom(this.auth.refresh());
    if (user === null) {
      this.handleFatalAuthError();
    }
  }

  private handleFatalAuthError(): void {
    this.stop();
    void this.router.navigateByUrl('/login');
  }
}
