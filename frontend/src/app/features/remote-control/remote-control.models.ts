import { ApplicationErrorContract } from '../../shared/contracts/admin-contracts';

export type RemoteControlContentMode = 'loop' | 'iframe';

export interface RemoteControlIframeOption {
  id: string;
  title: string;
  sourceReference: string;
  isActive: boolean;
}

export interface RemoteControlState {
  contentMode: RemoteControlContentMode;
  selectedContentId: string | null;
  selectedIframe?: RemoteControlIframeOption | null;
  adsVisible: boolean;
  updatedAt: string;
  displaySessionActive?: boolean;
}

export interface RemoteControlUpdate {
  contentMode: RemoteControlContentMode;
  selectedContentId: string | null;
  adsVisible: boolean;
}

export interface RemoteControlIframeOptionsResponse {
  items: RemoteControlIframeOption[];
}

export interface RemoteControlViewError extends ApplicationErrorContract {}
