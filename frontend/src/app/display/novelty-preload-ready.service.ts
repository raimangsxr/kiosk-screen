import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { DisplayMediaCacheService } from './display-media-cache.service';
import type { PreloadItem } from './display-stream.models';
import { DisplayStreamService } from './display-stream.service';
import { DisplayViewerController } from './display-viewer.controller';

@Injectable()
export class NoveltyPreloadReadyService {
  private readonly http = inject(HttpClient);
  private readonly mediaCache = inject(DisplayMediaCacheService);
  private readonly stream = inject(DisplayStreamService);
  private readonly displayViewer = inject(DisplayViewerController);

  private readonly reportedContentIds = new Set<string>();

  observeNovelties(items: readonly PreloadItem[], options?: { reconnect?: boolean }): void {
    if (!this.isPreloadAllowed()) {
      return;
    }

    const novelties = items.filter((item) => item.isNovelty);
    const pendingIds = new Set(novelties.map((item) => item.contentId));

    for (const reportedId of [...this.reportedContentIds]) {
      if (!pendingIds.has(reportedId)) {
        this.reportedContentIds.delete(reportedId);
      }
    }

    if (options?.reconnect) {
      for (const item of novelties) {
        this.reportedContentIds.delete(item.contentId);
      }
    }

    for (const item of novelties) {
      void this.reportWhenReady(item);
    }
  }

  resetSession(): void {
    this.reportedContentIds.clear();
  }

  private async reportWhenReady(item: PreloadItem): Promise<void> {
    if (!this.isPreloadAllowed() || this.reportedContentIds.has(item.contentId)) {
      return;
    }

    const readyState = this.mediaCache.getReadyState(item.mediaUrl);
    if (readyState === 'failed') {
      return;
    }

    if (readyState !== 'ready') {
      try {
        await this.mediaCache.ensureReady(item.mediaUrl, item.contentType);
      } catch {
        return;
      }
    }

    if (!this.isPreloadAllowed() || this.reportedContentIds.has(item.contentId)) {
      return;
    }

    const kioskId = this.stream.kioskId();
    if (!kioskId) {
      return;
    }

    this.reportedContentIds.add(item.contentId);
    this.http.post('/api/display/kiosk/events', {
      kioskId,
      type: 'novelty_preload_ready',
      contentId: item.contentId,
      at: new Date().toISOString(),
    }).subscribe({
      error: () => {
        this.reportedContentIds.delete(item.contentId);
      },
    });
  }

  private isPreloadAllowed(): boolean {
    return this.displayViewer.contentMode() === 'loop'
      && !this.displayViewer.isPaused()
      && !this.displayViewer.iframeActive();
  }
}
