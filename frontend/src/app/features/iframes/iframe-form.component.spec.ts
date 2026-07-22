import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ConfirmDialogService } from '../../shared/ui/confirm-dialog/confirm-dialog.service';
import { IframeFormComponent } from './iframe-form.component';
import { IframeFacade } from './iframe.facade';

describe('IframeFormComponent', () => {
  let fixture: ComponentFixture<IframeFormComponent>;
  let http: HttpTestingController;
  const currentItem = {
    id: 'iframe-1',
    organizationId: 'org-1',
    url: 'https://example.org/agenda',
    scaleX: 1,
    scaleY: 1,
    displayScales: [
      {
        displayDeviceId: 'device-1',
        displayLabel: 'Pantalla A',
        connected: true,
        scaleX: 1,
        scaleY: 1,
        source: 'default' as const,
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const facadeStub = {
    current: signal(currentItem),
    displayScales: signal(currentItem.displayScales),
    loading: signal(false),
    saving: signal(false),
    scalesSaving: signal(false),
    error: signal(null),
    clearCurrent: jasmine.createSpy('clearCurrent'),
    load: jasmine.createSpy('load').and.returnValue(of(currentItem)),
    save: jasmine.createSpy('save').and.returnValue(of({})),
    saveDisplayScales: jasmine.createSpy('saveDisplayScales').and.returnValue(
      of({
        ...currentItem,
        displayScales: [
          {
            displayDeviceId: 'device-1',
            displayLabel: 'Pantalla A',
            connected: true,
            scaleX: 1.25,
            scaleY: 0.8,
            source: 'override' as const,
          },
        ],
      }),
    ),
    precreateDisplayDevice: jasmine.createSpy('precreateDisplayDevice').and.callFake(() =>
      of({
        ...currentItem,
        displayScales: [
          ...currentItem.displayScales,
          {
            displayDeviceId: 'device-2',
            displayLabel: 'Pantalla B',
            connected: false,
            scaleX: 1,
            scaleY: 1,
            source: 'default' as const,
          },
        ],
      }),
    ),
    deleteDisplayDevice: jasmine.createSpy('deleteDisplayDevice').and.returnValue(
      of({
        ...currentItem,
        displayScales: [],
      }),
    ),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IframeFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => 'iframe-1' } },
          },
        },
        { provide: IframeFacade, useValue: facadeStub },
        {
          provide: ConfirmDialogService,
          useValue: {
            confirm: () => ({
              afterClosed: () => of(true),
            }),
          },
        },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(IframeFormComponent);
  });

  afterEach(() => {
    http.verify();
  });

  it('pre-fills matrix rows from display scales', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Pantalla A');
    expect(fixture.nativeElement.textContent).toContain('predeterminada');
  });

  it('saves dirty matrix rows via facade', () => {
    fixture.detectChanges();
    const component = fixture.componentInstance as IframeFormComponent & {
      updateRowScale(id: string, field: 'scaleX' | 'scaleY', event: Event): void;
      saveScales(): void;
    };

    component.updateRowScale('device-1', 'scaleX', {
      target: { value: '1.25' },
    } as unknown as Event);
    component.saveScales();

    expect(facadeStub.saveDisplayScales).toHaveBeenCalledWith('iframe-1', [
      { displayDeviceId: 'device-1', scaleX: 1.25, scaleY: 1 },
    ]);
  });

  it('adds a new display row immediately after pre-create', () => {
    fixture.detectChanges();
    const component = fixture.componentInstance as IframeFormComponent & {
      precreateDevice(): void;
      newDeviceLabel: { setValue(value: string): void };
      scaleRows: { displayLabel: string }[];
    };

    component.newDeviceLabel.setValue('Pantalla B');
    component.precreateDevice();
    fixture.detectChanges();

    expect(facadeStub.precreateDisplayDevice).toHaveBeenCalledWith('Pantalla B');
    expect(component.scaleRows.map((row) => row.displayLabel)).toEqual(['Pantalla A', 'Pantalla B']);
    expect(fixture.nativeElement.textContent).toContain('Pantalla B');
  });

  it('removes a display row after delete confirmation', () => {
    fixture.detectChanges();
    const component = fixture.componentInstance as IframeFormComponent & {
      deleteDevice(row: { displayDeviceId: string; displayLabel: string }): void;
      scaleRows: { displayLabel: string }[];
    };

    component.deleteDevice({
      displayDeviceId: 'device-1',
      displayLabel: 'Pantalla A',
    });
    fixture.detectChanges();

    expect(facadeStub.deleteDisplayDevice).toHaveBeenCalledWith('device-1');
    expect(component.scaleRows).toEqual([]);
  });

  it('marks cleared rows for restablecer save', () => {
    fixture.detectChanges();
    const component = fixture.componentInstance as IframeFormComponent & {
      clearRow(id: string): void;
      saveScales(): void;
    };

    component.clearRow('device-1');
    component.saveScales();

    expect(facadeStub.saveDisplayScales).toHaveBeenCalledWith('iframe-1', [
      { displayDeviceId: 'device-1', clear: true },
    ]);
  });
});
