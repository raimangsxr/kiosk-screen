import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-admin-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatToolbarModule, MatButtonModule, MatIconModule],
  template: `
    <mat-toolbar class="admin-toolbar">
      @if (showMenu()) {
        <button
          mat-icon-button
          type="button"
          (click)="menuToggled.emit()"
          aria-label="Open navigation"
        >
          <mat-icon aria-hidden="true">menu</mat-icon>
        </button>
      }
      <span class="admin-toolbar__title">{{ title() }}</span>
      <span class="admin-toolbar__spacer"></span>
      <ng-content />
    </mat-toolbar>
  `,
  styles: [
    `
      :host {
        display: block;
        position: sticky;
        top: 0;
        z-index: 10;
      }
      .admin-toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: var(--app-touch-target);
        background: var(--mat-sys-surface-container);
        color: var(--mat-sys-on-surface);
        border-bottom: 1px solid var(--mat-sys-outline-variant);
      }
      .admin-toolbar__title {
        font: var(--mat-sys-title-medium);
        letter-spacing: var(--mat-sys-title-medium-tracking);
      }
      .admin-toolbar__spacer {
        flex: 1;
      }
    `
  ]
})
export class AdminToolbarComponent {
  readonly title = input<string>('Administration');
  readonly showMenu = input<boolean>(false);
  readonly menuToggled = output<void>();
}
