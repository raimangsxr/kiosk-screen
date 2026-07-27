import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injectable,
  inject,
  input
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConnectedPosition, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { fromEvent, merge } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface MediaPreviewConfig {
  readonly mediaUrl: string;
  readonly contentType: 'photo' | 'video';
}

const PREVIEW_POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 8 },
  { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -8 },
  { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 8 }
];

@Injectable({ providedIn: 'root' })
export class MediaHoverPreviewService {
  private readonly overlay = inject(Overlay);
  private readonly destroyRef = inject(DestroyRef);

  private overlayRef: OverlayRef | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private pointerInsidePanel = false;
  private activeTrigger: HTMLElement | null = null;

  showHover(trigger: HTMLElement, config: MediaPreviewConfig): void {
    if (!config.mediaUrl) {
      return;
    }
    this.clearHideTimer();
    if (this.overlayRef && this.activeTrigger === trigger) {
      return;
    }
    this.hideImmediate();
    this.activeTrigger = trigger;
    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(trigger)
        .withPositions(PREVIEW_POSITIONS)
        .withViewportMargin(8),
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      panelClass: 'media-hover-preview-overlay'
    });
    const portal = new ComponentPortal(MediaHoverPreviewPanelComponent);
    const ref = this.overlayRef.attach(portal);
    ref.setInput('mediaUrl', config.mediaUrl);
    ref.setInput('contentType', config.contentType);
  }

  showTap(config: MediaPreviewConfig): void {
    if (!config.mediaUrl) {
      return;
    }
    this.hideImmediate();
    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
      scrollStrategy: this.overlay.scrollStrategies.block(),
      hasBackdrop: true,
      backdropClass: 'media-hover-preview-backdrop',
      panelClass: 'media-hover-preview-overlay'
    });
    const portal = new ComponentPortal(MediaHoverPreviewPanelComponent);
    const ref = this.overlayRef.attach(portal);
    ref.setInput('mediaUrl', config.mediaUrl);
    ref.setInput('contentType', config.contentType);

    merge(
      this.overlayRef.backdropClick(),
      fromEvent<KeyboardEvent>(document, 'keydown').pipe(filter((event) => event.key === 'Escape'))
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.hideImmediate());
  }

  scheduleHide(): void {
    this.clearHideTimer();
    this.hideTimer = setTimeout(() => {
      if (!this.pointerInsidePanel) {
        this.hideImmediate();
      }
    }, 80);
  }

  hideImmediate(): void {
    this.clearHideTimer();
    this.pointerInsidePanel = false;
    this.activeTrigger = null;
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  notifyPanelEnter(): void {
    this.pointerInsidePanel = true;
    this.clearHideTimer();
  }

  notifyPanelLeave(): void {
    this.pointerInsidePanel = false;
    this.scheduleHide();
  }

  isOpenFor(trigger: HTMLElement): boolean {
    return this.activeTrigger === trigger && this.overlayRef !== null;
  }

  private clearHideTimer(): void {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}

@Component({
  selector: 'app-media-hover-preview-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'media-hover-preview-panel',
    '(mouseenter)': 'onPanelEnter()',
    '(mouseleave)': 'onPanelLeave()'
  },
  template: `
    @if (contentType() === 'video') {
      <video
        class="media-hover-preview-panel__media"
        [src]="mediaUrl()"
        muted
        autoplay
        loop
        playsinline
        data-testid="media-hover-preview-video"
      ></video>
    } @else {
      <img
        class="media-hover-preview-panel__media"
        [src]="mediaUrl()"
        alt=""
        data-testid="media-hover-preview-image"
      />
    }
  `,
  styles: [
    `
      :host {
        display: block;
        pointer-events: auto;
        padding: 4px;
        border-radius: 8px;
        background: var(--mat-sys-surface-container-high);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      }
      .media-hover-preview-panel__media {
        display: block;
        max-width: min(480px, 80vw);
        max-height: min(480px, 80vh);
        width: auto;
        height: auto;
        object-fit: contain;
        border-radius: 4px;
      }
    `
  ]
})
export class MediaHoverPreviewPanelComponent {
  readonly mediaUrl = input.required<string>();
  readonly contentType = input.required<'photo' | 'video'>();

  private readonly service = inject(MediaHoverPreviewService);

  protected onPanelEnter(): void {
    this.service.notifyPanelEnter();
  }

  protected onPanelLeave(): void {
    this.service.notifyPanelLeave();
  }
}
