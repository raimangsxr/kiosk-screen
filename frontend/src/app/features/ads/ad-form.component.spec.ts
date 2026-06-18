import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
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

function stubRoute(id: string | null) {
  const params = id ? { id } : {};
  return {
    snapshot: { paramMap: convertToParamMap(params) },
    paramMap: of(convertToParamMap(params))
  };
}

describe('AdListComponent (Material)', () => {
  let fixture: ComponentFixture<AdListComponent>;
  let api: jasmine.SpyObj<AdsApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<AdsApiService>('AdsApiService', ['listAds', 'listClients', 'deleteAd']);
    api.listAds.and.returnValue(of([buildAd()]));
    api.listClients.and.returnValue(of([buildClient()]));
    api.deleteAd.and.returnValue(of(undefined as void));

    await TestBed.configureTestingModule({
      imports: [AdListComponent, NoopAnimationsModule],
      providers: [{ provide: AdsApiService, useValue: api }, provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(AdListComponent);
    fixture.detectChanges();
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
    api.listAds.and.returnValue(of([]));
    fixture.componentInstance['facade'].refresh().subscribe();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No ads yet');
  });

  it('exposes a redacted error message when list fails', () => {
    api.listAds.and.returnValue(
      throwError(() => ({ error: { code: 'unexpected_error', message: 'Failure at /var/log/ad.log', category: 'unexpected' } }))
    );
    fixture.componentInstance['facade'].refresh().subscribe({ error: () => undefined });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Ads unavailable');
    expect(text).not.toContain('/var/log/');
  });
});

describe('AdFormComponent (Reactive Forms + Material)', () => {
  let api: jasmine.SpyObj<AdsApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<AdsApiService>('AdsApiService', [
      'listAds',
      'listClients',
      'getAd',
      'createAd',
      'updateAd',
      'deleteAd',
      'uploadAd'
    ]);
    api.listClients.and.returnValue(of([buildClient()]));
    api.createAd.and.returnValue(of(buildAd()));
    api.updateAd.and.returnValue(of(buildAd()));
    api.uploadAd.and.returnValue(of(buildAd()));
    api.getAd.and.returnValue(of(buildAd()));
    api.listAds.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [AdFormComponent, NoopAnimationsModule],
      providers: [
        { provide: AdsApiService, useValue: api },
        { provide: ActivatedRoute, useValue: stubRoute(null) }
      ]
    }).compileComponents();
  });

  function newForm(): AdFormComponent {
    return TestBed.createComponent(AdFormComponent).componentInstance;
  }

  it('marks label and client as required and prevents save when invalid', () => {
    const component = newForm();
    component.ngOnInit();
    const form = component['form']!;
    expect(form.controls.clientId.hasError('required')).toBeTrue();
    expect(form.controls.label.hasError('required')).toBeTrue();
    component.submit();
    expect(api.createAd).not.toHaveBeenCalled();
    expect(api.uploadAd).not.toHaveBeenCalled();
  });

  it('rejects display order that is not a positive integer', () => {
    const component = newForm();
    component.ngOnInit();
    const form = component['form']!;
    form.controls.clientId.setValue('client-1');
    form.controls.label.setValue('Lobby');
    form.controls.displayOrder.setValue(0);
    expect(form.controls.displayOrder.hasError('positiveInteger')).toBeTrue();
    component.submit();
    expect(api.createAd).not.toHaveBeenCalled();
  });

  it('submits an ad with create endpoint when no file is provided', () => {
    const component = newForm();
    component.ngOnInit();
    const form = component['form']!;
    form.controls.clientId.setValue('client-1');
    form.controls.label.setValue('Lobby');
    form.controls.sourceReference.setValue('https://example.com/ad.jpg');
    form.controls.displayOrder.setValue(1);
    component.submit();
    expect(api.createAd).toHaveBeenCalled();
    expect(api.uploadAd).not.toHaveBeenCalled();
  });

  it('submits an ad with upload endpoint when a file is selected', () => {
    const component = newForm();
    component.ngOnInit();
    const form = component['form']!;
    form.controls.clientId.setValue('client-1');
    form.controls.label.setValue('Lobby');
    form.controls.displayOrder.setValue(1);
    component['selectedFile'].set(new File(['x'], 'ad.jpg', { type: 'image/jpeg' }));
    component.submit();
    expect(api.uploadAd).toHaveBeenCalled();
    expect(api.createAd).not.toHaveBeenCalled();
  });

  it('refuses to save on create when neither file nor source reference is provided', () => {
    const component = newForm();
    component.ngOnInit();
    const form = component['form']!;
    form.controls.clientId.setValue('client-1');
    form.controls.label.setValue('Lobby');
    form.controls.displayOrder.setValue(1);
    component.submit();
    expect(api.createAd).not.toHaveBeenCalled();
    expect(api.uploadAd).not.toHaveBeenCalled();
    expect(component['saveError']()?.category).toBe('validation');
  });

  it('uses update endpoint when adId is set', () => {
    TestBed.resetTestingModule();
    api = jasmine.createSpyObj<AdsApiService>('AdsApiService', [
      'listAds', 'listClients', 'getAd', 'createAd', 'updateAd', 'deleteAd', 'uploadAd'
    ]);
    api.listClients.and.returnValue(of([buildClient()]));
    api.getAd.and.returnValue(of(buildAd({ id: 'ad-1', label: 'Welcome' })));
    api.updateAd.and.returnValue(of(buildAd({ id: 'ad-1', label: 'Welcome' })));
    api.uploadAd.and.returnValue(of(buildAd({ id: 'ad-1' })));
    api.listAds.and.returnValue(of([]));
    TestBed.configureTestingModule({
      imports: [AdFormComponent, NoopAnimationsModule],
      providers: [
        { provide: AdsApiService, useValue: api },
        { provide: ActivatedRoute, useValue: stubRoute('ad-1') }
      ]
    });
    const fixture = TestBed.createComponent(AdFormComponent);
    fixture.detectChanges();
    const form = fixture.componentInstance['form']!;
    form.controls.label.setValue('Welcome renamed');
    fixture.componentInstance.submit();
    expect(api.updateAd).toHaveBeenCalled();
  });

  it('populates the form when an ad is loaded', () => {
    TestBed.resetTestingModule();
    api = jasmine.createSpyObj<AdsApiService>('AdsApiService', [
      'listAds', 'listClients', 'getAd', 'createAd', 'updateAd', 'deleteAd', 'uploadAd'
    ]);
    api.listClients.and.returnValue(of([buildClient()]));
    api.getAd.and.returnValue(of(buildAd({ label: 'Featured', displayOrder: 7, clientId: 'client-2' })));
    api.listAds.and.returnValue(of([]));
    TestBed.configureTestingModule({
      imports: [AdFormComponent, NoopAnimationsModule],
      providers: [
        { provide: AdsApiService, useValue: api },
        { provide: ActivatedRoute, useValue: stubRoute('ad-1') }
      ]
    });
    const fixture = TestBed.createComponent(AdFormComponent);
    fixture.detectChanges();
    const form = fixture.componentInstance['form']!;
    expect(form.controls.label.value).toBe('Featured');
    expect(form.controls.displayOrder.value).toBe(7);
    expect(form.controls.clientId.value).toBe('client-2');
  });

  it('exposes a save error from the facade when the save call fails', () => {
    api.createAd.and.returnValue(
      throwError(() => ({ error: { code: 'validation_failed', message: 'Bad label', category: 'validation' } }))
    );
    const component = newForm();
    component.ngOnInit();
    const form = component['form']!;
    form.controls.clientId.setValue('client-1');
    form.controls.label.setValue('Lobby');
    form.controls.sourceReference.setValue('https://example.com/ad.jpg');
    form.controls.displayOrder.setValue(1);
    component.submit();
    const err = component['saveError']();
    expect(err).not.toBeNull();
    expect(err?.category).toBe('validation');
  });

  it('tracks unsaved changes after a field is edited', () => {
    const component = newForm();
    component.ngOnInit();
    expect(component.hasUnsavedChanges()).toBeFalse();
    const form = component['form']!;
    form.controls.label.setValue('New label');
    expect(component.hasUnsavedChanges()).toBeTrue();
  });

  it('reports not dirty while saving', () => {
    const component = newForm();
    component.ngOnInit();
    const form = component['form']!;
    form.controls.label.setValue('New label');
    TestBed.inject(AdsFacade)['savingState'].set(true);
    expect(component.hasUnsavedChanges()).toBeFalse();
  });
});
