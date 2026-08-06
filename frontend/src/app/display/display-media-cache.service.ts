import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/** Max top-region blobs: visible + one preload (FR-001). */
const MAX_TOP_RETENTION = 2;

@Injectable()
export class DisplayMediaCacheService {
  private readonly http = inject(HttpClient);
  private readonly blobByUrl = new Map<string, string>();
  private readonly inflight = new Map<string, Promise<string>>();
  private readonly failedUrls = new Set<string>();
  private topRetained = new Set<string>();
  private adRetained = new Set<string>();

  /** Bumped when a blob URL becomes available so templates re-bind [src]. */
  readonly revision = signal(0);

  getDisplayUrl(url: string | null | undefined): string {
    if (!url) {
      return '';
    }
    return this.blobByUrl.get(url) ?? url;
  }

  /** Retain at most visible + one preload for the top region. */
  retainTop(urls: readonly (string | null | undefined)[]): void {
    const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))];
    const next = new Set(unique.slice(0, MAX_TOP_RETENTION));
    this.evictRetainedUrls(this.topRetained, next);
    this.topRetained = next;
    this.warm([...next]);
  }

  /** Retain only sponsor-strip URLs in the current visible window. */
  retainAds(urls: readonly (string | null | undefined)[]): void {
    const next = new Set(urls.filter((url): url is string => Boolean(url)));
    this.evictRetainedUrls(this.adRetained, next);
    this.adRetained = next;
    this.warm([...next]);
  }

  /** Iframe mode: release all top-region blobs (nothing shown in top media layer). */
  clearTopRetention(): void {
    const releasing = [...this.topRetained];
    this.topRetained.clear();
    for (const url of releasing) {
      this.revokeIfUnreferenced(url);
    }
  }

  warm(urls: readonly (string | null | undefined)[]): void {
    const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))];
    for (const url of unique) {
      if (this.failedUrls.has(url) || this.blobByUrl.has(url)) {
        continue;
      }
      void this.ensure(url);
    }
  }

  ensure(url: string): Promise<string> {
    if (this.failedUrls.has(url)) {
      return Promise.reject(new Error('media_fetch_failed'));
    }
    const cached = this.blobByUrl.get(url);
    if (cached) {
      return Promise.resolve(cached);
    }
    const pending = this.inflight.get(url);
    if (pending) {
      return pending;
    }

    const promise = firstValueFrom(
      this.http.get(url, { responseType: 'blob', withCredentials: true }),
    )
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        this.blobByUrl.set(url, blobUrl);
        this.inflight.delete(url);
        this.revision.update((value) => value + 1);
        return blobUrl;
      })
      .catch((error: unknown) => {
        this.inflight.delete(url);
        this.failedUrls.add(url);
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
    this.revokeIfUnreferenced(url);
  }

  releaseAll(): void {
    for (const blobUrl of this.blobByUrl.values()) {
      URL.revokeObjectURL(blobUrl);
    }
    this.blobByUrl.clear();
    this.inflight.clear();
    this.failedUrls.clear();
    this.topRetained.clear();
    this.adRetained.clear();
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
    const blobUrl = this.blobByUrl.get(url);
    if (!blobUrl) {
      return;
    }
    URL.revokeObjectURL(blobUrl);
    this.blobByUrl.delete(url);
    this.inflight.delete(url);
    this.revision.update((value) => value + 1);
  }
}
