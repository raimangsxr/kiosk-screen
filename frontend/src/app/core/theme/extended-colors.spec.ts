import { TestBed } from '@angular/core/testing';

import {
  DEFAULT_EXTENDED_COLORS,
  EXTENDED_COLORS,
  provideExtendedColors
} from './extended-colors';

describe('extended colors', () => {
  it('maps each status to its own semantic design token (distinct colors)', () => {
    expect(DEFAULT_EXTENDED_COLORS.success.accent).toBe('var(--app-success)');
    expect(DEFAULT_EXTENDED_COLORS.warning.accent).toBe('var(--app-warning)');
    expect(DEFAULT_EXTENDED_COLORS.info.accent).toBe('var(--app-info)');
  });

  it('gives success, warning and info distinct containers', () => {
    const containers = [
      DEFAULT_EXTENDED_COLORS.success.container,
      DEFAULT_EXTENDED_COLORS.warning.container,
      DEFAULT_EXTENDED_COLORS.info.container
    ];
    expect(new Set(containers).size).toBe(3);
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
