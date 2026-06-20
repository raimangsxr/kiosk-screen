import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, distinctUntilChanged, shareReplay, switchMap, timer } from 'rxjs';

import { MediaFileReference, RotationAnimation } from '../../shared/media-upload.models';
import { IframeItem } from './iframe.api';

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
  remoteControlPollingSeconds?: number;
  videoEndDelaySeconds?: number;
  isEnabled: boolean;
}

export interface DisplayContentItem {
  id: string;
  title: string;
  contentType: 'photo' | 'video';
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
  advertiser?: string | null;
}

export interface DisplayRemoteControlState {
  contentMode: 'loop' | 'iframe';
  selectedIframeId: string | null;
  adsVisible: boolean;
  fullscreenRequested?: boolean;
  navigationCommand?: 'next' | 'previous' | null;
  navigationCommandId?: string | null;
  updatedAt: string;
}

export interface DisplayState {
  configuration: DisplayKioskConfiguration;
  topContent: DisplayContentItem[];
  ads: DisplayAdItem[];
  remoteControl?: DisplayRemoteControlState;
  selectedIframe?: IframeItem | null;
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

  watchState(pollIntervalMs: number = 5000): Observable<DisplayState> {
    return timer(0, pollIntervalMs).pipe(
      switchMap(() => this.getState()),
      distinctUntilChanged((prev, curr) => equalByDisplayFingerprint(prev, curr)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }
}

function equalByDisplayFingerprint(prev: DisplayState | null, curr: DisplayState): boolean {
  if (prev === null) {
    return false;
  }
  return (
    sameIdsAndOrder(prev.topContent, curr.topContent) &&
    sameIdsAndOrder(prev.ads, curr.ads) &&
    sameDisplayConfiguration(prev.configuration, curr.configuration) &&
    prev.remoteControl?.selectedIframeId === curr.remoteControl?.selectedIframeId &&
    prev.remoteControl?.adsVisible === curr.remoteControl?.adsVisible &&
    prev.remoteControl?.fullscreenRequested === curr.remoteControl?.fullscreenRequested &&
    prev.remoteControl?.navigationCommandId === curr.remoteControl?.navigationCommandId &&
    prev.selectedIframe?.id === curr.selectedIframe?.id
  );
}

function sameDisplayConfiguration(
  prev: DisplayKioskConfiguration,
  curr: DisplayKioskConfiguration,
): boolean {
  return (
    prev.id === curr.id &&
    prev.name === curr.name &&
    prev.topRegionRatio === curr.topRegionRatio &&
    prev.bottomRegionRatio === curr.bottomRegionRatio &&
    prev.defaultTopDurationSeconds === curr.defaultTopDurationSeconds &&
    prev.defaultAdDurationSeconds === curr.defaultAdDurationSeconds &&
    prev.defaultTopRotationAnimation === curr.defaultTopRotationAnimation &&
    prev.defaultAdRotationAnimation === curr.defaultAdRotationAnimation &&
    prev.defaultTopAnimationDurationMilliseconds === curr.defaultTopAnimationDurationMilliseconds &&
    prev.defaultAdAnimationDurationMilliseconds === curr.defaultAdAnimationDurationMilliseconds &&
    prev.inlineAdCount === curr.inlineAdCount &&
    prev.remoteControlPollingSeconds === curr.remoteControlPollingSeconds &&
    prev.videoEndDelaySeconds === curr.videoEndDelaySeconds &&
    prev.isEnabled === curr.isEnabled
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
