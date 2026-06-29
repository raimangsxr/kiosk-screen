import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { BrandingLayout } from '../core/api/event-branding.api';

export interface BrandingViewModel {
  readonly eventName: string;
  readonly organizerName: string;
  readonly organizerLogoUrl: string | null;
  readonly logoLayout: BrandingLayout | null;
  readonly eventNameLayout: BrandingLayout | null;
}

/**
 * Renders the organizer logo + event-name pill that floats over the top
 * of the kiosk content (CHG-014 / ADR-0005). Hidden in iframe mode
 * and when no branding fields are populated.
 *
 * The visual layout is data-driven via CSS custom properties bound
 * from the polled `EventBranding` snapshot (CHG-023). When a
 * layout field is `null` in the polled snapshot, the corresponding
 * custom property is unset and the component-scoped CSS `var()`
 * fallback path applies — the documented visual defaults replicate
 * the pre-CHG-023 look.
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
        [style.--logo-x]="layoutCssValue(branding().logoLayout, 'x')"
        [style.--logo-y]="layoutCssValue(branding().logoLayout, 'y')"
        [style.--logo-size]="layoutCssValue(branding().logoLayout, 'size')"
        [style.--logo-transparency]="layoutCssValue(branding().logoLayout, 'transparency')"
        [style.--logo-border-radius]="layoutCssValue(branding().logoLayout, 'borderRadius')"
        [style.--event-name-x]="layoutCssValue(branding().eventNameLayout, 'x')"
        [style.--event-name-y]="layoutCssValue(branding().eventNameLayout, 'y')"
        [style.--event-name-size]="layoutCssValue(branding().eventNameLayout, 'size')"
        [style.--event-name-transparency]="layoutCssValue(branding().eventNameLayout, 'transparency')"
        [style.--event-name-border-radius]="layoutCssValue(branding().eventNameLayout, 'borderRadius')"
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
        pointer-events: none;
      }
      /**
       * The two children are absolutely positioned inside the
       * overlay container. Their visual treatment is driven from
       * CSS custom properties bound from the polled
       * EventBranding snapshot; the var() fallbacks replicate
       * the pre-CHG-023 overlay look documented in
       * docs/adr/0005-branding-overlay-layout.md and
       * specs/changes/023-event-branding-layout/spec.md.
       */
      .branding-overlay__logo {
        position: absolute;
        top: calc(var(--logo-y, 0) * 1vh);
        left: calc(var(--logo-x, 0) * 1vw);
        height: max(36px, calc(var(--logo-size, 6) * 1vh));
        max-width: min(40vw, 360px);
        object-fit: contain;
        flex-shrink: 0;
        opacity: calc((100 - var(--logo-transparency, 0)) / 100);
        border-radius: calc(var(--logo-border-radius, 0) * 1vh);
      }
      .branding-overlay__event-name {
        position: absolute;
        top: calc(var(--event-name-y, 0) * 1vh);
        right: calc(var(--event-name-x, 20) * 1vw);
        padding: 8px 14px;
        border-radius: calc(var(--event-name-border-radius, 6) * 1vh);
        background: rgb(0 0 0 / 68%);
        color: #fff;
        font-weight: 700;
        font-size: max(13px, calc(var(--event-name-size, 1.6) * 1vw));
        line-height: 1.2;
        font-family: system-ui, sans-serif;
        display: inline-flex;
        align-items: center;
        max-height: 50vh;
        opacity: calc((100 - var(--event-name-transparency, 0)) / 100);
        white-space: nowrap;
      }
      @media (max-width: 760px) {
        .branding-overlay__logo {
          height: max(20px, calc(var(--logo-size, 4) * 1vh));
          max-width: min(30vw, 200px);
        }
        .branding-overlay__event-name {
          padding: 6px 10px;
          font-size: max(13px, calc(var(--event-name-size, 1.6) * 1vw));
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

  /**
   * Resolve a single layout field to a CSS custom-property value.
   * Returns `null` when the layout is absent or the field is missing,
   * so Angular's `[style.--*]` binding emits no inline style and the
   * CSS `var(*, default)` fallback applies.
   */
  protected layoutCssValue(
    layout: BrandingLayout | null | undefined,
    field: keyof BrandingLayout
  ): string | null {
    if (!layout) {
      return null;
    }
    const value = layout[field];
    return typeof value === 'number' ? String(value) : null;
  }
}