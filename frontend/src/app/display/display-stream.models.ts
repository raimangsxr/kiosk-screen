import type { DisplayAdItem, DisplayContentItem, DisplayKioskConfiguration } from '../core/api/display.api';

export const DISPLAY_STREAM_PROTOCOL_VERSION = 1;

export type DisplayStreamEventType =
  | 'snapshot'
  | 'show_content'
  | 'show_ads'
  | 'show_iframe'
  | 'mode_changed'
  | 'config_updated'
  | 'branding_updated'
  | 'preload'
  | 'session_ended'
  | 'ping';

export interface DisplayStreamEnvelope<TPayload = unknown> {
  v: number;
  type: DisplayStreamEventType;
  sequence: number;
  emittedAt: string;
  operatorSessionId: string;
  organizationId: string;
  payload: TPayload;
}

export interface ConfigUpdatedPayload {
  configuration: Partial<DisplayKioskConfiguration> & Pick<DisplayKioskConfiguration, 'id'>;
  applyImmediately: boolean;
  changedFields: string[];
}

export interface SnapshotPayload {
  configuration: DisplayKioskConfiguration;
  contentMode: 'loop' | 'iframe' | 'fixed';
  isPaused: boolean;
  adsVisible: boolean;
  selectedIframe: unknown | null;
  currentTop: unknown | null;
  currentAds: unknown | null;
  fallbackActive: boolean;
}

export interface BrandingUpdatedPayload {
  eventName: string;
  organizerName: string;
  organizerLogoUrl: string | null;
  logoLayout?: unknown | null;
  eventNameLayout?: unknown | null;
}

export interface KioskRegisterResponse {
  kioskId: string;
  organizationId: string;
  operatorSessionId: string;
  protocolVersion: number;
}

export interface ShowContentPayload {
  commandId: string;
  content: DisplayContentItem;
  playback: {
    mode: 'timer' | 'video' | 'manual' | 'fixed_loop';
    durationSeconds: number;
    videoEndDelaySeconds: number;
    loopVideo: boolean;
  };
  transition: {
    animation: string;
    durationMs: number;
  };
  reason: string;
}

export interface ModeChangedPayload {
  contentMode: 'loop' | 'iframe' | 'fixed';
  isPaused: boolean;
  adsVisible: boolean;
  selectedFixedContentId: string | null;
  reason: string;
}

export interface ShowIframePayload {
  commandId: string;
  iframe: {
    id: string;
    title: string;
    url: string;
  };
  reason: string;
}

export interface PreloadPayload {
  items: Array<{
    contentId: string;
    mediaUrl: string;
    contentType: string;
    mediaVersion: string;
  }>;
  leadTimeSeconds: number;
}

export interface ShowAdsPayload {
  commandId: string;
  items: DisplayAdItem[];
  startIndex: number;
  inlineAdCount: number;
  border: {
    radiusPx: number;
    widthPx: number;
    color: string;
  };
  transition: {
    animation: string;
    durationMs: number;
  };
  durationSeconds: number;
  reason: string;
}
