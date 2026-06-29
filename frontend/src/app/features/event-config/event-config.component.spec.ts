import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { EventConfiguration } from '../../core/api/event-config.api';
import { EventConfigSyncService } from '../../core/event-config-sync.service';
import { EventConfigComponent } from './event-config.component';
import { EventConfigFacade, EventConfigFormValue } from './event-config.facade';

function buildConfiguration(overrides: Partial<EventConfiguration> = {}): EventConfiguration {
  return {
    id: 'event-1',
    organizationId: 'org-1',
    eventName: 'Spring Summit 2026',
    organizerName: 'ACME Events',
    organizerLogoMediaFile: null,
    eventDurationMinutes: 240,
    logoLayout: null,
    eventNameLayout: null,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides
  };
}

describe('EventConfigComponent (CHG-024 sliders + auto-save)', () => {
  let fixture: ComponentFixture<EventConfigComponent>;
  let httpController: HttpTestingController;
  let facade: EventConfigFacade;
  let sync: jasmine.SpyObj<EventConfigSyncService>;

  beforeEach(async () => {
    sync = jasmine.createSpyObj<EventConfigSyncService>('EventConfigSyncService', ['notifyEventConfigChanged']);
    await TestBed.configureTestingModule({
      imports: [EventConfigComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        EventConfigFacade,
        { provide: EventConfigSyncService, useValue: sync }
      ]
    }).compileComponents();
    facade = TestBed.inject(EventConfigFacade);
    httpController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EventConfigComponent);
    fixture.detectChanges();
    httpController.expectOne('/api/event-configuration').flush(buildConfiguration());
    fixture.detectChanges();
  });

  afterEach(() => {
    httpController.verify();
  });

  it('renders all ten branding layout fields as Material sliders', () => {
    const sliders = fixture.nativeElement.querySelectorAll('mat-slider');
    expect(sliders.length).toBe(10);
    const numberInputs = fixture.nativeElement.querySelectorAll('.event-config__layout-grid input[type="number"]');
    expect(numberInputs.length).toBe(0);
    const sliderInputs = fixture.nativeElement.querySelectorAll('input[matSliderThumb]');
    expect(sliderInputs.length).toBe(10);
  });

  it('shows the current value and unit next to each slider', () => {
    const values = fixture.nativeElement.querySelectorAll('.event-config__slider-value');
    expect(values.length).toBe(10);
    expect(values[0].textContent).toContain('vh');
    expect(values[5].textContent).toContain('vw');
  });

  it('sets aria-label and described-by on every slider for accessibility', () => {
    const sliders = fixture.nativeElement.querySelectorAll('mat-slider');
    sliders.forEach((slider: Element) => {
      expect(slider.getAttribute('aria-label')).toBeTruthy();
      expect(slider.getAttribute('aria-describedby')).toContain('-hint');
    });
  });

  it('preserves the documented range validators on every layout control', () => {
    const layoutGroup = fixture.componentInstance['form']!.controls.layout;
    Object.values(layoutGroup.controls).forEach((control) => {
      control.setValue(-1);
      expect(control.hasError('min')).toBeTrue();
      control.setValue(1000);
      expect(control.hasError('max')).toBeTrue();
      control.setValue(10);
      expect(control.valid).toBeTrue();
    });
  });

  it('uses integer-only steps on every slider', () => {
    const fields = [...fixture.componentInstance['logoFields'], ...fixture.componentInstance['eventNameFields']];
    fields.forEach((field) => {
      expect(field.step).toBe(1);
    });
  });

  it('renders integer read-outs for every slider', () => {
    const layoutGroup = fixture.componentInstance['form']!.controls.layout;
    layoutGroup.controls.logoSize.setValue(7);
    layoutGroup.controls.eventNameSize.setValue(3);
    fixture.detectChanges();
    const values = Array.from(fixture.nativeElement.querySelectorAll('.event-config__slider-value') as NodeListOf<HTMLElement>);
    const logoValue = values.find((el) => el.textContent?.includes('vh'));
    expect(logoValue?.textContent).toContain('7 ');
    expect(logoValue?.textContent).not.toContain('7.0');
  });

  it('triggers auto-save 400 ms after the operator stops dragging a slider', fakeAsync(() => {
    const layoutGroup = fixture.componentInstance['form']!.controls.layout;
    layoutGroup.controls.logoSize.setValue(12);

    tick(399);
    httpController.expectNone((req) => req.method === 'PUT');

    tick(1);
    const put = httpController.expectOne((req) => req.method === 'PUT' && req.url === '/api/event-configuration');
    put.flush(buildConfiguration({ logoLayout: { size: 12 } }));

    expect(sync.notifyEventConfigChanged).toHaveBeenCalled();
  }));

  it('collapses a continuous drag into a single save', fakeAsync(() => {
    const layoutGroup = fixture.componentInstance['form']!.controls.layout;
    layoutGroup.controls.logoSize.setValue(8);
    tick(100);
    layoutGroup.controls.logoSize.setValue(10);
    tick(100);
    layoutGroup.controls.logoSize.setValue(12);
    tick(400);

    const puts = httpController.match((req) => req.method === 'PUT');
    expect(puts.length).toBe(1);
    puts[0].flush(buildConfiguration({ logoLayout: { size: 12 } }));
  }));

  it('skips auto-save when the new value equals the last saved value', fakeAsync(() => {
    const layoutGroup = fixture.componentInstance['form']!.controls.layout;
    layoutGroup.controls.logoSize.setValue(12);
    tick(400);
    httpController.expectOne((req) => req.method === 'PUT').flush(buildConfiguration({ logoLayout: { size: 12 } }));

    layoutGroup.controls.logoSize.setValue(12);
    tick(400);
    expect(httpController.match((req) => req.method === 'PUT').length).toBe(0);
  }));

  it('surfaces auto-save errors in the status signal without throwing a toast', fakeAsync(() => {
    const layoutGroup = fixture.componentInstance['form']!.controls.layout;
    layoutGroup.controls.logoSize.setValue(15);
    tick(400);
    httpController
      .expectOne((req) => req.method === 'PUT')
      .flush({ detail: 'Boom' }, { status: 500, statusText: 'Server Error' });
    expect(facade.layoutAutoSave()).toBe('error');
    expect(sync.notifyEventConfigChanged).not.toHaveBeenCalled();
  }));

  it('clears the error status on the next successful auto-save', fakeAsync(() => {
    const layoutGroup = fixture.componentInstance['form']!.controls.layout;
    layoutGroup.controls.logoSize.setValue(15);
    tick(400);
    httpController
      .expectOne((req) => req.method === 'PUT')
      .flush({ detail: 'Boom' }, { status: 500, statusText: 'Server Error' });
    expect(facade.layoutAutoSave()).toBe('error');

    layoutGroup.controls.logoSize.setValue(16);
    tick(400);
    httpController
      .expectOne((req) => req.method === 'PUT')
      .flush(buildConfiguration({ logoLayout: { size: 16 } }));
    expect(facade.layoutAutoSave()).toBe('saved');
  }));

  it('explicit Save submits the full form and notifies the sync channel', fakeAsync(() => {
    const form = fixture.componentInstance['form']!;
    form.controls.eventName.setValue('Renamed Summit');
    fixture.componentInstance.submit();
    const put = httpController.expectOne((req) => req.method === 'PUT' && req.url === '/api/event-configuration');
    const formData = put.request.body as FormData;
    expect(formData.get('eventName')).toBe('Renamed Summit');
    expect(formData.get('eventDurationMinutes')).toBe('240');
    expect(formData.has('logoLayout')).toBeTrue();
    put.flush(buildConfiguration({ eventName: 'Renamed Summit' }));
    expect(sync.notifyEventConfigChanged).toHaveBeenCalled();
  }));

  it('auto-save sends the full form so eventName is preserved when only a slider moves', fakeAsync(() => {
    const layoutGroup = fixture.componentInstance['form']!.controls.layout;
    layoutGroup.controls.logoSize.setValue(15);
    tick(400);
    const put = httpController.expectOne((req) => req.method === 'PUT');
    const formData = put.request.body as FormData;
    expect(formData.get('eventName')).toBe('Spring Summit 2026');
    expect(formData.get('organizerName')).toBe('ACME Events');
    expect(formData.get('eventDurationMinutes')).toBe('240');
    put.flush(buildConfiguration({ logoLayout: { size: 15 } }));
  }));
});

