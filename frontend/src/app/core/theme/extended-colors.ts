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

/*
 * Cada estado apunta ahora a los tokens semánticos definidos en
 * the control-room tokens in `styles.scss` (verde / ámbar / azul reales, en claro y
 * oscuro), en lugar de reutilizar `primary`/`secondary` de Material —- con lo
 * que `success`, `warning` e `info` dejan de ser indistinguibles entre sí.
 */
export const DEFAULT_EXTENDED_COLORS: ExtendedColorPalette = {
  success: {
    container: 'var(--app-success-container)',
    onContainer: 'var(--app-on-success-container)',
    accent: 'var(--app-success)'
  },
  warning: {
    container: 'var(--app-warning-container)',
    onContainer: 'var(--app-on-warning-container)',
    accent: 'var(--app-warning)'
  },
  info: {
    container: 'var(--app-info-container)',
    onContainer: 'var(--app-on-info-container)',
    accent: 'var(--app-info)'
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
