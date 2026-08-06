import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { ActivateComponent } from './activate.component';

describe('ActivateComponent', () => {
  let fixture: ComponentFixture<ActivateComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ActivateComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => (key === 'code' ? 'abcdef' : null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ActivateComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('pre-fills code from query param in uppercase', () => {
    const input = fixture.nativeElement.querySelector('input[formcontrolname="userCode"]') as HTMLInputElement;
    expect(input.value).toBe('ABCDEF');
  });

  it('shows login fields when unauthenticated', () => {
    expect(fixture.nativeElement.textContent).toContain('Inicia sesión para autorizar la pantalla.');
  });

  it('authorizes after login and shows success without navigation', () => {
    const component = fixture.componentInstance as unknown as {
      form: { setValue: (value: Record<string, unknown>) => void };
      submit: () => void;
    };
    component.form.setValue({
      userCode: 'ABCDEF',
      displayLabel: 'Sala A',
      email: 'operator@example.com',
      password: 'operator',
      rememberMe: false,
    });
    component.submit();

    const login = http.expectOne('/api/auth/login');
    login.flush({
      id: 'user-1',
      email: 'operator@example.com',
      displayName: 'Operator',
      roles: ['event_operator'],
    });

    const authorize = http.expectOne('/api/auth/device-activation/authorize');
    expect(authorize.request.body).toEqual({
      userCode: 'ABCDEF',
      rememberMe: false,
      displayLabel: 'Sala A',
    });
    authorize.flush(null);

    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Pantalla activada');
  });

  it('displays server error messages for invalid codes', () => {
    const component = fixture.componentInstance as unknown as {
      form: { setValue: (value: Record<string, unknown>) => void };
      submit: () => void;
    };
    component.form.setValue({
      userCode: 'ZZZZZZ',
      displayLabel: 'Sala A',
      email: 'operator@example.com',
      password: 'operator',
      rememberMe: false,
    });
    component.submit();

    http.expectOne('/api/auth/login').flush({
      id: 'user-1',
      email: 'operator@example.com',
      displayName: 'Operator',
      roles: ['event_operator'],
    });

    const authorize = http.expectOne('/api/auth/device-activation/authorize');
    authorize.flush(
      { code: 'activation_not_found', message: 'No encontramos una pantalla con ese código.' },
      { status: 404, statusText: 'Not Found' },
    );

    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No encontramos una pantalla con ese código.');
  });

  it('rejects invalid code format before submit', () => {
    const component = fixture.componentInstance as unknown as {
      form: { setValue: (value: Record<string, unknown>) => void; invalid: boolean };
      submit: () => void;
    };
    component.form.setValue({
      userCode: 'abc12',
      displayLabel: 'Sala A',
      email: 'operator@example.com',
      password: 'operator',
      rememberMe: false,
    });
    expect(component.form.invalid).toBeTrue();
    component.submit();
    http.expectNone('/api/auth/login');
  });
});
