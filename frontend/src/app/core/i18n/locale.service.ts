import { DOCUMENT, registerLocaleData } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import localeEn from '@angular/common/locales/en';
import localeEs from '@angular/common/locales/es';

/**
 * Locales the application ships translations for. Keep in sync with the
 * `localize` build configurations in `angular.json`. The first entry is the
 * default; runtime switching between them is currently NOT supported —
 * `@angular/localize` swaps messages at build time, so switching here
 * stores the preference for the next reload / deploy rather than hot-
 * swapping strings mid-session. A future runtime translation loader
 * (e.g. transloco) would let us change locale without a full reload.
 */
export type AppLocale = 'es-ES' | 'en-US';

const LOCALE_STORAGE_KEY = 'kiosk_locale';
export const DEFAULT_LOCALE: AppLocale = 'es-ES';
const SUPPORTED_LOCALES: readonly AppLocale[] = ['es-ES', 'en-US'];

function isSupported(value: string | null): value is AppLocale {
  return value !== null && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly document = inject(DOCUMENT);
  private readonly current = signal<AppLocale>(this.readPersistedLocale());

  readonly locale = this.current.asReadonly();
  readonly isSpanish = computed(() => this.current() === 'es-ES');
  readonly isEnglish = computed(() => this.current() === 'en-US');

  constructor() {
    // Pre-register Angular's CLDR data for both supported locales so date /
    // number / currency pipes can render correctly once the build's
    // `$localize` machinery swaps the active locale. `registerLocaleData`
    // is idempotent; calling it twice for the same locale is a no-op.
    registerLocaleData(localeEs, 'es-ES');
    registerLocaleData(localeEn, 'en-US');

    // Reflect the current locale on <html lang> synchronously so the
    // DOM matches the signal on the very next render tick — accessibility
    // tools and crawlers read this attribute on first paint.
    this.syncDocumentLang(this.current());
  }

  setLocale(locale: AppLocale): void {
    if (locale === this.current()) {
      return;
    }
    this.current.set(locale);
    this.persist(locale);
    this.syncDocumentLang(locale);
  }

  private syncDocumentLang(locale: AppLocale): void {
    const root = this.document?.documentElement;
    if (root) {
      root.lang = locale;
    }
  }

  private readPersistedLocale(): AppLocale {
    try {
      const raw = globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY);
      return isSupported(raw) ? raw : DEFAULT_LOCALE;
    } catch {
      return DEFAULT_LOCALE;
    }
  }

  private persist(locale: AppLocale): void {
    try {
      globalThis.localStorage?.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // ignore — runtime still works, preference won't survive a reload.
    }
  }
}