import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, distinctUntilChanged, shareReplay, switchMap, timer } from 'rxjs';

import { MediaFileReference, RotationAnimation } from '../../shared/media-upload.models';
import { sameAdsState, sameDisplayConfiguration, sameTopContentState } from '../../display/display-fingerprint';
import { IframeItem } from './iframe.api';

export interface DisplayKioskConfiguration {
  id: string;
  name: string;
  topRegionRatio: number;
  bottomRegionRatio: number;
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
  isFixed?: boolean;
  isNovelty?: boolean;
  recurringEveryXIterations?: number | null;
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
  contentMode: 'loop' | 'iframe' | 'fixed';
  selectedIframeId: string | null;
  selectedFixedContentId?: string | null;
  adsVisible: boolean;
  fullscreenRequested?: boolean;
  navigationCommand?: 'next' | 'previous' | 'pause' | 'resume' | 'jump_to' | null;
  navigationCommandId?: string | null;
  jumpToContentId?: string | null;
  updatedAt: string;
}

export interface DisplayFixedEligibleContentItem {
  id: string;
  title: string;
  contentType: 'photo' | 'video';
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
}

export interface DisplayState {
  configuration: DisplayKioskConfiguration;
  topContent: DisplayContentItem[];
  ads: DisplayAdItem[];
  remoteControl?: DisplayRemoteControlState;
  selectedIframe?: IframeItem | null;
  fallbackActive: boolean;
  fixedEligibleContents?: DisplayFixedEligibleContentItem[];
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

  consumeNovelty(contentId: string): Observable<void> {
    return this.http.post<void>(
      `/api/display/content/${contentId}/consume-novelty`,
      {},
      { withCredentials: true },
    );
  }

  postRotationEvent(
    eventType: 'content_rotation_empty',
    payload: Record<string, unknown> = {},
  ): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(
      '/api/display/rotation-event',
      { eventType, payload },
      { withCredentials: true },
    );
  }

  watchState(pollIntervalMs: number = 5000): Observable<DisplayState> {
    return timer(0, pollIntervalMs).pipe(
      switchMap(() => this.getState()),
      distinctUntilChanged((prev, curr) => equalByDisplayFingerprint(prev, curr)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }
}

export function equalByDisplayFingerprint(prev: DisplayState | null, curr: DisplayState): boolean {
  if (prev === null) {
    return false;
  }
  return (
    sameTopContentState(prev.topContent, curr.topContent) &&
    sameAdsState(prev.ads, curr.ads) &&
    sameDisplayConfiguration(prev.configuration, curr.configuration) &&
    prev.remoteControl?.selectedIframeId === curr.remoteControl?.selectedIframeId &&
    prev.remoteControl?.selectedFixedContentId === curr.remoteControl?.selectedFixedContentId &&
    prev.remoteControl?.adsVisible === curr.remoteControl?.adsVisible &&
    prev.remoteControl?.fullscreenRequested === curr.remoteControl?.fullscreenRequested &&
    prev.remoteControl?.navigationCommandId === curr.remoteControl?.navigationCommandId &&
    prev.remoteControl?.jumpToContentId === curr.remoteControl?.jumpToContentId &&
    prev.remoteControl?.contentMode === curr.remoteControl?.contentMode &&
    prev.selectedIframe?.id === curr.selectedIframe?.id &&
    (prev.selectedIframe?.url ?? '') === (curr.selectedIframe?.url ?? '')
  );
}
