import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AdminApiService, KioskConfiguration } from '../../core/api/admin.api';
import { DisplayConfigFacade } from './display-config.facade';
import { DisplayConfigComponent } from './display-config.component';

const configuration: KioskConfiguration = {
  id: 'config-1',
  name: 'Main kiosk',
  defaultTopDurationSeconds: 10,
  defaultAdDurationSeconds: 8,
  defaultTopRotationAnimation: 'fade',
  defaultAdRotationAnimation: 'slide',
  defaultTopAnimationDurationMilliseconds: 300,
  defaultAdAnimationDurationMilliseconds: 300,
  inlineAdCount: 2,
  configuredEventDurationMinutes: 60,
  isEnabled: true
};

function buildConfig(partial: Partial<KioskConfiguration> = {}): KioskConfiguration {
  return { ...configuration, ...partial };
}

describe('DisplayConfigFacade', () => {
  let facade: DisplayConfigFacade;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), DisplayConfigFacade]
    });
    facade = TestBed.inject(DisplayConfigFacade);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('refresh loads configuration and exposes ready signal', () => {
    facade.refresh().subscribe();
    httpController.expectOne('/api/display/configuration').flush(buildConfig());
    expect(facade.configuration()?.id).toBe('config-1');
    expect(facade.ready()).toBeTrue();
  });

  it('save PUTs configuration payload and updates state', () => {
    facade.save({ ...configuration, name: 'Renamed' }).subscribe();
    const put = httpController.expectOne('/api/display/configuration');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual(jasmine.objectContaining({ name: 'Renamed' }));
    put.flush(buildConfig({ name: 'Renamed' }));
    expect(facade.configuration()?.name).toBe('Renamed');
  });

  it('clearError resets the error signal', () => {
    facade.refresh().subscribe({ error: () => undefined });
    httpController.expectOne('/api/display/configuration').flush(
      { code: 'unexpected_error', message: 'Boom' },
      { status: 500, statusText: 'Server Error' }
    );
    expect(facade.error()).not.toBeNull();
    facade.clearError();
    expect(facade.error()).toBeNull();
  });
});

describe('DisplayConfigComponent (Reactive Forms + Material)', () => {
  let fixture: ComponentFixture<DisplayConfigComponent>;
  let httpController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayConfigComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    httpController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DisplayConfigComponent);
    fixture.detectChanges();
    httpController.expectOne('/api/display/configuration').flush(buildConfig());
    fixture.detectChanges();
  });

  afterEach(() => {
    httpController.verify();
  });

  it('populates the form with loaded configuration', () => {
    const form = fixture.componentInstance['form']!;
    expect(form.controls.name.value).toBe('Main kiosk');
    expect(form.controls.defaultTopDurationSeconds.value).toBe(10);
  });

  it('saves a valid configuration', () => {
    const form = fixture.componentInstance['form']!;
    form.controls.name.setValue('Renamed kiosk');
    fixture.componentInstance.submit();
    const put = httpController.expectOne('/api/display/configuration');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual(jasmine.objectContaining({ name: 'Renamed kiosk' }));
    put.flush(buildConfig({ name: 'Renamed kiosk' }));
  });

  it('rejects inline ad count of zero', () => {
    const form = fixture.componentInstance['form']!;
    form.controls.inlineAdCount.setValue(0);
    expect(form.controls.inlineAdCount.hasError('positiveInteger')).toBeTrue();
    fixture.componentInstance.submit();
    httpController.expectNone((req) => req.method === 'PUT');
  });

  it('rejects event duration of zero', () => {
    const form = fixture.componentInstance['form']!;
    form.controls.configuredEventDurationMinutes.setValue(0);
    expect(form.controls.configuredEventDurationMinutes.hasError('positiveInteger')).toBeTrue();
    fixture.componentInstance.submit();
    httpController.expectNone((req) => req.method === 'PUT');
  });

  it('tracks unsaved changes after editing a field', () => {
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeFalse();
    const form = fixture.componentInstance['form']!;
    form.controls.name.setValue('Edited');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBeTrue();
  });
});
