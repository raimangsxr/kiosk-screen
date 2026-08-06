import { Injectable, computed, inject, signal } from '@angular/core';

import { DisplayMediaCacheService } from './display-media-cache.service';
import type { PreloadItem } from './display-stream.models';

export type NoveltyDownloadStatus = 'pending' | 'ready' | 'error';

export interface NoveltyQueueEntry {
  contentId: string;
  contentType: 'photo' | 'video';
  downloadStatus: NoveltyDownloadStatus;
  displayOrder: number;
  deferCount?: number;
  maxDefer?: number;
}

@Injectable()
export class NoveltyQueueTrackerService {
  private readonly mediaCache = inject(DisplayMediaCacheService);
  private readonly entries = signal<NoveltyQueueEntry[]>([]);
  private deferMetadataByContentId = new Map<string, Pick<NoveltyQueueEntry, 'deferCount' | 'maxDefer'>>();

  readonly visibleIcons = computed(() => {
    const sorted = [...this.entries()].sort((a, b) => a.displayOrder - b.displayOrder);
    return sorted.slice(0, 5);
  });

  readonly overflowCount = computed(() => Math.max(0, this.entries().length - 5));

  readonly hasEntries = computed(() => this.entries().length > 0);

  syncFromPreload(items: readonly PreloadItem[]): void {
    const novelties = items.filter((item) => item.isNovelty);
    this.replaceQueue(novelties);
  }

  syncFromSnapshot(items: readonly PreloadItem[] | undefined): void {
    const novelties = (items ?? []).filter((item) => item.isNovelty);
    for (const item of novelties) {
      this.mergeDeferMetadata(item);
    }
    this.replaceQueue(novelties);
  }

  removeOnCommit(contentId: string): void {
    this.entries.update((current) => current.filter((entry) => entry.contentId !== contentId));
    this.deferMetadataByContentId.delete(contentId);
  }

  private replaceQueue(items: readonly PreloadItem[]): void {
    const next = items.map((item, index) => ({
      contentId: item.contentId,
      contentType: (item.contentType === 'video' ? 'video' : 'photo') as 'photo' | 'video',
      downloadStatus: this.resolveStatus(item.mediaUrl),
      displayOrder: index,
      ...this.deferMetadataFor(item),
    }));
    this.entries.set(next);
    this.trackCacheUpdates(items);
  }

  private mergeDeferMetadata(item: PreloadItem): void {
    if (item.deferCount === undefined && item.maxDefer === undefined) {
      return;
    }
    this.deferMetadataByContentId.set(item.contentId, {
      deferCount: item.deferCount,
      maxDefer: item.maxDefer,
    });
  }

  private deferMetadataFor(item: PreloadItem): Pick<NoveltyQueueEntry, 'deferCount' | 'maxDefer'> {
    const fromItem: Pick<NoveltyQueueEntry, 'deferCount' | 'maxDefer'> = {};
    if (item.deferCount !== undefined) {
      fromItem.deferCount = item.deferCount;
    }
    if (item.maxDefer !== undefined) {
      fromItem.maxDefer = item.maxDefer;
    }
    if (fromItem.deferCount !== undefined || fromItem.maxDefer !== undefined) {
      this.deferMetadataByContentId.set(item.contentId, fromItem);
      return fromItem;
    }
    return this.deferMetadataByContentId.get(item.contentId) ?? {};
  }

  private trackCacheUpdates(items: readonly PreloadItem[]): void {
    for (const item of items) {
      void this.mediaCache.ensureReady(item.mediaUrl, item.contentType).then(() => {
        this.updateStatus(item.contentId, item.mediaUrl);
      }).catch(() => {
        this.markError(item.contentId);
      });
    }
  }

  private updateStatus(contentId: string, mediaUrl: string): void {
    const state = this.mediaCache.getReadyState(mediaUrl);
    if (state !== 'ready' && state !== 'failed') {
      return;
    }
    this.entries.update((current) =>
      current.map((entry) => {
        if (entry.contentId !== contentId) {
          return entry;
        }
        return {
          ...entry,
          downloadStatus: state === 'ready' ? 'ready' : 'error',
        };
      }),
    );
  }

  private markError(contentId: string): void {
    this.entries.update((current) =>
      current.map((entry) =>
        entry.contentId === contentId ? { ...entry, downloadStatus: 'error' as const } : entry,
      ),
    );
  }

  private resolveStatus(mediaUrl: string): NoveltyDownloadStatus {
    const state = this.mediaCache.getReadyState(mediaUrl);
    if (state === 'ready') {
      return 'ready';
    }
    if (state === 'failed') {
      return 'error';
    }
    return 'pending';
  }
}
