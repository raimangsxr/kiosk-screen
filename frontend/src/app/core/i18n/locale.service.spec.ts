import { TestBed } from '@angular/core/testing';

import { DEFAULT_LOCALE, LocaleService, localeTargetPath, prefixFor } from './locale.service';

describe('LocaleService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
  });

  it('defaults to es-ES when no preference is stored', () => {
    const service = TestBed.inject(LocaleService);
    expect(service.locale()).toBe(DEFAULT_LOCALE);
    expect(service.isSpanish()).toBeTrue();
    expect(service.isEnglish()).toBeFalse();
    expect(document.documentElement.lang).toBe(DEFAULT_LOCALE);
  });

  it('reads the persisted preference from localStorage', () => {
    localStorage.setItem('kiosk_locale', 'en-US');
    const service = TestBed.inject(LocaleService);
    expect(service.locale()).toBe('en-US');
    expect(service.isEnglish()).toBeTrue();
  });

  it('falls back to the default when the stored value is not a supported locale', () => {
    localStorage.setItem('kiosk_locale', 'fr-FR');
    const service = TestBed.inject(LocaleService);
    expect(service.locale()).toBe(DEFAULT_LOCALE);
  });

  it('updates the locale, persists it, and reflects it on <html lang>', () => {
    const service = TestBed.inject(LocaleService);
    service.setLocale('en-US');

    expect(service.locale()).toBe('en-US');
    expect(localStorage.getItem('kiosk_locale')).toBe('en-US');
    expect(document.documentElement.lang).toBe('en-US');
  });

  it('does not re-emit or re-persist when the locale is already active', () => {
    const service = TestBed.inject(LocaleService);
    service.setLocale('en-US');
    localStorage.removeItem('kiosk_locale');

    service.setLocale('en-US');
    expect(localStorage.getItem('kiosk_locale')).toBeNull();
  });

  it('exposes prefixFor() mapping per locale', () => {
    expect(prefixFor('es-ES')).toBe('/es-ES/');
    expect(prefixFor('en-US')).toBe('/en-US/');
  });

  it('exposes the active locale prefix as a signal', () => {
    const service = TestBed.inject(LocaleService);
    expect(service.prefix()).toBe('/es-ES/');

    service.setLocale('en-US');
    expect(service.prefix()).toBe('/en-US/');
  });
});

describe('localeTargetPath', () => {
  it('switches es-ES to en-US while preserving the rest of the path', () => {
    expect(localeTargetPath('/es-ES/hall', 'en-US')).toBe('/en-US/hall');
    expect(localeTargetPath('/es-ES/admin/content/42', 'en-US')).toBe('/en-US/admin/content/42');
  });

  it('switches en-US to es-ES while preserving the rest of the path', () => {
    expect(localeTargetPath('/en-US/admin', 'es-ES')).toBe('/es-ES/admin');
    expect(localeTargetPath('/en-US/admin/content/42', 'es-ES')).toBe('/es-ES/admin/content/42');
  });

  it('maps the bare locale path back to a trailing slash', () => {
    expect(localeTargetPath('/es-ES', 'en-US')).toBe('/en-US/');
    expect(localeTargetPath('/en-US', 'es-ES')).toBe('/es-ES/');
  });

  it('keeps the prefix when the current path has no locale segment', () => {
    expect(localeTargetPath('/', 'en-US')).toBe('/en-US/');
    expect(localeTargetPath('/admin', 'es-ES')).toBe('/es-ES/admin');
  });
});