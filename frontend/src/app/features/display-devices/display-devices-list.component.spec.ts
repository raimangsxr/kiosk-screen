import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { ConfirmDialogService } from '../../shared/ui/confirm-dialog/confirm-dialog.service';
import { DisplayDeviceRenameDialogComponent } from './display-device-rename-dialog.component';
import { DisplayDevicesListComponent } from './display-devices-list.component';
import { DisplayDevicesFacade } from './display-devices.facade';

class MatDialogStub {
  open = jasmine.createSpy('open').and.returnValue({
    afterClosed: () => of(false),
  });
}

describe('DisplayDevicesListComponent', () => {
  let fixture: ComponentFixture<DisplayDevicesListComponent>;
  let matDialogStub: MatDialogStub;
  const devices = signal([
    {
      id: 'device-1',
      organizationId: 'org-1',
      label: 'Sala A',
      lastSeenAt: '2026-01-02T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      connected: true,
    },
    {
      id: 'device-2',
      organizationId: 'org-1',
      label: 'Sala B',
      lastSeenAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      connected: false,
    },
  ]);

  const facadeStub = {
    devices,
    loading: signal(false),
    mutating: signal(false),
    error: signal<{ message: string; code: string } | null>(null),
    empty: signal(false),
    startPolling: jasmine.createSpy('startPolling'),
    refresh: jasmine.createSpy('refresh').and.returnValue(of(devices())),
    create: jasmine.createSpy('create').and.returnValue(of(devices()[0])),
    rename: jasmine.createSpy('rename').and.returnValue(of(devices()[0])),
    delete: jasmine.createSpy('delete').and.returnValue(of(void 0)),
  };

  beforeEach(async () => {
    devices.set([
      {
        id: 'device-1',
        organizationId: 'org-1',
        label: 'Sala A',
        lastSeenAt: '2026-01-02T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        connected: true,
      },
      {
        id: 'device-2',
        organizationId: 'org-1',
        label: 'Sala B',
        lastSeenAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        connected: false,
      },
    ]);
    facadeStub.error.set(null);
    facadeStub.empty.set(false);
    facadeStub.loading.set(false);
    matDialogStub = new MatDialogStub();

    await TestBed.configureTestingModule({
      imports: [DisplayDevicesListComponent],
      providers: [
        provideNoopAnimations(),
        { provide: DisplayDevicesFacade, useValue: facadeStub },
        { provide: MatDialog, useValue: matDialogStub },
        { provide: MatSnackBar, useValue: { open: jasmine.createSpy('open') } },
        {
          provide: ConfirmDialogService,
          useValue: {
            confirm: () => ({ afterClosed: () => of(true) }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DisplayDevicesListComponent);
  });

  it('renders device rows and connection chips', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Sala A');
    expect(text).toContain('Conectada');
    expect(text).toContain('Desconectada');
  });

  it('disables create when label is empty', () => {
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('[data-testid="add-display-device"]') as HTMLButtonElement;
    expect(button.disabled).toBeTrue();
  });

  it('creates a device from inline form', () => {
    fixture.detectChanges();
    const component = fixture.componentInstance as DisplayDevicesListComponent & {
      newLabel: { setValue(value: string): void };
      onCreate(): void;
    };
    component.newLabel.setValue('Sala C');
    component.onCreate();
    expect(facadeStub.create).toHaveBeenCalledWith('Sala C');
  });

  it('opens rename dialog without changing label when cancelled', () => {
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      onRename(row: { id: string; label: string; connected: boolean }): void;
      dialog: MatDialog;
    };
    const openSpy = spyOn(component.dialog, 'open').and.returnValue({
      afterClosed: () => of(false),
    } as never);
    component.onRename({ id: 'device-1', label: 'Sala A', connected: true });
    expect(openSpy).toHaveBeenCalledWith(DisplayDeviceRenameDialogComponent, jasmine.any(Object));
    expect(facadeStub.rename).not.toHaveBeenCalled();
  });

  it('shows connected warning when deleting a connected device', () => {
    const confirmSpy = jasmine.createSpy('confirm').and.returnValue({ afterClosed: () => of(false) });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DisplayDevicesListComponent],
      providers: [
        provideNoopAnimations(),
        { provide: DisplayDevicesFacade, useValue: facadeStub },
        { provide: MatDialog, useValue: new MatDialogStub() },
        { provide: MatSnackBar, useValue: { open: jasmine.createSpy('open') } },
        { provide: ConfirmDialogService, useValue: { confirm: confirmSpy } },
      ],
    });
    TestBed.compileComponents();
    fixture = TestBed.createComponent(DisplayDevicesListComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as DisplayDevicesListComponent & {
      onDelete(row: { id: string; label: string; connected: boolean }): void;
    };
    component.onDelete({ id: 'device-1', label: 'Sala A', connected: true });

    expect(confirmSpy).toHaveBeenCalled();
    const message = confirmSpy.calls.mostRecent().args[0].message as string;
    expect(message).toContain('Esta pantalla está conectada ahora mismo.');
  });

  it('surfaces refresh errors from facade', () => {
    facadeStub.error.set({ message: 'Sin permisos', code: 'forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sin permisos');
    facadeStub.error.set(null);
  });
});
