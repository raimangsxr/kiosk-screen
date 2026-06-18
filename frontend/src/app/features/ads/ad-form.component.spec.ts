import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AdItem, AdsApiService, Client } from '../../ads/ads-api.service';
import { AdsFacade } from './ads.facade';
import { AdListComponent } from './ad-list.component';
import { AdFormComponent } from './ad-form.component';

function buildAd(partial: Partial<AdItem> = {}): AdItem {
  return {
    id: 'ad-1',
    clientId: 'client-1',
    label: 'Lobby ad',
    sourceReference: 'https://example.com/ad.jpg',
    isActive: true,
    displayOrder: 1,
    ...partial
  };
}

function buildClient(partial: Partial<Client> = {}): Client {
  return { id: 'client-1', name: 'Sponsor', isActive: true, ...partial };
}

describe('AdListComponent (Material)', () => {
  let fixture: ComponentFixture<AdListComponent>;
  let httpController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdListComponent, NoopAnimationsModule],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    httpController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdListComponent);
    fixture.detectChanges();
    const adsReq = httpController.expectOne('/api/ads');
    adsReq.flush([buildAd()]);
    const clientsReq = httpController.expectOne('/api/clients');
    clientsReq.flush([buildClient()]);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpController.verify();
  });

  it('renders ad label and active status', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Lobby ad');
    expect(text).toContain('Active');
  });

  it('resolves client name from facade.clients when available', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Sponsor');
  });

  it('shows empty state when no ads are returned', () => {
    fixture.componentInstance['facade'].refresh().subscribe();
    httpController.expectOne('/api/ads').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No ads yet');
  });

  it('exposes a redacted error message when list fails', () => {
    fixture.componentInstance['facade'].refresh().subscribe({ error: () => undefined });
    httpController
      .expectOne('/api/ads')
      .flush(
        { code: 'unexpected_error', message: 'Failure at /var/log/ad.log', category: 'unexpected' },
        { status: 500, statusText: 'Server Error' }
      );
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Ads unavailable');
    expect(text).not.toContain('/var/log/');
  });
});

describe('AdFormComponent (Reactive Forms + Material)', () => {
  let httpController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdFormComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) }, paramMap: of(convertToParamMap({})) } }
      ]
    }).compileComponents();
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  function newForm(): ComponentFixture<AdFormComponent> {
    return TestBed.createComponent(AdFormComponent);
  }

  it('marks label and client as required and prevents save when invalid', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    httpController.expectOne('/api/clients').flush([buildClient()]);
    const form = fixture.componentInstance['form']!;
    expect(form.controls.clientId.hasError('required')).toBeTrue();
    expect(form.controls.label.hasError('required')).toBeTrue();
    fixture.componentInstance.submit();
    httpController.expectNone((req) => req.url === '/api/ads');
  });

  it('submits an ad with create endpoint when a source reference is provided', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    httpController.expectOne('/api/clients').flush([buildClient()]);
    const form = fixture.componentInstance['form']!;
    form.controls.clientId.setValue('client-1');
    form.controls.label.setValue('Lobby');
    form.controls.sourceReference.setValue('https://example.com/ad.jpg');
    form.controls.displayOrder.setValue(1);
    fixture.componentInstance.submit();
    const post = httpController.expectOne('/api/ads');
    expect(post.request.method).toBe('POST');
    post.flush(buildAd());
    httpController.expectOne('/api/ads').flush([buildAd()]);
  });

  it('submits an ad with upload endpoint when a file is selected', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    httpController.expectOne('/api/clients').flush([buildClient()]);
    const form = fixture.componentInstance['form']!;
    form.controls.clientId.setValue('client-1');
    form.controls.label.setValue('Lobby');
    form.controls.displayOrder.setValue(1);
    fixture.componentInstance['selectedFile'].set(new File(['x'], 'ad.jpg', { type: 'image/jpeg' }));
    fixture.componentInstance.submit();
    const post = httpController.expectOne('/api/ads/upload');
    expect(post.request.method).toBe('POST');
    expect(post.request.body instanceof FormData).toBeTrue();
    post.flush(buildAd());
    httpController.expectOne('/api/ads').flush([buildAd()]);
  });

  it('refuses to save on create when neither file nor source reference is provided', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    httpController.expectOne('/api/clients').flush([buildClient()]);
    const form = fixture.componentInstance['form']!;
    form.controls.clientId.setValue('client-1');
    form.controls.label.setValue('Lobby');
    form.controls.displayOrder.setValue(1);
    fixture.componentInstance.submit();
    httpController.expectNone((req) => req.url === '/api/ads');
    const err = fixture.componentInstance['saveError']();
    expect(err?.category).toBe('validation');
  });

  it('tracks unsaved changes after a field is edited', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    httpController.expectOne('/api/clients').flush([buildClient()]);
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
    const form = fixture.componentInstance['form']!;
    form.controls.label.setValue('New label');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue();
  });
});
