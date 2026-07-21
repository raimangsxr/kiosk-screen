import { Injectable, signal } from '@angular/core';

export const DISPLAY_LABEL_STORAGE_KEY = 'kiosk_display_label';

@Injectable({ providedIn: 'root' })
export class DisplayLabelService {
  readonly label = signal<string | null>(this.readStoredLabel());

  readStoredLabel(): string | null {
    if (typeof globalThis.localStorage === 'undefined') {
      return null;
    }
    const value = globalThis.localStorage.getItem(DISPLAY_LABEL_STORAGE_KEY);
    return value?.trim() ? value.trim() : null;
  }

  setLabel(label: string): void {
    const clean = label.trim();
    if (!clean) {
      return;
    }
    this.label.set(clean);
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.setItem(DISPLAY_LABEL_STORAGE_KEY, clean);
    }
  }
}
