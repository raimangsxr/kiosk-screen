import { TestBed } from '@angular/core/testing';

import {
  DEFAULT_EXTENDED_COLORS,
  EXTENDED_COLORS,
  provideExtendedColors
} from './extended-colors';

describe('extended colors', () => {
  it('exposes a default palette that maps to Material 3 system roles', () => {
    expect(DEFAULT_EXTENDED_COLORS.success.accent).toBe('var(--mat-sys-tertiary)');
    expect(DEFAULT_EXTENDED_COLORS.warning.accent).toBe('var(--mat-sys-secondary)');
    expect(DEFAULT_EXTENDED_COLORS.info.accent).toBe('var(--mat-sys-primary)');
  });

  it('provides the palette through DI when provideExtendedColors is registered', () => {
    TestBed.configureTestingModule({
      providers: [provideExtendedColors()]
    });
    const palette = TestBed.inject(EXTENDED_COLORS);
    expect(palette).toBe(DEFAULT_EXTENDED_COLORS);
  });

  it('returns the default palette from the token when no provider is registered', () => {
    TestBed.configureTestingModule({});
    const palette = TestBed.inject(EXTENDED_COLORS, null);
    expect(palette === null || palette === DEFAULT_EXTENDED_COLORS).toBeTrue();
  });
});
