import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { PwaUpdateService } from './pwa-update.service';

@Component({
  selector: 'app-pwa-update-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (updates.updateReady()) {
      <aside class="pwa-update-banner" role="status" aria-live="polite">
        <p class="pwa-update-banner__message">Hay una nueva versión disponible.</p>
        <button type="button" class="pwa-update-banner__action" (click)="updates.applyUpdate()">
          Actualizar
        </button>
      </aside>
    }
  `,
  styles: [`
    .pwa-update-banner {
      position: fixed;
      right: 1rem;
      bottom: 1rem;
      left: 1rem;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.875rem 1rem;
      border-radius: 0.75rem;
      background: #0a59b8;
      color: #fff;
      box-shadow: 0 12px 32px rgba(10, 89, 184, 0.35);
    }

    .pwa-update-banner__message {
      margin: 0;
      font: 500 0.95rem/1.4 Roboto, 'Helvetica Neue', Arial, sans-serif;
    }

    .pwa-update-banner__action {
      flex: 0 0 auto;
      border: 0;
      border-radius: 999px;
      padding: 0.5rem 1rem;
      background: #fff;
      color: #0a59b8;
      font: 600 0.875rem/1 Roboto, 'Helvetica Neue', Arial, sans-serif;
      cursor: pointer;
    }

    .pwa-update-banner__action:focus-visible {
      outline: 2px solid #fff;
      outline-offset: 2px;
    }
  `]
})
export class PwaUpdateBannerComponent {
  protected readonly updates = inject(PwaUpdateService);
}
