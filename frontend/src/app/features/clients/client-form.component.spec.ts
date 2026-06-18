import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AdsApiService, Client } from '../../ads/ads-api.service';
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientListComponent, NoopAnimationsModule],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    httpController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ClientListComponent);
    fixture.detectChanges();
    httpController.expectOne('/api/clients').flush([buildClient()]);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpController.verify();
  });

  it('renders client name and active status', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Sponsor');
    expect(text).toContain('Active');
  });

  it('shows empty state when no clients are returned', () => {
    fixture.componentInstance['facade'].refresh().subscribe();
    httpController.expectOne('/api/clients').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No clients yet');
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

  it('submits a new client with create endpoint and trims whitespace', () => {
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

  it('tracks unsaved changes after a field is edited', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
    const form = fixture.componentInstance['form']!;
    form.controls.name.setValue('New name');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue();
  });
});
