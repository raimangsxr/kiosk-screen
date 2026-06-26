import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Floating button shown when the browser rejected the kiosk's automatic
 * fullscreen request (CHG-005 addendum). Clicking the button asks the
 * browser to enter fullscreen again; the host listens to `(enter)` and
 * retries via `document.documentElement.requestFullscreen()`.
 *
 * The component is purely presentational: it does not own the
 * fullscreen API call. The host (DisplayScreenComponent) keeps the
 * existing `applyFullscreenPreference()` flow so the user's intent
 * survives a navigation away from `/display`.
 */
@Component({
  selector: 'app-kiosk-fullscreen-prompt',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <button
        type="button"
        class="fullscreen-prompt"
        (click)="enter.emit()"
        data-testid="display-fullscreen-prompt"
      >Enter fullscreen</button>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .fullscreen-prompt {
        position: fixed;
        right: clamp(12px, 2vw, 24px);
        bottom: clamp(12px, 2vw, 24px);
        z-index: 20;
        min-height: clamp(40px, 6vh, 56px);
        padding: 0 clamp(16px, 2vw, 24px);
        border: 0;
        border-radius: 6px;
        background: #fff;
        color: #102832;
        box-shadow: 0 12px 32px rgb(0 0 0 / 32%);
        font: 700 clamp(14px, 1.6vw, 20px) / 1 system-ui, sans-serif;
        cursor: pointer;
      }
      .fullscreen-prompt:focus-visible {
        outline: 4px solid #f2b84a;
        outline-offset: 3px;
      }
      @media (max-width: 760px) {
        .fullscreen-prompt {
          right: 12px;
          bottom: 12px;
          min-height: 48px;
          padding: 0 18px;
          font-size: 16px;
        }
      }
    `
  ]
})
export class KioskFullscreenPromptComponent {
  readonly visible = input<boolean>(false);
  readonly enter = output<void>();
}