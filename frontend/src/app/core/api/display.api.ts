import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, distinctUntilChanged, shareReplay, switchMap, timer } from 'rxjs';

import { MediaFileReference, RotationAnimation } from '../../shared/media-upload.models';
import { IframeItem } from './iframe.api';

export interface DisplayKioskConfiguration {
  id: string;
  name: string;
  topRegionRatio: 5;
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
  isFixed?: boolean;
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

/**
 * Compare two `topContent` queues for equality of the fields that the
 * kiosk runtime actually depends on. Spec 014 addendum 2: when the
 * admin updates a content's `recurringEveryXIterations`, `isFixed`,
 * or `isActive`, the kiosk MUST reflect the change on the next poll
 * without the operator refreshing the browser. The previous
 * fingerprint (`sameIdsAndOrder`) only checked id and displayOrder
 * and silently filtered those edits out of the polling stream; this
 * version adds the three cadence-related fields the rotation
 * controller reads.
 */
function sameTopContentState(
  prev: readonly DisplayContentItem[],
  curr: readonly DisplayContentItem[],
): boolean {
  if (prev.length !== curr.length) {
    return false;
  }
  for (let i = 0; i < prev.length; i++) {
    const p = prev[i];
    const c = curr[i];
    if (
      p.id !== c.id ||
      p.displayOrder !== c.displayOrder ||
      p.isActive !== c.isActive ||
      (p.isFixed ?? false) !== (c.isFixed ?? false) ||
      (p.recurringEveryXIterations ?? null) !== (c.recurringEveryXIterations ?? null)
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Compare two `ads` queues for equality of the fields the kiosk
 * runtime depends on. The active flag matters because a deactivated
 * ad must immediately disappear from the bottom band.
 */
function sameAdsState(
  prev: readonly DisplayAdItem[],
  curr: readonly DisplayAdItem[],
): boolean {
  if (prev.length !== curr.length) {
    return false;
  }
  for (let i = 0; i < prev.length; i++) {
    const p = prev[i];
    const c = curr[i];
    if (
      p.id !== c.id ||
      p.displayOrder !== c.displayOrder ||
      p.isActive !== c.isActive
    ) {
      return false;
    }
  }
  return true;
}
