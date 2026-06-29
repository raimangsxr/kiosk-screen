import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { LocaleNavigator } from '../i18n/locale.service';
import { UserMenuComponent } from './user-menu.component';

class FakeLocaleNavigator {
  currentPath = '/es-ES/hall';
  navigated: string | null = null;
  getCurrentPath(): string {
    return this.currentPath;
  }
  navigateTo(url: string): void {
    this.navigated = url;
  }
}

describe('UserMenuComponent', () => {
  let http: HttpTestingController;
  let navigator: FakeLocaleNavigator;

  beforeEach(() => {
    localStorage.clear();
    navigator = new FakeLocaleNavigator();
    TestBed.configureTestingModule({
      imports: [UserMenuComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LocaleNavigator, useValue: navigator }
      ]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('renders the initials avatar and exposes a sign-out action', () => {
    const fixture = TestBed.createComponent(UserMenuComponent);
    fixture.componentInstance['auth']['persist'](
      {
        id: 'u-1',
        email: 'ada@example.com',
        displayName: 'Ada Lovelace',
        roles: ['administrator']
      },
      false
    );
    fixture.detectChanges();

    const accountTrigger = fixture.nativeElement.querySelector(
      '[data-testid="user-menu-locale"] + button'
    ) as HTMLButtonElement;
    expect(accountTrigger.getAttribute('aria-label')).toBe('Account menu for Ada Lovelace');
    expect(accountTrigger.classList).toContain('user-menu__trigger');
    expect(fixture.nativeElement.textContent).toContain('AL');
  });

  it('shows the active locale short code (ES by default)', () => {
    const fixture = TestBed.createComponent(UserMenuComponent);
    fixture.componentInstance['auth']['persist'](
      {
        id: 'u-1',
        email: 'ada@example.com',
        displayName: 'Ada Lovelace',
        roles: ['administrator']
      },
      false
    );
    fixture.detectChanges();

    const localeTrigger = fixture.nativeElement.querySelector(
      '[data-testid="user-menu-locale"]'
    ) as HTMLButtonElement;
    expect(localeTrigger).toBeTruthy();
    expect(localeTrigger.textContent).toContain('ES');
  });

  it('logs out through the auth service and routes to login', () => {
    const fixture = TestBed.createComponent(UserMenuComponent);
    const component = fixture.componentInstance as unknown as { signOut: () => void };
    fixture.componentInstance['auth']['persist'](
      {
        id: 'u-1',
        email: 'ada@example.com',
        displayName: 'Ada Lovelace',
        roles: ['administrator']
      },
      false
    );
    fixture.detectChanges();

    component.signOut();

    const request = http.expectOne('/api/auth/logout');
    expect(request.request.method).toBe('POST');
    request.flush(null);

    expect(localStorage.getItem('kiosk_authenticated')).toBeNull();
  });

  it('toggles the theme when the theme button is clicked', () => {
    const fixture = TestBed.createComponent(UserMenuComponent);
    fixture.componentInstance['auth']['persist'](
      {
        id: 'u-1',
        email: 'ada@example.com',
        displayName: 'Ada Lovelace',
        roles: ['administrator']
      },
      false
    );
    fixture.detectChanges();

    const themeButton = fixture.nativeElement.querySelector(
      '[data-testid="user-menu-theme"]'
    ) as HTMLButtonElement;
    expect(themeButton).toBeTruthy();

    themeButton.click();
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    themeButton.click();
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  describe('selectLocale', () => {
    function selectLocale(component: UserMenuComponent, locale: 'es-ES' | 'en-US'): void {
      (component as unknown as { selectLocale: (l: 'es-ES' | 'en-US') => void }).selectLocale(locale);
    }

    it('navigates to /en-US/<rest> when switching from /es-ES/<rest> to English', () => {
      navigator.currentPath = '/es-ES/hall';

      const fixture = TestBed.createComponent(UserMenuComponent);
      fixture.componentInstance['auth']['persist'](
        {
          id: 'u-1',
          email: 'ada@example.com',
          displayName: 'Ada Lovelace',
          roles: ['administrator']
        },
        false
      );
      fixture.detectChanges();

      selectLocale(fixture.componentInstance, 'en-US');

      expect(localStorage.getItem('kiosk_locale')).toBe('en-US');
      expect(navigator.navigated).toBe('/en-US/hall');
    });

    it('preserves deep paths when switching locale', () => {
      navigator.currentPath = '/es-ES/admin/content/42';

      const fixture = TestBed.createComponent(UserMenuComponent);
      fixture.componentInstance['auth']['persist'](
        {
          id: 'u-1',
          email: 'ada@example.com',
          displayName: 'Ada Lovelace',
          roles: ['administrator']
        },
        false
      );
      fixture.detectChanges();

      selectLocale(fixture.componentInstance, 'en-US');

      expect(navigator.navigated).toBe('/en-US/admin/content/42');
    });

    it('maps a bare /en-US back to /es-ES/ when switching to Spanish', () => {
      navigator.currentPath = '/en-US';
      localStorage.setItem('kiosk_locale', 'en-US');

      const fixture = TestBed.createComponent(UserMenuComponent);
      fixture.componentInstance['auth']['persist'](
        {
          id: 'u-1',
          email: 'ada@example.com',
          displayName: 'Ada Lovelace',
          roles: ['administrator']
        },
        false
      );
      fixture.detectChanges();

      selectLocale(fixture.componentInstance, 'es-ES');

      expect(navigator.navigated).toBe('/es-ES/');
    });

    it('is a no-op when the chosen locale is already active', () => {
      navigator.currentPath = '/es-ES/admin';

      const fixture = TestBed.createComponent(UserMenuComponent);
      fixture.componentInstance['auth']['persist'](
        {
          id: 'u-1',
          email: 'ada@example.com',
          displayName: 'Ada Lovelace',
          roles: ['administrator']
        },
        false
      );
      fixture.detectChanges();

      selectLocale(fixture.componentInstance, 'es-ES');

      expect(navigator.navigated).toBeNull();
    });
  });
});
