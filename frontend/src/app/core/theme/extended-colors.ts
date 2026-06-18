import { InjectionToken, Provider, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export interface ExtendedColor {
  readonly container: string;
  readonly onContainer: string;
  readonly accent: string;
}

export interface ExtendedColorPalette {
  readonly success: ExtendedColor;
  readonly warning: ExtendedColor;
  readonly info: ExtendedColor;
}

export const EXTENDED_COLORS = new InjectionToken<ExtendedColorPalette>('app.extended-colors');

export const DEFAULT_EXTENDED_COLORS: ExtendedColorPalette = {
  success: {
    container: 'var(--mat-sys-tertiary-container)',
    onContainer: 'var(--mat-sys-on-tertiary-container)',
    accent: 'var(--mat-sys-tertiary)'
  },
  warning: {
    container: 'var(--mat-sys-secondary-container)',
    onContainer: 'var(--mat-sys-on-secondary-container)',
    accent: 'var(--mat-sys-secondary)'
  },
  info: {
    container: 'var(--mat-sys-primary-container)',
    onContainer: 'var(--mat-sys-on-primary-container)',
    accent: 'var(--mat-sys-primary)'
  }
};

export function provideExtendedColors(): Provider {
  return {
    provide: EXTENDED_COLORS,
    useValue: DEFAULT_EXTENDED_COLORS
  };
}

export function injectExtendedColors(): ExtendedColorPalette {
  return inject(EXTENDED_COLORS, { optional: true }) ?? DEFAULT_EXTENDED_COLORS;
}

export function getCssVar(name: string, fallback: string): string {
  const document = inject(DOCUMENT, { optional: true });
  if (!document) {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}
