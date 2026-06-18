import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';

import { AdItem, ContentItem, DisplayApiService, DisplayState } from './display-api.service';
import { DisplayRotationService } from './display-rotation.service';

@Component({
  selector: 'app-display-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="display-screen" [class.display-screen--ads-hidden]="!adsVisible" aria-label="Kiosk display">
      <section class="top-region" aria-label="Main content">
        <ng-container *ngIf="displayAvailable && currentContent; else contentFallback">
          <img *ngIf="currentContent.contentType === 'photo'" [src]="mediaSource(currentContent)" [alt]="currentContent.title" [class]="animationClass(currentContent)">
          <video *ngIf="currentContent.contentType === 'video'" [src]="mediaSource(currentContent)" muted autoplay loop [class]="animationClass(currentContent)"></video>
          <iframe *ngIf="currentContent.contentType === 'embedded_web'" [src]="iframeSource(currentContent)" [title]="currentContent.title"></iframe>
          <div class="content-label">{{ currentContent.title }}</div>
        </ng-container>
        <ng-template #contentFallback>
          <div class="fallback">{{ displayAvailable ? 'Content unavailable' : 'Display unavailable' }}</div>
        </ng-template>
      </section>

      <section *ngIf="adsVisible" class="ad-region" aria-label="Client ads">
        <ng-container *ngIf="visibleAds.length; else adFallback">
          <figure *ngFor="let ad of visibleAds">
            <img [src]="mediaSource(ad)" [alt]="ad.label" [class]="animationClass(ad)">
            <figcaption>{{ ad.label }}</figcaption>
          </figure>
        </ng-container>
        <ng-template #adFallback>
          <div class="fallback">Ads unavailable</div>
        </ng-template>
      </section>
    </main>
  `,
  styleUrl: './display-screen.component.css'
})
export class DisplayScreenComponent implements OnInit, OnDestroy {
  private readonly api = inject(DisplayApiService);
  private readonly rotation = inject(DisplayRotationService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private contentTimer: ReturnType<typeof setTimeout> | null = null;
  private adTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly escapeHandler = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      void this.router.navigateByUrl('/hall');
    }
  };

  state: DisplayState | null = null;
  contentIndex = 0;
  adIndex = 0;

  get currentContent(): ContentItem | null {
    if (!this.displayAvailable) {
      return null;
    }
    if (this.state?.remoteControl?.contentMode === 'iframe') {
      return this.state.selectedIframe ?? null;
    }
    return this.rotation.current(this.state?.topContent ?? [], this.contentIndex);
  }

  get currentAd(): AdItem | null {
    if (!this.adsVisible) {
      return null;
    }
    return this.rotation.current(this.state?.ads ?? [], this.adIndex);
  }

  get visibleAds(): AdItem[] {
    if (!this.adsVisible) {
      return [];
    }
    const ads = this.rotation.ordered(this.state?.ads ?? []);
    if (!ads.length) {
      return [];
    }
    const inlineCount = this.state?.configuration.inlineAdCount ?? 1;
    const rotated = [...ads.slice(this.adIndex), ...ads.slice(0, this.adIndex)];
    return rotated.slice(0, Math.min(inlineCount, rotated.length));
  }

  get adsVisible(): boolean {
    return this.displayAvailable && this.state?.remoteControl?.adsVisible !== false;
  }

  get displayAvailable(): boolean {
    return this.state?.configuration.isEnabled !== false;
  }

  ngOnInit(): void {
    globalThis.addEventListener?.('keydown', this.escapeHandler);
    this.api.openDisplay().subscribe((state) => {
      this.applyState(state);
      this.scheduleNextPoll();
    });
  }

  ngOnDestroy(): void {
    globalThis.removeEventListener?.('keydown', this.escapeHandler);
    this.clearTimers();
  }

  mediaSource(item: ContentItem | AdItem): string {
    return item.mediaFile?.mediaUrl ?? item.sourceReference;
  }

  animationClass(item: ContentItem | AdItem): string {
    return `rotation-${item.effectiveRotationAnimation ?? item.rotationAnimation ?? 'none'}`;
  }

  iframeSource(item: ContentItem): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(item.sourceReference);
  }

  private startRotation(): void {
    this.clearRotationTimers();
    this.scheduleNextContent();
    this.scheduleNextAd();
  }

  private scheduleNextContent(): void {
    if (!this.displayAvailable) {
      return;
    }
    if (this.state?.remoteControl?.contentMode === 'iframe') {
      return;
    }
    const items = this.state?.topContent ?? [];
    if (items.length <= 1) {
      return;
    }
    const durationSeconds = this.rotation.duration(this.currentContent, this.state?.configuration.defaultTopDurationSeconds ?? 10);
    this.contentTimer = setTimeout(() => {
      this.contentIndex = (this.contentIndex + 1) % items.length;
      this.scheduleNextContent();
    }, durationSeconds * 1000);
  }

  private scheduleNextAd(): void {
    if (!this.adsVisible) {
      return;
    }
    const ads = this.state?.ads ?? [];
    if (ads.length <= 1) {
      return;
    }
    const durationSeconds = this.rotation.duration(this.currentAd, this.state?.configuration.defaultAdDurationSeconds ?? 10);
    this.adTimer = setTimeout(() => {
      this.adIndex = (this.adIndex + 1) % ads.length;
      this.scheduleNextAd();
    }, durationSeconds * 1000);
  }

  private scheduleNextPoll(): void {
    const intervalSeconds = this.state?.configuration.remoteControlPollingSeconds ?? 3;
    this.pollTimer = setTimeout(() => {
      this.api.getState().subscribe((state) => {
        this.applyState(state);
        this.scheduleNextPoll();
      });
    }, intervalSeconds * 1000);
  }

  private applyState(state: DisplayState): void {
    this.state = state;
    this.contentIndex = 0;
    this.adIndex = 0;
    this.startRotation();
  }

  private clearRotationTimers(): void {
    if (this.contentTimer) {
      clearTimeout(this.contentTimer);
      this.contentTimer = null;
    }
    if (this.adTimer) {
      clearTimeout(this.adTimer);
      this.adTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearRotationTimers();
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
