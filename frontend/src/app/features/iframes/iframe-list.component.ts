import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

import { DisplayScaleEntry, IframeItem } from '../../core/api/iframe.api';
import { AdminListComponent } from '../../shared/ui/admin/admin-list.component';
import { ConfirmDialogService } from '../../shared/ui/confirm-dialog/confirm-dialog.service';
import { ADMIN_COPY } from '../../shared/ui/admin/admin-copy';
import { IframeFacade } from './iframe.facade';

@Component({
  selector: 'app-iframe-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCardModule,
    MatChipsModule,
    AdminListComponent
  ],
  template: `
    <app-admin-list
      title="Iframes"
      description="Vistas web preconfiguradas para fijar desde el control remoto."
      [loading]="facade.loading()"
      [error]="facade.error()"
      [empty]="facade.empty()"
      errorTitle="Iframes no disponibles"
      emptyTitle="Sin iframes"
      emptyMessage="Crea una URL de iframe para usarla en control remoto."
      emptyActionLabel="Nuevo iframe"
      emptyActionRoute="/admin/iframes/new"
      emptyIcon="web_asset"
      [primaryAction]="primaryAction"
      [refreshAction]="refreshAction"
    >
      <ng-template #adminListTable>
        <table mat-table [dataSource]="facade.iframes()" [trackBy]="trackById" class="app-table" aria-label="Iframes">
          <ng-container matColumnDef="url">
            <th mat-header-cell *matHeaderCellDef>URL</th>
            <td mat-cell *matCellDef="let iframe" [title]="iframe.url">{{ iframe.url }}</td>
          </ng-container>
          <ng-container matColumnDef="scales">
            <th mat-header-cell *matHeaderCellDef>Escalas por pantalla</th>
            <td mat-cell *matCellDef="let iframe">
              @if (scaleSummary(iframe).length === 0) {
                <span class="iframe-list__no-scales">Sin pantallas registradas</span>
              } @else {
                <ul class="iframe-list__scale-summary">
                  @for (entry of scaleSummary(iframe); track entry.displayDeviceId) {
                    <li>
                      <span class="iframe-list__label">{{ entry.displayLabel }}</span>
                      <span class="iframe-list__scale">{{ entry.scaleX }}×{{ entry.scaleY }}</span>
                      <mat-chip-set aria-label="Fuente de escala">
                        <mat-chip [highlighted]="entry.source === 'override'">
                          {{ entry.source === 'override' ? 'personalizada' : 'predeterminada' }}
                        </mat-chip>
                        @if (entry.connected) {
                          <mat-chip color="primary">conectada</mat-chip>
                        }
                      </mat-chip-set>
                    </li>
                  }
                </ul>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let iframe">
              <a
                mat-button
                color="primary"
                [routerLink]="['/admin/iframes', iframe.id]"
                [attr.aria-label]="'Editar iframe'"
              >
                <mat-icon aria-hidden="true">edit</mat-icon>
                {{ ADMIN_COPY.edit }}
              </a>
              <button mat-button color="warn" type="button" (click)="delete(iframe)" [attr.aria-label]="'Eliminar iframe'">
                <mat-icon aria-hidden="true">delete</mat-icon>
                {{ ADMIN_COPY.delete }}
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </ng-template>

      <ng-template #adminListCards>
        @for (iframe of facade.iframes(); track iframe.id) {
          <mat-card appearance="outlined" class="iframe-list__card">
            <mat-card-content>
              <p class="iframe-list__url">{{ iframe.url }}</p>
              @for (entry of scaleSummary(iframe); track entry.displayDeviceId) {
                <p class="iframe-list__card-scale">
                  {{ entry.displayLabel }}: {{ entry.scaleX }}×{{ entry.scaleY }}
                  ({{ entry.source === 'override' ? 'personalizada' : 'predeterminada' }})
                </p>
              }
            </mat-card-content>
            <mat-card-actions class="app-card-actions">
              <a mat-button color="primary" [routerLink]="['/admin/iframes', iframe.id]">
                <mat-icon aria-hidden="true">edit</mat-icon>
                {{ ADMIN_COPY.edit }}
              </a>
              <button mat-button color="warn" type="button" (click)="delete(iframe)">
                <mat-icon aria-hidden="true">delete</mat-icon>
                {{ ADMIN_COPY.delete }}
              </button>
            </mat-card-actions>
          </mat-card>
        }
      </ng-template>
    </app-admin-list>
  `,
  styles: [
    `
      .iframe-list__card {
        background: var(--mat-sys-surface);
      }
      .iframe-list__url {
        margin: 0;
        word-break: break-all;
        font: var(--mat-sys-body-medium);
        color: var(--mat-sys-on-surface);
      }
      .iframe-list__scale-summary {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.35rem;
      }
      .iframe-list__scale-summary li {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.35rem 0.5rem;
      }
      .iframe-list__label {
        font-weight: 600;
      }
      .iframe-list__scale {
        font-variant-numeric: tabular-nums;
      }
      .iframe-list__no-scales,
      .iframe-list__card-scale {
        margin: 0;
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-small);
      }
    `
  ]
})
export class IframeListComponent implements OnInit {
  protected readonly ADMIN_COPY = ADMIN_COPY;
  protected readonly facade = inject(IframeFacade);
  private readonly confirm = inject(ConfirmDialogService);
  protected readonly displayedColumns = ['url', 'scales', 'actions'];
  protected readonly primaryAction = { route: '/admin/iframes/new', label: 'Nuevo iframe', icon: 'add' };
  protected readonly refreshAction = { route: '/admin/iframes', label: ADMIN_COPY.refresh };

  ngOnInit(): void {
    this.facade.refresh().subscribe();
  }

  protected trackById(_index: number, item: IframeItem): string {
    return item.id;
  }

  protected scaleSummary(iframe: IframeItem): DisplayScaleEntry[] {
    return iframe.displayScales ?? [];
  }

  protected delete(iframe: IframeItem): void {
    this.confirm
      .confirm({
        title: 'Eliminar iframe',
        message: `¿Eliminar ${iframe.url}?`,
        confirmLabel: ADMIN_COPY.delete,
        cancelLabel: ADMIN_COPY.cancel,
        destructive: true
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.facade.delete(iframe.id).subscribe();
        }
      });
  }
}
