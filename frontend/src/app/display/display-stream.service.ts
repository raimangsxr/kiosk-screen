import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../core/auth/auth.service';
import { createRandomUuid } from '../shared/util/random-id';
import { DisplayLabelService } from './display-label.service';

import {
  BrandingUpdatedPayload,
  ConfigUpdatedPayload,
  DisplayStreamEnvelope,
  DisplayStreamEventType,
  IframeScaleUpdatedPayload,
  KioskRegisterResponse,
  ModeChangedPayload,
  PreloadPayload,
  ShowAdsPayload,
  ShowContentPayload,
  ShowIframePayload,
} from './display-stream.models';
import { IframeScaleService } from './iframe-scale.service';

const CLIENT_INSTANCE_STORAGE_KEY = 'kiosk-client-instance-id';

@Injectable({ providedIn: 'root' })
export class DisplayStreamService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly displayLabel = inject(DisplayLabelService);
  private readonly iframeScales = inject(IframeScaleService);

  readonly kioskId = signal<string | null>(null);
  readonly displayDeviceId = signal<string | null>(null);
  readonly connected = signal(false);
  readonly reconnecting = signal(false);
  readonly sessionEnded = signal(false);
  readonly sseFallbackActive = signal(false);
  readonly lastSequence = signal(0);
  readonly lastEvent = signal<DisplayStreamEnvelope | null>(null);

  readonly configUpdated = computed(() => {
    const event = this.lastEvent();
    if (event?.type !== 'config_updated') {
      return null;
    }
    return event.payload as ConfigUpdatedPayload;
  });

  readonly brandingUpdated = computed(() => {
    const event = this.lastEvent();
    if (event?.type !== 'branding_updated') {
      return null;
    }
    return event.payload as BrandingUpdatedPayload;
  });

  readonly showContent = computed(() => {
    const event = this.lastEvent();
    if (event?.type !== 'show_content') {
      return null;
    }
    return event.payload as ShowContentPayload;
  });

  readonly showAds = computed(() => {
    const event = this.lastEvent();
    if (event?.type !== 'show_ads') {
      return null;
    }
    return event.payload as ShowAdsPayload;
  });

  readonly modeChanged = computed(() => {
    const event = this.lastEvent();
    if (event?.type !== 'mode_changed') {
      return null;
    }
    return event.payload as ModeChangedPayload;
  });

  readonly showIframe = computed(() => {
    const event = this.lastEvent();
    if (event?.type !== 'show_iframe') {
      return null;
    }
    return event.payload as ShowIframePayload;
  });

  readonly preload = computed(() => {
    const event = this.lastEvent();
    if (event?.type !== 'preload') {
      return null;
    }
    return event.payload as PreloadPayload;
  });

  private eventSource: EventSource | null = null;
  private started = false;
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private authVerifyInFlight: Promise<void> | null = null;
  private lastAuthVerifyAt = 0;
  private lastAppliedSnapshotKey: string | null = null;

  private static readonly SSE_FALLBACK_DELAY_MS = 60_000;
  private static readonly AUTH_VERIFY_MIN_MS = 5_000;

  async start(): Promise<void> {
    if (this.started) {
      return;
    }
    this.started = true;
    const registration = await this.register();
    await this.startWithRegistration(registration);
  }

  /** Join an active display session without calling POST /display/open. */
  async tryRegister(): Promise<KioskRegisterResponse | null> {
    try {
      return await this.register();
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async startWithRegistration(registration: KioskRegisterResponse): Promise<void> {
    if (this.started) {
      this.kioskId.set(registration.kioskId);
      this.connect(registration.kioskId);
      return;
    }
    this.started = true;
    this.kioskId.set(registration.kioskId);
    this.connect(registration.kioskId);
  }

  stop(): void {
    this.started = false;
    this.disconnect();
    this.kioskId.set(null);
    this.displayDeviceId.set(null);
    this.iframeScales.reset();
    this.connected.set(false);
    this.reconnecting.set(false);
    this.sessionEnded.set(false);
    this.lastAppliedSnapshotKey = null;
  }

  private async register(): Promise<KioskRegisterResponse> {
    const label = this.displayLabel.label();
    const registration = await firstValueFrom(
      this.http.post<KioskRegisterResponse>('/api/display/kiosk/register', {
        clientInstanceId: this.clientInstanceId(),
        label,
      }),
    );
    this.displayDeviceId.set(registration.displayDeviceId);
    await this.iframeScales.loadForKiosk(registration.kioskId, registration.displayDeviceId);
    return registration;
  }

  private connect(kioskId: string): void {
    this.disconnect();
    // ngsw-bypass: Angular SW must not intercept long-lived SSE (breaks reconnect + exhausts sockets).
    const url =
      `/api/display/stream?kioskId=${encodeURIComponent(kioskId)}&ngsw-bypass=true`;
    const source = new EventSource(url, { withCredentials: true });
    this.eventSource = source;

    source.onopen = () => {
      this.connected.set(true);
      this.reconnecting.set(false);
      this.sseFallbackActive.set(false);
      this.clearFallbackTimer();
    };

    source.onerror = () => {
      this.connected.set(false);
      if (this.sessionEnded()) {
        return;
      }
      this.reconnecting.set(true);
      this.armFallbackTimer();
      void this.verifyAuthOrRedirect();
    };

    const eventTypes: DisplayStreamEventType[] = [
      'snapshot',
      'config_updated',
      'branding_updated',
      'show_content',
      'show_ads',
      'show_iframe',
      'iframe_scale_updated',
      'mode_changed',
      'preload',
      'session_ended',
    ];

    for (const type of eventTypes) {
      source.addEventListener(type, (raw) => {
        this.handleMessage(raw as MessageEvent<string>);
      });
    }

    source.onmessage = (raw) => {
      this.handleMessage(raw);
    };
  }

  private handleMessage(raw: MessageEvent<string>): void {
    try {
      const envelope = JSON.parse(raw.data) as DisplayStreamEnvelope;
      if (envelope.type === 'snapshot') {
        const snapshotKey = this.snapshotFingerprint(envelope);
        if (snapshotKey === this.lastAppliedSnapshotKey) {
          return;
        }
        this.lastAppliedSnapshotKey = snapshotKey;
      }
      this.lastEvent.set(envelope);
      if (typeof envelope.sequence === 'number') {
        this.lastSequence.set(envelope.sequence);
      }
      if (envelope.type === 'session_ended') {
        this.sessionEnded.set(true);
        this.started = false;
        this.connected.set(false);
        this.reconnecting.set(false);
        this.disconnect();
      }
      if (envelope.type === 'iframe_scale_updated') {
        this.iframeScales.applyScaleUpdate(envelope.payload as IframeScaleUpdatedPayload);
      }
    } catch {
      // Ignore malformed SSE payloads; EventSource will keep the connection alive.
    }
  }

  private snapshotFingerprint(envelope: DisplayStreamEnvelope): string {
    try {
      return JSON.stringify(envelope.payload);
    } catch {
      return String(envelope.sequence ?? '');
    }
  }

  private disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.clearFallbackTimer();
  }

  private armFallbackTimer(): void {
    if (this.fallbackTimer !== null || this.sseFallbackActive()) {
      return;
    }
    this.fallbackTimer = setTimeout(() => {
      this.fallbackTimer = null;
      if (!this.connected() && this.started && !this.sessionEnded()) {
        this.sseFallbackActive.set(true);
      }
    }, DisplayStreamService.SSE_FALLBACK_DELAY_MS);
  }

  private clearFallbackTimer(): void {
    if (this.fallbackTimer !== null) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  private async verifyAuthOrRedirect(): Promise<void> {
    const now = Date.now();
    if (now - this.lastAuthVerifyAt < DisplayStreamService.AUTH_VERIFY_MIN_MS) {
      return;
    }
    if (this.authVerifyInFlight) {
      return;
    }
    this.lastAuthVerifyAt = now;
    this.authVerifyInFlight = (async () => {
      try {
        const user = await firstValueFrom(this.auth.refresh());
        if (user === null) {
          this.handleFatalAuthError();
        }
      } finally {
        this.authVerifyInFlight = null;
      }
    })();
    await this.authVerifyInFlight;
  }

  private handleFatalAuthError(): void {
    this.started = false;
    this.connected.set(false);
    this.reconnecting.set(false);
    this.disconnect();
    void this.router.navigateByUrl('/login');
  }

  private clientInstanceId(): string {
    if (typeof globalThis.sessionStorage === 'undefined') {
      return createRandomUuid();
    }
    const existing = globalThis.sessionStorage.getItem(CLIENT_INSTANCE_STORAGE_KEY);
    if (existing) {
      return existing;
    }
    const created = createRandomUuid();
    globalThis.sessionStorage.setItem(CLIENT_INSTANCE_STORAGE_KEY, created);
    return created;
  }
}
