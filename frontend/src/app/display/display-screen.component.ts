import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';

import { AdItem, ContentItem, DisplayApiService, DisplayState } from './display-api.service';
import { DisplayRotationService } from './display-rotation.service';

@Component({
  selector: 'app-display-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="display-screen" aria-label="Kiosk display">
      <section class="top-region" aria-label="Main content">
        <ng-container *ngIf="currentContent; else contentFallback">
          <img *ngIf="currentContent.contentType === 'photo'" [src]="currentContent.sourceReference" [alt]="currentContent.title">
          <video *ngIf="currentContent.contentType === 'video'" [src]="currentContent.sourceReference" muted autoplay loop></video>
          <iframe *ngIf="currentContent.contentType === 'embedded_web'" [src]="currentContent.sourceReference" [title]="currentContent.title"></iframe>
          <div class="content-label">{{ currentContent.title }}</div>
        </ng-container>
        <ng-template #contentFallback>
          <div class="fallback">Content unavailable</div>
        </ng-template>
      </section>

      <section class="ad-region" aria-label="Client ads">
        <ng-container *ngIf="currentAd; else adFallback">
          <img [src]="currentAd.sourceReference" [alt]="currentAd.label">
          <strong>{{ currentAd.label }}</strong>
        </ng-container>
        <ng-template #adFallback>
          <div class="fallback">Ads unavailable</div>
        </ng-template>
      </section>
    </main>
  `,
  styleUrl: './display-screen.component.css'
})
export class DisplayScreenComponent implements OnInit {
  private readonly api = inject(DisplayApiService);
  private readonly rotation = inject(DisplayRotationService);

  state: DisplayState | null = null;
  contentIndex = 0;
  adIndex = 0;

  get currentContent(): ContentItem | null {
    return this.rotation.current(this.state?.topContent ?? [], this.contentIndex);
  }

  get currentAd(): AdItem | null {
    return this.rotation.current(this.state?.ads ?? [], this.adIndex);
  }

  ngOnInit(): void {
    this.api.openDisplay().subscribe((state) => {
      this.state = state;
    });
  }
}
