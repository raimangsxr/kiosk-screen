import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DisplayMediaCacheService {
  private readonly http = inject(HttpClient);
  private readonly blobByUrl = new Map<string, string>();
  private readonly inflight = new Map<string, Promise<string>>();
  private readonly failedUrls = new Set<string>();

  /** Bumped when a blob URL becomes available so templates re-bind [src]. */
  readonly revision = signal(0);

  getDisplayUrl(url: string | null | undefined): string {
    if (!url) {
      return '';
    }
    return this.blobByUrl.get(url) ?? url;
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

  releaseAll(): void {
    for (const blobUrl of this.blobByUrl.values()) {
      URL.revokeObjectURL(blobUrl);
    }
    this.blobByUrl.clear();
    this.inflight.clear();
    this.failedUrls.clear();
  }
}
