import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';

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
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('posts credentials and marks the browser session authenticated', () => {
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

  it('surfaces an error message when credentials are rejected', () => {
    const component = asTestable(fixture.componentInstance);
    component.form.setValue({ email: 'wrong@example.com', password: 'nope', rememberMe: false });

    component.submit();

    const request = http.expectOne('/api/auth/login');
    request.flush({ detail: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(component.errorMessage()).toBe('Invalid email or password.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('does not submit when the form is invalid', () => {
    const component = asTestable(fixture.componentInstance);
    component.submit();
    http.expectNone(() => true);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
