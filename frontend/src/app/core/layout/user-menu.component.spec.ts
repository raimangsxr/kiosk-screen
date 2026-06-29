import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { UserMenuComponent } from './user-menu.component';

describe('UserMenuComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [UserMenuComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
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

    const themeButton = fixture.nativeElement.querySelector(
      '[data-testid="user-menu-theme"]'
    ) as HTMLButtonElement;
    const accountTrigger = themeButton.nextElementSibling as HTMLButtonElement;
    expect(accountTrigger.getAttribute('aria-label')).toBe('Account menu for Ada Lovelace');
    expect(accountTrigger.classList).toContain('user-menu__trigger');
    expect(fixture.nativeElement.textContent).toContain('AL');
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
});
