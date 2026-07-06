import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';

import { ReadinessFacade } from './readiness.facade';
import { AdminPageComponent } from '../../shared/ui/admin/admin-page.component';
import { AdminStateComponent } from '../../shared/admin-state.component';

@Component({
  selector: 'app-readiness',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatDividerModule,
    AdminPageComponent,
    AdminStateComponent
  ],
  template: `
    <app-admin-page
      title="Comprobación"
      description="Verifica que la configuración del quiosco esté completa antes del evento."
    />

    <mat-card appearance="outlined" class="readiness__card">
      <mat-card-content>
        @if (facade.loading()) {
          <mat-progress-bar mode="indeterminate" aria-label="Cargando comprobación" />
        }
        @if (facade.error(); as error) {
          <app-admin-state
            kind="error"
            title="Comprobación no disponible"
            [message]="error.message"
          />
        }

        @if (facade.ready()) {
          <div class="readiness__ready">
            <span class="readiness__pill readiness__pill--ready">Listo para abrir el quiosco</span>
            <p>Todos los requisitos están completos. Puedes abrir el modo quiosco desde el hall.</p>
          </div>
        }

        @if (facade.blocked()) {
          <div class="readiness__blocked">
            <span class="readiness__pill readiness__pill--blocked">Bloqueado</span>
            <p>Resuelve cada bloqueo antes de abrir el modo quiosco.</p>
          </div>
        }

        @if (facade.blockers().length > 0) {
          <h3>Bloqueos</h3>
          <ul class="readiness__list">
            @for (blocker of facade.blockers(); track blocker) {
              <li class="admin-stack">
                <span class="readiness__message">{{ blocker }}</span>
                <a mat-stroked-button color="primary" [routerLink]="resolveRoute(blocker)">
                  <mat-icon aria-hidden="true">arrow_forward</mat-icon>
                  Resolver
                </a>
              </li>
            }
          </ul>
        }

        @if (facade.warnings().length > 0) {
          <mat-divider />
          <h3>Advertencias</h3>
          <ul class="readiness__list">
            @for (warning of facade.warnings(); track warning) {
              <li class="admin-stack">
                <span class="readiness__message">{{ warning }}</span>
                <a mat-stroked-button [routerLink]="resolveRoute(warning)">
                  <mat-icon aria-hidden="true">arrow_forward</mat-icon>
                  Revisar
                </a>
              </li>
            }
          </ul>
        }

        @if (!facade.loading() && !facade.error() && !facade.report()) {
          <app-admin-state
            kind="empty"
            title="Sin comprobación"
            message="La comprobación aún no se ha ejecutado."
          />
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      .readiness__card {
        margin-top: 16px;
      }
      .readiness__ready,
      .readiness__blocked {
        margin-bottom: 16px;
      }
      .readiness__pill {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 999px;
        font: var(--mat-sys-label-medium);
        font-weight: 600;
        margin-bottom: 8px;
      }
      .readiness__pill--ready {
        background: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container);
      }
      .readiness__pill--blocked {
        background: var(--mat-sys-error-container);
        color: var(--mat-sys-on-error-container);
      }
      .readiness__list {
        list-style: none;
        padding: 0;
        margin: 8px 0;
      }
      .readiness__list li {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px;
        border: 1px solid var(--mat-sys-outline-variant);
        border-radius: var(--mat-sys-corner-medium);
        margin-bottom: 8px;
        background: var(--mat-sys-surface);
      }
      .readiness__message {
        flex: 1;
      }
      .readiness__list a {
        min-height: var(--app-touch-target);
      }
      h3 {
        font: var(--mat-sys-title-small);
        color: var(--mat-sys-on-surface-variant);
        text-transform: uppercase;
        margin: 16px 0 8px;
      }
    `
  ]
})
export class ReadinessComponent implements OnInit {
  protected readonly facade = inject(ReadinessFacade);

  ngOnInit(): void {
    this.facade.refresh().subscribe();
  }

  resolveRoute(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('user') || lower.includes('rol') || lower.includes('usuario')) {
      return '/admin/users';
    }
    if (lower.includes('content') || lower.includes('contenido')) {
      return '/admin/content';
    }
    if (lower.includes('anuncio') || /\bad(s)?\b/.test(lower)) {
      return '/admin/ads';
    }
    if (lower.includes('iframe') || lower.includes('embedded')) {
      return '/admin/iframes';
    }
    if (lower.includes('configuration') || lower.includes('display') || lower.includes('pantalla')) {
      return '/admin/configuration';
    }
    if (lower.includes('event') || lower.includes('evento')) {
      return '/admin/event';
    }
    return '/admin';
  }
}
