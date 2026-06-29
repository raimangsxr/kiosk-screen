import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to light when no preference is stored and no system preference is set', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.mode()).toBe('light');
    expect(service.isLight()).toBeTrue();
    expect(service.isDark()).toBeFalse();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('reads the persisted preference from localStorage', () => {
    localStorage.setItem('kiosk_theme', 'dark');
    const service = TestBed.inject(ThemeService);
    expect(service.mode()).toBe('dark');
    expect(service.isDark()).toBeTrue();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggles the mode and reflects it on <html data-theme>', () => {
    const service = TestBed.inject(ThemeService);
    service.toggle();
    expect(service.mode()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    service.toggle();
    expect(service.mode()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('persists the chosen mode to localStorage', () => {
    const service = TestBed.inject(ThemeService);
    service.setMode('dark');
    expect(localStorage.getItem('kiosk_theme')).toBe('dark');
  });

  it('does not re-emit or re-persist when the mode is already active', () => {
    const service = TestBed.inject(ThemeService);
    service.setMode('dark');
    localStorage.removeItem('kiosk_theme');

    service.setMode('dark');
    expect(localStorage.getItem('kiosk_theme')).toBeNull();
  });
});