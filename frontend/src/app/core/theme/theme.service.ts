import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'kiosk_theme';
const THEME_ATTR = 'data-theme';

function resolvePreferredMode(): ThemeMode {
  try {
    const stored = globalThis.localStorage?.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    // ignore storage failures; fall back to system preference
  }
  if (typeof globalThis.matchMedia === 'function') {
    const prefersDark = globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
  return 'light';
}

/**
 * Owns the document-level theme attribute (`<html data-theme="light|dark">`).
 * The actual CSS variables live in `styles.scss` (`:root` for light,
 * `[data-theme='dark']` for dark) — this service only flips the attribute
 * and persists the operator's preference so it survives reloads.
 *
 * M3 palettes are theme-aware through Angular Material's runtime
 * `mat.theme()` call (see `styles.scss`). The admin shell backgrounds use
 * `var(--mat-sys-surface-container-lowest)` so they follow whichever
 * palette is active automatically.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly modeState = signal<ThemeMode>(resolvePreferredMode());

  readonly mode = this.modeState.asReadonly();
  readonly isDark = computed(() => this.modeState() === 'dark');
  readonly isLight = computed(() => this.modeState() === 'light');

  constructor() {
    this.applyToDocument(this.modeState());
  }

  setMode(mode: ThemeMode): void {
    if (mode === this.modeState()) {
      return;
    }
    this.modeState.set(mode);
    this.applyToDocument(mode);
    this.persist(mode);
  }

  toggle(): void {
    this.setMode(this.modeState() === 'dark' ? 'light' : 'dark');
  }

  private applyToDocument(mode: ThemeMode): void {
    const root = this.document?.documentElement;
    if (root) {
      root.setAttribute(THEME_ATTR, mode);
    }
  }

  private persist(mode: ThemeMode): void {
    try {
      globalThis.localStorage?.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // storage may be unavailable; runtime still works without persistence
    }
  }
}