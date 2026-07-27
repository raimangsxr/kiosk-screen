import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';
export type Density = 'comfortable' | 'compact';

const THEME_STORAGE_KEY = 'kiosk_theme';
const DENSITY_STORAGE_KEY = 'kiosk_density';
const THEME_ATTR = 'data-theme';
const DENSITY_ATTR = 'data-density';

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

function resolvePreferredDensity(): Density {
  try {
    const stored = globalThis.localStorage?.getItem(DENSITY_STORAGE_KEY) as Density | null;
    if (stored === 'comfortable' || stored === 'compact') {
      return stored;
    }
  } catch {
    // ignore storage failures; fall back to the comfortable default
  }
  return 'comfortable';
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
  private readonly densityState = signal<Density>(resolvePreferredDensity());

  readonly mode = this.modeState.asReadonly();
  readonly isDark = computed(() => this.modeState() === 'dark');
  readonly isLight = computed(() => this.modeState() === 'light');

  readonly density = this.densityState.asReadonly();
  readonly isCompact = computed(() => this.densityState() === 'compact');

  constructor() {
    this.applyModeToDocument(this.modeState());
    this.applyDensityToDocument(this.densityState());
  }

  setMode(mode: ThemeMode): void {
    if (mode === this.modeState()) {
      return;
    }
    this.modeState.set(mode);
    this.applyModeToDocument(mode);
    this.persist(THEME_STORAGE_KEY, mode);
  }

  toggle(): void {
    this.setMode(this.modeState() === 'dark' ? 'light' : 'dark');
  }

  setDensity(density: Density): void {
    if (density === this.densityState()) {
      return;
    }
    this.densityState.set(density);
    this.applyDensityToDocument(density);
    this.persist(DENSITY_STORAGE_KEY, density);
  }

  toggleDensity(): void {
    this.setDensity(this.densityState() === 'compact' ? 'comfortable' : 'compact');
  }

  private applyModeToDocument(mode: ThemeMode): void {
    this.document?.documentElement?.setAttribute(THEME_ATTR, mode);
  }

  private applyDensityToDocument(density: Density): void {
    const root = this.document?.documentElement;
    if (!root) {
      return;
    }
    // Only mark the attribute for the non-default value so the comfortable
    // default keeps working without any attribute present.
    if (density === 'compact') {
      root.setAttribute(DENSITY_ATTR, 'compact');
    } else {
      root.removeAttribute(DENSITY_ATTR);
    }
  }

  private persist(key: string, value: string): void {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // storage may be unavailable; runtime still works without persistence
    }
  }
}