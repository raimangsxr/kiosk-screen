import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AdItem, AdsApiService } from '../../core/api/ads.api';
import { AdsFacade } from './ads.facade';
import { AdListComponent } from './ad-list.component';
import { AdFormComponent } from './ad-form.component';

function buildAd(partial: Partial<AdItem> = {}): AdItem {
  return {
    id: 'ad-1',
    sourceReference: 'https://example.com/ad.jpg',
    isActive: true,
    displayOrder: 1,
    advertiser: 'Sponsor',
    ...partial
  };
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
    fixture.detectChanges();
  });

  afterEach(() => {
    httpController.verify();
  });

  it('renders ad metadata and active status', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Sponsor');
    expect(text).toContain('External source');
    expect(text).toContain('Activo');
  });

  it('shows empty state when no ads are returned', () => {
    fixture.componentInstance['facade'].refresh().subscribe();
    httpController.expectOne('/api/ads').flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sin anuncios');
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
    expect(text).toContain('Anuncios no disponibles');
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

  it('submits an ad with create endpoint when a source reference is provided', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    const form = fixture.componentInstance['form']!;
    form.controls.advertiser.setValue('Sponsor Inc.');
    form.controls.sourceReference.setValue('https://example.com/ad.jpg');
    fixture.componentInstance.submit();
    const post = httpController.expectOne('/api/ads');
    expect(post.request.method).toBe('POST');
    const body = post.request.body as Record<string, unknown>;
    expect('label' in body).toBeFalse();
    expect('clientId' in body).toBeFalse();
    expect(body['advertiser']).toBe('Sponsor Inc.');
    post.flush(buildAd());
    httpController.expectOne('/api/ads').flush([buildAd()]);
  });

  it('submits an ad with upload endpoint when a file is selected', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    const form = fixture.componentInstance['form']!;
    form.controls.advertiser.setValue('Sponsor Inc.');
    fixture.componentInstance['selectedFile'].set(new File(['x'], 'ad.jpg', { type: 'image/jpeg' }));
    fixture.componentInstance.submit();
    const post = httpController.expectOne('/api/ads/upload');
    expect(post.request.method).toBe('POST');
    expect(post.request.body instanceof FormData).toBeTrue();
    const formData = post.request.body as FormData;
    expect(formData.has('label')).toBeFalse();
    expect(formData.has('clientId')).toBeFalse();
    expect(formData.get('advertiser')).toBe('Sponsor Inc.');
    post.flush(buildAd());
    httpController.expectOne('/api/ads').flush([buildAd()]);
  });

  it('uploads each selected ad image when multiple files are selected on create', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    const form = fixture.componentInstance['form']!;
    form.controls.advertiser.setValue('Sponsor Inc.');
    form.controls.displayOrder.setValue(1);
    fixture.componentInstance['selectedFiles'].set([
      new File(['x'], 'first.jpg', { type: 'image/jpeg' }),
      new File(['y'], 'second.jpg', { type: 'image/jpeg' })
    ]);

    fixture.componentInstance.submit();

    const first = httpController.expectOne('/api/ads/upload');
    expect((first.request.body as FormData).has('displayOrder')).toBeFalse();
    first.flush(buildAd({ id: 'ad-1' }));

    const second = httpController.expectOne('/api/ads/upload');
    expect((second.request.body as FormData).has('displayOrder')).toBeFalse();
    second.flush(buildAd({ id: 'ad-2' }));

    httpController.expectOne('/api/ads').flush([buildAd(), buildAd({ id: 'ad-2' })]);
  });

  it('refuses to save on create when neither file nor source reference is provided', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    fixture.componentInstance.submit();
    httpController.expectNone((req) => req.url === '/api/ads');
    const err = fixture.componentInstance['saveError']();
    expect(err?.category).toBe('validation');
  });

  it('tracks unsaved changes after a field is edited', () => {
    const fixture = newForm();
    fixture.componentInstance.ngOnInit();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
    const form = fixture.componentInstance['form']!;
    form.controls.sourceReference.setValue('https://example.com/ad.jpg');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue();
  });
});
