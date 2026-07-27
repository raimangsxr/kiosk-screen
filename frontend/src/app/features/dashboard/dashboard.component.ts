import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AdminStateComponent } from '../../shared/admin-state.component';
import { DashboardFacade } from './dashboard.facade';
import {
  ActivitySeverity,
  ContentQueueEntry,
  OperationsDashboardState,
  ReadinessSlice
} from './dashboard.models';
import { adsLabel, modeLabel, relativeTime } from '../../shared/util/remote-control-labels';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, MatProgressBarModule, AdminStateComponent],
  template: `
    <header class="pagehead">
      <div>
        <p class="eyebrow">Operación</p>
        <h1>Panel</h1>
        <p class="pagehead__desc">
          Centro de operaciones del quiosco: preparación, estado en vivo, cola de reproducción y actividad reciente.
        </p>
      </div>
      <div class="pagehead__actions">
        <button class="btn btn--ghost" type="button" (click)="refresh()" [disabled]="loading()">
          <mat-icon aria-hidden="true">refresh</mat-icon> Actualizar
        </button>
        <a class="btn btn--primary" routerLink="/display">
          <mat-icon aria-hidden="true">play_arrow</mat-icon> Abrir quiosco
        </a>
      </div>
    </header>

    @if (loading() && !state()) {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando panel" />
    }

    @if (allSectionsFailed()) {
      <app-admin-state
        kind="error"
        title="Panel no disponible"
        message="No se pudo cargar ninguna sección del panel. Comprueba la conexión e inténtalo de nuevo."
      />
    }

    @if (state(); as s) {
      <!-- KPI tiles -->
      <div class="stats">
        <div class="app-card stat">
          <div class="stat__top">
            <span class="eyebrow">Estado</span>
            <span class="stat__ico" [class]="'stat__ico--' + readinessKind(s.readiness)">
              <mat-icon aria-hidden="true">{{ readinessIcon(s.readiness) }}</mat-icon>
            </span>
          </div>
          <div class="stat__value stat__value--sm">{{ readinessLabel(s.readiness) }}</div>
          <div class="stat__sub">{{ readinessSub(s.readiness) }}</div>
        </div>

        <div class="app-card stat">
          <div class="stat__top">
            <span class="eyebrow">Pantallas conectadas</span>
            <span class="stat__ico"><mat-icon aria-hidden="true">connected_tv</mat-icon></span>
          </div>
          <div class="stat__value">{{ s.liveKiosks?.items?.length ?? '—' }}</div>
          <div class="stat__sub">{{ kioskSub(s) }}</div>
        </div>

        <div class="app-card stat">
          <div class="stat__top">
            <span class="eyebrow">Contenido activo</span>
            <span class="stat__ico"><mat-icon aria-hidden="true">photo_library</mat-icon></span>
          </div>
          <div class="stat__value">{{ s.queue?.activeContentCount ?? '—' }}</div>
          <div class="stat__sub">elementos en rotación</div>
        </div>

        <div class="app-card stat">
          <div class="stat__top">
            <span class="eyebrow">Modo actual</span>
            <span class="stat__ico"><mat-icon aria-hidden="true">cast_connected</mat-icon></span>
          </div>
          <div class="stat__value stat__value--sm">{{ s.live ? modeLabel(s.live.contentMode) : '—' }}</div>
          <div class="stat__sub">{{ s.live ? 'Anuncios ' + adsLabel(s.live.adsVisible).toLowerCase() : 'sin datos' }}</div>
        </div>
      </div>

      <div class="grid-2">
        <!-- Live display -->
        <div class="app-card livecard">
          <div class="app-card__head">
            <h2>Display en vivo</h2>
            @if (s.live?.displaySessionActive) {
              <span class="onair"><span class="onair__dot"></span>En emisión</span>
            } @else {
              <span class="pill pill--muted"><span class="pdot"></span>Sin sesión</span>
            }
          </div>
          <div class="app-card__body">
            @if (isLiveDegraded()) {
              <app-admin-state kind="error" title="Estado en vivo no disponible" message="No se pudo cargar el estado del display." />
              <button class="btn btn--ghost" type="button" (click)="retryLive()" style="margin-top:12px">
                <mat-icon aria-hidden="true">refresh</mat-icon> Reintentar
              </button>
            } @else if (s.live; as live) {
              <p class="livecard__hint">Estado del quiosco en directo y acceso al control.</p>
              <div class="statusgrid">
                <div class="statusgrid__cell">
                  <span class="eyebrow">Modo</span>
                  <b>{{ modeLabel(live.contentMode) }}</b>
                </div>
                <div class="statusgrid__cell">
                  <span class="eyebrow">Anuncios</span>
                  <span class="pill" [class.pill--ok]="live.adsVisible" [class.pill--muted]="!live.adsVisible">
                    <span class="pdot"></span>{{ adsLabel(live.adsVisible) }}
                  </span>
                </div>
                <div class="statusgrid__cell">
                  <span class="eyebrow">Pantallas</span>
                  <b>{{ s.liveKiosks?.items?.length ?? 0 }}</b>
                </div>
                <div class="statusgrid__cell">
                  <span class="eyebrow">Actualizado</span>
                  <b class="mono">{{ relativeTime(live.updatedAt) }}</b>
                </div>
                @if (live.contentMode === 'fixed') {
                  <div class="statusgrid__cell statusgrid__cell--wide">
                    <span class="eyebrow">Contenido fijo</span>
                    @if (live.pinnedContentUnresolved) {
                      <b class="livecard__unresolved">Contenido no disponible</b>
                    } @else {
                      <b>{{ live.pinnedContentTitle ?? '—' }}</b>
                    }
                  </div>
                }
              </div>
              <div class="livecard__cta">
                <a class="btn btn--primary" routerLink="/display"><mat-icon aria-hidden="true">open_in_new</mat-icon> Abrir display</a>
                <a class="btn btn--ghost" routerLink="/admin/remote-control"><mat-icon aria-hidden="true">settings_remote</mat-icon> Control remoto</a>
              </div>
            }
          </div>
        </div>

        <!-- Preparación -->
        <div class="app-card">
          <div class="app-card__head">
            <h2>Preparación</h2>
            <span class="pill" [class]="'pill--' + readinessKind(s.readiness)"><span class="pdot"></span>{{ readinessLabel(s.readiness) }}</span>
          </div>
          <div class="app-card__body">
            @if (isReadinessDegraded()) {
              <app-admin-state kind="error" title="Comprobación no disponible" message="No se pudo cargar el estado de preparación." actionLabel="Reintentar" actionRoute="/admin/readiness" />
            } @else if (s.readiness; as r) {
              @if (r.blockers.length === 0 && r.warnings.length === 0) {
                <div class="readiness__ok">
                  <mat-icon aria-hidden="true">check_circle</mat-icon>
                  <p>Todo listo para abrir el quiosco. Sin bloqueos ni advertencias.</p>
                </div>
              } @else {
                <div class="readiness">
                  @for (b of r.blockers; track b.message) {
                    <div class="ritem ritem--crit">
                      <mat-icon aria-hidden="true" class="ritem__ico ritem__ico--crit">error</mat-icon>
                      <p>{{ b.message }}</p>
                      <a class="btn btn--ghost btn--sm" [routerLink]="b.resolveRoute">Resolver</a>
                    </div>
                  }
                  @for (w of r.warnings; track w.message) {
                    <div class="ritem ritem--warn">
                      <mat-icon aria-hidden="true" class="ritem__ico ritem__ico--warn">warning</mat-icon>
                      <p>{{ w.message }}</p>
                      <a class="btn btn--ghost btn--sm" [routerLink]="w.resolveRoute">Revisar</a>
                    </div>
                  }
                </div>
              }
            }
          </div>
        </div>
      </div>

      <div class="grid-2">
        <!-- Cola -->
        <div class="app-card">
          <div class="app-card__head"><h2>Cola de reproducción</h2><span class="eyebrow">Orden activo</span></div>
          <div class="app-card__body">
            @if (isQueueDegraded()) {
              <app-admin-state kind="error" title="Cola no disponible" message="No se pudo cargar el contenido activo." />
            } @else if (s.queue && s.queue.entries.length > 0) {
              <ol class="qlist">
                @for (entry of s.queue.entries; track entry.id; let i = $index) {
                  <li class="qrow" [class.qrow--pinned]="entry.isPinnedNow">
                    <span class="qnum mono">{{ pad(i + 1) }}</span>
                    <span class="qmain">
                      <b>{{ entry.title }}</b>
                      <span>{{ kindLabel(entry) }}</span>
                    </span>
                    @if (entry.isPinnedNow) {
                      <span class="pill pill--info"><span class="pdot"></span>En emisión</span>
                    }
                  </li>
                }
              </ol>
            } @else {
              <app-admin-state kind="empty" title="Sin contenido activo" message="No hay elementos activos en la cola de reproducción." />
            }
          </div>
        </div>

        <!-- Actividad -->
        <div class="app-card">
          <div class="app-card__head"><h2>Actividad reciente</h2></div>
          <div class="app-card__body">
            @if (isActivityDegraded()) {
              <app-admin-state kind="error" title="Actividad no disponible" message="No se pudieron cargar los eventos recientes." />
            } @else if (s.activity && s.activity.items.length > 0) {
              <ul class="alist">
                @for (item of s.activity.items; track item.id) {
                  <li class="arow">
                    <span class="astripe" [class]="'astripe--' + severityKind(item.severity)"></span>
                    <p>{{ item.message }}</p>
                    <time class="mono">{{ relativeTime(item.createdAt) }}</time>
                  </li>
                }
              </ul>
            } @else {
              <app-admin-state kind="empty" title="Sin actividad" message="Aún no hay eventos registrados en el display." />
            }
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  private readonly facade = inject(DashboardFacade);

  protected readonly state = signal<OperationsDashboardState | null>(null);
  protected readonly loading = signal(false);

  protected readonly modeLabel = modeLabel;
  protected readonly adsLabel = adsLabel;
  protected readonly relativeTime = relativeTime;

  protected readonly allSectionsFailed = computed(() => {
    const s = this.state();
    if (!s) {
      return false;
    }
    return !s.readiness && !s.live && !s.queue && !s.activity;
  });

  ngOnInit(): void {
    this.refresh();
  }

  protected refresh(): void {
    this.loading.set(true);
    this.facade.load().subscribe({
      next: (next) => {
        this.state.set(next);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  protected retryLive(): void {
    const current = this.state();
    if (!current) {
      return;
    }
    this.facade.reloadLive(current).subscribe({ next: (next) => this.state.set(next) });
  }

  protected pad(n: number): string {
    return n < 10 ? '0' + n : String(n);
  }

  protected kindLabel(entry: ContentQueueEntry): string {
    if (entry.kind === 'recurring' && entry.recurringEveryXIterations) {
      return `Recurrente ×${entry.recurringEveryXIterations}`;
    }
    if (entry.kind === 'fixed-eligible') {
      return 'Fijo elegible';
    }
    return 'Regular';
  }

  protected readinessLabel(r: ReadinessSlice | null): string {
    if (!r) {
      return 'Sin datos';
    }
    if (r.blockers.length > 0) {
      return 'Bloqueado';
    }
    if (r.warnings.length > 0) {
      return 'Acción recomendada';
    }
    return r.ready ? 'Listo' : 'Acción recomendada';
  }

  protected readinessKind(r: ReadinessSlice | null): 'ok' | 'warn' | 'crit' | 'muted' {
    if (!r) {
      return 'muted';
    }
    if (r.blockers.length > 0) {
      return 'crit';
    }
    if (r.warnings.length > 0 || !r.ready) {
      return 'warn';
    }
    return 'ok';
  }

  protected readinessIcon(r: ReadinessSlice | null): string {
    const kind = this.readinessKind(r);
    if (kind === 'crit') {
      return 'error';
    }
    if (kind === 'warn') {
      return 'warning';
    }
    if (kind === 'ok') {
      return 'check_circle';
    }
    return 'help';
  }

  protected readinessSub(r: ReadinessSlice | null): string {
    if (!r) {
      return 'sin datos';
    }
    const b = r.blockers.length;
    const w = r.warnings.length;
    if (b === 0 && w === 0) {
      return 'sin incidencias';
    }
    const parts: string[] = [];
    if (b > 0) {
      parts.push(`${b} bloqueo${b === 1 ? '' : 's'}`);
    }
    if (w > 0) {
      parts.push(`${w} advertencia${w === 1 ? '' : 's'}`);
    }
    return parts.join(' · ');
  }

  protected kioskSub(s: OperationsDashboardState): string {
    const items = s.liveKiosks?.items ?? [];
    if (items.length === 0) {
      return 'ninguna en línea';
    }
    return items.map((k) => k.displayLabel ?? 'Sin etiqueta').slice(0, 2).join(' · ');
  }

  protected severityKind(severity: ActivitySeverity): 'ok' | 'warn' | 'crit' | 'info' {
    if (severity === 'error') {
      return 'crit';
    }
    if (severity === 'warning') {
      return 'warn';
    }
    return 'info';
  }

  protected isReadinessDegraded(): boolean {
    const s = this.state();
    return Boolean(s && !s.readiness && s.degradedSections.includes('Comprobación'));
  }
  protected isLiveDegraded(): boolean {
    const s = this.state();
    return Boolean(s && !s.live && s.degradedSections.includes('Estado en vivo'));
  }
  protected isQueueDegraded(): boolean {
    const s = this.state();
    return Boolean(s && !s.queue && s.degradedSections.includes('Contenido'));
  }
  protected isActivityDegraded(): boolean {
    const s = this.state();
    return Boolean(s && !s.activity && s.degradedSections.includes('Actividad'));
  }
}
