import { ChangeDetectionStrategy, Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-file-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  template: `
    <div class="file-input" [class.file-input--with-preview]="showPreview()">
      <button
        mat-stroked-button
        type="button"
        color="primary"
        (click)="triggerPicker()"
        [disabled]="disabled()"
        class="file-input__button"
      >
        <mat-icon aria-hidden="true">upload</mat-icon>
        {{ buttonLabel() }}
      </button>
      <input
        #picker
        type="file"
        [accept]="accept()"
        [multiple]="multiple()"
        [hidden]="true"
        (change)="onFileSelected($event)"
        [attr.aria-label]="ariaLabel()"
      />
      @if (selectedFileName(); as name) {
        <div class="file-input__filename" role="status">
          <mat-icon aria-hidden="true">description</mat-icon>
          <span>{{ name }}</span>
        </div>
        @if (showPreview() && previewUrl(); as url) {
          <mat-card appearance="outlined" class="file-input__preview">
            <img mat-card-image [src]="url" alt="Vista previa del archivo seleccionado" />
          </mat-card>
        }
      } @else if (existingFileName(); as name) {
        <div class="file-input__filename file-input__filename--existing" role="status">
          <mat-icon aria-hidden="true">attach_file</mat-icon>
          <span>Current file: {{ name }}</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .file-input {
        display: grid;
        gap: 8px;
      }
      .file-input__button {
        min-height: var(--app-touch-target);
        align-self: start;
        justify-self: start;
      }
      .file-input__filename {
        display: flex;
        align-items: center;
        gap: 8px;
        font: var(--mat-sys-body-medium);
        letter-spacing: var(--mat-sys-body-medium-tracking);
        color: var(--mat-sys-on-surface);
      }
      .file-input__filename--existing {
        color: var(--mat-sys-on-surface-variant);
      }
      .file-input__preview {
        max-width: 320px;
        overflow: hidden;
        background: var(--mat-sys-surface);
      }
      .file-input__preview img {
        display: block;
        max-height: 220px;
        object-fit: cover;
      }
    `
  ]
})
export class FileInputComponent {
  private readonly picker = viewChild<ElementRef<HTMLInputElement>>('picker');

  readonly accept = input<string>('');
  readonly buttonLabel = input<string>('Choose file');
  readonly ariaLabel = input<string>('Choose file');
  readonly disabled = input<boolean>(false);
  readonly existingFileName = input<string | null>(null);
  readonly multiple = input<boolean>(false);
  readonly showPreview = input<boolean>(false);

  readonly fileSelected = output<File>();
  readonly filesSelected = output<File[]>();

  protected readonly selectedFileName = signal<string | null>(null);
  private readonly previewObjectUrl = signal<string | null>(null);

  protected readonly previewUrl = computed(() => this.previewObjectUrl());

  protected triggerPicker(): void {
    this.picker()?.nativeElement.click();
  }

  protected onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files ?? []);
    const file = files[0];
    if (!file || !files.length) {
      return;
    }
    this.revokePreview();
    this.selectedFileName.set(files.length === 1 ? file.name : `${files.length} files selected`);
    if (this.showPreview() && file.type.startsWith('image/')) {
      this.previewObjectUrl.set(URL.createObjectURL(file));
    }
    this.fileSelected.emit(file);
    this.filesSelected.emit(files);
  }

  private revokePreview(): void {
    const current = this.previewObjectUrl();
    if (current) {
      URL.revokeObjectURL(current);
    }
    this.previewObjectUrl.set(null);
  }
}
