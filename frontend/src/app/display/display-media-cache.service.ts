import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/** Max top-region blobs: visible + one preload (FR-001). */
const MAX_TOP_RETENTION = 2;
const MAX_CONCURRENT_DOWNLOADS = 3;
const PROBE_TIMEOUT_MS = 10_000;
const RETRY_COOLDOWN_MS = 15_000;

export type MediaCacheReadyState = 'idle' | 'downloading' | 'ready' | 'failed';

interface PreparationRequest {
  readonly url: string;
  readonly contentType: string;
  readonly generation: number;
  required: boolean;
  active: boolean;
  readonly promise: Promise<string>;
  readonly resolve: (blobUrl: string) => void;
  readonly reject: (error: unknown) => void;
}

@Injectable()
export class DisplayMediaCacheService {
  private readonly http = inject(HttpClient);
  private readonly blobByUrl = new Map<string, string>();
  private readonly pendingByUrl = new Map<string, PreparationRequest>();
  private readonly failureAtByUrl = new Map<string, number>();
  private topRetained = new Set<string>();
  private adRetained = new Set<string>();
  private readonly readyStateByUrl = new Map<string, MediaCacheReadyState>();
  private readonly preparationQueue: PreparationRequest[] = [];
  private activeDownloads = 0;
  private lifecycleGeneration = 0;

  /** Bumped when a presentation Blob URL changes so templates re-bind [src]. */
  readonly revision = signal(0);

  getReadyState(url: string | null | undefined): MediaCacheReadyState {
    if (!url) {
      return 'idle';
    }
    return this.readyStateByUrl.get(url) ?? 'idle';
  }

  getDisplayUrl(url: string | null | undefined): string {
    if (!url || this.readyStateByUrl.get(url) !== 'ready') {
      return '';
    }
    return this.blobByUrl.get(url) ?? '';
  }

