import { TestBed } from '@angular/core/testing';

import { DEFAULT_LOCALE, LocaleService } from './locale.service';

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
});