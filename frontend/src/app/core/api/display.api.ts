import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, distinctUntilChanged, interval, shareReplay, switchMap, timer } from 'rxjs';
import { MediaFileReference, RotationAnimation } from '../../shared/media-upload.models';

export interface DisplayKioskConfiguration {
  id: string;
  name: string;
  topRegionRatio: 4;
  bottomRegionRatio: 1;
  defaultTopDurationSeconds: number;
  defaultAdDurationSeconds: number;
  defaultTopRotationAnimation?: RotationAnimation;
  defaultAdRotationAnimation?: RotationAnimation;
  defaultTopAnimationDurationMilliseconds?: number;
  defaultAdAnimationDurationMilliseconds?: number;
  inlineAdCount?: number;
  configuredEventDurationMinutes: number;
  isEnabled: boolean;
}

export interface DisplayContentItem {
  id: string;
  title: string;
  contentType: 'photo' | 'video' | 'embedded_web';
  sourceReference: string;
  mediaFile?: MediaFileReference | null;
  isActive: boolean;
  displayOrder: number;
  durationSeconds?: number | null;
  rotationAnimation?: RotationAnimation | null;
  animationDurationMilliseconds?: number | null;
  effectiveDurationSeconds?: number | null;
  effectiveRotationAnimation?: RotationAnimation | null;
  effectiveAnimationDurationMilliseconds?: number | null;
}

export interface DisplayAdItem {
  id: string;
  clientId: string;
  label: string;
  sourceReference: string;
  mediaFile?: MediaFileReference | null;
  isActive: boolean;
  displayOrder: number;
  durationSeconds?: number | null;
  rotationAnimation?: RotationAnimation | null;
  animationDurationMilliseconds?: number | null;
  effectiveDurationSeconds?: number | null;
  effectiveRotationAnimation?: RotationAnimation | null;
  effectiveAnimationDurationMilliseconds?: number | null;
}

export interface DisplayState {
  configuration: DisplayKioskConfiguration;
  topContent: DisplayContentItem[];
  ads: DisplayAdItem[];
  fallbackActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class DisplayApiService {
  private readonly http = inject(HttpClient);

  openDisplay(): Observable<DisplayState> {
    return this.http.post<DisplayState>('/api/display/open', {}, { withCredentials: true });
  }

  getState(): Observable<DisplayState> {
    return this.http.get<DisplayState>('/api/display/state', { withCredentials: true });
  }

  /**
   * Polls `GET /api/display/state` at `pollIntervalMs` (default 5 s) and emits
   * a new snapshot only when the ``(topContent ids, topContent displayOrder,
   * ads ids, ads displayOrder)`` tuple changes. Other state changes (e.g.,
   * ``lastUsedAt`` on a media reference) do NOT trigger emissions.
   */
  watchState(pollIntervalMs: number = 5000): Observable<DisplayState> {
    return timer(0, pollIntervalMs).pipe(
      switchMap(() => this.getState()),
      distinctUntilChanged((prev, curr) => equalByIdAndOrder(prev, curr)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }
}

function equalByIdAndOrder(prev: DisplayState | null, curr: DisplayState): boolean {
  if (prev === null) {
    return false;
  }
  return (
    sameIdsAndOrder(prev.topContent, curr.topContent) &&
    sameIdsAndOrder(prev.ads, curr.ads)
  );
}

function sameIdsAndOrder<T extends { id: string; displayOrder: number }>(
  prev: readonly T[],
  curr: readonly T[],
): boolean {
  if (prev.length !== curr.length) {
    return false;
  }
  for (let i = 0; i < prev.length; i++) {
    if (prev[i].id !== curr[i].id || prev[i].displayOrder !== curr[i].displayOrder) {
      return false;
    }
  }
  return true;
}
