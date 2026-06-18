import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AdsApiService, Client } from '../../ads/ads-api.service';
import { ClientsFacade } from './clients.facade';
import { ClientListComponent } from './client-list.component';
import { ClientFormComponent } from './client-form.component';

function buildClient(partial: Partial<Client> = {}): Client {
  return { id: 'client-1', name: 'Sponsor', isActive: true, ...partial };
}

function stubRoute(id: string | null) {
  const params = id ? { id } : {};
  return {
    snapshot: { paramMap: convertToParamMap(params) },
    paramMap: of(convertToParamMap(params))
  };
}

describe('ClientListComponent (Material)', () => {
  let fixture: ComponentFixture<ClientListComponent>;
  let httpController: HttpTestingController;
  let api: jasmine.SpyObj<AdsApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<AdsApiService>('AdsApiService', ['listClients', 'deleteClient', 'updateClient']);
    api.listClients.and.returnValue(of([buildClient()]));
    api.deleteClient.and.returnValue(of(undefined as void));
    api.updateClient.and.returnValue(of(buildClient({ isActive: false })));

    await TestBed.configureTestingModule({
      imports: [ClientListComponent, NoopAnimationsModule],
      providers: [
        { provide: AdsApiService, useValue: api },
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClientListComponent);
    fixture.detectChanges();
  });

  it('renders client name and active status', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Sponsor');
    expect(text).toContain('Active');
  });

  it('shows empty state when no clients are returned', () => {
    api.listClients.and.returnValue(of([]));
    fixture.componentInstance['facade'].refresh().subscribe();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No clients yet');
  });

  it('exposes a redacted error message when list fails', () => {
    api.listClients.and.returnValue(
      throwError(() => ({ error: { code: 'unexpected_error', message: 'Failure at /var/log/client.log', category: 'unexpected' } }))
    );
    fixture.componentInstance['facade'].refresh().subscribe({ error: () => undefined });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Clients unavailable');
    expect(text).not.toContain('/var/log/');
  });

  it('offers deactivate and delete actions', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Deactivate');
    expect(text).toContain('Delete');
  });
});

describe('ClientFormComponent (Reactive Forms + Material)', () => {
  let httpController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientFormComponent, NoopAnimationsModule],
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

  function newForm(): ComponentFixture<ClientFormComponent> {
    return TestBed.createComponent(ClientFormComponent);
  }

  it('marks name as required and prevents save when invalid', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    const form = fixture.componentInstance['form']!;
    expect(form.controls.name.hasError('required')).toBeTrue();
    fixture.componentInstance.submit();
    httpController.expectNone('/api/clients');
  });

  it('submits a new client with create endpoint', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    const form = fixture.componentInstance['form']!;
    form.controls.name.setValue('Sponsor');
    fixture.componentInstance.submit();
    const post = httpController.expectOne('/api/clients');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ name: 'Sponsor', isActive: true });
    post.flush(buildClient());
    httpController.expectOne('/api/clients').flush([]);
  });

  it('trims whitespace before saving', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    const form = fixture.componentInstance['form']!;
    form.controls.name.setValue('   Sponsor   ');
    fixture.componentInstance.submit();
    const post = httpController.expectOne('/api/clients');
    expect(post.request.body).toEqual({ name: 'Sponsor', isActive: true });
    post.flush(buildClient());
    httpController.expectOne('/api/clients').flush([]);
  });

  describe('with route /:id/edit', () => {
    beforeEach(async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [ClientFormComponent, NoopAnimationsModule],
        providers: [
          provideRouter([]),
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: ActivatedRoute, useValue: stubRoute('client-1') }
        ]
      }).compileComponents();
      httpController = TestBed.inject(HttpTestingController);
    });

    it('uses update endpoint when clientId is set', () => {
      const fixture = TestBed.createComponent(ClientFormComponent);
      fixture.componentInstance.ngOnInit();
      const listReq = httpController.expectOne('/api/clients');
      listReq.flush([buildClient()]);
      const form = fixture.componentInstance['form']!;
      form.controls.name.setValue('Sponsor renamed');
      fixture.componentInstance.submit();
      const put = httpController.expectOne('/api/clients/client-1');
      expect(put.request.method).toBe('PUT');
      expect(put.request.body).toEqual({ name: 'Sponsor renamed', isActive: true });
      put.flush(buildClient());
      httpController.expectOne('/api/clients').flush([]);
    });

    it('populates the form when a client is loaded', () => {
      const fixture = TestBed.createComponent(ClientFormComponent);
      fixture.componentInstance.ngOnInit();
      httpController.expectOne('/api/clients').flush([buildClient({ name: 'Featured', isActive: false })]);
      const form = fixture.componentInstance['form']!;
      expect(form.controls.name.value).toBe('Featured');
      expect(form.controls.isActive.value).toBeFalse();
    });

    it('exposes a not-found error when the client does not exist', () => {
      const fixture = TestBed.createComponent(ClientFormComponent);
      fixture.componentInstance.ngOnInit();
      httpController.expectOne('/api/clients').flush([]);
      const err = fixture.componentInstance['loadError']();
      expect(err).not.toBeNull();
      expect(err?.category).toBe('not-found');
    });
  });

  it('exposes a save error from the facade when the save call fails', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    const form = fixture.componentInstance['form']!;
    form.controls.name.setValue('Sponsor');
    fixture.componentInstance.submit();
    httpController.expectOne('/api/clients').flush(
      { code: 'validation_failed', message: 'Bad name', category: 'validation' },
      { status: 422, statusText: 'Unprocessable Entity' }
    );
    const err = fixture.componentInstance['saveError']();
    expect(err).not.toBeNull();
    expect(err?.category).toBe('validation');
  });

  it('tracks unsaved changes after a field is edited', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
    const form = fixture.componentInstance['form']!;
    form.controls.name.setValue('New name');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue();
  });

  it('reports not dirty while saving', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    const form = fixture.componentInstance['form']!;
    form.controls.name.setValue('New name');
    TestBed.inject(ClientsFacade)['savingState'].set(true);
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
  });
});
