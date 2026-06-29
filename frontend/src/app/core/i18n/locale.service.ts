import { DOCUMENT, registerLocaleData } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import localeEn from '@angular/common/locales/en';
import localeEs from '@angular/common/locales/es';

/**
 * Locales the application ships translations for. Keep in sync with the
 * `localize` build configurations in `angular.json`. The first entry is the
 * default. `@angular/localize` swaps messages at build time; the frontend
 * ships a separate Angular bundle per locale, each served under its own
 * URL prefix by nginx (see `frontend/nginx.conf` and `I18N.LOCALE`). The
 * user menu navigates to the destination prefix so the browser fetches
 * the bundle for the chosen locale.
 */
export type AppLocale = 'es-ES' | 'en-US';

export type LocalePrefix = '/es-ES/' | '/en-US/';

const LOCALE_STORAGE_KEY = 'kiosk_locale';
export const DEFAULT_LOCALE: AppLocale = 'es-ES';
export const DEFAULT_LOCALE_PREFIX: LocalePrefix = '/es-ES/';
const SUPPORTED_LOCALES: readonly AppLocale[] = ['es-ES', 'en-US'];
const LOCALE_PREFIXES: Readonly<Record<AppLocale, LocalePrefix>> = {
  'es-ES': '/es-ES/',
  'en-US': '/en-US/'
};

export function prefixFor(locale: AppLocale): LocalePrefix {
  return LOCALE_PREFIXES[locale];
}

/**
 * Build the destination URL for a locale switch.
 *
 * Strips the leading `/es-ES` or `/en-US` segment from `currentPath` and
 * prepends the prefix for `targetLocale`, so the same logical route is
 * rendered under the destination bundle.
 *
 * Examples:
 *   localeTargetPath('/es-ES/hall', 'en-US')      → '/en-US/hall'
 *   localeTargetPath('/en-US/admin/content/42', 'es-ES') → '/es-ES/admin/content/42'
 *   localeTargetPath('/en-US', 'es-ES')           → '/es-ES/'
 *   localeTargetPath('/', 'en-US')                → '/en-US/'
 */
export function localeTargetPath(currentPath: string, targetLocale: AppLocale): string {
  const rest = stripLocalePrefix(currentPath);
  return LOCALE_PREFIXES[targetLocale] + rest;
}

function stripLocalePrefix(pathname: string): string {
  if (pathname === '/es-ES' || pathname === '/en-US') {
    return '';
  }
  if (pathname.startsWith('/es-ES/')) {
    return pathname.slice('/es-ES/'.length);
  }
  if (pathname.startsWith('/en-US/')) {
    return pathname.slice('/en-US/'.length);
  }
  return pathname.replace(/^\//, '');
}

function isSupported(value: string | null): value is AppLocale {
  return value !== null && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Indirection over `globalThis.location.assign` and `pathname` so that
 * `UserMenuComponent` can stay declarative and tests can swap the
 * navigation target without monkey-patching the browser's `Location`.
 */
@Injectable({ providedIn: 'root' })
export class LocaleNavigator {
  getCurrentPath(): string {
    return globalThis.location?.pathname ?? '/';
  }

  navigateTo(url: string): void {
    if (typeof globalThis.location !== 'undefined') {
      globalThis.location.assign(url);
    }
  }
}

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly document = inject(DOCUMENT);
  private readonly current = signal<AppLocale>(this.readPersistedLocale());

  readonly locale = this.current.asReadonly();
  readonly isSpanish = computed(() => this.current() === 'es-ES');
  readonly isEnglish = computed(() => this.current() === 'en-US');
  readonly prefix = computed<LocalePrefix>(() => prefixFor(this.current()));

  constructor() {
    // Pre-register Angular's CLDR data for both supported locales so date /
    // number / currency pipes can render correctly once the build's
    // `$localize` machinery swaps the active locale. `registerLocaleData`
    // is idempotent; calling it twice for the same locale is a no-op.
    //
    // Angular's CLDR data ships only base locale ids (`es`, `en`), so we
    // register the data with its own id. `LOCALE_ID` (the project-level
    // identifier `es-ES` / `en-US`) still resolves at pipe time via the
    // locale fallback chain, which is why we don't pass a second arg here.
    registerLocaleData(localeEs);
    registerLocaleData(localeEn);

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