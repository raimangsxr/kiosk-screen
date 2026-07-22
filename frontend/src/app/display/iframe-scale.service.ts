import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import type { IframeScaleUpdatedPayload } from './display-stream.models';

@Injectable({ providedIn: 'root' })
export class IframeScaleService {
  private readonly http = inject(HttpClient);

  readonly displayDeviceId = signal<string | null>(null);
  private readonly overrides = signal<Record<string, { scaleX: number; scaleY: number }>>({});

  reset(): void {
    this.displayDeviceId.set(null);
    this.overrides.set({});
  }

  async loadForKiosk(kioskId: string, displayDeviceId: string): Promise<void> {
    this.displayDeviceId.set(displayDeviceId);
    const data = await firstValueFrom(
      this.http.get<{ displayDeviceId: string; overrides: Record<string, { scaleX: number; scaleY: number }> }>(
        `/api/display/iframe-scales/me?kioskId=${encodeURIComponent(kioskId)}`,
      ),
    );
    this.overrides.set(data.overrides ?? {});
  }

  applyScaleUpdate(payload: IframeScaleUpdatedPayload): void {
    if (payload.displayDeviceId !== this.displayDeviceId()) {
      return;
    }
    if (payload.source === 'default') {
      this.overrides.update((current) => {
        const next = { ...current };
        delete next[payload.iframeId];
        return next;
      });
      return;
    }
    this.overrides.update((current) => ({
      ...current,
      [payload.iframeId]: { scaleX: payload.scaleX, scaleY: payload.scaleY },
    }));
  }

  resolveScale(
    iframeId: string | undefined,
    scaleX: number,
    scaleY: number,
  ): { scaleX: number; scaleY: number } {
    if (!iframeId) {
      return { scaleX, scaleY };
    }
    const override = this.overrides()[iframeId];
    return override ?? { scaleX, scaleY };
  }
}
