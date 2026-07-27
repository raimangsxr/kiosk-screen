import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type RemoteNavigationCommand = 'next' | 'previous' | 'pause' | 'resume';

@Component({
  selector: 'app-remote-navigation-controls',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="remote-control__navigation" role="group" aria-label="Navegación de rotación">
      <button
        type="button"
        class="btn btn--ghost"
        [disabled]="saving()"
        (click)="command.emit('previous')"
        data-testid="remote-control-previous"
        aria-label="Contenido anterior"
      >
        <mat-icon aria-hidden="true">skip_previous</mat-icon>
        Anterior
      </button>
      <button
        type="button"
        class="btn btn--ghost"
        [disabled]="saving() || isPaused()"
        (click)="command.emit('pause')"
        data-testid="remote-control-pause"
        aria-label="Pausar rotación"
      >
        <mat-icon aria-hidden="true">pause</mat-icon>
        Pausar
      </button>
      <button
        type="button"
        class="btn btn--ghost"
        [disabled]="saving() || !isPaused()"
        (click)="command.emit('resume')"
        data-testid="remote-control-resume"
        aria-label="Reanudar rotación"
      >
        <mat-icon aria-hidden="true">play_arrow</mat-icon>
        Reanudar
      </button>
      <button
        type="button"
        class="btn btn--primary remote-control__navigation-next"
        [disabled]="saving()"
        (click)="command.emit('next')"
        data-testid="remote-control-next"
        aria-label="Contenido siguiente"
      >
        <mat-icon aria-hidden="true">skip_next</mat-icon>
        Siguiente
      </button>
    </div>
  `,
  styles: [
    `
      .remote-control__navigation {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 16px;
      }
      .remote-control__navigation .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .remote-control__navigation-next {
        margin-left: auto;
      }
      @media (max-width: 599.98px) {
        .remote-control__navigation-next {
          margin-left: 0;
        }
      }
    `
  ]
})
export class RemoteNavigationControlsComponent {
  readonly saving = input.required<boolean>();
  readonly isPaused = input.required<boolean>();
  readonly command = output<RemoteNavigationCommand>();
}