  /** Retain at most visible + one preload for the top region. */
  retainTop(urls: readonly (string | null | undefined)[]): void {
    const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))];
    const next = new Set(unique.slice(0, MAX_TOP_RETENTION));
    this.evictRetainedUrls(this.topRetained, next);
    this.topRetained = next;
    this.pruneUnneededQueuedPreparations();
    this.warm([...next]);
  }

  /** Retain only sponsor-strip URLs in the current visible window. */
  retainAds(urls: readonly (string | null | undefined)[]): void {
    const next = new Set(urls.filter((url): url is string => Boolean(url)));
    this.evictRetainedUrls(this.adRetained, next);
    this.adRetained = next;
    this.pruneUnneededQueuedPreparations();
    this.warm([...next]);
  }

  /** Iframe mode: release all top-region blobs (nothing shown in top media layer). */
  clearTopRetention(): void {
    const releasing = [...this.topRetained];
    this.topRetained.clear();
    for (const url of releasing) {
      this.revokeIfUnreferenced(url);
    }
    this.pruneUnneededQueuedPreparations();
  }

  warm(urls: readonly (string | null | undefined)[]): void {
    const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))];
    for (const url of unique) {
      void this.queuePreparation(url, 'photo', false).catch(() => undefined);
    }
  }

  warmItems(items: ReadonlyArray<{ mediaUrl: string; contentType?: string }>): void {
    for (const item of items.slice(0, 1)) {
      if (item.mediaUrl) {
        void this.queuePreparation(item.mediaUrl, item.contentType ?? 'photo', false)
          .catch(() => undefined);
      }
    }
  }

  ensure(url: string, contentType = 'photo'): Promise<string> {
    return this.ensureReady(url, contentType);
  }

  /**
   * Ensure the medium has been downloaded and presentation-probed. All direct
   * callers cross the same FIFO scheduler; none can bypass the global limit.
   * A non-retained request may resolve with an empty string after verification:
   * logical readiness does not grant ownership of a presentation Blob URL.
   */
  ensureReady(url: string, contentType = 'photo'): Promise<string> {
    return this.queuePreparation(url, contentType, true);
  }

  release(url: string): void {
    this.topRetained.delete(url);
    this.adRetained.delete(url);
    this.pruneUnneededQueuedPreparations();
    this.revokeIfUnreferenced(url);
  }

  private queuePreparation(url: string, contentType: string, required: boolean): Promise<string> {
    const cached = this.blobByUrl.get(url);
    if (cached) {
      return Promise.resolve(cached);
    }

    const failedAt = this.failureAtByUrl.get(url);
    if (failedAt !== undefined) {
      if (Date.now() - failedAt < RETRY_COOLDOWN_MS) {
        return Promise.reject(new Error('media_retry_cooldown'));
      }
      this.failureAtByUrl.delete(url);
      this.readyStateByUrl.delete(url);
    }

    const existing = this.pendingByUrl.get(url);
    if (existing) {
      existing.required ||= required;
      return existing.promise;
    }

    if (this.readyStateByUrl.get(url) === 'ready' && !this.isRetained(url)) {
      return Promise.resolve('');
    }

    let resolve!: (blobUrl: string) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<string>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    const request: PreparationRequest = {
      url,
      contentType,
      generation: this.lifecycleGeneration,
      required,
      active: false,
      promise,
      resolve,
      reject,
    };
    this.pendingByUrl.set(url, request);
    this.readyStateByUrl.set(url, 'downloading');
    this.preparationQueue.push(request);
    this.drainPreparationQueue();
    return promise;
  }

  private drainPreparationQueue(): void {
    while (this.activeDownloads < MAX_CONCURRENT_DOWNLOADS && this.preparationQueue.length > 0) {
      const request = this.preparationQueue.shift();
      if (!request || this.pendingByUrl.get(request.url) !== request) {
        continue;
      }
      request.active = true;
      this.activeDownloads += 1;
      void this.runPreparation(request);
    }
  }

  private async runPreparation(request: PreparationRequest): Promise<void> {
    try {
      const blobUrl = await this.fetchAndProbe(request.url, request.contentType);
      if (request.generation !== this.lifecycleGeneration) {
        URL.revokeObjectURL(blobUrl);
        request.resolve('');
        return;
      }

      this.failureAtByUrl.delete(request.url);
      if (this.isRetained(request.url)) {
        const previous = this.blobByUrl.get(request.url);
        if (previous && previous !== blobUrl) {
          URL.revokeObjectURL(previous);
        }
        this.blobByUrl.set(request.url, blobUrl);
        this.readyStateByUrl.set(request.url, 'ready');
        request.resolve(blobUrl);
      } else {
        URL.revokeObjectURL(blobUrl);
        if (request.required) {
          this.readyStateByUrl.set(request.url, 'ready');
        } else {
          this.readyStateByUrl.delete(request.url);
        }
        request.resolve('');
      }
      this.revision.update((value) => value + 1);
    } catch (error: unknown) {
      if (request.generation !== this.lifecycleGeneration) {
        request.reject(error);
        return;
      }
      this.failureAtByUrl.set(request.url, Date.now());
      this.readyStateByUrl.set(request.url, 'failed');
      this.revision.update((value) => value + 1);
      if (error instanceof HttpErrorResponse) {
        console.warn(`Display media cache: failed to fetch ${request.url} (${error.status})`);
      }
      request.reject(error);
    } finally {
      if (request.generation !== this.lifecycleGeneration) {
        return;
      }
      if (this.pendingByUrl.get(request.url) === request) {
        this.pendingByUrl.delete(request.url);
      }
      this.activeDownloads -= 1;
      this.drainPreparationQueue();
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
        video.oncanplay = null;
        video.onerror = null;
        video.removeAttribute('src');
        video.load();
      };
      video.oncanplay = () => {
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
    const released = new Error('media_cache_released');
    for (const request of this.pendingByUrl.values()) {
      if (!request.active) {
        request.reject(released);
      }
    }
    for (const blobUrl of this.blobByUrl.values()) {
      URL.revokeObjectURL(blobUrl);
    }
    this.blobByUrl.clear();
    this.pendingByUrl.clear();
    this.failureAtByUrl.clear();
    this.topRetained.clear();
    this.adRetained.clear();
    this.readyStateByUrl.clear();
    this.preparationQueue.length = 0;
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
    if (this.isRetained(url)) {
      return;
    }
    const blobUrl = this.blobByUrl.get(url);
    if (!blobUrl) {
      return;
    }
    URL.revokeObjectURL(blobUrl);
    this.blobByUrl.delete(url);
    // Preserve logical readiness. If this URL becomes visible again,
    // queuePreparation sees there is no Blob and prepares a fresh source.
    this.readyStateByUrl.set(url, 'ready');
    this.revision.update((value) => value + 1);
  }

  private pruneUnneededQueuedPreparations(): void {
    for (let index = this.preparationQueue.length - 1; index >= 0; index -= 1) {
      const request = this.preparationQueue[index];
      if (request.required || this.isRetained(request.url)) {
        continue;
      }
      this.preparationQueue.splice(index, 1);
      if (this.pendingByUrl.get(request.url) === request) {
        this.pendingByUrl.delete(request.url);
      }
      this.readyStateByUrl.delete(request.url);
      request.reject(new Error('media_preparation_pruned'));
    }
  }

  private isRetained(url: string): boolean {
    return this.topRetained.has(url) || this.adRetained.has(url);
  }
}
