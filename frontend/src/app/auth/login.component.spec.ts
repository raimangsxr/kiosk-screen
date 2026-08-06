import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { DeviceActivationService } from '../core/auth/device-activation.service';
import { LoginComponent } from './login.component';

interface TestableLoginComponent {
  form: { setValue: (value: { email: string; password: string; rememberMe: boolean }) => void; invalid: boolean };
  submit: () => void;
  errorMessage: () => string | null;
}

function asTestable(component: LoginComponent): TestableLoginComponent {
  return component as unknown as TestableLoginComponent;
}

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    spyOn(TestBed.inject(DeviceActivationService), 'buildQrDataUrl').and.returnValue(
      of('data:image/png;base64,test'),
    );
    fixture.detectChanges();
    http.expectOne('/api/auth/device-activation/start').flush({
      userCode: 'ABCDEF',
      deviceCode: 'device-123',
      expiresAt: '2026-08-06T10:00:00Z',
      pollIntervalSeconds: 2,
      activateUrl: '/activate?code=ABCDEF',
    });
    await fixture.whenStable();
    const initialPolls = http.match('/api/auth/device-activation/poll');
    initialPolls.forEach((request) => request.flush({ status: 'pending' }));
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('shows centered header and both credential and activation panels side by side', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Acceso al quiosco');
    expect(text).toContain('Correo y contraseña');
    expect(text).toContain('Acceso por QR');
    expect(text).toContain('Activa desde tu móvil');
    expect(text).toContain('ABCDEF');
    expect(fixture.nativeElement.querySelector('.login-header')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-live="polite"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.login-panel--credentials')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.login-panel--activation')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.login-panels mat-card')).not.toBeNull();
  });

  it('posts credentials and navigates to hall', () => {
    const component = asTestable(fixture.componentInstance);
    component.form.setValue({ email: 'operator@example.com', password: 'operator', rememberMe: false });

    component.submit();

    const request = http.expectOne('/api/auth/login');
    expect(request.request.withCredentials).toBeTrue();
    expect(request.request.body).toEqual({ email: 'operator@example.com', password: 'operator', rememberMe: false });
    request.flush({ id: 'user-1', email: 'operator@example.com', displayName: 'Operator', roles: ['event_operator'] });

    expect(localStorage.getItem('kiosk_authenticated')).toBe('true');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/hall');
  });

  it('navigates to display when activation poll succeeds', async () => {
    const component = fixture.componentInstance as unknown as {
      startPolling: (deviceCode: string, intervalSeconds: number) => void;
    };
    component.startPolling('device-123', 2);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const poll = http.expectOne('/api/auth/device-activation/poll');
    poll.flush({
      status: 'authorized',
      displayLabel: 'Sala A',
      user: {
        id: 'user-1',
        email: 'operator@example.com',
        displayName: 'Operator',
        roles: ['event_operator'],
      },
    });

    expect(localStorage.getItem('kiosk_authenticated')).toBe('true');
    expect(localStorage.getItem('kiosk_display_label')).toBe('Sala A');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/display');
  });

  it('surfaces an error message when credentials are rejected', () => {
    const component = asTestable(fixture.componentInstance);
    component.form.setValue({ email: 'wrong@example.com', password: 'nope', rememberMe: false });

    component.submit();

    const request = http.expectOne('/api/auth/login');
    request.flush({ detail: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(component.errorMessage()).toBe('Correo o contraseña incorrectos.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('does not submit credentials when the form is invalid', () => {
    const component = asTestable(fixture.componentInstance);
    component.submit();
    http.expectNone('/api/auth/login');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
