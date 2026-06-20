import { IframeItem } from '../../core/api/iframe.api';
import { ApplicationErrorContract } from '../../shared/contracts/admin-contracts';

export type RemoteControlContentMode = 'loop' | 'iframe';

export type RemoteControlIframeOption = IframeItem;

export interface RemoteControlState {
  contentMode: RemoteControlContentMode;
  selectedIframeId: string | null;
  selectedIframe?: RemoteControlIframeOption | null;
  adsVisible: boolean;
  updatedAt: string;
  displaySessionActive?: boolean;
}

export interface RemoteControlUpdate {
  contentMode: RemoteControlContentMode;
  selectedIframeId: string | null;
  adsVisible: boolean;
}

export interface RemoteControlIframeOptionsResponse {
  items: RemoteControlIframeOption[];
}

export interface RemoteControlViewError extends ApplicationErrorContract {}
