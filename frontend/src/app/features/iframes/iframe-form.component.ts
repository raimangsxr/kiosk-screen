import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { DisplayScaleEntry } from '../../core/api/iframe.api';
import { DirtyFormAware } from '../../shared/dirty-form.models';
import { ConfirmDialogService } from '../../shared/ui/confirm-dialog/confirm-dialog.service';
import { ADMIN_COPY } from '../../shared/ui/admin/admin-copy';

import { IframeFacade } from './iframe.facade';

interface ScaleRowDraft {
  displayDeviceId: string;
  displayLabel: string;
  connected: boolean;
  scaleX: number;
  scaleY: number;
  source: 'override' | 'default';
  dirty: boolean;
  cleared: boolean;
}

@Component({
  selector: 'app-iframe-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  template: `
    <section class="admin-form-page">
      <header>
        <h1>{{ iframeId ? 'Editar iframe' : 'Nuevo iframe' }}</h1>
      </header>
      <form [formGroup]="form" (ngSubmit)="submit()" class="admin-form">
        <mat-form-field appearance="outline">
          <mat-label>URL</mat-label>
          <input matInput formControlName="url" autocomplete="off" />
          @if (form.controls.url.hasError('required')) {
            <mat-error>La URL es obligatoria.</mat-error>
          }
          @if (form.controls.url.hasError('pattern')) {
            <mat-error>Introduce una URL http(s) válida.</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Escala X (predeterminada)</mat-label>
          <input matInput type="number" formControlName="scaleX" min="0.1" max="5" step="0.05" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Escala Y (predeterminada)</mat-label>
          <input matInput type="number" formControlName="scaleY" min="0.1" max="5" step="0.05" />
        </mat-form-field>
        @if (facade.error(); as error) {
          <p class="admin-form__error">{{ error.message }}</p>
        }
        <div class="admin-form__actions">
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || facade.saving()">
            Guardar iframe
          </button>
          <a mat-button routerLink="/admin/iframes">Cancelar</a>
        </div>
      </form>

      @if (iframeId) {
        <section class="iframe-form__matrix" aria-labelledby="iframe-scale-matrix-title">
          <header class="iframe-form__matrix-header">
            <h2 id="iframe-scale-matrix-title">Escala por pantalla</h2>
            <div class="iframe-form__matrix-actions">
              <mat-form-field appearance="outline" class="iframe-form__precreate">
                <mat-label>Nueva pantalla</mat-label>
                <input matInput [formControl]="newDeviceLabel" autocomplete="off" />
              </mat-form-field>
              <button
                mat-stroked-button
                type="button"
                [disabled]="!newDeviceLabel.value.trim() || facade.scalesSaving()"
                (click)="precreateDevice()"
              >
                Añadir pantalla
              </button>
            </div>
          </header>

          @if (scaleRows.length === 0) {
            <p class="iframe-form__empty">No hay pantallas registradas. Añade una o conecta un kiosk con etiqueta.</p>
          } @else {
            <div class="iframe-form__rows">
              @for (row of scaleRows; track row.displayDeviceId) {
                <div class="iframe-form__row">
                  <div class="iframe-form__row-label">
                    <strong>{{ row.displayLabel }}</strong>
                    <mat-chip-set>
                      <mat-chip [highlighted]="row.source === 'override' && !row.cleared">
                        {{ row.cleared || row.source === 'default' ? 'predeterminada' : 'personalizada' }}
                      </mat-chip>
                      @if (row.connected) {
                        <mat-chip color="primary">conectada</mat-chip>
                      }
                    </mat-chip-set>
                  </div>
                  <mat-form-field appearance="outline">
                    <mat-label>Escala X</mat-label>
                    <input
                      matInput
                      type="number"
                      min="0.1"
                      max="5"
                      step="0.05"
                      [value]="row.scaleX"
                      (input)="updateRowScale(row.displayDeviceId, 'scaleX', $event)"
                    />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Escala Y</mat-label>
                    <input
                      matInput
                      type="number"
                      min="0.1"
                      max="5"
                      step="0.05"
                      [value]="row.scaleY"
                      (input)="updateRowScale(row.displayDeviceId, 'scaleY', $event)"
                    />
                  </mat-form-field>
                  <button mat-button type="button" (click)="clearRow(row.displayDeviceId)">Restablecer</button>
                  <button
                    mat-button
                    color="warn"
                    type="button"
                    [disabled]="facade.scalesSaving()"
                    (click)="deleteDevice(row)"
                    [attr.aria-label]="'Eliminar pantalla ' + row.displayLabel"
                  >
                    <mat-icon aria-hidden="true">delete</mat-icon>
                    Eliminar
                  </button>
                </div>
              }
            </div>
            <div class="admin-form__actions">
              <button
                mat-flat-button
                color="primary"
                type="button"
                [disabled]="!hasScaleChanges() || facade.scalesSaving()"
                (click)="saveScales()"
              >
                Guardar escalas por pantalla
              </button>
            </div>
          }
        </section>
      }
    </section>
  `,
  styles: [
    `
      .iframe-form__matrix {
        margin-top: 2rem;
        display: grid;
        gap: 1rem;
      }
      .iframe-form__matrix-header {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 1rem;
        align-items: end;
      }
      .iframe-form__matrix-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
      }
      .iframe-form__precreate {
        min-width: 12rem;
      }
      .iframe-form__rows {
        display: grid;
        gap: 1rem;
      }
      .iframe-form__row {
        display: grid;
        gap: 0.75rem;
        grid-template-columns: minmax(10rem, 1.5fr) repeat(2, minmax(6rem, 1fr)) auto auto;
        align-items: center;
      }
      .iframe-form__row-label {
        display: grid;
        gap: 0.35rem;
      }
      .iframe-form__empty {
        margin: 0;
        color: var(--mat-sys-on-surface-variant);
      }
      @media (max-width: 900px) {
        .iframe-form__row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class IframeFormComponent implements OnInit, DirtyFormAware {
  protected readonly ADMIN_COPY = ADMIN_COPY;
  protected readonly facade = inject(IframeFacade);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected iframeId: string | null = null;
  private initialSnapshot = '';
  protected scaleRows: ScaleRowDraft[] = [];
  protected readonly newDeviceLabel = this.fb.nonNullable.control('');

  protected readonly form = this.fb.nonNullable.group({
    url: ['', [Validators.required, Validators.pattern(/^https?:\/\/\S+$/)]],
    scaleX: [1, [Validators.required, Validators.min(0.1), Validators.max(5)]],
    scaleY: [1, [Validators.required, Validators.min(0.1), Validators.max(5)]],
  });

  ngOnInit(): void {
    this.iframeId = this.route.snapshot.paramMap.get('id');
    this.facade.clearCurrent();
    this.initialSnapshot = this.snapshot();
    if (this.iframeId) {
      this.facade.load(this.iframeId).subscribe((item) => {
        this.form.patchValue({ url: item.url, scaleX: item.scaleX, scaleY: item.scaleY });
        this.syncScaleRows(item.displayScales ?? []);
        this.initialSnapshot = this.snapshot();
      });
    }
  }

  hasUnsavedChanges(): boolean {
    if (this.facade.saving() || this.facade.scalesSaving()) {
      return false;
    }
    return this.snapshot() !== this.initialSnapshot || this.hasScaleChanges();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.facade.save({
      url: this.form.controls.url.value.trim(),
      scaleX: this.form.controls.scaleX.value,
      scaleY: this.form.controls.scaleY.value,
    }, this.iframeId ?? undefined).subscribe(() => {
      this.markPristine();
      void this.router.navigate(['/admin/iframes']);
    });
  }

  protected precreateDevice(): void {
    const label = this.newDeviceLabel.value.trim();
    if (!label) {
      return;
    }
    this.facade.precreateDisplayDevice(label).subscribe((item) => {
      this.newDeviceLabel.setValue('');
      const scales = 'displayScales' in item ? item.displayScales ?? [] : this.facade.displayScales();
      this.syncScaleRows(scales);
      this.cdr.markForCheck();
    });
  }

  protected updateRowScale(displayDeviceId: string, field: 'scaleX' | 'scaleY', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.scaleRows = this.scaleRows.map((row) => {
      if (row.displayDeviceId !== displayDeviceId) {
        return row;
      }
      return {
        ...row,
        [field]: value,
        dirty: true,
        cleared: false,
      };
    });
  }

  protected deleteDevice(row: ScaleRowDraft): void {
    this.confirm
      .confirm({
        title: 'Eliminar pantalla',
        message: `¿Eliminar "${row.displayLabel}"? Se borrarán también sus escalas personalizadas para todos los iframes.`,
        confirmLabel: ADMIN_COPY.delete,
        cancelLabel: ADMIN_COPY.cancel,
        destructive: true,
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.facade.deleteDisplayDevice(row.displayDeviceId).subscribe((item) => {
          const scales = 'displayScales' in item ? item.displayScales ?? [] : this.facade.displayScales();
          this.syncScaleRows(scales);
          this.cdr.markForCheck();
        });
      });
  }

  protected clearRow(displayDeviceId: string): void {
    const defaults = {
      scaleX: this.form.controls.scaleX.value,
      scaleY: this.form.controls.scaleY.value,
    };
    this.scaleRows = this.scaleRows.map((row) => {
      if (row.displayDeviceId !== displayDeviceId) {
        return row;
      }
      return {
        ...row,
        ...defaults,
        dirty: true,
        cleared: true,
      };
    });
  }

  protected hasScaleChanges(): boolean {
    return this.scaleRows.some((row) => row.dirty);
  }

  protected saveScales(): void {
    if (!this.iframeId) {
      return;
    }
    const items = this.scaleRows
      .filter((row) => row.dirty)
      .map((row) =>
        row.cleared
          ? { displayDeviceId: row.displayDeviceId, clear: true }
          : {
              displayDeviceId: row.displayDeviceId,
              scaleX: row.scaleX,
              scaleY: row.scaleY,
            },
      );
    if (items.length === 0) {
      return;
    }
    this.facade.saveDisplayScales(this.iframeId, items).subscribe((response) => {
      this.syncScaleRows(response.displayScales);
    });
  }

  private syncScaleRows(entries: readonly DisplayScaleEntry[]): void {
    this.scaleRows = entries.map((entry) => ({
      displayDeviceId: entry.displayDeviceId,
      displayLabel: entry.displayLabel,
      connected: entry.connected,
      scaleX: entry.scaleX,
      scaleY: entry.scaleY,
      source: entry.source,
      dirty: false,
      cleared: false,
    }));
  }

  private snapshot(): string {
    return JSON.stringify({
      url: this.form.controls.url.value,
      scaleX: this.form.controls.scaleX.value,
      scaleY: this.form.controls.scaleY.value,
    });
  }

  private markPristine(): void {
    this.initialSnapshot = this.snapshot();
  }
}
