import { IframeItem } from '../../core/api/iframe.api';
import { ApplicationErrorContract } from '../../shared/contracts/admin-contracts';

export type RemoteControlContentMode = 'loop' | 'iframe' | 'fixed';
export type RemoteControlNavigationCommand = 'next' | 'previous' | 'pause' | 'resume' | 'jump_to';

export type RemoteControlIframeOption = IframeItem;

export interface RemoteControlFixedContentOption {
  id: string;
  title: string;
  contentType: 'photo' | 'video';
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
}

export interface RemoteControlState {
  contentMode: RemoteControlContentMode;
  selectedIframeId: string | null;
  selectedFixedContentId?: string | null;
  selectedIframe?: RemoteControlIframeOption | null;
  adsVisible: boolean;
  fullscreenRequested: boolean;
  navigationCommand?: RemoteControlNavigationCommand | null;
  navigationCommandId?: string | null;
  jumpToContentId?: string | null;
  updatedAt: string;
  displaySessionActive?: boolean;
}

export interface RemoteControlUpdate {
  contentMode: RemoteControlContentMode;
  selectedIframeId: string | null;
  selectedFixedContentId?: string | null;
  adsVisible: boolean;
  fullscreenRequested: boolean;
}

export interface RemoteControlNavigationRequest {
  command: RemoteControlNavigationCommand;
  targetContentId?: string | null;
}

export interface RemoteControlIframeOptionsResponse {
  items: RemoteControlIframeOption[];
  fixedEligibleContents?: RemoteControlFixedContentOption[];
}

export interface RemoteControlViewError extends ApplicationErrorContract {}
