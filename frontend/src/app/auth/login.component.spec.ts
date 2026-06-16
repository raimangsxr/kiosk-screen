import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('posts credentials and marks the browser session authenticated', () => {
    const component = fixture.componentInstance;
    component.email = 'operator@example.com';
    component.password = 'operator';

    component.submit();

    const request = http.expectOne('/api/auth/login');
    expect(request.request.withCredentials).toBeTrue();
    expect(request.request.body).toEqual({ email: 'operator@example.com', password: 'operator' });
    request.flush({ id: 'user-1', email: 'operator@example.com', displayName: 'Operator', roles: ['event_operator'] });

    expect(localStorage.getItem('kiosk_authenticated')).toBe('true');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/display');
  });
});

