import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-remote-status-strip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="remote-control__status"
      role="status"
      aria-live="polite"
      data-testid="remote-control-status"
    >
      <div class="remote-control__status-pills">
        <span class="pill pill--info">
          <span class="pdot"></span>
          {{ modeLabel() }}
        </span>
        <span
          class="pill"
          [class.pill--ok]="adsVisible()"
          [class.pill--muted]="!adsVisible()"
        >
          <span class="pdot"></span>
          Anuncios {{ adsLabel() }}
        </span>
        <span
          class="pill"
          [class.pill--ok]="fullscreenRequested()"
          [class.pill--muted]="!fullscreenRequested()"
        >
          <span class="pdot"></span>
          Pantalla completa {{ fullscreenLabel() }}
        </span>
        <span
          class="pill"
          [class.pill--ok]="displayOnline()"
          [class.pill--warn]="displayOnline() === false"
          [class.pill--muted]="displayOnline() === null"
        >
          <span class="pdot"></span>
          {{ displayLabel() }}
        </span>
      </div>
      <span class="remote-control__status-updated mono">
        Actualizado {{ updatedLabel() }}{{ savingSuffix() }}
      </span>
    </div>
  `,
  styles: [
    `
      .remote-control__status {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .remote-control__status-pills {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .remote-control__status-updated {
        margin-left: auto;
        color: var(--app-text-dim);
        font-size: 12px;
      }
      @media (max-width: 599.98px) {
        .remote-control__status-updated {
          margin-left: 0;
          width: 100%;
        }
      }
    `
  ]
})
export class RemoteStatusStripComponent {
  readonly modeIcon = input.required<string>();
  readonly modeLabel = input.required<string>();
  readonly adsVisible = input.required<boolean>();
  readonly adsIcon = input.required<string>();
  readonly adsLabel = input.required<string>();
  readonly fullscreenRequested = input.required<boolean>();
  readonly fullscreenIcon = input.required<string>();
  readonly fullscreenLabel = input.required<string>();
  readonly displayOnline = input.required<boolean | null>();
  readonly displayLabel = input.required<string>();
  readonly updatedLabel = input.required<string>();
  readonly savingSuffix = input.required<string>();
}
