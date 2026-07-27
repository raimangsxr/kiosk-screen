import { ChangeDetectionStrategy, Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { ApiKeysFacade } from './api-keys.facade';

export interface ApiKeyDialogData {
  mode: 'create' | 'rotate';
  keyId?: string;
  keyLabel?: string;
}

export interface ApiKeyDialogResult {
  action: 'created' | 'rotated' | 'cancelled';
  rawKey?: string;
}

@Component({
  selector: 'app-api-keys-create-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ title }}</h2>

    <mat-dialog-content>
      <!-- Phase 1: enter label (create only) -->
      @if (phase === 'label') {
        <form [formGroup]="labelForm" (ngSubmit)="onSubmit()">
          <p class="api-keys-create-dialog__description">{{ description }}</p>
          <mat-form-field appearance="outline" class="api-keys-create-dialog__field">
            <mat-label>Etiqueta</mat-label>
            <input
              matInput
              formControlName="label"
              required
              maxlength="120"
              autocomplete="off"
              data-testid="label-input"
            />
            <mat-hint align="end">{{ labelForm.get('label')?.value?.length || 0 }} / 120</mat-hint>
            @if (labelForm.get('label')?.hasError('required')) {
              <mat-error>
                La etiqueta es obligatoria.
              </mat-error>
            }
            @if (labelForm.get('label')?.hasError('maxlength')) {
              <mat-error>
                La etiqueta debe tener 120 caracteres o menos.
              </mat-error>
            }
          </mat-form-field>
        </form>
      }

      <!-- Phase 2: reveal the raw key once (create and rotate) -->
      @if (phase === 'reveal') {
        <div class="api-keys-create-dialog__reveal">
          <div class="api-keys-create-dialog__warning" role="alert" aria-live="polite">
            <mat-icon>warning</mat-icon>
            <div>
              <strong>Copia esta clave ahora.</strong>
              <p>No podrás volver a verla.</p>
            </div>
          </div>
          <div class="api-keys-create-dialog__keybox" data-testid="raw-key">
            <code>{{ rawKey }}</code>
            <button
              mat-button
              type="button"
              (click)="onCopy()"
              data-testid="copy-raw-key"
              aria-label="Copiar clave al portapapeles"
            >
              <mat-icon>content_copy</mat-icon>
              {{ copied ? 'Copiado' : 'Copiar' }}
            </button>
          </div>
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <!-- Phase 1: cancel + submit -->
      @if (phase === 'label') {
        <button mat-button type="button" mat-dialog-close data-testid="cancel">Cancelar</button>
        <button
          mat-flat-button
          color="primary"
          type="button"
          (click)="onSubmit()"
          [disabled]="labelForm.invalid || facade.saving()"
          data-testid="submit"
        >
          {{ facade.saving() ? 'Trabajando…' : (data.mode === 'create' ? 'Crear' : 'Rotar') }}
        </button>
      }
      <!-- Phase 2: only "Done" (Escape and click-outside are blocked) -->
      @if (phase === 'reveal') {
        <button mat-flat-button color="primary" type="button" (click)="onDone()" data-testid="done">
          Hecho
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [
    `
      .api-keys-create-dialog__description {
        margin: 0 0 12px 0;
        color: var(--mat-sys-on-surface-variant);
      }
      .api-keys-create-dialog__field {
        width: 100%;
      }
      .api-keys-create-dialog__reveal {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .api-keys-create-dialog__warning {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        background: var(--mat-sys-secondary-container);
        color: var(--mat-sys-on-secondary-container);
        padding: 12px 16px;
        border-radius: var(--mat-sys-corner-medium);
        border: 1px solid var(--mat-sys-outline-variant);
      }
      .api-keys-create-dialog__warning mat-icon {
        color: var(--mat-sys-secondary);
      }
      .api-keys-create-dialog__keybox {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--mat-sys-surface-container);
        color: var(--mat-sys-on-surface);
        border-radius: var(--mat-sys-corner-small);
        border: 1px solid var(--mat-sys-outline-variant);
      }
      .api-keys-create-dialog__keybox code {
        flex: 1;
        font-family: 'Roboto Mono', monospace;
        word-break: break-all;
        user-select: all;
      }
    `,
  ],
})
export class ApiKeysApiKeyCreateDialogComponent {
  readonly data: ApiKeyDialogData;
  readonly facade = inject(ApiKeysFacade);
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ApiKeysApiKeyCreateDialogComponent, ApiKeyDialogResult>);

  phase: 'label' | 'reveal' = 'label';
  rawKey: string | null = null;
  copied = false;

  readonly labelForm = this.fb.nonNullable.group({
    label: ['', [Validators.required, Validators.maxLength(120)]],
  });

  constructor(@Inject(MAT_DIALOG_DATA) data: ApiKeyDialogData) {
    this.data = data;
  }

  get title(): string {
    if (this.phase === 'reveal') {
      return this.data.mode === 'create' ? 'Clave de API creada' : 'Clave de API rotada';
    }
    return this.data.mode === 'create' ? 'Crear clave de API' : 'Rotar clave de API';
  }

  get description(): string {
    if (this.data.mode === 'rotate') {
      return `El valor actual de "${this.data.keyLabel ?? 'esta clave'}" dejará de funcionar de inmediato. El nuevo valor se mostrará una sola vez.`;
    }
    return 'Un nombre legible para identificar esta clave. Elige algo que tu equipo reconozca, como "App móvil" o "Integración de socios".';
  }

  onSubmit(): void {
    if (this.labelForm.invalid) {
      return;
    }
    const label = this.labelForm.get('label')!.value.trim();
    if (!label) {
      return;
    }
    if (this.data.mode === 'create') {
      this.facade.create(label).subscribe({
        next: (result) => {
          this.rawKey = result.rawKey;
          this.phase = 'reveal';
        },
        error: () => {
          // The error is mapped to facade.error; the dialog stays in 'label' phase
          // so the operator can correct and retry.
        },
      });
    } else if (this.data.keyId) {
      this.facade.rotate(this.data.keyId).subscribe({
        next: (result) => {
          this.rawKey = result.rawKey;
          this.phase = 'reveal';
        },
        error: () => {
          // Same as above.
        },
      });
    }
  }

  onCopy(): void {
    if (!this.rawKey) {
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(this.rawKey).then(
        () => {
          this.copied = true;
          setTimeout(() => (this.copied = false), 2000);
        },
        () => {
          // Clipboard write failed (permissions); leave the key visible in the
          // code block so the user can copy manually.
        },
      );
    }
  }

  onDone(): void {
    this.dialogRef.close({
      action: this.data.mode === 'create' ? 'created' : 'rotated',
      rawKey: this.rawKey ?? undefined,
    });
  }
}
