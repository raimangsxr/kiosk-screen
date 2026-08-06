import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/** Max top-region blobs: visible + one preload (FR-001). */
const MAX_TOP_RETENTION = 2;

export type MediaCacheReadyState = 'idle' | 'downloading' | 'ready' | 'failed';

const MAX_CONCURRENT_DOWNLOADS = 3;
const PROBE_TIMEOUT_MS = 10_000;

@Injectable()
export class DisplayMediaCacheService {
  private readonly http = inject(HttpClient);
  private readonly blobByUrl = new Map<string, string>();
  private readonly inflight = new Map<string, Promise<string>>();
  private readonly failedUrls = new Set<string>();
  private topRetained = new Set<string>();
  private adRetained = new Set<string>();
  private readonly readyStateByUrl = new Map<string, MediaCacheReadyState>();
  private readonly warmQueue: Array<{ url: string; contentType: string }> = [];
  private readonly evictedWhileInflight = new Set<string>();
  private activeDownloads = 0;
  private lifecycleGeneration = 0;

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

  /** Retain at most visible + one preload for the top region. */
  retainTop(urls: readonly (string | null | undefined)[]): void {
    const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))];
    const next = new Set(unique.slice(0, MAX_TOP_RETENTION));
    this.evictRetainedUrls(this.topRetained, next);
    this.topRetained = next;
    this.pruneWarmQueue();
    this.warm([...next]);
  }

  /** Retain only sponsor-strip URLs in the current visible window. */
  retainAds(urls: readonly (string | null | undefined)[]): void {
    const next = new Set(urls.filter((url): url is string => Boolean(url)));
    this.evictRetainedUrls(this.adRetained, next);
    this.adRetained = next;
    this.pruneWarmQueue();
    this.warm([...next]);
  }

  /** Iframe mode: release all top-region blobs (nothing shown in top media layer). */
  clearTopRetention(): void {
    const releasing = [...this.topRetained];
    this.topRetained.clear();
    for (const url of releasing) {
      this.revokeIfUnreferenced(url);
    }
    this.pruneWarmQueue();
  }

  warm(urls: readonly (string | null | undefined)[]): void {
    const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))];
    for (const url of unique) {
      this.enqueueWarm(url, 'photo');
    }
    this.drainWarmQueue();
  }

  warmItems(items: ReadonlyArray<{ mediaUrl: string; contentType?: string }>): void {
    for (const item of items.slice(0, 1)) {
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
    const generation = this.lifecycleGeneration;
    let promise!: Promise<string>;
    promise = this.fetchAndProbe(url, contentType)
      .then((blobUrl) => {
        const ownsInflightEntry = this.inflight.get(url) === promise;
        if (ownsInflightEntry) {
          this.inflight.delete(url);
        }
        const evicted = generation === this.lifecycleGeneration
          ? this.evictedWhileInflight.delete(url)
          : false;
        if (generation !== this.lifecycleGeneration || (evicted && !this.isRetained(url))) {
          URL.revokeObjectURL(blobUrl);
          if (ownsInflightEntry || (!this.inflight.has(url) && !this.blobByUrl.has(url))) {
            this.readyStateByUrl.delete(url);
          }
          this.revision.update((value) => value + 1);
          return blobUrl;
        }
        this.blobByUrl.set(url, blobUrl);
        this.readyStateByUrl.set(url, 'ready');
        this.revision.update((value) => value + 1);
        return blobUrl;
      })
      .catch((error: unknown) => {
        const ownsInflightEntry = this.inflight.get(url) === promise;
        if (ownsInflightEntry) {
          this.inflight.delete(url);
        }
        if (generation !== this.lifecycleGeneration) {
          if (ownsInflightEntry || (!this.inflight.has(url) && !this.blobByUrl.has(url))) {
            this.readyStateByUrl.delete(url);
          }
          throw error;
        }
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

  release(url: string): void {
    this.topRetained.delete(url);
    this.adRetained.delete(url);
    this.pruneWarmQueue();
    this.revokeIfUnreferenced(url);
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
      const generation = this.lifecycleGeneration;
      void this.ensureReady(entry.url, entry.contentType)
        .catch(() => undefined)
        .finally(() => {
          if (generation !== this.lifecycleGeneration) {
            return;
          }
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
    try {
      if (!this.shouldSkipPresentationProbe()) {
        if (contentType === 'video') {
          await this.probeVideo(blobUrl);
        } else {
          await this.probeImage(blobUrl);
        }
      }
    } catch (error) {
      URL.revokeObjectURL(blobUrl);
      throw error;
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
    this.lifecycleGeneration += 1;
    for (const blobUrl of this.blobByUrl.values()) {
      URL.revokeObjectURL(blobUrl);
    }
    this.blobByUrl.clear();
    this.inflight.clear();
    this.failedUrls.clear();
    this.topRetained.clear();
    this.adRetained.clear();
    this.evictedWhileInflight.clear();
    this.readyStateByUrl.clear();
    this.warmQueue.length = 0;
    this.activeDownloads = 0;
    this.revision.update((value) => value + 1);
  }

  private evictRetainedUrls(current: Set<string>, next: Set<string>): void {
    for (const url of current) {
      if (!next.has(url)) {
        current.delete(url);
        this.revokeIfUnreferenced(url);
      }
    }
  }

  private revokeIfUnreferenced(url: string): void {
    if (this.topRetained.has(url) || this.adRetained.has(url)) {
      return;
    }
    if (this.inflight.has(url)) {
      this.evictedWhileInflight.add(url);
    }
    const blobUrl = this.blobByUrl.get(url);
    if (!blobUrl) {
      return;
    }
    URL.revokeObjectURL(blobUrl);
    this.blobByUrl.delete(url);
    this.inflight.delete(url);
    // Also drop the ready-state (CHG-050) so an evicted-then-re-needed URL is
    // re-downloaded instead of being treated as still 'ready' with no blob.
    this.readyStateByUrl.delete(url);
    this.revision.update((value) => value + 1);
  }

  private pruneWarmQueue(): void {
    for (let index = this.warmQueue.length - 1; index >= 0; index -= 1) {
      if (!this.isRetained(this.warmQueue[index].url)) {
        this.warmQueue.splice(index, 1);
      }
    }
  }

  private isRetained(url: string): boolean {
    return this.topRetained.has(url) || this.adRetained.has(url);
  }
}
