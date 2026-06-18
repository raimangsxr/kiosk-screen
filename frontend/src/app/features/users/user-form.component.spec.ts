import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AdminApiService, UserRecord } from '../../admin/admin-api.service';
import { UsersFacade } from './users.facade';
import { UsersListComponent } from './users-list.component';
import { UserFormComponent } from './user-form.component';

function buildUser(partial: Partial<UserRecord> = {}): UserRecord {
  return {
    id: 'user-1',
    email: 'admin@example.com',
    displayName: 'Admin',
    isActive: true,
    roles: ['administrator'],
    ...partial
  };
}

function stubRoute(id: string | null) {
  const params = id ? { id } : {};
  return {
    snapshot: { paramMap: convertToParamMap(params) },
    paramMap: of(convertToParamMap(params))
  };
}

describe('UsersFacade', () => {
  let facade: UsersFacade;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), UsersFacade]
    });
    facade = TestBed.inject(UsersFacade);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('refresh exposes loaded users', () => {
    facade.refresh().subscribe();
    httpController.expectOne('/api/users').flush([buildUser(), buildUser({ id: 'user-2', email: 'op@example.com' })]);
    expect(facade.users().length).toBe(2);
  });

  it('loadUser populates current signal when found', () => {
    facade.loadUser('user-1').subscribe();
    httpController.expectOne('/api/users').flush([buildUser()]);
    expect(facade.current()?.id).toBe('user-1');
  });

  it('loadUser exposes not_found error when user does not exist', () => {
    facade.loadUser('missing').subscribe({ error: () => undefined });
    httpController.expectOne('/api/users').flush([]);
    expect(facade.error()?.category).toBe('not-found');
  });

  it('save creates a new user and refreshes the list', () => {
    facade.save({ email: 'op@example.com', displayName: 'Op', isActive: true, roles: ['event_operator'] }).subscribe();
    const post = httpController.expectOne('/api/users');
    expect(post.request.method).toBe('POST');
    post.flush(buildUser({ email: 'op@example.com' }));
    httpController.expectOne('/api/users').flush([buildUser({ email: 'op@example.com' })]);
  });

  it('save updates an existing user when id is provided', () => {
    facade.save({ email: 'admin@example.com', displayName: 'Admin', isActive: false, roles: ['administrator'] }, 'user-1').subscribe();
    const put = httpController.expectOne('/api/users/user-1');
    expect(put.request.method).toBe('PUT');
    put.flush(buildUser({ isActive: false }));
    httpController.expectOne('/api/users').flush([buildUser({ isActive: false })]);
  });

  it('toggleActive flips isActive and refreshes the list', () => {
    facade.toggleActive(buildUser({ isActive: true })).subscribe();
    const put = httpController.expectOne('/api/users/user-1');
    expect(put.request.body).toEqual(jasmine.objectContaining({ isActive: false }));
    put.flush(buildUser({ isActive: false }));
    httpController.expectOne('/api/users').flush([buildUser({ isActive: false })]);
  });

  it('clearError resets the error signal', () => {
    facade.refresh().subscribe({ error: () => undefined });
    httpController.expectOne('/api/users').flush(
      { code: 'unexpected_error', message: 'Boom' },
      { status: 500, statusText: 'Server Error' }
    );
    expect(facade.error()).not.toBeNull();
    facade.clearError();
    expect(facade.error()).toBeNull();
  });
});

describe('UsersListComponent (Material)', () => {
  let fixture: ComponentFixture<UsersListComponent>;
  let httpController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersListComponent, NoopAnimationsModule],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    httpController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(UsersListComponent);
    fixture.detectChanges();
    httpController.expectOne('/api/users').flush([buildUser()]);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpController.verify();
  });

  it('renders email and role', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('admin@example.com');
    expect(text).toContain('administrator');
  });

  it('shows empty state when no users are returned', () => {
    fixture.componentInstance['facade'].refresh().subscribe();
    httpController.expectOne('/api/users').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No users yet');
  });
});

describe('UserFormComponent (Reactive Forms + Material)', () => {
  let httpController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserFormComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: stubRoute(null) }
      ]
    }).compileComponents();
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  function newForm(): ComponentFixture<UserFormComponent> {
    return TestBed.createComponent(UserFormComponent);
  }

  it('marks email and displayName as required', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    const form = fixture.componentInstance['form']!;
    expect(form.controls.email.hasError('required')).toBeTrue();
    expect(form.controls.displayName.hasError('required')).toBeTrue();
  });

  it('refuses to save when no role is selected', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    const form = fixture.componentInstance['form']!;
    form.controls.email.setValue('op@example.com');
    form.controls.displayName.setValue('Operator');
    expect(form.invalid).toBeTrue();
    expect(form.controls.roles.hasError('atLeastOneRole')).toBeTrue();
    fixture.componentInstance.submit();
    httpController.expectNone('/api/users');
  });

  it('submits a new user with selected roles and lowercases the email', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    const form = fixture.componentInstance['form']!;
    form.controls.email.setValue('OP@Example.COM');
    form.controls.displayName.setValue('Operator');
    fixture.componentInstance.rolesArray.at(0).setValue(true);
    fixture.componentInstance.submit();
    const post = httpController.expectOne('/api/users');
    expect(post.request.body).toEqual(jasmine.objectContaining({
      email: 'op@example.com',
      displayName: 'Operator',
      roles: ['administrator']
    }));
    post.flush(buildUser({ email: 'op@example.com' }));
    httpController.expectOne('/api/users').flush([]);
  });

  it('tracks unsaved changes after a field is edited', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
    const form = fixture.componentInstance['form']!;
    form.controls.email.setValue('op@example.com');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue();
  });
});
