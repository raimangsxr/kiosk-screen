import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface BrandingViewModel {
  readonly eventName: string;
  readonly organizerName: string;
  readonly organizerLogoUrl: string | null;
}

/**
 * Renders the organizer logo + event-name pill that floats over the top
 * of the kiosk content (spec 014 / ADR-0005). Hidden in iframe mode
 * and when no branding fields are populated.
 *
 * Broken logos self-hide via the `(logoBroken)` output so the host can
 * keep its single source of truth (the kiosk's branding signal) without
 * re-checking image load state on every render.
 */
@Component({
  selector: 'app-kiosk-branding-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible() && hasContent()) {
      <div
        class="branding-overlay"
        aria-label="Organizer and event branding"
        id="branding-overlay"
        data-testid="kiosk-branding-overlay"
      >
        @if (branding().organizerLogoUrl; as logoUrl) {
          @if (!hiddenLogoUrl() || hiddenLogoUrl() !== logoUrl) {
            <img
              [src]="logoUrl"
              alt=""
              class="branding-overlay__logo"
              (error)="logoBroken.emit(logoUrl)"
              data-testid="kiosk-branding-logo"
            />
          }
        }
        @if (branding().eventName) {
          <span
            class="branding-overlay__event-name"
            data-testid="kiosk-branding-event-name"
          >{{ branding().eventName }}</span>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .branding-overlay {
        position: absolute;
        top: 10px;
        left: 10px;
        right: 10px;
        z-index: 3;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        pointer-events: none;
      }
      .branding-overlay__logo {
        height: clamp(36px, 6vh, 80px);
        max-width: min(40vw, 360px);
        object-fit: contain;
        flex-shrink: 0;
      }
      .branding-overlay__event-name {
        padding: 8px 14px;
        border-radius: 6px;
        background: rgb(0 0 0 / 68%);
        color: #fff;
        font: 700 clamp(16px, 1.6vw, 28px) / 1.2 system-ui, sans-serif;
        display: inline-flex;
        align-items: center;
        max-height: clamp(36px, 6vh, 80px);
      }
      @media (max-width: 760px) {
        .branding-overlay {
          gap: 7px;
        }
        .branding-overlay__logo {
          height: clamp(20px, 4vh, 36px);
          max-width: min(30vw, 200px);
        }
        .branding-overlay__event-name {
          padding: 6px 10px;
          font-size: clamp(13px, 1.6vw, 18px);
        }
      }
    `
  ]
})
export class KioskBrandingOverlayComponent {
  /** Current branding snapshot. The host passes the kiosk's branding signal directly. */
  readonly branding = input.required<BrandingViewModel>();
  /**
   * Hidden logo URL — the host tracks this so the overlay survives a
   * remount (the broken-logo state is owned by the host, not the overlay).
   */
  readonly hiddenLogoUrl = input<string | null>(null);

  /** True when the overlay should be rendered. The host applies iframe-mode hiding. */
  readonly visible = input<boolean>(true);

  readonly logoBroken = output<string>();

  protected hasContent(): boolean {
    const b = this.branding();
    return Boolean(b.eventName) || Boolean(b.organizerLogoUrl);
  }
}