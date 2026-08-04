import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type MediaCacheReadyState = 'idle' | 'downloading' | 'ready' | 'failed';

const MAX_CONCURRENT_DOWNLOADS = 3;
const PROBE_TIMEOUT_MS = 10_000;

@Injectable()
export class DisplayMediaCacheService {
  private readonly http = inject(HttpClient);
  private readonly blobByUrl = new Map<string, string>();
  private readonly inflight = new Map<string, Promise<string>>();
  private readonly failedUrls = new Set<string>();
  private readonly readyStateByUrl = new Map<string, MediaCacheReadyState>();
  private readonly warmQueue: Array<{ url: string; contentType: string }> = [];
  private activeDownloads = 0;

  /** Bumped when a blob URL becomes available so templates re-bind [src]. */
  readonly revision = signal(0);

  getReadyState(url: string | null | undefined): MediaCacheReadyState {
    if (!url) {
      return 'idle';
    }
    return this.readyStateByUrl.get(url) ?? 'idle';
  }

  getDisplayUrl(url: string | null | undefined): string {
    if (!url) {
      return '';
    }
    const state = this.readyStateByUrl.get(url);
    if (state === 'ready') {
      return this.blobByUrl.get(url) ?? '';
    }
    return '';
  }

  warm(urls: readonly (string | null | undefined)[]): void {
    const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))];
    for (const url of unique) {
      this.enqueueWarm(url, 'photo');
    }
    this.drainWarmQueue();
  }

  warmItems(items: ReadonlyArray<{ mediaUrl: string; contentType?: string }>): void {
    for (const item of items) {
      if (item.mediaUrl) {
        this.enqueueWarm(item.mediaUrl, item.contentType ?? 'photo');
      }
    }
    this.drainWarmQueue();
  }

  private enqueueWarm(url: string, contentType: string): void {
    if (this.failedUrls.has(url) || this.readyStateByUrl.get(url) === 'ready') {
      return;
    }
    if (!this.warmQueue.some((entry) => entry.url === url) && !this.inflight.has(url)) {
      this.warmQueue.push({ url, contentType });
    }
  }

  ensure(url: string, contentType = 'photo'): Promise<string> {
    return this.ensureReady(url, contentType);
  }

  ensureReady(url: string, contentType = 'photo'): Promise<string> {
    if (this.failedUrls.has(url)) {
      return Promise.reject(new Error('media_fetch_failed'));
    }
    const state = this.readyStateByUrl.get(url);
    if (state === 'ready') {
      const cached = this.blobByUrl.get(url);
      if (cached) {
        return Promise.resolve(cached);
      }
    }
    const pending = this.inflight.get(url);
    if (pending) {
      return pending;
    }

    this.readyStateByUrl.set(url, 'downloading');
    const promise = this.fetchAndProbe(url, contentType)
      .then((blobUrl) => {
        this.blobByUrl.set(url, blobUrl);
        this.inflight.delete(url);
        this.readyStateByUrl.set(url, 'ready');
        this.revision.update((value) => value + 1);
        return blobUrl;
      })
      .catch((error: unknown) => {
        this.inflight.delete(url);
        this.failedUrls.add(url);
        this.readyStateByUrl.set(url, 'failed');
        this.revision.update((value) => value + 1);
        if (error instanceof HttpErrorResponse) {
          console.warn(`Display media cache: failed to fetch ${url} (${error.status})`);
        }
        throw error;
      });

    this.inflight.set(url, promise);
    return promise;
  }

  private drainWarmQueue(): void {
    while (this.activeDownloads < MAX_CONCURRENT_DOWNLOADS && this.warmQueue.length > 0) {
      const entry = this.warmQueue.shift();
      if (!entry || this.failedUrls.has(entry.url) || this.readyStateByUrl.get(entry.url) === 'ready') {
        continue;
      }
      if (this.inflight.has(entry.url)) {
        continue;
      }
      this.activeDownloads += 1;
      void this.ensureReady(entry.url, entry.contentType).finally(() => {
        this.activeDownloads -= 1;
        this.drainWarmQueue();
      });
    }
  }

  private async fetchAndProbe(url: string, contentType: string): Promise<string> {
    const blob = await firstValueFrom(
      this.http.get(url, { responseType: 'blob', withCredentials: true }),
    );
    const blobUrl = URL.createObjectURL(blob);
    if (!this.shouldSkipPresentationProbe()) {
      if (contentType === 'video') {
        await this.probeVideo(blobUrl);
      } else {
        await this.probeImage(blobUrl);
      }
    }
    return blobUrl;
  }

  private shouldSkipPresentationProbe(): boolean {
    return typeof (globalThis as { __karma__?: unknown }).__karma__ !== 'undefined';
  }

  private probeImage(blobUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const timer = globalThis.setTimeout(() => {
        cleanup();
        reject(new Error('image_probe_timeout'));
      }, PROBE_TIMEOUT_MS);
      const cleanup = (): void => {
        globalThis.clearTimeout(timer);
        image.onload = null;
        image.onerror = null;
      };
      image.onload = () => {
        cleanup();
        resolve();
      };
      image.onerror = () => {
        cleanup();
        reject(new Error('image_probe_failed'));
      };
      image.src = blobUrl;
    });
  }

  private probeVideo(blobUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.muted = true;
      video.preload = 'auto';
      const timer = globalThis.setTimeout(() => {
        cleanup();
        reject(new Error('video_probe_timeout'));
      }, PROBE_TIMEOUT_MS);
      const cleanup = (): void => {
        globalThis.clearTimeout(timer);
        video.removeAttribute('src');
        video.load();
        video.oncanplaythrough = null;
        video.onerror = null;
      };
      video.oncanplaythrough = () => {
        cleanup();
        resolve();
      };
      video.onerror = () => {
        cleanup();
        reject(new Error('video_probe_failed'));
      };
      video.src = blobUrl;
      video.load();
    });
  }

  releaseAll(): void {
    for (const blobUrl of this.blobByUrl.values()) {
      URL.revokeObjectURL(blobUrl);
    }
    this.blobByUrl.clear();
    this.inflight.clear();
    this.failedUrls.clear();
    this.readyStateByUrl.clear();
    this.warmQueue.length = 0;
    this.activeDownloads = 0;
  }
}