describe('EventConfigFacade.saveLayout (CHG-024)', () => {
  let facade: EventConfigFacade;
  let httpController: HttpTestingController;
  let sync: jasmine.SpyObj<EventConfigSyncService>;

  beforeEach(() => {
    sync = jasmine.createSpyObj<EventConfigSyncService>('EventConfigSyncService', ['notifyEventConfigChanged']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        EventConfigFacade,
        { provide: EventConfigSyncService, useValue: sync }
      ]
    });
    facade = TestBed.inject(EventConfigFacade);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('sends the full form plus the layout JSON in the PUT body', () => {
    const formValue: EventConfigFormValue = {
      eventName: 'Spring Summit',
      organizerName: 'ACME',
      eventDurationMinutes: 240,
      logoSize: 10,
      logoX: null,
      logoY: null,
      logoTransparency: null,
      logoBorderRadius: null,
      eventNameSize: 2,
      eventNameX: 20,
      eventNameY: null,
      eventNameTransparency: null,
      eventNameBorderRadius: 6
    };
    facade.saveLayout(formValue).subscribe();

    const put = httpController.expectOne((req) => req.method === 'PUT' && req.url === '/api/event-configuration');
    const formData = put.request.body as FormData;
    expect(formData.get('eventName')).toBe('Spring Summit');
    expect(formData.get('organizerName')).toBe('ACME');
    expect(formData.get('eventDurationMinutes')).toBe('240');
    expect(formData.has('logoLayout')).toBeTrue();
    expect(formData.has('eventNameLayout')).toBeTrue();
    expect(JSON.parse(formData.get('logoLayout') as string)).toEqual({ size: 10 });
    expect(JSON.parse(formData.get('eventNameLayout') as string)).toEqual({ size: 2, x: 20, borderRadius: 6 });
    expect(formData.has('file')).toBeFalse();
    expect(formData.has('removeLogo')).toBeFalse();
    put.flush(buildConfiguration({ logoLayout: { size: 10 } }));
  });

  it('preserves the eventName when auto-save only touches a layout field', () => {
    const formValue: EventConfigFormValue = {
      eventName: 'Spring Summit 2026',
      organizerName: 'ACME Events',
      eventDurationMinutes: 240,
      logoSize: 12,
      logoX: null,
      logoY: null,
      logoTransparency: null,
      logoBorderRadius: null,
      eventNameSize: null,
      eventNameX: null,
      eventNameY: null,
      eventNameTransparency: null,
      eventNameBorderRadius: null
    };
    facade.saveLayout(formValue).subscribe();
    const put = httpController.expectOne((req) => req.method === 'PUT');
    const formData = put.request.body as FormData;
    expect(formData.get('eventName')).toBe('Spring Summit 2026');
    put.flush(buildConfiguration({ logoLayout: { size: 12 } }));
  });

  it('updates layoutAutoSave to saved and notifies the sync channel on success', () => {
    const formValue: EventConfigFormValue = {
      eventName: 'Spring Summit',
      organizerName: 'ACME',
      eventDurationMinutes: 240,
      logoSize: 8, logoX: null, logoY: null, logoTransparency: null, logoBorderRadius: null,
      eventNameSize: null, eventNameX: null, eventNameY: null, eventNameTransparency: null, eventNameBorderRadius: null
    };
    facade.saveLayout(formValue).subscribe();
    httpController.expectOne((req) => req.method === 'PUT').flush(buildConfiguration({ logoLayout: { size: 8 } }));
    expect(facade.layoutAutoSave()).toBe('saved');
    expect(sync.notifyEventConfigChanged).toHaveBeenCalled();
  });

  it('sets layoutAutoSave to error on failure without throwing', () => {
    const formValue: EventConfigFormValue = {
      eventName: 'Spring Summit',
      organizerName: 'ACME',
      eventDurationMinutes: 240,
      logoSize: 8, logoX: null, logoY: null, logoTransparency: null, logoBorderRadius: null,
      eventNameSize: null, eventNameX: null, eventNameY: null, eventNameTransparency: null, eventNameBorderRadius: null
    };
    facade.saveLayout(formValue).subscribe({ error: () => undefined });
    httpController.expectOne((req) => req.method === 'PUT').flush(
      { detail: 'Network error' },
      { status: 0, statusText: 'Unknown Error' }
    );
    expect(facade.layoutAutoSave()).toBe('error');
    expect(sync.notifyEventConfigChanged).not.toHaveBeenCalled();
  });
});