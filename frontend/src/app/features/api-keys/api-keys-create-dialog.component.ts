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
      <form *ngIf="phase === 'label'" [formGroup]="labelForm" (ngSubmit)="onSubmit()">
        <p class="api-keys-create-dialog__description">{{ description }}</p>
        <mat-form-field appearance="outline" class="api-keys-create-dialog__field">
          <mat-label>Label</mat-label>
          <input
            matInput
            formControlName="label"
            required
            maxlength="120"
            autocomplete="off"
            data-testid="label-input"
          />
          <mat-hint align="end">{{ labelForm.get('label')?.value?.length || 0 }} / 120</mat-hint>
          <mat-error *ngIf="labelForm.get('label')?.hasError('required')">
            A label is required.
          </mat-error>
          <mat-error *ngIf="labelForm.get('label')?.hasError('maxlength')">
            The label must be 120 characters or fewer.
          </mat-error>
        </mat-form-field>
      </form>

      <!-- Phase 2: reveal the raw key once (create and rotate) -->
      <div *ngIf="phase === 'reveal'" class="api-keys-create-dialog__reveal">
        <div class="api-keys-create-dialog__warning" role="alert" aria-live="polite">
          <mat-icon>warning</mat-icon>
          <div>
            <strong>Copy this key now.</strong>
            <p>You will not be able to see it again.</p>
          </div>
        </div>
        <div class="api-keys-create-dialog__keybox" data-testid="raw-key">
          <code>{{ rawKey }}</code>
          <button
            mat-button
            type="button"
            (click)="onCopy()"
            data-testid="copy-raw-key"
            aria-label="Copy raw key to clipboard"
          >
            <mat-icon>content_copy</mat-icon>
            {{ copied ? 'Copied' : 'Copy' }}
          </button>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <!-- Phase 1: cancel + submit -->
      <ng-container *ngIf="phase === 'label'">
        <button mat-button type="button" mat-dialog-close data-testid="cancel">Cancel</button>
        <button
          mat-flat-button
          color="primary"
          type="button"
          (click)="onSubmit()"
          [disabled]="labelForm.invalid || facade.saving()"
          data-testid="submit"
        >
          {{ facade.saving() ? 'Working…' : (data.mode === 'create' ? 'Create' : 'Rotate') }}
        </button>
      </ng-container>
      <!-- Phase 2: only "Done" (Escape and click-outside are blocked) -->
      <ng-container *ngIf="phase === 'reveal'">
        <button mat-flat-button color="primary" type="button" (click)="onDone()" data-testid="done">
          Done
        </button>
      </ng-container>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .api-keys-create-dialog__description {
        margin: 0 0 12px 0;
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
        background: rgba(255, 193, 7, 0.15);
        padding: 12px 16px;
        border-radius: 6px;
        border: 1px solid rgba(255, 193, 7, 0.4);
      }
      .api-keys-create-dialog__warning mat-icon {
        color: #ff6f00;
      }
      .api-keys-create-dialog__keybox {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: rgba(0, 0, 0, 0.05);
        border-radius: 4px;
        border: 1px solid rgba(0, 0, 0, 0.12);
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
      return this.data.mode === 'create' ? 'API key created' : 'API key rotated';
    }
    return this.data.mode === 'create' ? 'Create API key' : 'Rotate API key';
  }

  get description(): string {
    if (this.data.mode === 'rotate') {
      return `The current value of "${this.data.keyLabel ?? 'this key'}" will stop working immediately. The new value will be shown once.`;
    }
    return 'A human-readable name to identify this key. Choose something your team will recognize, like "Mobile app" or "Partner integration".';
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
