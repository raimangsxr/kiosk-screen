import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { DisplayAdItem, DisplayContentItem } from '../core/api/display.api';
import { DisplayStreamService } from './display-stream.service';
import type {
  ModeChangedPayload,
  PreloadPayload,
  ShowAdsPayload,
  ShowContentPayload,
  ShowIframePayload,
  SnapshotIframe,
  SnapshotPayload,
} from './display-stream.models';

@Injectable()
export class DisplayViewerController {
  private readonly http = inject(HttpClient);
  private readonly stream = inject(DisplayStreamService);

  readonly contentMode = signal<'loop' | 'iframe' | 'fixed'>('loop');
  readonly isPaused = signal(false);
  readonly adsVisible = signal(true);
  readonly currentContent = signal<DisplayContentItem | null>(null);
  readonly currentIframe = signal<ShowIframePayload['iframe'] | null>(null);
  readonly visibleAds = signal<DisplayAdItem[]>([]);
  readonly adAnimationRun = signal(0);
  readonly inlineAdCount = signal(1);
  readonly adBorderStyle = signal<Record<string, string | number>>({});
  readonly currentCommandId = signal<string | null>(null);
  readonly currentShowReason = signal<string>('bootstrap');
  readonly preloadUrls = signal<string[]>([]);

  readonly isFixedMode = computed(() => this.contentMode() === 'fixed');
  readonly iframeActive = computed(() => this.contentMode() === 'iframe' && this.currentIframe() !== null);

  applyModeChanged(payload: ModeChangedPayload): void {
    this.contentMode.set(payload.contentMode);
    this.isPaused.set(payload.isPaused);
    this.adsVisible.set(payload.adsVisible);
    if (payload.contentMode !== 'iframe') {
      this.currentIframe.set(null);
    }
  }

  applySnapshot(snapshot: SnapshotPayload): void {
    this.applyModeChanged({
      contentMode: snapshot.contentMode,
      isPaused: snapshot.isPaused,
      adsVisible: snapshot.adsVisible,
      selectedFixedContentId: null,
      reason: 'snapshot',
    });

    if (snapshot.contentMode === 'iframe' && snapshot.selectedIframe) {
      this.applyShowIframe(this.snapshotIframePayload(snapshot.selectedIframe));
      if (snapshot.currentAds) {
        this.applyShowAds(snapshot.currentAds);
      }
      return;
    }

    if (snapshot.currentTop) {
      this.applyShowContent(snapshot.currentTop);
    }
    if (snapshot.currentAds) {
      this.applyShowAds(snapshot.currentAds);
    }
  }

  private snapshotIframePayload(iframe: SnapshotIframe): ShowIframePayload {
    return {
      commandId: 'snapshot',
      iframe: {
        id: iframe.id,
        title: iframe.url,
        url: iframe.url,
        scaleX: iframe.scaleX ?? 1,
        scaleY: iframe.scaleY ?? 1,
      },
      reason: 'snapshot',
    };
  }

  applyShowContent(payload: ShowContentPayload): void {
    if (payload.playback.mode === 'fixed_loop') {
      this.contentMode.set('fixed');
    } else if (this.contentMode() !== 'iframe') {
      this.contentMode.set('loop');
    }
    this.currentShowReason.set(payload.reason);
    this.currentContent.set(payload.content);
    this.currentCommandId.set(payload.commandId);
    this.currentIframe.set(null);
  }

  applyPreload(payload: PreloadPayload): void {
    this.preloadUrls.set(payload.items.map((item) => item.mediaUrl).filter(Boolean));
  }

  applyShowIframe(payload: ShowIframePayload): void {
    this.contentMode.set('iframe');
    this.currentIframe.set(payload.iframe);
    this.currentContent.set(null);
    this.currentCommandId.set(payload.commandId);
  }

  applyShowAds(payload: ShowAdsPayload): void {
    const count = Math.max(1, payload.inlineAdCount ?? 1);
    const items = payload.items;
    const start = payload.startIndex ?? 0;
    const visible: DisplayAdItem[] = [];
    for (let index = 0; index < count; index += 1) {
      const item = items[(start + index) % items.length];
      if (item) {
        visible.push(item);
      }
    }
    this.visibleAds.set(visible);
    this.inlineAdCount.set(count);
    this.adBorderStyle.set({
      borderRadius: `${payload.border.radiusPx}px`,
      borderWidth: `${payload.border.widthPx}px`,
      borderColor: payload.border.color,
      borderStyle: 'solid',
    });
    this.adAnimationRun.update((value) => value + 1);
  }

  onVideoEnded(content: DisplayContentItem): void {
    if (this.isFixedMode()) {
      return;
    }
    const commandId = this.currentCommandId();
    const kioskId = this.stream.kioskId();
    if (!commandId || !kioskId || content.id !== this.currentContent()?.id) {
      return;
    }
    this.postKioskEvent({
      kioskId,
      type: 'video_ended',
      commandId,
      contentId: content.id,
      at: new Date().toISOString(),
    });
  }

  reportMediaError(contentId: string, metadata: Record<string, unknown>): void {
    const commandId = this.currentCommandId();
    const kioskId = this.stream.kioskId();
    if (!commandId || !kioskId) {
      return;
    }
    this.postKioskEvent({
      kioskId,
      type: 'media_error',
      commandId,
      contentId,
      at: new Date().toISOString(),
      metadata,
    });
  }

  private postKioskEvent(body: Record<string, unknown>): void {
    this.http.post('/api/display/kiosk/events', body).subscribe({ error: () => undefined });
  }
}
